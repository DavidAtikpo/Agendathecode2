import type { Prisma } from '@prisma/client';

/** Sessions visibles : créateur Pro ou personne proposée (formateur / assessor). */
export function sessionsVisibleToUser(userId: string): Prisma.TrainingSessionWhereInput {
  return {
    OR: [{ createdById: userId }, { assignments: { some: { userId } } }],
  };
}

export function isSessionCreator(session: { createdById: string }, userId: string): boolean {
  return session.createdById === userId;
}
