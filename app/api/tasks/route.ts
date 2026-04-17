import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { resolveAssignees } from '@/app/lib/task-assign';
import { tasksVisibleToUser } from '@/app/lib/task-access';
import { sendTaskNotificationEmail } from '@/app/lib/email';
import { TASK_WITH_RELATIONS_INCLUDE, serializeTask } from '@/app/lib/task-serialize';
import { TaskStatus, TaskPriority } from '@prisma/client';

export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: tasksVisibleToUser(sessionId),
    include: TASK_WITH_RELATIONS_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tasks.map(serializeTask));
}

export async function POST(request: Request) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, status, priority, assignedTo, dueDate } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
  }

  let assignedToIds: string[];
  try {
    assignedToIds = await resolveAssignees(sessionId, assignedTo);
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

  try {
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ?? '',
        status: (status as TaskStatus) ?? TaskStatus.todo,
        priority: (priority as TaskPriority) ?? TaskPriority.medium,
        assigneeNotifiedAt: assignedToIds.length > 0 ? new Date() : null,
        assignees: {
          create: assignedToIds.map(userId => ({ userId })),
        },
        createdById: sessionId,
        dueDate: dueDate && String(dueDate).trim() !== '' ? new Date(dueDate) : null,
      },
      include: TASK_WITH_RELATIONS_INCLUDE,
    });

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
          event: 'created',
          actorName: actor?.name ?? null,
          status: task.status,
      });
      if (!notify.ok) {
        console.warn('[tasks POST] task notification email failed:', notify.error);
      }
    }

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (e: unknown) {
    console.error('[tasks POST]', e);
    const msg =
      e instanceof Error ? e.message : 'Erreur lors de la création de la tâche';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
