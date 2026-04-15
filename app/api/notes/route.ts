import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { replaceNoteShares } from '@/app/lib/note-share';

const ownerSelect = { id: true, name: true, initials: true, color: true } as const;

type NoteRow = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  remindAt: Date | null;
  reminderByEmail: boolean;
  reminderEmailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  user: { id: string; name: string; initials: string; color: string } | null;
  shares: { userId: string }[];
};

function serialize(note: NoteRow) {
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
    ownerId: note.userId,
    ownerName: note.user?.name ?? null,
    ownerInitials: note.user?.initials ?? null,
    ownerColor: note.user?.color ?? null,
    sharedWith: note.shares.map(s => s.userId),
  };
}

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
    include: {
      user: { select: ownerSelect },
      shares: { select: { userId: true } },
    },
  });
  return NextResponse.json(notes.map(serialize));
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
    include: {
      user: { select: ownerSelect },
      shares: { select: { userId: true } },
    },
  });

  return NextResponse.json(serialize(full), { status: 201 });
}
