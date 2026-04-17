import type { Prisma } from '@prisma/client';

export const TASK_WITH_RELATIONS_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true } } } },
  assets: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof TASK_WITH_RELATIONS_INCLUDE }>;

export function serializeTask(task: TaskWithRelations) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as string,
    priority: task.priority as string,
    assignedTo: task.assignees.map(a => a.userId),
    createdBy: task.createdById,
    assigneeNotifiedAt: task.assigneeNotifiedAt?.toISOString() ?? null,
    dueDate: task.dueDate?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assets: task.assets.map(a => ({
      id: a.id,
      kind: a.kind,
      mediaType: a.mediaType,
      originalName: a.originalName,
      bytes: a.bytes,
      url: a.url,
      createdAt: a.createdAt.toISOString(),
      uploaderId: a.uploaderId,
    })),
  };
}
