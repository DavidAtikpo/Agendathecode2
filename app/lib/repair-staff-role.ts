import type { Role } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { normalizeAppUserRole } from '@/app/lib/user-roles';

const STAFF_ROLES = new Set(['formateur', 'assessor', 'auditeur']);

/**
 * Si le compte a des assignations de session mais un rôle `user` (ou un mauvais rôle staff),
 * aligne le rôle compte sur le rôle d’assignation pour afficher « Mes propositions ».
 */
export async function repairStaffRoleFromAssignments(userId: string): Promise<Role | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return null;

  const current = normalizeAppUserRole(user.role);
  if (current === 'admin' || current === 'organizer') {
    return null;
  }

  const assignments = await prisma.sessionAssignment.findMany({
    where: { userId },
    select: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  if (assignments.length === 0) return null;

  const roles = [...new Set(assignments.map(a => a.role as string))].filter(r =>
    STAFF_ROLES.has(r),
  );
  if (roles.length === 0) return null;

  /** Priorité : rôle le plus récent si plusieurs */
  const desired = roles.includes(assignments[0].role) ? assignments[0].role : roles[0];

  if (current === desired) return null;

  /** Ne pas écraser un rôle staff différent s’il y a plusieurs rôles d’assignation conflictuels */
  if (STAFF_ROLES.has(current) && roles.length > 1 && !roles.includes(current)) {
    return null;
  }

  if (current === 'user' || (STAFF_ROLES.has(current) && roles.length === 1 && current !== desired)) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: desired as Role },
      select: { role: true },
    });
    return updated.role;
  }

  return null;
}
