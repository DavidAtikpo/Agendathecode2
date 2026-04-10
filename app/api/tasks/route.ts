import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { resolveAssignee } from '@/app/lib/task-assign';
import { tasksVisibleToUser } from '@/app/lib/task-access';
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
    assigneeNotifiedAt: task.assigneeNotifiedAt?.toISOString() ?? null,
    dueDate: task.dueDate?.toISOString() ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: tasksVisibleToUser(sessionId),
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tasks.map(serialize));
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

  let assignedToId: string | null;
  try {
    assignedToId = await resolveAssignee(sessionId, assignedTo);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'ASSIGN_FORBIDDEN') {
      return NextResponse.json(
        { error: 'Vous ne pouvez assigner qu’à vous-même ou à un collaborateur ajouté par email.' },
        { status: 403 }
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
        assignedToId,
        assigneeNotifiedAt: assignedToId ? new Date() : null,
        createdById: sessionId,
        dueDate: dueDate && String(dueDate).trim() !== '' ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(serialize(task), { status: 201 });
  } catch (e: unknown) {
    console.error('[tasks POST]', e);
    const msg =
      e instanceof Error ? e.message : 'Erreur lors de la création de la tâche';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
