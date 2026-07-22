import { prisma } from '@/app/lib/prisma';
import { SessionAssignmentRole, SessionAssignmentStatus } from '@prisma/client';
import { resolveUserIdByEmailForAssignment } from '@/app/lib/session-assign';
import { assertOrganizerOwnsStaffUser } from '@/app/lib/staff-access';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RoleEmailPayload = {
  formateurEmails?: unknown;
  assessorEmails?: unknown;
  auditeurEmails?: unknown;
  formateurEmail?: unknown;
  assessorEmail?: unknown;
};

/** Lit une liste d'e-mails depuis le body (tableau ou champ legacy unique). */
export function parseEmailList(raw: unknown, legacySingle?: unknown): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (typeof v !== 'string') return;
    const e = v.trim().toLowerCase();
    if (e && EMAIL_RE.test(e) && !out.includes(e)) out.push(e);
  };
  if (Array.isArray(raw)) {
    for (const item of raw) add(item);
  } else if (typeof raw === 'string' && raw.trim()) {
    for (const part of raw.split(/[,;]/)) add(part);
  }
  if (legacySingle !== undefined && (raw === undefined || (Array.isArray(raw) && raw.length === 0))) {
    add(legacySingle);
  }
  return out;
}

export function parseRoleEmailMap(body: RoleEmailPayload): {
  formateur: string[] | undefined;
  assessor: string[] | undefined;
  auditeur: string[] | undefined;
} {
  const hasFormateur =
    body.formateurEmails !== undefined || body.formateurEmail !== undefined;
  const hasAssessor =
    body.assessorEmails !== undefined || body.assessorEmail !== undefined;
  const hasAuditeur = body.auditeurEmails !== undefined;

  return {
    formateur: hasFormateur
      ? parseEmailList(body.formateurEmails, body.formateurEmail)
      : undefined,
    assessor: hasAssessor
      ? parseEmailList(body.assessorEmails, body.assessorEmail)
      : undefined,
    auditeur: hasAuditeur ? parseEmailList(body.auditeurEmails) : undefined,
  };
}

export async function resolveStaffEmailsForRole(
  emails: string[],
  role: SessionAssignmentRole,
  organizerId: string,
  organizerRole: unknown,
): Promise<string[]> {
  const userIds: string[] = [];
  for (const email of emails) {
    const userId = await resolveUserIdByEmailForAssignment(email, role);
    if (userId === organizerId) {
      throw new Error('SELF_ASSIGN');
    }
    if (userIds.includes(userId)) continue;
    await assertOrganizerOwnsStaffUser(organizerId, userId, organizerRole);
    userIds.push(userId);
  }
  return userIds;
}

export type ResolvedSessionAssignments = {
  userId: string;
  role: SessionAssignmentRole;
}[];

/** Résout tous les rôles présents dans le payload. */
export async function resolveAllSessionAssignments(
  roleEmails: ReturnType<typeof parseRoleEmailMap>,
  organizerId: string,
  organizerRole: unknown,
): Promise<ResolvedSessionAssignments> {
  const entries: ResolvedSessionAssignments = [];
  const seenUser = new Set<string>();

  const roles: { role: SessionAssignmentRole; emails: string[] | undefined }[] = [
    { role: SessionAssignmentRole.formateur, emails: roleEmails.formateur },
    { role: SessionAssignmentRole.assessor, emails: roleEmails.assessor },
    { role: SessionAssignmentRole.auditeur, emails: roleEmails.auditeur },
  ];

  for (const { role, emails } of roles) {
    if (emails === undefined) continue;
    const userIds = await resolveStaffEmailsForRole(emails, role, organizerId, organizerRole);
    for (const userId of userIds) {
      if (seenUser.has(userId)) {
        throw new Error('DUPLICATE_USER');
      }
      seenUser.add(userId);
      entries.push({ userId, role });
    }
  }

  return entries;
}

/** Met à jour les assignations d'une session (remplace par rôle si fourni). */
export async function syncSessionAssignments(
  sessionId: string,
  roleEmails: ReturnType<typeof parseRoleEmailMap>,
  organizerId: string,
  organizerRole: unknown,
  options: {
    datesChanged: boolean;
    priorAssignments: { id: string; userId: string; role: SessionAssignmentRole; status: SessionAssignmentStatus }[];
    notify: (userId: string, role: SessionAssignmentRole, isNew: boolean) => Promise<void>;
  },
): Promise<void> {
  const toApply: ResolvedSessionAssignments = [];

  for (const role of [
    SessionAssignmentRole.formateur,
    SessionAssignmentRole.assessor,
    SessionAssignmentRole.auditeur,
  ] as const) {
    const key =
      role === SessionAssignmentRole.formateur
        ? roleEmails.formateur
        : role === SessionAssignmentRole.assessor
          ? roleEmails.assessor
          : roleEmails.auditeur;
    if (key === undefined) continue;
    const userIds = await resolveStaffEmailsForRole(key, role, organizerId, organizerRole);
    for (const userId of userIds) {
      if (toApply.some(e => e.userId === userId)) throw new Error('DUPLICATE_USER');
      toApply.push({ userId, role });
    }
  }

  const rolesTouched = new Set<SessionAssignmentRole>();
  if (roleEmails.formateur !== undefined) rolesTouched.add(SessionAssignmentRole.formateur);
  if (roleEmails.assessor !== undefined) rolesTouched.add(SessionAssignmentRole.assessor);
  if (roleEmails.auditeur !== undefined) rolesTouched.add(SessionAssignmentRole.auditeur);

  for (const role of rolesTouched) {
    const desired = toApply.filter(a => a.role === role).map(a => a.userId);
    const existingForRole = options.priorAssignments.filter(a => a.role === role);
    const toRemove = existingForRole.filter(a => !desired.includes(a.userId));
    if (toRemove.length > 0) {
      await prisma.sessionAssignment.deleteMany({
        where: { id: { in: toRemove.map(a => a.id) } },
      });
    }
  }

  for (const { userId, role } of toApply) {
    const prev = options.priorAssignments.find(a => a.userId === userId && a.role === role);
    const isNew = !prev;
    const resetStatus =
      options.datesChanged ||
      isNew ||
      prev?.status === SessionAssignmentStatus.declined;

    if (prev) {
      if (resetStatus) {
        await prisma.sessionAssignment.update({
          where: { id: prev.id },
          data: {
            status: SessionAssignmentStatus.pending,
            respondedAt: null,
            acceptedOption: null,
          },
        });
        await options.notify(userId, role, false);
      }
    } else {
      const conflict = await prisma.sessionAssignment.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (conflict) {
        await prisma.sessionAssignment.update({
          where: { id: conflict.id },
          data: {
            role,
            status: SessionAssignmentStatus.pending,
            respondedAt: null,
            acceptedOption: null,
          },
        });
      } else {
        await prisma.sessionAssignment.create({
          data: {
            sessionId,
            userId,
            role,
            status: SessionAssignmentStatus.pending,
          },
        });
      }
      await options.notify(userId, role, true);
    }
  }
}
