import { prisma } from '@/app/lib/prisma';
import type { GoogleProfile } from '@/app/lib/google-oauth';
import { initialsFromName, USER_AVATAR_COLORS } from '@/app/lib/user-display';

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
      color: USER_AVATAR_COLORS[count % USER_AVATAR_COLORS.length],
      initials: initialsFromName(name),
    },
  });
}
