import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

/**
 * Checks if the current session user is an admin.
 * Returns the userId on success, or a NextResponse error to send immediately.
 */
export async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }) };
  }

  return { ok: true, userId };
}
