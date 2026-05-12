import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { TASK_WITH_RELATIONS_INCLUDE, serializeTask } from '@/app/lib/task-serialize';
import { TaskStatus, TaskPriority, TaskAssetKind } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_STATUS: Record<string, TaskStatus> = {
  todo: TaskStatus.todo,
  urgent: TaskStatus.urgent,
  doing: TaskStatus.doing,
  testing: TaskStatus.testing,
  done: TaskStatus.done,
  review: TaskStatus.review,
};

const ALLOWED_PRIORITY: Record<string, TaskPriority> = {
  low: TaskPriority.low,
  medium: TaskPriority.medium,
  high: TaskPriority.high,
  urgent: TaskPriority.urgent,
};

/**
 * Convertit une note en tâche.
 * - Crée une nouvelle Task avec titre + contenu de la note.
 * - Transfère les NoteAsset sur la nouvelle Task (kind: 'input') sans
 *   re-uploader sur Cloudinary (DB-level move, le fichier reste partagé).
 * - Optionnellement supprime la note d'origine.
 */
export async function POST(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: {
    deleteOriginal?: boolean;
    priority?: string;
    status?: string;
    dueDate?: string | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    /* corps optionnel */
  }

  const note = await prisma.note.findFirst({
    where: { id, userId: sessionId },
    include: { assets: true },
  });
  if (!note) {
    return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
  }

  const status = (body.status && ALLOWED_STATUS[body.status]) || TaskStatus.todo;
  const priority = (body.priority && ALLOWED_PRIORITY[body.priority]) || TaskPriority.medium;
  const dueDate =
    body.dueDate && String(body.dueDate).trim() !== '' && !Number.isNaN(new Date(body.dueDate).getTime())
      ? new Date(body.dueDate)
      : note.remindAt;

  /* Transaction : création tâche + transfert assets + (option) suppression note. */
  const created = await prisma.$transaction(async tx => {
    const task = await tx.task.create({
      data: {
        title: note.title || 'Sans titre',
        description: note.content ?? '',
        status,
        priority,
        dueDate,
        createdById: sessionId,
        assignees: { create: [{ userId: sessionId }] },
        assigneeNotifiedAt: new Date(),
      },
    });

    if (note.assets.length > 0) {
      await tx.taskAsset.createMany({
        data: note.assets.map(a => ({
          taskId: task.id,
          uploaderId: a.uploaderId,
          kind: TaskAssetKind.input,
          mediaType: a.mediaType,
          originalName: a.originalName,
          bytes: a.bytes,
          url: a.url,
          publicId: a.publicId,
        })),
      });
      /* Les fichiers Cloudinary appartiennent désormais à la tâche : on
         supprime les NoteAsset pour éviter une double-suppression. */
      await tx.noteAsset.deleteMany({ where: { noteId: note.id } });
    }

    if (body.deleteOriginal) {
      await tx.note.delete({ where: { id: note.id } });
    }

    const full = await tx.task.findUniqueOrThrow({
      where: { id: task.id },
      include: TASK_WITH_RELATIONS_INCLUDE,
    });
    return full;
  });

  return NextResponse.json(
    {
      task: serializeTask(created),
      noteDeleted: !!body.deleteOriginal,
      noteId: note.id,
    },
    { status: 201 },
  );
}
