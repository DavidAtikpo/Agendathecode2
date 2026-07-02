import { prisma } from '@/app/lib/prisma';
import { SessionAssignmentRole } from '@prisma/client';

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

export function parseSessionRole(raw: unknown): SessionAssignmentRole | null {
  if (raw === 'formateur' || raw === 'assessor') return raw;
  return null;
}
