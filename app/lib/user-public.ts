import type { User as PrismaUser } from '@prisma/client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  initials: string;
  createdAt: string;
  plan: 'free' | 'pro';
};

export function toPublicUser(u: PrismaUser): PublicUser {
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
