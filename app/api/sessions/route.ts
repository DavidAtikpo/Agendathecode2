import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { assertUserIsSessionOrganizer, sessionsOrganizerRequiredMessage } from '@/app/lib/pro-plan';
import { sessionsVisibleToUser } from '@/app/lib/session-access';
import { assertOrganizerOwnsStaffUser } from '@/app/lib/staff-access';
import {
  parseRoleEmailMap,
  resolveAllSessionAssignments,
} from '@/app/lib/session-assignment-batch';
import { sessionRoleMismatchMessage } from '@/app/lib/user-roles';
import { buildSessionTitle, parseDateOnly } from '@/app/lib/session-title';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { SessionAssignmentStatus } from '@prisma/client';

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

  const organizer = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const roleEmails = parseRoleEmailMap(body);
  let assignments: Awaited<ReturnType<typeof resolveAllSessionAssignments>>;
  try {
    assignments = await resolveAllSessionAssignments(roleEmails, userId, organizer?.role);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'SELF_ASSIGN') {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous inclure dans la proposition.' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'DUPLICATE_USER') {
      return NextResponse.json(
        { error: 'Chaque intervenant ne peut apparaître qu\'une seule fois sur la session.' },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === 'EMAIL_INVALID') {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Aucun compte Agenda avec cet email. Créez d\'abord l\'intervenant.' },
        { status: 404 },
      );
    }
    if (e instanceof Error && e.message === 'ROLE_MISMATCH') {
      return NextResponse.json({ error: sessionRoleMismatchMessage('assessor') }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'STAFF_NOT_OWNED') {
      return NextResponse.json(
        { error: 'Vous ne pouvez assigner que des intervenants créés par votre compte.' },
        { status: 403 },
      );
    }
    throw e;
  }

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
