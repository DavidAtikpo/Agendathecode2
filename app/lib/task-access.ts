import type { Prisma } from '@prisma/client';

/** Tâches visibles : créées par l'utilisateur, assignées, ou dans un groupe dont il est membre. */
export function tasksVisibleToUser(sessionId: string): Prisma.TaskWhereInput {
  return {
    OR: [
      { createdById: sessionId },
      { assignees: { some: { userId: sessionId } } },
      { group: { members: { some: { userId: sessionId } } } },
    ],
  };
}

export function isTaskAssignee(
  task: { assignees: { userId: string }[] },
  sessionId: string,
): boolean {
  return task.assignees.some(a => a.userId === sessionId);
}

/** Seul le créateur peut modifier titre, description, assignation, etc. sur une tâche de groupe. */
export function isGroupTaskContentReadOnlyForUser(
  task: { groupId: string | null; createdById: string },
  sessionId: string,
): boolean {
  return Boolean(task.groupId) && task.createdById !== sessionId;
}

/** @deprecated Utiliser isGroupTaskContentReadOnlyForUser */
export function isGroupTaskReadOnlyForUser(
  task: { groupId: string | null; createdById: string },
  sessionId: string,
): boolean {
  return isGroupTaskContentReadOnlyForUser(task, sessionId);
}

/** Créateur ou personne assignée peut changer le statut (Kanban). */
export function canUserChangeTaskStatus(
  task: { groupId: string | null; createdById: string; assignees: { userId: string }[] },
  sessionId: string,
): boolean {
  if (task.createdById === sessionId) return true;
  return isTaskAssignee(task, sessionId);
}
