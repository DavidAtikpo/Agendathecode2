import type { Prisma } from '@prisma/client';

export const TASK_WITH_RELATIONS_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true } } } },
  assets: { orderBy: { createdAt: 'desc' } },
  group: { select: { id: true, name: true, logoUrl: true } },
  _count: { select: { comments: true } },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { createdAt: true, authorId: true },
  },
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
    groupId: task.groupId ?? undefined,
    group: task.group
      ? { id: task.group.id, name: task.group.name, logoUrl: task.group.logoUrl ?? null }
      : undefined,
    assigneeNotifiedAt: task.assigneeNotifiedAt?.toISOString() ?? null,
    dueDate: task.dueDate?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    commentCount: task._count.comments,
    lastCommentAt: task.comments[0]?.createdAt.toISOString() ?? null,
    lastCommentBy: task.comments[0]?.authorId ?? null,
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
