import type { Prisma } from '@prisma/client';

const ownerSelect = { id: true, name: true, initials: true, color: true } as const;

export const NOTE_WITH_RELATIONS_INCLUDE = {
  user: { select: ownerSelect },
  shares: { select: { userId: true } },
  assets: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.NoteInclude;

export type NoteWithRelations = Prisma.NoteGetPayload<{
  include: typeof NOTE_WITH_RELATIONS_INCLUDE;
}>;

export function serializeNote(note: NoteWithRelations) {
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
    assets: note.assets.map(a => ({
      id: a.id,
      mediaType: a.mediaType,
      originalName: a.originalName,
      bytes: a.bytes,
      url: a.url,
      createdAt: a.createdAt.toISOString(),
      uploaderId: a.uploaderId,
    })),
  };
}
