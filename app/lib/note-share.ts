import { prisma } from '@/app/lib/prisma';

/**
 * Vérifie que chaque cible est le propriétaire lui-même ou un collaborateur ajouté par e-mail (TeamContact).
 */
export async function assertNoteShareTargetsAllowed(ownerId: string, targetIds: string[]): Promise<void> {
  const unique = [...new Set(targetIds.map(String).filter(Boolean))];
  for (const memberId of unique) {
    if (memberId === ownerId) continue;
    const link = await prisma.teamContact.findUnique({
      where: { ownerId_memberId: { ownerId, memberId } },
    });
    if (!link) {
      throw new Error('SHARE_FORBIDDEN');
    }
  }
}

/** Remplace la liste des partages (ids utilisateurs, hors propriétaire). */
export async function replaceNoteShares(noteId: string, ownerId: string, userIds: string[]): Promise<void> {
  const ids = [...new Set(userIds.map(String).filter(id => id && id !== ownerId))];
  await assertNoteShareTargetsAllowed(ownerId, ids);
  await prisma.$transaction(async tx => {
    await tx.noteShare.deleteMany({ where: { noteId } });
    if (ids.length > 0) {
      await tx.noteShare.createMany({
        data: ids.map(userId => ({ noteId, userId })),
      });
    }
  });
}
