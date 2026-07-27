import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { normalizeAppUserRole, type AppUserRole } from '@/app/lib/user-roles';

const STAFF_ROLES: Role[] = ['formateur', 'assessor', 'auditeur'];

/** Visibilité intervenant pour un organisateur (confidentialité entre organisateurs). */
export function organizerStaffVisibilityOr(organizerId: string): Prisma.UserWhereInput[] {
  return [
    { staffCreatedById: organizerId },
    { staffRegistration: { is: { createdById: organizerId } } },
    /** Déjà proposé sur une session de cet organisateur */
    {
      sessionAssignments: {
        some: { session: { createdById: organizerId } },
      },
    },
  ];
}

/** Filtre Prisma pour la liste des intervenants selon le rôle connecté. */
export function staffListWhereForUser(
  userId: string,
  role: unknown,
): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: { in: STAFF_ROLES } };
  if (normalizeAppUserRole(role) === 'admin') {
    return base;
  }
  return {
    ...base,
    OR: organizerStaffVisibilityOr(userId),
  };
}

/**
 * Répare les liens manquants (legacy) : staffCreatedById sans StaffRegistration,
 * ou intervenants assignés aux sessions de l’organisateur sans enregistrement.
 */
export async function backfillOrganizerStaffRegistrations(organizerId: string): Promise<void> {
  const [byCreator, bySession] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: STAFF_ROLES },
        staffCreatedById: organizerId,
      },
      select: { id: true },
    }),
    prisma.sessionAssignment.findMany({
      where: { session: { createdById: organizerId } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const ids = new Set<string>();
  for (const u of byCreator) ids.add(u.id);
  for (const a of bySession) ids.add(a.userId);

  for (const staffUserId of ids) {
    try {
      await registerStaffForOrganizer(staffUserId, organizerId);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'STAFF_OWNED_BY_OTHER') continue;
      throw e;
    }
  }
}

/** Vérifie qu’un organisateur ne propose que des intervenants qu’il a créés (admin exempté). */
export async function assertOrganizerOwnsStaffUser(
  organizerId: string,
  staffUserId: string,
  organizerRole: unknown,
): Promise<void> {
  if (normalizeAppUserRole(organizerRole) === 'admin') return;

  const staff = await prisma.user.findUnique({
    where: { id: staffUserId },
    select: {
      staffCreatedById: true,
      role: true,
      staffRegistration: { select: { createdById: true } },
    },
  });
  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    throw new Error('STAFF_NOT_FOUND');
  }
  if (staff.staffCreatedById === organizerId) {
    await ensureStaffRegistration(staffUserId, organizerId);
    return;
  }
  if (staff.staffRegistration?.createdById === organizerId) {
    return;
  }

  const onOrganizerSession = await prisma.sessionAssignment.findFirst({
    where: {
      userId: staffUserId,
      session: { createdById: organizerId },
    },
    select: { id: true },
  });
  if (onOrganizerSession) {
    await claimStaffForOrganizerIfAllowed(staffUserId, organizerId, staff);
    return;
  }

  /** Compte intervenant legacy sans propriétaire — rattachement au premier usage */
  if (!staff.staffCreatedById && !staff.staffRegistration) {
    await registerStaffForOrganizer(staffUserId, organizerId);
    return;
  }

  throw new Error('STAFF_NOT_OWNED');
}

async function ensureStaffRegistration(staffUserId: string, organizerId: string): Promise<void> {
  const reg = await prisma.staffRegistration.findUnique({
    where: { staffUserId },
    select: { createdById: true },
  });
  if (!reg) {
    await prisma.staffRegistration.create({
      data: { staffUserId, createdById: organizerId },
    });
  }
}

async function claimStaffForOrganizerIfAllowed(
  staffUserId: string,
  organizerId: string,
  staff: {
    staffCreatedById: string | null;
    staffRegistration: { createdById: string } | null;
  },
): Promise<void> {
  if (staff.staffRegistration && staff.staffRegistration.createdById !== organizerId) {
    throw new Error('STAFF_NOT_OWNED');
  }
  if (staff.staffCreatedById && staff.staffCreatedById !== organizerId) {
    throw new Error('STAFF_NOT_OWNED');
  }
  await registerStaffForOrganizer(staffUserId, organizerId);
}

export async function registerStaffForOrganizer(staffUserId: string, organizerId: string): Promise<void> {
  const existing = await prisma.staffRegistration.findUnique({
    where: { staffUserId },
    select: { createdById: true },
  });
  if (existing && existing.createdById !== organizerId) {
    throw new Error('STAFF_OWNED_BY_OTHER');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: staffUserId },
      data: { staffCreatedById: organizerId },
    }),
    prisma.staffRegistration.upsert({
      where: { staffUserId },
      create: { staffUserId, createdById: organizerId },
      update: { createdById: organizerId },
    }),
  ]);
}

export function isOrganizerRole(role: unknown): boolean {
  return normalizeAppUserRole(role) === 'organizer';
}

export function isAdminRole(role: unknown): boolean {
  return normalizeAppUserRole(role) === 'admin';
}

export type StaffScopeRole = AppUserRole;
