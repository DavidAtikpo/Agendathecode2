import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { GROUP_WITH_MEMBERS_INCLUDE, serializeGroup } from '@/app/lib/group-serialize';

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** Retirer un membre du groupe, ou quitter le groupe (membre non créateur). */
export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id, userId } = await ctx.params;

  if (userId === sessionId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: sessionId } },
      include: { group: { select: { createdById: true } } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Vous n\'êtes pas membre de ce groupe.' }, { status: 404 });
    }
    if (membership.group.createdById === sessionId) {
      return NextResponse.json(
        { error: 'Le créateur ne peut pas quitter le groupe. Supprimez-le ou transférez-le.' },
        { status: 400 },
      );
    }
    await prisma.groupMember.deleteMany({
      where: { groupId: id, userId: sessionId },
    });
    return NextResponse.json({ ok: true });
  }

  const group = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!group) {
    return NextResponse.json({ error: 'Seul le créateur peut retirer des membres.' }, { status: 403 });
  }

  await prisma.groupMember.deleteMany({
    where: { groupId: id, userId },
  });

  const updated = await prisma.group.findUnique({
    where: { id },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });
  return NextResponse.json(serializeGroup(updated!));
}
