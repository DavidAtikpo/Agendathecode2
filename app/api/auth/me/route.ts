import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';
import { isTrainingStaffRole } from '@/app/lib/user-roles';
import { provisionWebirataStaffAccountIfReady } from '@/app/lib/webirata-staff';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  /** Rattrapage : déjà accepté une session avant la sync a-finpart */
  if (isTrainingStaffRole(user.role) && !user.webirataUserId) {
    try {
      const ok = await provisionWebirataStaffAccountIfReady(userId);
      if (ok) {
        user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      }
    } catch (e: unknown) {
      console.error('[auth/me] provision webirata', e);
    }
  }

  return NextResponse.json(toPublicUser(user, { includePasswordLoginHint: true }));
}
