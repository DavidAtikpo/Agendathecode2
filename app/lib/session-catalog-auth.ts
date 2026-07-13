import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { canManageTrainingSessions } from '@/app/lib/user-roles';

/** Organisateur ou administrateur — gestion du catalogue de dates publiques. */
export async function requireSessionCatalogManager(): Promise<
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

  if (!user || !canManageTrainingSessions(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Accès réservé aux organisateurs et administrateurs' },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId };
}
