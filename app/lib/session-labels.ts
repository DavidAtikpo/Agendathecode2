import type {
  SessionAssignmentRole,
  SessionAssignmentStatus,
  SessionAssignmentView,
  TrainingSession,
} from '../types';

export const ROLE_LABEL: Record<SessionAssignmentRole, string> = {
  formateur: 'Formateur',
  assessor: 'Assessor',
};

export const STATUS_LABEL: Record<SessionAssignmentStatus, string> = {
  pending: 'En attente',
  accepted: 'Disponible',
  declined: 'Indisponible',
};

export function formatSessionDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function assignmentFor(
  session: TrainingSession,
  role: SessionAssignmentRole,
): SessionAssignmentView | undefined {
  return session.assignments.find(a => a.role === role);
}

export function sessionConfirmLabel(session: TrainingSession): string {
  const roles = session.assignments;
  if (roles.length === 0) return 'Sans intervenants';
  if (roles.some(a => a.status === 'declined')) return 'À réassigner';
  if (roles.every(a => a.status === 'accepted')) return 'Confirmée';
  if (roles.some(a => a.status === 'pending')) return 'En attente';
  return 'Partielle';
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
