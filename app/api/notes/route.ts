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

export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const notes = await prisma.note.findMany({
    where: { userId: sessionId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes.map(serialize));
}

export async function POST(request: Request) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, pinned, remindAt, reminderByEmail } = body;

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

  return NextResponse.json(serialize(note), { status: 201 });
}
