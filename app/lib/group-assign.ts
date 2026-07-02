import { prisma } from '@/app/lib/prisma';
import { parseAssigneeIdsFromBody } from '@/app/lib/task-assign';

/**
 * Assignation dans un groupe : soi-même et/ou un autre membre du groupe (max 2).
 */
export async function resolveGroupAssignees(
  groupId: string,
  actorId: string,
  assignedTo: unknown
): Promise<string[]> {
  const ids = parseAssigneeIdsFromBody(assignedTo);

  if (ids.length > 2) {
    throw new Error('ASSIGN_TOO_MANY');
  }

  const memberIds = new Set(
    (
      await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })
    ).map(m => m.userId)
  );

  if (!memberIds.has(actorId)) {
    throw new Error('GROUP_FORBIDDEN');
  }

  for (const id of ids) {
    if (!memberIds.has(id)) {
      throw new Error('ASSIGN_FORBIDDEN');
    }
  }

  return ids;
}

/** Vérifie que chaque membre proposé est un collaborateur ajouté par email. */
export async function assertGroupMembersAllowed(
  ownerId: string,
  memberIds: string[]
): Promise<void> {
  for (const memberId of memberIds) {
    if (memberId === ownerId) continue;
    const link = await prisma.teamContact.findUnique({
      where: { ownerId_memberId: { ownerId, memberId } },
    });
    if (!link) {
      throw new Error('MEMBER_FORBIDDEN');
    }
  }
}
