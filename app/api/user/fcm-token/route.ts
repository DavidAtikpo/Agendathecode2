import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST /api/user/fcm-token
 * Body: { token: string, platform?: string }
 *
 * Upserts a device token for the authenticated user.
 * Uses the token itself as the unique key so reinstalling the app
 * doesn't create duplicates.
 */
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const platform: string = body?.platform ?? 'android';

  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform, updatedAt: new Date() },
    create: { token, userId, platform },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/user/fcm-token
 * Body: { token: string }
 *
 * Removes a device token (called on logout).
 */
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token: string | undefined = body?.token;
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  await prisma.deviceToken.deleteMany({ where: { token, userId } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
