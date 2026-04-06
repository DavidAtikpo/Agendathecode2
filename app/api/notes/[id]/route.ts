import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import type { Note } from '@prisma/client';

function serialize(note: Note) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    pinned: note.pinned,
    remindAt: note.remindAt?.toISOString() ?? null,
    reminderByEmail: note.reminderByEmail,
    reminderEmailSentAt: note.reminderEmailSentAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
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

  const existing = await prisma.note.findFirst({
    where: { id, userId: sessionId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
  }

  const remindPatch =
    data.remindAt === undefined
      ? {}
      : data.remindAt === null || data.remindAt === ''
        ? { remindAt: null }
        : (() => {
            const d = new Date(data.remindAt);
            return Number.isNaN(d.getTime()) ? {} : { remindAt: d };
          })();

  const newRemindAt =
    data.remindAt === undefined
      ? existing.remindAt
      : data.remindAt === null || data.remindAt === ''
        ? null
        : (() => {
            const d = new Date(data.remindAt);
            return Number.isNaN(d.getTime()) ? existing.remindAt : d;
          })();

  const tOld = existing.remindAt?.getTime() ?? null;
  const tNew = newRemindAt?.getTime() ?? null;
  const remindChanged = data.remindAt !== undefined && tOld !== tNew;

  const emailToggleChanged =
    data.reminderByEmail !== undefined && data.reminderByEmail !== existing.reminderByEmail;

  const resetEmailFlag = remindChanged || emailToggleChanged;

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.pinned !== undefined && { pinned: data.pinned }),
      ...remindPatch,
      ...(data.reminderByEmail !== undefined && { reminderByEmail: !!data.reminderByEmail }),
      ...(resetEmailFlag ? { reminderEmailSentAt: null } : {}),
    },
  });

  return NextResponse.json(serialize(note));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const res = await prisma.note.deleteMany({ where: { id, userId: sessionId } });
  if (res.count === 0) {
    return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
