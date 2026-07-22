import { messages, t } from './i18n';
import type { AppLocale } from './i18n/types';
import type {
  SessionAssignmentRole,
  SessionAssignmentStatus,
  SessionAssignmentView,
  TrainingSession,
} from '../types';

const msg = messages as unknown as Parameters<typeof t>[0];

export function sessionRoleLabel(role: SessionAssignmentRole, locale: AppLocale): string {
  return t(msg, locale, `sessions.roles.${role}`);
}

export function sessionStatusLabel(status: SessionAssignmentStatus, locale: AppLocale): string {
  return t(msg, locale, `sessions.status.${status}`);
}

export function formatSessionDate(iso: string, locale: AppLocale) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function assignmentsForRole(
  session: TrainingSession,
  role: SessionAssignmentRole,
): SessionAssignmentView[] {
  return session.assignments.filter(a => a.role === role);
}

export function assignmentFor(
  session: TrainingSession,
  role: SessionAssignmentRole,
): SessionAssignmentView | undefined {
  return session.assignments.find(a => a.role === role);
}

export function sessionConfirmLabel(session: TrainingSession, locale: AppLocale): string {
  const roles = session.assignments;
  if (roles.length === 0) return t(msg, locale, 'sessions.confirm.noAssignees');
  if (roles.some(a => a.status === 'declined')) return t(msg, locale, 'sessions.confirm.reassign');
  if (roles.every(a => a.status === 'accepted')) return t(msg, locale, 'sessions.confirm.confirmed');
  if (roles.some(a => a.status === 'pending')) return t(msg, locale, 'sessions.confirm.pending');
  return t(msg, locale, 'sessions.confirm.partial');
}

export type OrganizerStatusFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'confirmed';

export function matchesOrganizerFilter(session: TrainingSession, filter: OrganizerStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'confirmed') {
    return session.assignments.length > 0 && session.assignments.every(a => a.status === 'accepted');
  }
  if (filter === 'pending') return session.assignments.some(a => a.status === 'pending');
  if (filter === 'accepted') return session.assignments.some(a => a.status === 'accepted');
  if (filter === 'declined') return session.assignments.some(a => a.status === 'declined');
  return true;
}

export type AssigneeStatusFilter = 'all' | 'pending' | 'accepted' | 'declined';

export function myAssignment(session: TrainingSession, userId: string) {
  return session.assignments.find(a => a.user.id === userId);
}

export function matchesAssigneeFilter(
  session: TrainingSession,
  userId: string,
  filter: AssigneeStatusFilter,
): boolean {
  const mine = myAssignment(session, userId);
  if (!mine) return false;
  if (filter === 'all') return true;
  return mine.status === filter;
}

export function statusBadgeClass(status: SessionAssignmentStatus): string {
  if (status === 'accepted') return 'bg-emerald-500/20 text-emerald-300';
  if (status === 'declined') return 'bg-rose-500/20 text-rose-300';
  return 'bg-amber-500/20 text-amber-200';
}
