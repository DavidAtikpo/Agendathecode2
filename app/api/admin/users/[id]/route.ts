import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin';
import { ADMIN_USER_SELECT, serializeAdminUser } from '@/app/lib/admin-user-serialize';

export const runtime = 'nodejs';

/** GET — fetch notes of a specific user */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const notes = await prisma.note.findMany({
    where: { userId: id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true, pinned: true },
  });

  return NextResponse.json(
    notes.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
  );
}

/** PATCH — update user plan, role, credits, or active status */
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
  if (
    body.role === 'admin' ||
    body.role === 'user' ||
    body.role === 'organizer' ||
    body.role === 'formateur' ||
    body.role === 'assessor' ||
    body.role === 'auditeur'
  ) {
    data.role = body.role;
  }

  if (typeof body.active === 'boolean') data.active = body.active;

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
      select: ADMIN_USER_SELECT,
    });

    return NextResponse.json(serializeAdminUser(updated));
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
