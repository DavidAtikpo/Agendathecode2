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
    organizerUsers,
    formateurUsers,
    assessorUsers,
    disabledUsers,
    totalNotes,
    totalTasks,
    totalSessions,
    totalGroups,
    totalCreditsInCirculation,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: 'pro' } }),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { role: 'organizer' } }),
    prisma.user.count({ where: { role: 'formateur' } }),
    prisma.user.count({ where: { role: 'assessor' } }),
    prisma.user.count({ where: { active: false } }),
    prisma.note.count(),
    prisma.task.count(),
    prisma.trainingSession.count(),
    prisma.group.count(),
    prisma.user.aggregate({ _sum: { aiCredits: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, plan: true, role: true },
    }),
  ]);

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
    organizerUsers,
    formateurUsers,
    assessorUsers,
    disabledUsers,
    totalNotes,
    totalTasks,
    totalSessions,
    totalGroups,
    totalCreditsInCirculation: totalCreditsInCirculation._sum.aiCredits ?? 0,
    tasksByStatus: statusCounts,
    recentUsers: recentUsers.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
