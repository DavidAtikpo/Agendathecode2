import { prisma } from '@/app/lib/prisma';

/**
 * Vérifie que l’assignation est autorisée : soit à soi-même, soit à un collaborateur ajouté par email.
 */
export async function resolveAssignee(
  ownerId: string,
  assignedTo: unknown
): Promise<string | null> {
  if (assignedTo === undefined || assignedTo === null || assignedTo === '') {
    return null;
  }
  const id = typeof assignedTo === 'string' ? assignedTo : String(assignedTo);
  if (id === ownerId) return id;

  const link = await prisma.teamContact.findUnique({
    where: { ownerId_memberId: { ownerId, memberId: id } },
  });
  if (!link) {
    throw new Error('ASSIGN_FORBIDDEN');
  }
  return id;
}
