import { prisma } from '@/app/lib/prisma';

/**
 * Vérifie que l’assignation est autorisée (max 2 personnes) :
 * soi-même et/ou un collaborateur ajouté par email.
 */
export async function resolveAssignees(
  ownerId: string,
  assignedTo: unknown
): Promise<string[]> {
  if (assignedTo === undefined || assignedTo === null || assignedTo === '') {
    return [];
  }

  const raw = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  const ids = Array.from(
    new Set(
      raw
        .map(v => (typeof v === 'string' ? v : String(v)))
        .map(v => v.trim())
        .filter(Boolean)
    )
  );

  if (ids.length > 2) {
    throw new Error('ASSIGN_TOO_MANY');
  }

  for (const id of ids) {
    if (id === ownerId) continue;
    const link = await prisma.teamContact.findUnique({
      where: { ownerId_memberId: { ownerId, memberId: id } },
    });
    if (!link) {
      throw new Error('ASSIGN_FORBIDDEN');
    }
  }

  return ids;
}
