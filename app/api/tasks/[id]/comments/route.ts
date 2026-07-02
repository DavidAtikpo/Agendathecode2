import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { tasksVisibleToUser } from '@/app/lib/task-access';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { notifyGroupAboutTask } from '@/app/lib/group-notify';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

function serializeComment(c: {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; color: string; initials: string };
}) {
  return {
    id: c.id,
    taskId: c.taskId,
    authorId: c.authorId,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
  };
}

/** GET — liste tous les commentaires d'une tâche */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;

  const task = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(userId) },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, color: true, initials: true } },
    },
  });

  return NextResponse.json(comments.map(serializeComment));
}

/** POST — ajouter un commentaire */
export async function POST(req: NextRequest, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await ctx.params;

  const task = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(userId) },
    select: {
      id: true,
      title: true,
      createdById: true,
      groupId: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });

  let content = '';
  try {
    const body = await req.json();
    content = typeof body.content === 'string' ? body.content.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  if (!content) return NextResponse.json({ error: 'Message vide' }, { status: 400 });

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: userId, content },
    include: {
      author: { select: { id: true, name: true, color: true, initials: true } },
    },
  });

  const shortMsg = content.length > 60 ? content.slice(0, 57) + '…' : content;

  if (task.groupId) {
    await notifyGroupAboutTask({
      groupId: task.groupId,
      excludeUserId: userId,
      taskTitle: task.title,
      event: 'comment',
      actorName: comment.author.name,
      commentPreview: shortMsg,
      taskId: task.id,
    });
  } else {
    const participants = new Set<string>();
    participants.add(task.createdById);
    for (const a of task.assignees) participants.add(a.userId);
    participants.delete(userId);

    for (const recipientId of participants) {
      await sendPushToUser(recipientId, {
        title: `💬 ${comment.author.name} — ${task.title}`,
        body: shortMsg,
        data: { type: 'task_comment', taskId: task.id },
      });
    }
  }

  return NextResponse.json(serializeComment(comment), { status: 201 });
}

/** DELETE — supprimer son propre commentaire */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id: taskId } = await ctx.params;
  let commentId = '';
  try {
    const body = await req.json();
    commentId = typeof body.commentId === 'string' ? body.commentId : '';
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }
  if (!commentId) return NextResponse.json({ error: 'commentId requis' }, { status: 400 });

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId, authorId: userId },
  });
  if (!comment) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });

  await prisma.taskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
