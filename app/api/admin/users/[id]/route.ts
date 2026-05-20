import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin';

export const runtime = 'nodejs';

/** PATCH — update user plan, role, or credits */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.plan === 'free' || body.plan === 'pro') data.plan = body.plan;
  if (body.role === 'admin' || body.role === 'user') data.role = body.role;

  if (typeof body.aiCredits === 'number' && body.aiCredits >= 0) {
    data.aiCredits = Math.floor(body.aiCredits);
  }
  if (body.aiCreditsExpiresAt === null) {
    data.aiCreditsExpiresAt = null;
  } else if (typeof body.aiCreditsExpiresAt === 'string') {
    const d = new Date(body.aiCreditsExpiresAt);
    if (!Number.isNaN(d.getTime())) data.aiCreditsExpiresAt = d;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, plan: true, role: true,
        aiCredits: true, aiCreditsExpiresAt: true, createdAt: true, googleId: true,
        _count: { select: { notes: true, tasksCreated: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      plan: updated.plan,
      role: updated.role,
      aiCredits: updated.aiCredits,
      aiCreditsExpiresAt: updated.aiCreditsExpiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      hasGoogle: !!updated.googleId,
      notesCount: updated._count.notes,
      tasksCount: updated._count.tasksCreated,
    });
  } catch {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }
}

/** DELETE — delete a user and all their data (cascades) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (id === auth.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }
}
