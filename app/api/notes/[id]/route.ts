import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { replaceNoteShares } from '@/app/lib/note-share';
import { NOTE_WITH_RELATIONS_INCLUDE, serializeNote } from '@/app/lib/note-serialize';
import { sendPushToUser } from '@/app/lib/firebase-admin';

async function loadSerialized(id: string) {
  const note = await prisma.note.findUniqueOrThrow({
    where: { id },
    include: NOTE_WITH_RELATIONS_INCLUDE,
  });
  return serializeNote(note);
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

  if (Array.isArray(data.sharedWith)) {
    // Detect newly added recipients before replacing
    const existingShares = await prisma.noteShare.findMany({
      where: { noteId: id },
      select: { userId: true },
    });
    const existingIds = new Set(existingShares.map((s) => s.userId));
    const newRecipientIds = (data.sharedWith as string[]).filter(
      (uid) => uid !== sessionId && !existingIds.has(uid)
    );

    try {
      await replaceNoteShares(id, sessionId, data.sharedWith as string[]);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'SHARE_FORBIDDEN') {
        return NextResponse.json(
          { error: "Vous ne pouvez partager qu'avec des collaborateurs ajoutés par e-mail." },
          { status: 403 }
        );
      }
      throw e;
    }

    // Push notification to newly added recipients
    if (newRecipientIds.length > 0) {
      const owner = await prisma.user.findUnique({
        where: { id: sessionId },
        select: { name: true },
      });
      for (const recipientId of newRecipientIds) {
        await sendPushToUser(recipientId, {
          title: '📄 Note partagée avec vous',
          body: `${owner?.name ?? 'Quelqu\'un'} a partagé : "${existing.title}"`,
          data: { type: 'note_shared', noteId: id },
        });
      }
    }
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

  const hasContentPatch =
    data.title !== undefined || data.content !== undefined || data.pinned !== undefined;

  if (hasContentPatch || Object.keys(remindPatch).length || data.reminderByEmail !== undefined) {
    await prisma.note.update({
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
  }

  return NextResponse.json(await loadSerialized(id));
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
