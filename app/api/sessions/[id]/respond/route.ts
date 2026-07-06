import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { sessionsVisibleToUser } from '@/app/lib/session-access';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { canViewSessionProposals, normalizeAppUserRole } from '@/app/lib/user-roles';
import { SessionAssignmentStatus, SessionDateOption } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

/** Formateur / assessor : accepter ou refuser une proposition (lecture seule sur les dates). */
export async function POST(request: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const decision = body.status === 'accepted' || body.status === 'declined' ? body.status : null;
  const role = body.role === 'formateur' || body.role === 'assessor' ? body.role : null;
  const acceptedOption =
    body.acceptedOption === 'primary' || body.acceptedOption === 'alternative'
      ? body.acceptedOption
      : null;

  if (!decision || !role) {
    return NextResponse.json({ error: 'status (accepted|declined) et role requis' }, { status: 400 });
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!canViewSessionProposals(account?.role)) {
    return NextResponse.json(
      { error: 'Seuls les comptes Formateur et Assessor peuvent répondre aux propositions.' },
      { status: 403 },
    );
  }

  const accountRole = normalizeAppUserRole(account?.role);
  if (accountRole === 'formateur' && role !== 'formateur') {
    return NextResponse.json({ error: 'Votre compte est Formateur uniquement.' }, { status: 403 });
  }
  if (accountRole === 'assessor' && role !== 'assessor') {
    return NextResponse.json({ error: 'Votre compte est Assessor uniquement.' }, { status: 403 });
  }

  const session = await prisma.trainingSession.findFirst({
    where: { id, ...sessionsVisibleToUser(userId) },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  if (!session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  const hasAltDates = Boolean(session.altStartDate && session.altEndDate);
  if (decision === 'accepted' && hasAltDates && !acceptedOption) {
    return NextResponse.json(
      { error: 'Choisissez l\'option A ou B pour confirmer votre disponibilité.' },
      { status: 400 },
    );
  }

  const assignment = session.assignments.find(a => a.role === role && a.userId === userId);
  if (!assignment) {
    return NextResponse.json({ error: 'Vous n\'êtes pas assigné à ce rôle pour cette session.' }, { status: 403 });
  }

  if (assignment.status === SessionAssignmentStatus.accepted && decision === 'accepted') {
    return NextResponse.json(serializeTrainingSession(session));
  }

  await prisma.sessionAssignment.update({
    where: { id: assignment.id },
    data: {
      status: decision as SessionAssignmentStatus,
      respondedAt: new Date(),
      acceptedOption:
        decision === 'accepted'
          ? (acceptedOption as SessionDateOption | null) ??
            (hasAltDates ? null : SessionDateOption.primary)
          : null,
    },
  });

  const responder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const roleLabel = role === 'formateur' ? 'Formateur' : 'Assessor';
  const statusLabel = decision === 'accepted' ? 'disponible' : 'indisponible';

  await sendPushToUser(session.createdById, {
    title: `📅 ${roleLabel} — ${statusLabel}`,
    body: `${responder?.name ?? 'Un intervenant'} : ${session.title}`,
    data: { type: 'session_response', sessionId: id, role, status: decision },
  });

  const updated = await prisma.trainingSession.findUnique({
    where: { id },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });

  return NextResponse.json(serializeTrainingSession(updated!));
}
