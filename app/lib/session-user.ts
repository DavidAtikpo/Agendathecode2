import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

/** Utilisateur connecté (id + rôle) ou null si non authentifié. */
export async function getAuthenticatedSessionUser(): Promise<{
  id: string;
  role: string;
} | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!user) return null;
  return user;
}
