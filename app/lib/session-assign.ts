import { prisma } from '@/app/lib/prisma';
import { SessionAssignmentRole } from '@prisma/client';
import { normalizeAppUserRole } from '@/app/lib/user-roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    assignmentRole === SessionAssignmentRole.formateur ? 'formateur' : 'assessor';

  const user = await prisma.user.findUnique({
    where: { email: raw },
    select: { id: true, role: true },
  });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const role = normalizeAppUserRole(user.role);
  if (role !== expectedRole && role !== 'admin') {
    throw new Error('ROLE_MISMATCH');
  }

  return user.id;
}

export function parseSessionRole(raw: unknown): SessionAssignmentRole | null {
  if (raw === 'formateur' || raw === 'assessor') return raw;
  return null;
}
