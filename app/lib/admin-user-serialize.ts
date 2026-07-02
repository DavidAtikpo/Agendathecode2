import type { Prisma } from '@prisma/client';

/** Champs communs pour la liste admin et les réponses PATCH. */
export const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  plan: true,
  role: true,
  active: true,
  aiCredits: true,
  aiCreditsExpiresAt: true,
  unreadNotificationCount: true,
  createdAt: true,
  googleId: true,
  passwordHash: true,
  stripeCustomerId: true,
  _count: {
    select: {
      notes: true,
      tasksCreated: true,
      groupMemberships: true,
      trainingSessionsCreated: true,
      sessionAssignments: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

export function serializeAdminUser(u: AdminUserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    role: u.role,
    active: u.active,
    aiCredits: u.aiCredits,
    aiCreditsExpiresAt: u.aiCreditsExpiresAt?.toISOString() ?? null,
    unreadNotificationCount: u.unreadNotificationCount,
    createdAt: u.createdAt.toISOString(),
    hasGoogle: !!u.googleId,
    hasPassword: !!u.passwordHash,
    hasStripeSubscription: !!u.stripeCustomerId,
    notesCount: u._count.notes,
    tasksCount: u._count.tasksCreated,
    groupsCount: u._count.groupMemberships,
    sessionsCreatedCount: u._count.trainingSessionsCreated,
    sessionAssignmentsCount: u._count.sessionAssignments,
  };
}

export type SerializedAdminUser = ReturnType<typeof serializeAdminUser>;
