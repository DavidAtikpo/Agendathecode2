import { randomBytes } from 'crypto';
import type { Role } from '@prisma/client';
import { WebirataRole } from '@prisma/catalog-client';
import { catalogPrisma } from '@/app/lib/catalog-prisma';
import { prisma } from '@/app/lib/prisma';
import { initialsFromName, USER_AVATAR_COLORS } from '@/app/lib/user-display';
import { isTrainingStaffRole, type AppUserRole } from '@/app/lib/user-roles';
import type { StaffRole } from '@/app/lib/staff-create';

/** Rôles webirata importés comme intervenants Neurix (configurable via env, séparés par des virgules). */
function parseWebirataRoleList(envKey: string, fallback: WebirataRole[]): WebirataRole[] {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const out: WebirataRole[] = [];
  for (const part of raw.split(',')) {
    const key = part.trim().toUpperCase() as WebirataRole;
    if (Object.values(WebirataRole).includes(key)) out.push(key);
  }
  return out.length > 0 ? out : fallback;
}

/**
 * Mapping Neurix ↔ webirata.Role (enum réel : USER, ADMIN, GESTIONNAIRE, CONTRIBUTOR, CLIENT, FORMATEUR, ENTREPRISE).
 * Par défaut : FORMATEUR ↔ formateur ; assessor / auditeur créés aussi en FORMATEUR sur a-finpart
 * (surcharge possible via WEBIRATA_ROLES_*).
 */
export function webirataRolesForNeurixStaff(): WebirataRole[] {
  const formateur = parseWebirataRoleList('WEBIRATA_ROLES_FORMATEUR', [WebirataRole.FORMATEUR]);
  const assessor = parseWebirataRoleList('WEBIRATA_ROLES_ASSESSOR', []);
  const auditeur = parseWebirataRoleList('WEBIRATA_ROLES_AUDITEUR', []);
  return [...new Set([...formateur, ...assessor, ...auditeur])];
}

export function mapWebirataRoleToNeurix(role: WebirataRole): StaffRole | null {
  const formateur = parseWebirataRoleList('WEBIRATA_ROLES_FORMATEUR', [WebirataRole.FORMATEUR]);
  const assessor = parseWebirataRoleList('WEBIRATA_ROLES_ASSESSOR', []);
  const auditeur = parseWebirataRoleList('WEBIRATA_ROLES_AUDITEUR', []);
  if (formateur.includes(role)) return 'formateur';
  if (assessor.includes(role)) return 'assessor';
  if (auditeur.includes(role)) return 'auditeur';
  return null;
}

export function mapNeurixRoleToWebirata(role: AppUserRole): WebirataRole | null {
  if (role === 'formateur') {
    return parseWebirataRoleList('WEBIRATA_ROLES_FORMATEUR', [WebirataRole.FORMATEUR])[0] ?? null;
  }
  if (role === 'assessor') {
    return (
      parseWebirataRoleList('WEBIRATA_ROLES_ASSESSOR', [WebirataRole.FORMATEUR])[0] ?? null
    );
  }
  if (role === 'auditeur') {
    return (
      parseWebirataRoleList('WEBIRATA_ROLES_AUDITEUR', [WebirataRole.FORMATEUR])[0] ?? null
    );
  }
  return null;
}

function buildDisplayName(prenom: string | null | undefined, nom: string | null | undefined, email: string): string {
  const full = [prenom, nom].filter(Boolean).join(' ').trim();
  return full || email;
}

function splitDisplayName(name: string): { prenom: string; nom: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenom: 'Intervenant', nom: 'Neurix' };
  if (parts.length === 1) return { prenom: parts[0], nom: parts[0] };
  return { prenom: parts.slice(0, -1).join(' '), nom: parts[parts.length - 1] };
}

function newWebirataUserId(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(8).toString('hex');
  return `c${time}${rand}`.slice(0, 25);
}

export type WebirataStaffRow = {
  id: string;
  email: string;
  name: string;
  neurixRole: StaffRole;
  webirataRole: WebirataRole;
  isActive: boolean;
};

/** Liste les intervenants (formateur / assessor / auditeur) depuis webirata.User. */
export async function listWebirataStaffUsers(): Promise<WebirataStaffRow[]> {
  const roles = webirataRolesForNeurixStaff();
  const rows = await catalogPrisma.webirataUser.findMany({
    where: { role: { in: roles }, isActive: true },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      isActive: true,
    },
  });

  const out: WebirataStaffRow[] = [];
  for (const row of rows) {
    const neurixRole = mapWebirataRoleToNeurix(row.role);
    if (!neurixRole) continue;
    out.push({
      id: row.id,
      email: row.email.trim().toLowerCase(),
      name: buildDisplayName(row.prenom, row.nom, row.email),
      neurixRole,
      webirataRole: row.role,
      isActive: row.isActive,
    });
  }
  return out;
}

/**
 * Importe ou met à jour un compte Neurix miroir depuis webirata (mot de passe copié).
 * Permet à l’organisateur d’assigner des intervenants déjà présents sur a-finpart.
 */
export async function importWebirataStaffToNeurix(
  webirataUserId: string,
  organizerId: string,
): Promise<{ id: string; email: string; name: string; role: Role } | null> {
  const source = await catalogPrisma.webirataUser.findUnique({
    where: { id: webirataUserId },
    select: {
      id: true,
      email: true,
      password: true,
      nom: true,
      prenom: true,
      role: true,
      isActive: true,
    },
  });
  if (!source || !source.isActive) return null;

  const neurixRole = mapWebirataRoleToNeurix(source.role);
  if (!neurixRole) return null;

  const email = source.email.trim().toLowerCase();
  const name = buildDisplayName(source.prenom, source.nom, email);
  const prismaRole = neurixRole as Role;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        initials: initialsFromName(name),
        webirataUserId: source.id,
        webirataSyncedAt: new Date(),
        ...(existing.role === 'user' ? { role: prismaRole, passwordHash: source.password } : {}),
      },
      select: { id: true, email: true, name: true, role: true },
    });
    await registerImportedStaff(updated.id, organizerId);
    return updated;
  }

  const count = await prisma.user.count();
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: source.password,
      name,
      color: USER_AVATAR_COLORS[count % USER_AVATAR_COLORS.length],
      initials: initialsFromName(name),
      role: prismaRole,
      aiCredits: 0,
      staffCreatedById: organizerId,
      webirataUserId: source.id,
      webirataSyncedAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  });
  await registerImportedStaff(created.id, organizerId);
  return created;
}

async function registerImportedStaff(staffUserId: string, organizerId: string): Promise<void> {
  const reg = await prisma.staffRegistration.findUnique({ where: { staffUserId } });
  if (!reg) {
    await prisma.staffRegistration.create({
      data: { staffUserId, createdById: organizerId },
    });
  }
}

/** Importe tous les intervenants webirata visibles pour un organisateur. */
export async function syncAllWebirataStaffForOrganizer(organizerId: string): Promise<number> {
  const rows = await listWebirataStaffUsers();
  let n = 0;
  for (const row of rows) {
    const imported = await importWebirataStaffToNeurix(row.id, organizerId);
    if (imported) n += 1;
  }
  return n;
}

/**
 * Crée le compte sur webirata après mot de passe défini + au moins une session acceptée.
 * Idempotent : met à jour le mot de passe si le compte existe déjà (même e-mail).
 */
export async function provisionWebirataStaffAccountIfReady(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      webirataUserId: true,
    },
  });
  if (!user || !isTrainingStaffRole(user.role) || !user.passwordHash) {
    return false;
  }

  const accepted = await prisma.sessionAssignment.findFirst({
    where: { userId, status: 'accepted' },
    select: { id: true },
  });
  if (!accepted) return false;

  const webirataRole = mapNeurixRoleToWebirata(user.role as AppUserRole);
  if (!webirataRole) return false;

  const email = user.email.trim().toLowerCase();
  const { prenom, nom } = splitDisplayName(user.name);
  const now = new Date();

  if (user.webirataUserId) {
    await catalogPrisma.webirataUser.update({
      where: { id: user.webirataUserId },
      data: {
        password: user.passwordHash,
        prenom,
        nom,
        role: webirataRole,
        isActive: true,
        updatedAt: now,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { webirataSyncedAt: now },
    });
    return true;
  }

  const byEmail = await catalogPrisma.webirataUser.findUnique({
    where: { email },
    select: { id: true },
  });

  if (byEmail) {
    await catalogPrisma.webirataUser.update({
      where: { id: byEmail.id },
      data: {
        password: user.passwordHash,
        prenom,
        nom,
        role: webirataRole,
        isActive: true,
        updatedAt: now,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { webirataUserId: byEmail.id, webirataSyncedAt: now },
    });
    return true;
  }

  const newId = newWebirataUserId();
  await catalogPrisma.webirataUser.create({
    data: {
      id: newId,
      email,
      password: user.passwordHash,
      prenom,
      nom,
      role: webirataRole,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { webirataUserId: newId, webirataSyncedAt: now },
  });
  return true;
}
