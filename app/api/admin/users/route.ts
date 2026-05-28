import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      role: true,
      active: true,
      aiCredits: true,
      aiCreditsExpiresAt: true,
      createdAt: true,
      googleId: true,
      _count: {
        select: {
          notes: true,
          tasksCreated: true,
        },
      },
    },
  });

  return NextResponse.json(
    users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      role: u.role,
      active: u.active,
      aiCredits: u.aiCredits,
      aiCreditsExpiresAt: u.aiCreditsExpiresAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      hasGoogle: !!u.googleId,
      notesCount: u._count.notes,
      tasksCount: u._count.tasksCreated,
    })),
  );
}
