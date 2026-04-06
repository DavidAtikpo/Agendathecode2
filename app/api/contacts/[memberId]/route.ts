import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';

type Ctx = { params: Promise<{ memberId: string }> };

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { memberId } = await ctx.params;

  await prisma.teamContact.deleteMany({
    where: { ownerId: sessionId, memberId },
  });

  return NextResponse.json({ ok: true });
}
