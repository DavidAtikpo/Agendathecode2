import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { canManageTrainingSessions } from '@/app/lib/user-roles';
import {
  createStaffAccount,
  isStaffRole,
  type StaffRole,
} from '@/app/lib/staff-create';
import { staffListWhereForUser, registerStaffForOrganizer } from '@/app/lib/staff-access';
import { buildSessionTitle, parseDateOnly } from '@/app/lib/session-title';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { SessionAssignmentRole, SessionAssignmentStatus } from '@prisma/client';

export const runtime = 'nodejs';

async function requireOrganizerOrAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false as const, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true },
  });
  if (!user || !canManageTrainingSessions(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Réservé aux organisateurs et administrateurs.' },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, user };
}

function staffRoleToAssignmentRole(role: StaffRole): SessionAssignmentRole | null {
  if (role === 'formateur') return SessionAssignmentRole.formateur;
  if (role === 'assessor') return SessionAssignmentRole.assessor;
  return null;
}

/** GET — liste des comptes formateur / assessor / auditeur */
export async function GET() {
  const auth = await requireOrganizerOrAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: staffListWhereForUser(auth.user.id, auth.user.role),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      active: true,
    },
  });

  return NextResponse.json(
    users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
    })),
  );
}

/**
 * POST — crée un compte formateur / assessor / auditeur (nom, prénom, e-mail).
 * Optionnel : propose une session avec deux plages de dates.
 */
export async function POST(request: Request) {
  const auth = await requireOrganizerOrAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  const sendInvite = body.sendInvite !== false;

  if (!isStaffRole(role)) {
    return NextResponse.json(
      { error: 'Rôle requis : formateur, assessor ou auditeur' },
      { status: 400 },
    );
  }

  let staff;
  try {
    staff = await createStaffAccount({
      firstName,
      lastName,
      email,
      role,
      sendInvite,
      createdByOrganizerId: auth.user.id,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NAME_REQUIRED') {
      return NextResponse.json({ error: 'Nom et prénom requis' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'EMAIL_INVALID') {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'ROLE_CONFLICT') {
      return NextResponse.json(
        { error: 'Cet email est déjà associé à un autre type de compte.' },
        { status: 409 },
      );
    }
    throw e;
  }

  try {
    await registerStaffForOrganizer(staff.id, auth.user.id);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'STAFF_OWNED_BY_OTHER') {
      return NextResponse.json(
        { error: 'Cet intervenant a été créé par un autre organisateur.' },
        { status: 409 },
      );
    }
    throw e;
  }

  const sessionPayload = body.session;
  let session = null;

  if (sessionPayload && typeof sessionPayload === 'object') {
    const startDate = parseDateOnly(sessionPayload.startDate);
    const endDate = parseDateOnly(sessionPayload.endDate);
    const altStartDate = parseDateOnly(sessionPayload.altStartDate);
    const altEndDate = parseDateOnly(sessionPayload.altEndDate);
    const examDate = parseDateOnly(sessionPayload.examDate);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Dates option A (début et fin) requises pour la proposition' },
        { status: 400 },
      );
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'La date de fin A doit être après le début' }, { status: 400 });
    }
    if ((altStartDate && !altEndDate) || (!altStartDate && altEndDate)) {
      return NextResponse.json(
        { error: 'Renseignez début et fin pour l\'option B, ou laissez les deux vides' },
        { status: 400 },
      );
    }
    if (altStartDate && altEndDate && altEndDate < altStartDate) {
      return NextResponse.json({ error: 'La date de fin B doit être après le début' }, { status: 400 });
    }
    if (examDate && examDate < endDate && examDate < (altEndDate ?? endDate)) {
      return NextResponse.json(
        { error: 'La date d\'examen doit être après la fin de formation' },
        { status: 400 },
      );
    }

    const assignmentRole = staffRoleToAssignmentRole(role);
    const assignments: { userId: string; role: SessionAssignmentRole }[] = [];
    if (assignmentRole && staff.id !== auth.user.id) {
      assignments.push({ userId: staff.id, role: assignmentRole });
    }

    const title = buildSessionTitle(startDate, endDate, examDate);

    const created = await prisma.trainingSession.create({
      data: {
        title,
        startDate,
        endDate,
        altStartDate,
        altEndDate,
        examDate,
        createdById: auth.user.id,
        assignments: {
          create: assignments.map(a => ({
            userId: a.userId,
            role: a.role,
            status: SessionAssignmentStatus.pending,
          })),
        },
      },
      include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
    });

    for (const a of created.assignments) {
      await sendPushToUser(a.userId, {
        title: '📅 Proposition de session',
        body: `${auth.user.name} vous propose : ${created.title}`,
        data: { type: 'session_proposal', sessionId: created.id, role: a.role },
      });
    }

    session = serializeTrainingSession(created);
  }

  return NextResponse.json({ staff, session }, { status: staff.created ? 201 : 200 });
}
