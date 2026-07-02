import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { assertUserIsPro, sessionsProRequiredMessage } from '@/app/lib/pro-plan';
import { sessionsVisibleToUser } from '@/app/lib/session-access';
import { resolveUserIdByEmail } from '@/app/lib/session-assign';
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
    await assertUserIsPro(userId);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'PRO_REQUIRED') {
      return NextResponse.json({ error: sessionsProRequiredMessage() }, { status: 403 });
    }
    throw e;
  }

  const body = await request.json();
  const startDate = parseDateOnly(body.startDate);
  const endDate = parseDateOnly(body.endDate);
  const examDate = parseDateOnly(body.examDate);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Dates de début et fin requises (AAAA-MM-JJ)' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 });
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

  try {
    if (body.formateurEmail) {
      formateurId = await resolveUserIdByEmail(body.formateurEmail);
      if (formateurId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous assigner comme formateur' }, { status: 400 });
      }
    }
    if (body.assessorEmail) {
      assessorId = await resolveUserIdByEmail(body.assessorEmail);
      if (assessorId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous assigner comme assessor' }, { status: 400 });
      }
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
