import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { provisionWebirataStaffAccountIfReady } from '@/app/lib/webirata-staff';
import { repairStaffRoleFromAssignments } from '@/app/lib/repair-staff-role';
import { toPublicUser } from '@/app/lib/user-public';
import { sessionsVisibleToUser } from '@/app/lib/session-access';
import { SessionAssignmentStatus, SessionDateOption } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

/** Formateur / assessor / auditeur : accepter ou refuser une proposition. */
export async function POST(request: Request, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    await repairStaffRoleFromAssignments(userId);
  } catch (e: unknown) {
    console.error('[sessions/respond] repair staff role', e);
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const decision = body.status === 'accepted' || body.status === 'declined' ? body.status : null;
  const role =
    body.role === 'formateur' || body.role === 'assessor' || body.role === 'auditeur'
      ? body.role
      : null;
  const acceptedOption =
    body.acceptedOption === 'primary' || body.acceptedOption === 'alternative'
      ? body.acceptedOption
      : null;

  if (!decision || !role) {
    return NextResponse.json({ error: 'status (accepted|declined) et role requis' }, { status: 400 });
  }

  const session = await prisma.trainingSession.findFirst({
    where: { id, ...sessionsVisibleToUser(userId) },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  if (!session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  const assignment = session.assignments.find(a => a.role === role && a.userId === userId);
  if (!assignment) {
    return NextResponse.json(
      { error: "Vous n'êtes pas assigné à ce rôle pour cette session." },
      { status: 403 },
    );
  }

  const hasAltDates = Boolean(session.altStartDate && session.altEndDate);
  if (decision === 'accepted' && hasAltDates && !acceptedOption) {
    return NextResponse.json(
      { error: "Choisissez l'option A ou B pour confirmer votre disponibilité." },
      { status: 400 },
    );
  }

  const alreadyAccepted =
    assignment.status === SessionAssignmentStatus.accepted && decision === 'accepted';

  if (!alreadyAccepted) {
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

    const responder = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const roleLabel =
      role === 'formateur' ? 'Formateur' : role === 'assessor' ? 'Assessor' : 'Auditeur';
    const statusLabel = decision === 'accepted' ? 'disponible' : 'indisponible';

    await sendPushToUser(session.createdById, {
      title: `📅 ${roleLabel} — ${statusLabel}`,
      body: `${responder?.name ?? 'Un intervenant'} : ${session.title}`,
      data: { type: 'session_response', sessionId: id, role, status: decision },
    });
  }

  let webirataProvisioned = false;
  if (decision === 'accepted') {
    try {
      webirataProvisioned = await provisionWebirataStaffAccountIfReady(userId);
    } catch (e: unknown) {
      console.error('[sessions/respond] provision webirata', e);
    }
  }

  const updated = await prisma.trainingSession.findUnique({
    where: { id },
    include: SESSION_WITH_ASSIGNMENTS_INCLUDE,
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  return NextResponse.json({
    session: serializeTrainingSession(updated!),
    user: toPublicUser(user, { includePasswordLoginHint: true }),
    webirataProvisioned,
  });
}
