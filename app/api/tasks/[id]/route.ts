import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getAuthenticatedSessionUser } from '@/app/lib/session-user';
import { assigneeIdsEqual, parseAssigneeIdsFromBody, resolveAssignees } from '@/app/lib/task-assign';
import { resolveGroupAssignees } from '@/app/lib/group-assign';
import { notifyGroupAboutTask } from '@/app/lib/group-notify';
import { isGroupTaskContentReadOnlyForUser, isTaskAssignee, tasksVisibleToUser } from '@/app/lib/task-access';
import { sendTaskNotificationEmail } from '@/app/lib/email';
import { TASK_WITH_RELATIONS_INCLUDE, serializeTask } from '@/app/lib/task-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { TaskStatus, TaskPriority } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const sessionUser = await getAuthenticatedSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const sessionId = sessionUser.id;

  const { id } = await ctx.params;
  const data = await request.json();

  const existing = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId, sessionUser.role) },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });
  if (!existing) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  }

  const isCreator = existing.createdById === sessionId;
  const isAssignee = isTaskAssignee(existing, sessionId);
  const isGroupContentReadOnly = isGroupTaskContentReadOnlyForUser(existing, sessionId);
  const existingAssigneeIds = existing.assignees.map(a => a.userId);

  if (existing.groupId && !isCreator && !isAssignee) {
    return NextResponse.json(
      { error: 'Seul le créateur ou un assigné peut modifier cette tâche de groupe.' },
      { status: 403 },
    );
  }

  if (isGroupContentReadOnly && isAssignee) {
    if (data.status === undefined) {
      return NextResponse.json(
        { error: 'En tant qu’assigné, vous ne pouvez modifier que le statut.' },
        { status: 403 },
      );
    }
    if (data.title !== undefined && data.title !== existing.title) {
      return NextResponse.json({ error: 'Seul le créateur peut modifier le titre.' }, { status: 403 });
    }
    if (data.description !== undefined && data.description !== existing.description) {
      return NextResponse.json({ error: 'Seul le créateur peut modifier la description.' }, { status: 403 });
    }
    if (data.priority !== undefined && data.priority !== existing.priority) {
      return NextResponse.json({ error: 'Seul le créateur peut modifier la priorité.' }, { status: 403 });
    }
    if (data.dueDate !== undefined) {
      const nextDue = data.dueDate ? new Date(data.dueDate).getTime() : null;
      const existingDue = existing.dueDate?.getTime() ?? null;
      if (nextDue !== existingDue) {
        return NextResponse.json({ error: 'Seul le créateur peut modifier la date limite.' }, { status: 403 });
      }
    }
    if (data.assignedTo !== undefined) {
      const incoming = parseAssigneeIdsFromBody(data.assignedTo);
      if (!assigneeIdsEqual(incoming, existingAssigneeIds)) {
        return NextResponse.json({ error: 'Seul le créateur peut modifier l’assignation.' }, { status: 403 });
      }
    }
  } else if (isGroupContentReadOnly) {
    return NextResponse.json(
      { error: 'Les tâches de groupe ne peuvent être modifiées que par leur créateur ou leurs assignés.' },
      { status: 403 },
    );
  }

  if (!isCreator) {
    if (data.assignedTo !== undefined) {
      const incoming = parseAssigneeIdsFromBody(data.assignedTo);
      if (!assigneeIdsEqual(incoming, existingAssigneeIds)) {
        return NextResponse.json(
          { error: 'Seul le créateur peut modifier l’assignation.' },
          { status: 403 }
        );
      }
    }
    if (data.priority !== undefined && data.priority !== existing.priority) {
      return NextResponse.json(
        { error: 'Seul le créateur peut modifier la priorité.' },
        { status: 403 }
      );
    }
    if (data.dueDate !== undefined) {
      const nextDue = data.dueDate ? new Date(data.dueDate).getTime() : null;
      const existingDue = existing.dueDate?.getTime() ?? null;
      if (nextDue !== existingDue) {
        return NextResponse.json(
          { error: 'Seul le créateur peut modifier la date limite.' },
          { status: 403 }
        );
      }
    }
  }

  let assignedToIds: string[] | undefined;
  let assigneeNotifiedAt: Date | null | undefined;
  if (data.assignedTo !== undefined && isCreator) {
    try {
      if (existing.groupId) {
        assignedToIds = await resolveGroupAssignees(existing.groupId, sessionId, data.assignedTo);
      } else {
        assignedToIds = await resolveAssignees(sessionId, data.assignedTo);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'ASSIGN_FORBIDDEN') {
        return NextResponse.json(
          {
            error: existing.groupId
              ? 'Vous ne pouvez assigner qu’à des membres du groupe.'
              : 'Vous ne pouvez assigner qu’à vous-même ou à un collaborateur ajouté par email.',
          },
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
    const nextAssigneeIds = [...assignedToIds].sort();
    if (!assigneeIdsEqual(existingAssigneeIds, nextAssigneeIds)) {
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
      ...(assignedToIds !== undefined && {
        assignees: {
          deleteMany: {},
          create: assignedToIds.map(userId => ({ userId })),
        },
      }),
      ...(assigneeNotifiedAt !== undefined && { assigneeNotifiedAt }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });

  const actor = await prisma.user.findUnique({
    where: { id: sessionId },
    select: { name: true },
  });

  if (existing.groupId && (moved || assigneeChanged || data.title !== undefined || data.description !== undefined)) {
    if (assigneeChanged) {
      await notifyGroupAboutTask({
        groupId: existing.groupId,
        excludeUserId: sessionId,
        taskTitle: task.title,
        event: 'assigned',
        actorName: actor?.name ?? null,
        taskId: task.id,
      });
    }
    if (moved) {
      await notifyGroupAboutTask({
        groupId: existing.groupId,
        excludeUserId: sessionId,
        taskTitle: task.title,
        event: 'moved',
        actorName: actor?.name ?? null,
        status: task.status,
        taskId: task.id,
      });
    }
  } else if (task.assignees.length > 0 && (moved || assigneeChanged)) {
    const otherAssignees = task.assignees.filter(a => a.userId !== sessionId);
    const assigneeEmails = otherAssignees.map(a => a.user.email).filter(Boolean);
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
    for (const a of otherAssignees) {
      if (moved) {
        await sendPushToUser(a.userId, {
          title: '🔄 Statut de tâche modifié',
          body: `${task.title} → ${task.status}`,
          data: { type: 'task_status', taskId: task.id, status: task.status },
        });
      } else if (assigneeChanged) {
        await sendPushToUser(a.userId, {
          title: '📋 Tâche réassignée',
          body: `${actor?.name ?? 'Quelqu\'un'} vous a assigné : ${task.title}`,
          data: { type: 'task_assigned', taskId: task.id },
        });
      }
    }
    if (moved && existing.createdById !== sessionId) {
      await sendPushToUser(existing.createdById, {
        title: '🔄 Statut de tâche modifié',
        body: `${actor?.name ?? 'Un assigné'} a changé le statut de "${task.title}" → ${task.status}`,
        data: { type: 'task_status', taskId: task.id, status: task.status },
      });
    }
  }

  return NextResponse.json(serializeTask(task));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionUser = await getAuthenticatedSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const sessionId = sessionUser.id;

  const { id } = await ctx.params;
  const task = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId, sessionUser.role) },
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
