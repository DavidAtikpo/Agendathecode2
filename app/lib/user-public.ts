import { normalizePreferences, type UserPreferences } from '@/app/lib/user-preferences';

/** Sous-ensemble User DB — évite d'importer des types depuis `@prisma/client` (résolution fragile en build Next). */
export type ToPublicUserInput = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: Date;
  /** Absent sur certains résultats Prisma inférés ; défaut : free */
  plan?: 'free' | 'pro';
  role?: 'admin' | 'user';
  /** JSON Prisma ou objet déjà parsé */
  preferences?: unknown;
  /** Présent sur le modèle Prisma User — ne jamais renvoyer au client */
  passwordHash?: string | null;
  /** Crédits IA restants */
  aiCredits?: number;
  /** Date d'expiration des crédits */
  aiCreditsExpiresAt?: Date | null;
  /** ID client Stripe — présent uniquement si abonnement souscrit via Stripe */
  stripeCustomerId?: string | null;
  /** Notifications push non vues — badge de l'icône app mobile */
  unreadNotificationCount?: number;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: string;
  plan: 'free' | 'pro';
  role: 'admin' | 'user';
  preferences: UserPreferences;
  /** Indique si le compte peut se connecter par mot de passe (exclut OAuth-only). Renseigné seulement quand demandé. */
  hasPasswordLogin?: boolean;
  /** Crédits IA restants (null = compte invité) */
  aiCredits: number;
  /** ISO string ou null si pas de crédits achetés */
  aiCreditsExpiresAt: string | null;
  /** true si l'utilisateur a un abonnement Stripe actif (stripeCustomerId présent) */
  hasStripeSubscription: boolean;
  /** Notifications push non vues — pilote le badge de l'icône app mobile */
  unreadNotificationCount: number;
};

type ToPublicUserOptions = {
  /** Exposer si un mot de passe est défini (session / login / profil soi — pas pour les contacts). */
  includePasswordLoginHint?: boolean;
};

export function toPublicUser(u: ToPublicUserInput, opts?: ToPublicUserOptions): PublicUser {
  const base: PublicUser = {
    id: u.id,
    email: u.email,
    name: u.name,
    color: u.color,
    initials: u.initials,
    createdAt: u.createdAt.toISOString(),
    plan: u.plan === 'pro' ? 'pro' : 'free',
    role: u.role === 'admin' ? 'admin' : 'user',
    preferences: normalizePreferences(u.preferences ?? {}),
    aiCredits: u.aiCredits ?? 0,
    aiCreditsExpiresAt: u.aiCreditsExpiresAt ? u.aiCreditsExpiresAt.toISOString() : null,
    hasStripeSubscription: Boolean(u.stripeCustomerId),
    unreadNotificationCount: u.unreadNotificationCount ?? 0,
  };
  if (opts?.includePasswordLoginHint) {
    base.hasPasswordLogin = Boolean(u.passwordHash);
  }
  return base;
}
