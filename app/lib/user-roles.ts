import { rolesMessages } from './i18n/messages/roles';
import { messages, t } from './i18n';
import type { AppLocale } from './i18n/types';

/** Rôles compte utilisateur (Prisma `Role`). */
export type AppUserRole =
  | 'user'
  | 'admin'
  | 'organizer'
  | 'formateur'
  | 'assessor'
  | 'auditeur';

const TRAINING_STAFF: AppUserRole[] = ['formateur', 'assessor', 'auditeur'];

export function normalizeAppUserRole(raw: unknown): AppUserRole {
  if (
    raw === 'admin' ||
    raw === 'organizer' ||
    raw === 'formateur' ||
    raw === 'assessor' ||
    raw === 'auditeur'
  ) {
    return raw;
  }
  return 'user';
}

/** Formateur / assessor — pas d’accès aux groupes. */
export function isTrainingStaffRole(role: unknown): boolean {
  const r = normalizeAppUserRole(role);
  return TRAINING_STAFF.includes(r);
}

export function canAccessGroups(role: unknown): boolean {
  const r = normalizeAppUserRole(role);
  if (TRAINING_STAFF.includes(r)) return false;
  if (r === 'organizer') return false;
  return true;
}

/** Création et gestion des sessions formation (remplace le forfait Pro). */
export function canManageTrainingSessions(role: unknown): boolean {
  const r = normalizeAppUserRole(role);
  return r === 'organizer' || r === 'admin';
}

/** Vue « Mes propositions » (réponses formateur / assessor). */
export function canViewSessionProposals(role: unknown): boolean {
  const r = normalizeAppUserRole(role);
  return r === 'formateur' || r === 'assessor' || r === 'admin';
}

const i18nMessages = messages as unknown as Parameters<typeof t>[0];

export function sessionOrganizerRequiredMessage(locale: AppLocale = 'fr') {
  return t(i18nMessages, locale, 'sessions.errors.organizerRequired');
}

export function sessionRoleMismatchMessage(
  assignmentRole: 'formateur' | 'assessor',
  locale: AppLocale = 'fr',
) {
  const role = t(i18nMessages, locale, `sessions.roles.${assignmentRole}`);
  return t(i18nMessages, locale, 'sessions.errors.roleMismatch', { role });
}

export function groupsForbiddenForRoleMessage(locale: AppLocale = 'fr') {
  return t(i18nMessages, locale, 'roles.errors.groupsForbidden');
}

export function getRoleLabels(locale: AppLocale): Record<AppUserRole, string> {
  return rolesMessages[locale].labels;
}

export function getRoleDescriptions(locale: AppLocale): Record<AppUserRole, string> {
  return rolesMessages[locale].descriptions;
}

export const ROLE_BADGE_COLORS: Record<AppUserRole, string> = {
  user: 'bg-slate-600/50 text-slate-300',
  admin: 'bg-violet-500/20 text-violet-300',
  organizer: 'bg-teal-500/20 text-teal-300',
  formateur: 'bg-indigo-500/20 text-indigo-300',
  assessor: 'bg-sky-500/20 text-sky-300',
  auditeur: 'bg-amber-500/20 text-amber-300',
};
