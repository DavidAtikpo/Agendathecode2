import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin';
import { ADMIN_USER_SELECT, serializeAdminUser } from '@/app/lib/admin-user-serialize';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: ADMIN_USER_SELECT,
  });

  return NextResponse.json(users.map(serializeAdminUser));
}
