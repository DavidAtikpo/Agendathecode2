import type { Prisma } from '@prisma/client';

export const SESSION_WITH_ASSIGNMENTS_INCLUDE = {
  assignments: {
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
    orderBy: { role: 'asc' as const },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.TrainingSessionInclude;

export type SessionWithAssignments = Prisma.TrainingSessionGetPayload<{
  include: typeof SESSION_WITH_ASSIGNMENTS_INCLUDE;
}>;

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function serializeTrainingSession(session: SessionWithAssignments) {
  return {
    id: session.id,
    title: session.title,
    startDate: dateOnlyIso(session.startDate),
    endDate: dateOnlyIso(session.endDate),
    altStartDate: session.altStartDate ? dateOnlyIso(session.altStartDate) : null,
    altEndDate: session.altEndDate ? dateOnlyIso(session.altEndDate) : null,
    examDate: session.examDate ? dateOnlyIso(session.examDate) : null,
    createdBy: session.createdById,
    creatorName: session.createdBy.name,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    assignments: session.assignments.map(a => ({
      id: a.id,
      role: a.role as string,
      status: a.status as string,
      acceptedOption: a.acceptedOption as string | null,
      respondedAt: a.respondedAt?.toISOString() ?? null,
      user: {
        id: a.user.id,
        email: a.user.email,
        name: a.user.name,
        color: a.user.color,
        initials: a.user.initials,
      },
    })),
  };
}

export type SerializedTrainingSession = ReturnType<typeof serializeTrainingSession>;
