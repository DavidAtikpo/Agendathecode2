import type { Task } from '../types';
import type { UserPreferences } from './user-preferences';

/** Nombre de tâches assignées à l’utilisateur depuis la dernière visite de la vue Tâches. */
export function countUnreadAssignedTasks(
  tasks: Task[],
  userId: string,
  prefs: UserPreferences,
): number {
  const raw = prefs.assignedInboxLastSeenAt?.trim();
  const lastMs = raw ? new Date(raw).getTime() : 0;
  if (Number.isNaN(lastMs)) {
    return tasks.filter(t => t.assignedTo === userId && Boolean(t.assigneeNotifiedAt)).length;
  }
  return tasks.filter(t => {
    if (t.assignedTo !== userId || !t.assigneeNotifiedAt) return false;
    const ping = new Date(t.assigneeNotifiedAt).getTime();
    return !Number.isNaN(ping) && ping > lastMs;
  }).length;
}
