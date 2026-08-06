import { prisma } from '@/app/lib/prisma';
import { SessionAssignmentRole } from '@prisma/client';
import { normalizeAppUserRole } from '@/app/lib/user-roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeStaffEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Compte trouvé mais rôle incompatible avec l’assignation (formateur / assessor / auditeur). */
export class RoleAssignmentMismatchError extends Error {
  readonly code = 'ROLE_MISMATCH' as const;

  constructor(
    readonly email: string,
    readonly expectedRole: string,
    readonly actualRole: string,
  ) {
    super('ROLE_MISMATCH');
  }
}

export async function resolveUserIdByEmail(email: unknown): Promise<string> {
  const raw = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!raw || !EMAIL_RE.test(raw)) {
    throw new Error('EMAIL_INVALID');
  }
  const user = await prisma.user.findUnique({ where: { email: raw }, select: { id: true } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return user.id;
}

/** Résout un email et vérifie que le compte a le rôle attendu (formateur / assessor). */
export async function resolveUserIdByEmailForAssignment(
  email: unknown,
  assignmentRole: SessionAssignmentRole,
): Promise<string> {
  const raw = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!raw || !EMAIL_RE.test(raw)) {
    throw new Error('EMAIL_INVALID');
  }

  const expectedRole =
    assignmentRole === SessionAssignmentRole.formateur
      ? 'formateur'
      : assignmentRole === SessionAssignmentRole.assessor
        ? 'assessor'
        : 'auditeur';

  const user = await prisma.user.findUnique({
    where: { email: raw },
    select: { id: true, role: true },
  });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const role = normalizeAppUserRole(user.role);
  if (role !== expectedRole && role !== 'admin') {
    throw new RoleAssignmentMismatchError(raw, expectedRole, role);
  }

  return user.id;
}

export function parseSessionRole(raw: unknown): SessionAssignmentRole | null {
  if (raw === 'formateur' || raw === 'assessor' || raw === 'auditeur') {
    return raw as SessionAssignmentRole;
  }
  return null;
}
