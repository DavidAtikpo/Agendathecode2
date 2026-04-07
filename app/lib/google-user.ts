import { prisma } from '@/app/lib/prisma';
import type { GoogleProfile } from '@/app/lib/google-oauth';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const email = profile.email.toLowerCase();

  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogle) return byGoogle;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw new Error('ACCOUNT_CONFLICT');
    }
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.sub },
    });
  }

  const count = await prisma.user.count();
  const name = profile.name?.trim() || email.split('@')[0] || 'Utilisateur';

  return prisma.user.create({
    data: {
      email,
      passwordHash: null,
      googleId: profile.sub,
      name,
      color: COLORS[count % COLORS.length],
      initials: makeInitials(name),
    },
  });
}
