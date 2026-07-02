import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';

export const runtime = 'nodejs';

/**
 * Remet à zéro le compteur de notifications non vues (appelé par l'app mobile
 * à l'ouverture / retour au premier plan) — efface le badge sur l'icône.
 */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { unreadNotificationCount: 0 },
  });

  return NextResponse.json(toPublicUser(updated, { includePasswordLoginHint: true }));
}
