import { prisma } from '@/app/lib/prisma';

/** Vérifie que l'utilisateur a le forfait Pro (création de groupes, etc.). */
export async function assertUserIsPro(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user || user.plan !== 'pro') {
    throw new Error('PRO_REQUIRED');
  }
}

export function proRequiredMessage() {
  return 'La création de groupes est réservée au forfait Pro.';
}

export function sessionsProRequiredMessage() {
  return 'La création de sessions formation est réservée au forfait Pro.';
}
