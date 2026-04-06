import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { resolveAssignee } from '@/app/lib/task-assign';
import { TaskStatus, TaskPriority } from '@prisma/client';
import type { Task } from '@prisma/client';

function serialize(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as string,
    priority: task.priority as string,
    assignedTo: task.assignedToId,
    createdBy: task.createdById,
    dueDate: task.dueDate?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const data = await request.json();

  let assignedToId: string | null | undefined;
  if (data.assignedTo !== undefined) {
    try {
      assignedToId = await resolveAssignee(sessionId, data.assignedTo);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'ASSIGN_FORBIDDEN') {
        return NextResponse.json(
          { error: 'Vous ne pouvez assigner qu’à vous-même ou à un collaborateur ajouté par email.' },
          { status: 403 }
        );
      }
      throw e;
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status as TaskStatus }),
      ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
      ...(data.assignedTo !== undefined && { assignedToId }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
  });

  return NextResponse.json(serialize(task));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
