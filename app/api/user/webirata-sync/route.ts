import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { isTrainingStaffRole } from '@/app/lib/user-roles';
import { toPublicUser } from '@/app/lib/user-public';
import { provisionWebirataStaffAccountIfReady } from '@/app/lib/webirata-staff';
import { getWebirataPortalUrl } from '@/app/lib/webirata-portal';

export const runtime = 'nodejs';

/** Force la création / sync du compte a-finpart pour l’intervenant connecté. */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isTrainingStaffRole(user.role)) {
    return NextResponse.json(
      { error: 'Réservé aux formateurs, assessors et auditeurs.' },
      { status: 403 },
    );
  }

  let provisioned = false;
  let provisionError: string | null = null;
  try {
    provisioned = await provisionWebirataStaffAccountIfReady(userId);
  } catch (e: unknown) {
    provisionError = e instanceof Error ? e.message : String(e);
    console.error('[user/webirata-sync]', e);
  }

  const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const publicUser = toPublicUser(refreshed, { includePasswordLoginHint: true });

  return NextResponse.json({
    ok: true,
    provisioned: provisioned || Boolean(refreshed.webirataUserId),
    portalUrl: getWebirataPortalUrl(),
    user: publicUser,
    error: provisionError,
    needsAccept:
      !refreshed.webirataUserId &&
      !(await prisma.sessionAssignment.findFirst({
        where: { userId, status: 'accepted' },
        select: { id: true },
      })),
  });
}
