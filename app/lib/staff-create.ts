import { randomBytes } from 'crypto';
import type { Role } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { hashPassword } from '@/app/lib/auth';
import { initialsFromName, USER_AVATAR_COLORS } from '@/app/lib/user-display';
import { sendPasswordResetEmail } from '@/app/lib/email';
import { getPublicSiteBaseUrl } from '@/app/lib/site-base-url';
import {
  generatePasswordResetToken,
  PASSWORD_RESET_TTL_MS,
} from '@/app/lib/password-reset';
import { normalizeAppUserRole } from '@/app/lib/user-roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type StaffRole = 'formateur' | 'assessor' | 'auditeur';

const STAFF_ROLES: StaffRole[] = ['formateur', 'assessor', 'auditeur'];

export function isStaffRole(raw: unknown): raw is StaffRole {
  return typeof raw === 'string' && STAFF_ROLES.includes(raw as StaffRole);
}

export function staffRoleToPrisma(role: StaffRole): Role {
  return role;
}

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  /** Envoyer un e-mail d'invitation (lien pour définir le mot de passe). */
  sendInvite?: boolean;
  /** Organisateur ou admin à l'origine de la création (confidentialité multi-organisateurs). */
  createdByOrganizerId?: string;
};

export type CreateStaffResult = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  created: boolean;
  inviteEmailSent: boolean;
};

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Crée ou met à jour un compte formateur / assessor / auditeur. */
export async function createStaffAccount(input: CreateStaffInput): Promise<CreateStaffResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const role = input.role;

  if (!firstName || !lastName) {
    throw new Error('NAME_REQUIRED');
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error('EMAIL_INVALID');
  }

  const name = buildFullName(firstName, lastName);
  const prismaRole = staffRoleToPrisma(role);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });

  if (existing) {
    const existingRole = normalizeAppUserRole(existing.role);
    if (
      existingRole !== role &&
      existingRole !== 'admin' &&
      existingRole !== 'organizer'
    ) {
      throw new Error('ROLE_CONFLICT');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        initials: initialsFromName(name),
        role: prismaRole,
        ...(input.createdByOrganizerId
          ? { staffCreatedById: input.createdByOrganizerId }
          : {}),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const inviteEmailSent = input.sendInvite
      ? await sendStaffInviteEmail(updated.id, updated.email, updated.name)
      : false;

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role,
      created: false,
      inviteEmailSent,
    };
  }

  const count = await prisma.user.count();
  const tempPass = randomBytes(24).toString('base64url');
  const passwordHash = await hashPassword(tempPass);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      color: USER_AVATAR_COLORS[count % USER_AVATAR_COLORS.length],
      initials: initialsFromName(name),
      role: prismaRole,
      aiCredits: 0,
      staffCreatedById: input.createdByOrganizerId ?? null,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const inviteEmailSent = input.sendInvite
    ? await sendStaffInviteEmail(user.id, user.email, user.name)
    : false;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    created: true,
    inviteEmailSent,
  };
}

async function sendStaffInviteEmail(userId: string, email: string, name: string): Promise<boolean> {
  const { raw, hash } = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hash, expiresAt },
    }),
  ]);

  const resetUrl = `${getPublicSiteBaseUrl()}/reset-password?token=${raw}`;
  const sent = await sendPasswordResetEmail(email, {
    name,
    resetUrl,
    locale: 'fr',
  });

  return sent.ok;
}
