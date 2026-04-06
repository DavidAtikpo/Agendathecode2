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
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: string;
  plan: 'free' | 'pro';
};

export function toPublicUser(u: ToPublicUserInput): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    color: u.color,
    initials: u.initials,
    createdAt: u.createdAt.toISOString(),
    plan: u.plan === 'pro' ? 'pro' : 'free',
  };
}
