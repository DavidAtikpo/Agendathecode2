import { prisma } from '@/app/lib/prisma';
import {
  canManageTrainingSessions,
  sessionOrganizerRequiredMessage,
} from '@/app/lib/user-roles';

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

/** Vérifie le rôle Organisateur (gestion des sessions formation). */
export async function assertUserIsSessionOrganizer(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || !canManageTrainingSessions(user.role)) {
    throw new Error('ORGANIZER_REQUIRED');
  }
}

export function proRequiredMessage() {
  return 'La création de groupes est réservée au forfait Pro.';
}

export function sessionsOrganizerRequiredMessage() {
  return sessionOrganizerRequiredMessage();
}
