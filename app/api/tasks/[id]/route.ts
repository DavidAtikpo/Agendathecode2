import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { resolveAssignees } from '@/app/lib/task-assign';
import { tasksVisibleToUser } from '@/app/lib/task-access';
import { sendTaskNotificationEmail } from '@/app/lib/email';
import { TASK_WITH_RELATIONS_INCLUDE, serializeTask } from '@/app/lib/task-serialize';
import { TaskStatus, TaskPriority } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const data = await request.json();

  const existing = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId) },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });
  if (!existing) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  }

  let assignedToIds: string[] | undefined;
  let assigneeNotifiedAt: Date | null | undefined;
  if (data.assignedTo !== undefined) {
    if (existing.createdById !== sessionId) {
      return NextResponse.json(
        { error: 'Seul le créateur peut modifier l’assignation.' },
        { status: 403 }
      );
    }
    try {
      assignedToIds = await resolveAssignees(sessionId, data.assignedTo);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'ASSIGN_FORBIDDEN') {
        return NextResponse.json(
          { error: 'Vous ne pouvez assigner qu’à vous-même ou à un collaborateur ajouté par email.' },
          { status: 403 }
        );
      }
      if (e instanceof Error && e.message === 'ASSIGN_TOO_MANY') {
        return NextResponse.json(
          { error: 'Vous pouvez assigner une tâche à 2 collaborateurs maximum.' },
          { status: 400 }
        );
      }
      throw e;
    }
    const existingAssigneeIds = existing.assignees.map(a => a.userId).sort();
    const nextAssigneeIds = [...assignedToIds].sort();
    if (JSON.stringify(existingAssigneeIds) !== JSON.stringify(nextAssigneeIds)) {
      assigneeNotifiedAt = assignedToIds.length > 0 ? new Date() : null;
    }
  }
  const moved = data.status !== undefined && data.status !== existing.status;
  const assigneeChanged =
    assignedToIds !== undefined &&
    JSON.stringify(existing.assignees.map(a => a.userId).sort()) !== JSON.stringify([...assignedToIds].sort());

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status as TaskStatus }),
      ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
      ...(data.assignedTo !== undefined && {
        assignees: {
          deleteMany: {},
          create: assignedToIds!.map(userId => ({ userId })),
        },
      }),
      ...(assigneeNotifiedAt !== undefined && { assigneeNotifiedAt }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });

  if (task.assignees.length > 0 && (moved || assigneeChanged)) {
    const actor = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { name: true },
    });
    const assigneeEmails = task.assignees
      .filter(a => a.userId !== sessionId)
      .map(a => a.user.email)
      .filter(Boolean);
    for (const email of assigneeEmails) {
      const notify = await sendTaskNotificationEmail(email, {
        taskTitle: task.title,
        event: moved ? 'moved' : 'assigned',
        actorName: actor?.name ?? null,
        status: task.status,
      });
      if (!notify.ok) {
        console.warn('[tasks PATCH] task notification email failed:', notify.error);
      }
    }
  }

  return NextResponse.json(serializeTask(task));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const task = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId) },
    include: { assignees: true, assets: { select: { id: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  }
  if (task.createdById !== sessionId) {
    return NextResponse.json(
      { error: 'Seul le créateur de la tâche peut la supprimer.' },
      { status: 403 },
    );
  }
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
