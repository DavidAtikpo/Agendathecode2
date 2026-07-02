import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { GROUP_WITH_MEMBERS_INCLUDE, serializeGroup } from '@/app/lib/group-serialize';

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** Retirer un membre du groupe (créateur uniquement, pas soi-même). */
export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id, userId } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!group) {
    return NextResponse.json({ error: 'Seul le créateur peut retirer des membres.' }, { status: 403 });
  }
  if (userId === sessionId) {
    return NextResponse.json({ error: 'Le créateur ne peut pas se retirer du groupe.' }, { status: 400 });
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
