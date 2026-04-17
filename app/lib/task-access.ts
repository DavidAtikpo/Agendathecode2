import type { Prisma } from '@prisma/client';

/** Tâches visibles : créées par l’utilisateur ou assignées à lui (pas les brouillons d’un collaborateur). */
export function tasksVisibleToUser(sessionId: string): Prisma.TaskWhereInput {
  return {
    OR: [{ createdById: sessionId }, { assignees: { some: { userId: sessionId } } }],
  };
}
