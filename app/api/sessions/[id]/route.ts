import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { isSessionCreator, sessionsVisibleToUser } from '@/app/lib/session-access';
import {
  parseRoleEmailMap,
  syncSessionAssignments,
} from '@/app/lib/session-assignment-batch';
import { buildSessionTitle, parseDateOnly } from '@/app/lib/session-title';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { SessionAssignmentStatus } from '@prisma/client';

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
  const organizerId = userId;

  const { id } = await ctx.params;
  const existing = await prisma.trainingSession.findFirst({
    where: { id, ...sessionsVisibleToUser(organizerId) },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  if (!existing) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }
  if (!isSessionCreator(existing, organizerId)) {
    return NextResponse.json({ error: 'Seul le créateur peut modifier cette session.' }, { status: 403 });
  }

  const priorAssignments = existing.assignments;

  const body = await request.json();
  const startDate = body.startDate !== undefined ? parseDateOnly(body.startDate) : existing.startDate;
  const endDate = body.endDate !== undefined ? parseDateOnly(body.endDate) : existing.endDate;
  const altStartDate =
    body.altStartDate === null
      ? null
      : body.altStartDate !== undefined
        ? parseDateOnly(body.altStartDate)
        : existing.altStartDate;
  const altEndDate =
    body.altEndDate === null
      ? null
      : body.altEndDate !== undefined
        ? parseDateOnly(body.altEndDate)
        : existing.altEndDate;
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
  if ((altStartDate && !altEndDate) || (!altStartDate && altEndDate)) {
    return NextResponse.json(
      { error: 'Renseignez début et fin pour l\'option B, ou laissez les deux vides' },
      { status: 400 },
    );
  }
  if (altStartDate && altEndDate && altEndDate < altStartDate) {
    return NextResponse.json({ error: 'La date de fin B doit être après le début' }, { status: 400 });
  }

  const datesChanged =
    existing.startDate.getTime() !== startDate.getTime() ||
    existing.endDate.getTime() !== endDate.getTime() ||
    (existing.altStartDate?.getTime() ?? null) !== (altStartDate?.getTime() ?? null) ||
    (existing.altEndDate?.getTime() ?? null) !== (altEndDate?.getTime() ?? null) ||
    (existing.examDate?.getTime() ?? null) !== (examDate?.getTime() ?? null);

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : buildSessionTitle(startDate, endDate, examDate);

  await prisma.trainingSession.update({
    where: { id },
    data: { title, startDate, endDate, altStartDate, altEndDate, examDate },
  });

  const creatorUser = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true, role: true } });

  const roleEmails = parseRoleEmailMap(body);
  const hasAssignmentPatch =
    roleEmails.formateur !== undefined ||
    roleEmails.assessor !== undefined ||
    roleEmails.auditeur !== undefined;

  try {
    if (hasAssignmentPatch) {
      await syncSessionAssignments(id, roleEmails, organizerId, creatorUser?.role ?? 'user', {
        datesChanged,
        priorAssignments: priorAssignments.map(a => ({
          id: a.id,
          userId: a.userId,
          role: a.role,
          status: a.status,
        })),
        notify: async (targetId, role, isNew) => {
          if (isNew || datesChanged) {
            await sendPushToUser(targetId, {
              title: datesChanged ? '📅 Session modifiée' : '📅 Proposition de session',
              body: `${creatorUser?.name ?? 'Organisateur'} : ${title}`,
              data: { type: 'session_proposal', sessionId: id, role },
            });
          }
        },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Aucun compte Agenda avec cet email.' },
        { status: 404 },
      );
    }
    if (e instanceof Error && e.message === 'SELF_ASSIGN') {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous inclure dans la proposition.' }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'DUPLICATE_USER') {
      return NextResponse.json(
        { error: 'Chaque intervenant ne peut apparaître qu\'une seule fois sur la session.' },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === 'STAFF_NOT_OWNED') {
      return NextResponse.json(
        { error: 'Vous ne pouvez assigner que des intervenants créés par votre compte.' },
        { status: 403 },
      );
    }
    if (e instanceof Error && e.message === 'ROLE_MISMATCH') {
      return NextResponse.json({ error: 'Rôle du compte incompatible avec l\'assignation.' }, { status: 400 });
    }
    throw e;
  }

  if (datesChanged && !hasAssignmentPatch) {
    for (const a of priorAssignments) {
      if (a.status === SessionAssignmentStatus.accepted) {
        await prisma.sessionAssignment.update({
          where: { id: a.id },
          data: { status: SessionAssignmentStatus.pending, respondedAt: null, acceptedOption: null },
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
