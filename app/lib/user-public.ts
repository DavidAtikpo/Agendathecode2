import { normalizePreferences, type UserPreferences } from '@/app/lib/user-preferences';

/** Sous-ensemble User DB — évite d’importer des types depuis `@prisma/client` (résolution fragile en build Next). */
export type ToPublicUserInput = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: Date;
  /** Absent sur certains résultats Prisma inférés ; défaut : free */
  plan?: 'free' | 'pro';
  /** JSON Prisma ou objet déjà parsé */
  preferences?: unknown;
  /** Présent sur le modèle Prisma User — ne jamais renvoyer au client */
  passwordHash?: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: string;
  plan: 'free' | 'pro';
  preferences: UserPreferences;
  /** Indique si le compte peut se connecter par mot de passe (exclut OAuth-only). Renseigné seulement quand demandé. */
  hasPasswordLogin?: boolean;
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
    preferences: normalizePreferences(u.preferences ?? {}),
  };
  if (opts?.includePasswordLoginHint) {
    base.hasPasswordLogin = Boolean(u.passwordHash);
  }
  return base;
}
