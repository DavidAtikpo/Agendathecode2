import type { Prisma } from '@prisma/client';
import { toPublicUser } from '@/app/lib/user-public';

export const GROUP_WITH_MEMBERS_INCLUDE = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          color: true,
          initials: true,
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
      color: true,
      initials: true,
      createdAt: true,
    },
  },
} satisfies Prisma.GroupInclude;

export type GroupWithMembers = Prisma.GroupGetPayload<{ include: typeof GROUP_WITH_MEMBERS_INCLUDE }>;

export function serializeGroup(group: GroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    logoUrl: group.logoUrl ?? null,
    createdBy: group.createdById,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    members: group.members.map(m => toPublicUser(m.user)),
    memberCount: group.members.length,
  };
}

export function serializeGroupSummary(group: Pick<GroupWithMembers, 'id' | 'name' | 'logoUrl'>) {
  return {
    id: group.id,
    name: group.name,
    logoUrl: group.logoUrl ?? null,
  };
}
