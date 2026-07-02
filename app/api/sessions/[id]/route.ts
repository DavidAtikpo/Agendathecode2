import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { isSessionCreator, sessionsVisibleToUser } from '@/app/lib/session-access';
import { resolveUserIdByEmailForAssignment } from '@/app/lib/session-assign';
import { sessionRoleMismatchMessage } from '@/app/lib/user-roles';
import { buildSessionTitle, parseDateOnly } from '@/app/lib/session-title';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { SessionAssignmentRole, SessionAssignmentStatus } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const session = await prisma.trainingSession.findFirst({
    where: { id, ...sessionsVisibleToUser(userId) },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  if (!session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeTrainingSession(session));
}

export async function PATCH(request: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.trainingSession.findFirst({
    where: { id, ...sessionsVisibleToUser(userId) },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  if (!existing) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }
  if (!isSessionCreator(existing, userId)) {
    return NextResponse.json({ error: 'Seul le créateur peut modifier cette session.' }, { status: 403 });
  }

  const priorAssignments = existing.assignments;

  const body = await request.json();
  const startDate = body.startDate !== undefined ? parseDateOnly(body.startDate) : existing.startDate;
  const endDate = body.endDate !== undefined ? parseDateOnly(body.endDate) : existing.endDate;
  const examDate =
    body.examDate === null
      ? null
      : body.examDate !== undefined
        ? parseDateOnly(body.examDate)
        : existing.examDate;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 });
  }

  const datesChanged =
    existing.startDate.getTime() !== startDate.getTime() ||
    existing.endDate.getTime() !== endDate.getTime() ||
    (existing.examDate?.getTime() ?? null) !== (examDate?.getTime() ?? null);

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : buildSessionTitle(startDate, endDate, examDate);

  await prisma.trainingSession.update({
    where: { id },
    data: { title, startDate, endDate, examDate },
  });

  const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  async function upsertRole(role: SessionAssignmentRole, emailKey: 'formateurEmail' | 'assessorEmail') {
    if (body[emailKey] === undefined) return;
    const email = body[emailKey];
    if (email === null || email === '') {
      await prisma.sessionAssignment.deleteMany({ where: { sessionId: id, role } });
      return;
    }
    let targetId: string;
    try {
      targetId = await resolveUserIdByEmailForAssignment(email, role);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'USER_NOT_FOUND') {
        throw new Error('USER_NOT_FOUND');
      }
      if (e instanceof Error && e.message === 'ROLE_MISMATCH') {
        throw new Error(`ROLE_MISMATCH:${role}`);
      }
      throw e;
    }
    if (targetId === userId) {
      throw new Error('SELF_ASSIGN');
    }

    const prev = priorAssignments.find(a => a.role === role);
    const isNewPerson = !prev || prev.userId !== targetId;
    const resetStatus =
      datesChanged || isNewPerson || prev?.status === SessionAssignmentStatus.declined;

    await prisma.sessionAssignment.upsert({
      where: { sessionId_role: { sessionId: id, role } },
      create: {
        sessionId: id,
        userId: targetId,
        role,
        status: SessionAssignmentStatus.pending,
      },
      update: {
        userId: targetId,
        ...(resetStatus
          ? { status: SessionAssignmentStatus.pending, respondedAt: null }
          : {}),
      },
    });

    if (isNewPerson || resetStatus) {
      await sendPushToUser(targetId, {
        title: datesChanged ? '📅 Session modifiée' : '📅 Proposition de session',
        body: `${creator?.name ?? 'Organisateur'} : ${title}`,
        data: { type: 'session_proposal', sessionId: id, role },
      });
    }
  }

  try {
    await upsertRole(SessionAssignmentRole.formateur, 'formateurEmail');
    await upsertRole(SessionAssignmentRole.assessor, 'assessorEmail');
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Aucun compte Agenda avec cet email.' },
        { status: 404 }
      );
    }
    if (e instanceof Error && e.message === 'SELF_ASSIGN') {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous assigner ce rôle.' }, { status: 400 });
    }
    if (e instanceof Error && e.message?.startsWith('ROLE_MISMATCH:')) {
      const failed = e.message.split(':')[1] as 'formateur' | 'assessor';
      return NextResponse.json({ error: sessionRoleMismatchMessage(failed) }, { status: 400 });
    }
    throw e;
  }

  if (datesChanged) {
    for (const a of priorAssignments) {
      if (a.status === SessionAssignmentStatus.accepted) {
        await prisma.sessionAssignment.update({
          where: { id: a.id },
          data: { status: SessionAssignmentStatus.pending, respondedAt: null },
        });
        await sendPushToUser(a.userId, {
          title: '📅 Dates modifiées — revalidation',
          body: `Merci de reconfirmer votre disponibilité : ${title}`,
          data: { type: 'session_proposal', sessionId: id, role: a.role },
        });
      }
    }
  }

  const updated = await prisma.trainingSession.findUnique({
    where: { id },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });

  return NextResponse.json(serializeTrainingSession(updated!));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.trainingSession.findFirst({
    where: { id, createdById: userId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Session introuvable ou accès refusé.' }, { status: 404 });
  }

  await prisma.trainingSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
