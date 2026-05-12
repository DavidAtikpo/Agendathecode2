import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { replaceNoteShares } from '@/app/lib/note-share';
import { NOTE_WITH_RELATIONS_INCLUDE, serializeNote } from '@/app/lib/note-serialize';

export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const notes = await prisma.note.findMany({
    where: {
      OR: [{ userId: sessionId }, { shares: { some: { userId: sessionId } } }],
    },
    orderBy: { updatedAt: 'desc' },
    include: NOTE_WITH_RELATIONS_INCLUDE,
  });
  return NextResponse.json(notes.map(serializeNote));
}

export async function POST(request: Request) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, pinned, remindAt, reminderByEmail, sharedWith } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
  }

  let remind: Date | null = null;
  if (remindAt != null && remindAt !== '') {
    const d = new Date(remindAt);
    if (!Number.isNaN(d.getTime())) remind = d;
  }

  const note = await prisma.note.create({
    data: {
      userId: sessionId,
      title: title.trim(),
      content: content ?? '',
      pinned: pinned ?? false,
      remindAt: remind,
      reminderByEmail: reminderByEmail !== false,
    },
  });

  if (Array.isArray(sharedWith) && sharedWith.length > 0) {
    try {
      await replaceNoteShares(note.id, sessionId, sharedWith as string[]);
    } catch (e: unknown) {
      await prisma.note.delete({ where: { id: note.id } });
      if (e instanceof Error && e.message === 'SHARE_FORBIDDEN') {
        return NextResponse.json(
          { error: 'Vous ne pouvez partager qu’avec des collaborateurs ajoutés par e-mail.' },
          { status: 403 }
        );
      }
      throw e;
    }
  }

  const full = await prisma.note.findUniqueOrThrow({
    where: { id: note.id },
    include: NOTE_WITH_RELATIONS_INCLUDE,
  });

  return NextResponse.json(serializeNote(full), { status: 201 });
}
