import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { isSessionCreator, sessionsVisibleToUser } from '@/app/lib/session-access';
import {
  SESSION_WITH_ASSIGNMENTS_INCLUDE,
  serializeTrainingSession,
} from '@/app/lib/session-serialize';
import { notifySessionProposal } from '@/app/lib/session-proposal-notify';
import { SessionAssignmentStatus } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — relance e-mail + push de proposition pour les intervenants assignés
 * (utile pour les sessions créées avant le système de notification).
 *
 * Body optionnel : `{ userId?: string }` — un seul intervenant ; sinon tous (sauf refusés).
 */
export async function POST(request: Request, ctx: Ctx) {
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
  if (!isSessionCreator(session, userId)) {
    return NextResponse.json({ error: 'Seul le créateur peut relancer les notifications.' }, { status: 403 });
  }

  let targetUserId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.userId === 'string' && body.userId.trim()) {
      targetUserId = body.userId.trim();
    }
  } catch {
    /* body vide OK */
  }

  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const organizerName = creator?.name ?? 'Organisateur';

  const targets = session.assignments.filter(a => {
    if (a.status === SessionAssignmentStatus.declined) return false;
    if (targetUserId && a.userId !== targetUserId) return false;
    return true;
  });

  if (targets.length === 0) {
    return NextResponse.json(
      { error: 'Aucun intervenant à notifier (ou déjà indisponible).' },
      { status: 400 },
    );
  }

  let sent = 0;
  const errors: string[] = [];
  for (const a of targets) {
    try {
      await notifySessionProposal({
        userId: a.userId,
        role: a.role,
        sessionId: session.id,
        sessionTitle: session.title,
        organizerName,
      });
      sent += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${a.user.email}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: targets.length,
    errors: errors.length > 0 ? errors : undefined,
    session: serializeTrainingSession(session),
  });
}
