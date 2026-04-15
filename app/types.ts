import type { UserPreferences } from './lib/user-preferences';

export interface User {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  /** Abonnement Stripe — défaut free si absent (anciennes sessions) */
  plan?: 'free' | 'pro';
  /** Présent après login/register — utile clients mobiles (Bearer), ignoré par le web */
  token?: string;
  /** Préférences persistantes (API `/api/user/preferences`) — défaut côté client si absent */
  preferences?: UserPreferences;
  /** Présent après `/api/auth/me` ou login : compte avec mot de passe (pas Google-only). */
  hasPasswordLogin?: boolean;
}

export type TaskStatus = 'todo' | 'urgent' | 'doing' | 'done' | 'review';
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
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string | null;
  createdBy: string;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  /** ISO — présent quand la tâche a été assignée (badge pour l’assigné). */
  assigneeNotifiedAt?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
