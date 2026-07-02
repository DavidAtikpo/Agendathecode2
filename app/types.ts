import type { UserPreferences } from './lib/user-preferences';

export interface User {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  /** Abonnement Stripe — défaut free si absent (anciennes sessions) */
  plan?: 'free' | 'pro';
  /** Rôle : admin ou user */
  role?: 'admin' | 'user';
  /** Présent après login/register — utile clients mobiles (Bearer), ignoré par le web */
  token?: string;
  /** Préférences persistantes (API `/api/user/preferences`) — défaut côté client si absent */
  preferences?: UserPreferences;
  /** Présent après `/api/auth/me` ou login : compte avec mot de passe (pas Google-only). */
  hasPasswordLogin?: boolean;
  /** Crédits IA restants (1 = 1 message Claude) */
  aiCredits?: number;
  /** ISO string d'expiration, ou null */
  aiCreditsExpiresAt?: string | null;
}

export type TaskStatus = 'todo' | 'urgent' | 'doing' | 'testing' | 'done' | 'review';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  /** ISO 8601 — rappel planifié (optionnel) */
  remindAt?: string | null;
  /** Envoyer un e-mail à l’heure du rappel (compte connecté + cron serveur) */
  reminderByEmail?: boolean;
  /** Horodatage d’envoi e-mail réussi */
  reminderEmailSentAt?: string | null;
  /** Propriétaire (créateur) — pour notes partagées avec vous. */
  ownerId?: string | null;
  ownerName?: string | null;
  ownerInitials?: string | null;
  ownerColor?: string | null;
  /** Collaborateurs avec accès lecture (seul le propriétaire modifie). */
  sharedWith?: string[];
  /** Photos / documents joints (Cloudinary). */
  assets?: NoteAsset[];
}

export interface NoteAsset {
  id: string;
  mediaType: string;
  originalName: string;
  bytes?: number | null;
  url: string;
  createdAt: string;
  uploaderId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string[];
  createdBy: string;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  /** Groupe partagé — visible par tous les membres. */
  groupId?: string;
  group?: { id: string; name: string; logoUrl: string | null };
  /** ISO — présent quand la tâche a été assignée (badge pour l’assigné). */
  assigneeNotifiedAt?: string | null;
  assets?: TaskAsset[];
}

export interface Group {
  id: string;
  name: string;
  logoUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: User[];
  memberCount: number;
}

export type SessionAssignmentRole = 'formateur' | 'assessor';
export type SessionAssignmentStatus = 'pending' | 'accepted' | 'declined';

export interface SessionAssignmentView {
  id: string;
  role: SessionAssignmentRole;
  status: SessionAssignmentStatus;
  respondedAt: string | null;
  user: Pick<User, 'id' | 'email' | 'name' | 'color' | 'initials'>;
}

export interface TrainingSession {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  examDate: string | null;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  assignments: SessionAssignmentView[];
}

export interface TaskAsset {
  id: string;
  kind: 'input' | 'output';
  mediaType: string;
  originalName: string;
  bytes?: number | null;
  url: string;
  createdAt: string;
  uploaderId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
