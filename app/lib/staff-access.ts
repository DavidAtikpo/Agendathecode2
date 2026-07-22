import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { normalizeAppUserRole, type AppUserRole } from '@/app/lib/user-roles';

const STAFF_ROLES: Role[] = ['formateur', 'assessor', 'auditeur'];

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
    OR: [
      { staffCreatedById: userId },
      { staffRegistration: { is: { createdById: userId } } },
    ],
  };
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
  const owned =
    staff.staffCreatedById === organizerId ||
    staff.staffRegistration?.createdById === organizerId;
  if (!owned) {
    throw new Error('STAFF_NOT_OWNED');
  }
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
