import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [
    totalUsers,
    proUsers,
    adminUsers,
    totalNotes,
    totalTasks,
    totalCreditsInCirculation,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: 'pro' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.note.count(),
    prisma.task.count(),
    prisma.user.aggregate({ _sum: { aiCredits: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, plan: true },
    }),
  ]);

  // Tasks by status
  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    _count: true,
  });

  const statusCounts: Record<string, number> = {};
  for (const g of tasksByStatus) {
    statusCounts[g.status] = g._count;
  }

  return NextResponse.json({
    totalUsers,
    proUsers,
    adminUsers,
    totalNotes,
    totalTasks,
    totalCreditsInCirculation: totalCreditsInCirculation._sum.aiCredits ?? 0,
    tasksByStatus: statusCounts,
    recentUsers: recentUsers.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
