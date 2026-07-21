import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { assertUserIsSessionOrganizer, sessionsOrganizerRequiredMessage } from '@/app/lib/pro-plan';
import { sessionsVisibleToUser } from '@/app/lib/session-access';
import { resolveUserIdByEmailForAssignment } from '@/app/lib/session-assign';
import { assertOrganizerOwnsStaffUser } from '@/app/lib/staff-access';
import { sessionRoleMismatchMessage } from '@/app/lib/user-roles';
import { buildSessionTitle, parseDateOnly } from '@/app/lib/session-title';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { SessionAssignmentRole, SessionAssignmentStatus } from '@prisma/client';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const sessions = await prisma.trainingSession.findMany({
    where: sessionsVisibleToUser(userId),
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json(sessions.map(serializeTrainingSession));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    await assertUserIsSessionOrganizer(userId);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'ORGANIZER_REQUIRED') {
      return NextResponse.json({ error: sessionsOrganizerRequiredMessage() }, { status: 403 });
    }
    throw e;
  }

  const body = await request.json();
  const startDate = parseDateOnly(body.startDate);
  const endDate = parseDateOnly(body.endDate);
  const altStartDate = parseDateOnly(body.altStartDate);
  const altEndDate = parseDateOnly(body.altEndDate);
  const examDate = parseDateOnly(body.examDate);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Dates de début et fin requises (AAAA-MM-JJ)' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 });
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
  if (examDate && examDate < endDate) {
    return NextResponse.json({ error: 'La date d\'examen doit être après la fin de formation' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : buildSessionTitle(startDate, endDate, examDate);

  let formateurId: string | undefined;
  let assessorId: string | undefined;

  const organizer = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  try {
    if (body.formateurEmail) {
      formateurId = await resolveUserIdByEmailForAssignment(
        body.formateurEmail,
        SessionAssignmentRole.formateur,
      );
      if (formateurId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous assigner comme formateur' }, { status: 400 });
      }
      await assertOrganizerOwnsStaffUser(userId, formateurId, organizer?.role);
    }
    if (body.assessorEmail) {
      assessorId = await resolveUserIdByEmailForAssignment(
        body.assessorEmail,
        SessionAssignmentRole.assessor,
      );
      if (assessorId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous assigner comme assessor' }, { status: 400 });
      }
      await assertOrganizerOwnsStaffUser(userId, assessorId, organizer?.role);
    }
    if (formateurId && assessorId && formateurId === assessorId) {
      return NextResponse.json(
        { error: 'Le formateur et l\'assessor doivent être des personnes différentes' },
        { status: 400 }
      );
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'EMAIL_INVALID') {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Aucun compte Agenda avec cet email. La personne doit d\'abord s\'inscrire.' },
        { status: 404 }
      );
    }
    if (e instanceof Error && e.message === 'ROLE_MISMATCH') {
      return NextResponse.json(
        {
          error: sessionRoleMismatchMessage(
            body.formateurEmail && !formateurId ? 'formateur' : 'assessor',
          ),
        },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === 'STAFF_NOT_OWNED') {
      return NextResponse.json(
        { error: 'Vous ne pouvez assigner que des intervenants créés par votre compte.' },
        { status: 403 },
      );
    }
    throw e;
  }

  const assignments: { userId: string; role: SessionAssignmentRole }[] = [];
  if (formateurId) assignments.push({ userId: formateurId, role: SessionAssignmentRole.formateur });
  if (assessorId) assignments.push({ userId: assessorId, role: SessionAssignmentRole.assessor });

  const session = await prisma.trainingSession.create({
    data: {
      title,
      startDate,
      endDate,
      altStartDate,
      altEndDate,
      examDate,
      createdById: userId,
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

  const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  for (const a of session.assignments) {
    await sendPushToUser(a.userId, {
      title: '📅 Proposition de session',
      body: `${creator?.name ?? 'Un organisateur'} vous propose : ${session.title}`,
      data: { type: 'session_proposal', sessionId: session.id, role: a.role },
    });
  }

  return NextResponse.json(serializeTrainingSession(session), { status: 201 });
}
