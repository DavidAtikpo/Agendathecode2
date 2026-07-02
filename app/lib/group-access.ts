import type { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';

/** Groupes dont l'utilisateur est membre. */
export async function groupIdsForUser(userId: string): Promise<string[]> {
  const rows = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  return rows.map(r => r.groupId);
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const link = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { groupId: true },
  });
  return Boolean(link);
}

export async function assertGroupMember(groupId: string, userId: string): Promise<void> {
  if (!(await isGroupMember(groupId, userId))) {
    throw new Error('GROUP_FORBIDDEN');
  }
}

export async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const rows = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  return rows.map(r => r.userId);
}

/** Filtre Prisma : groupes visibles par l'utilisateur. */
export function groupsVisibleToUser(sessionId: string): Prisma.GroupWhereInput {
  return { members: { some: { userId: sessionId } } };
}
