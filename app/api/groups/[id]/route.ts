import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { groupsVisibleToUser } from '@/app/lib/group-access';
import { assertGroupMembersAllowed } from '@/app/lib/group-assign';
import { GROUP_WITH_MEMBERS_INCLUDE, serializeGroup } from '@/app/lib/group-serialize';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id, ...groupsVisibleToUser(sessionId) },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });
  if (!group) {
    return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 });
  }

  return NextResponse.json(serializeGroup(group));
}

export async function PATCH(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Seul le créateur du groupe peut le modifier.' }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: 'Nom du groupe invalide' }, { status: 400 });
  }

  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
    },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });

  return NextResponse.json(serializeGroup(group));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Seul le créateur du groupe peut le supprimer.' }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** Ajouter un membre (créateur uniquement). Body: { userId } */
export async function POST(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!group) {
    return NextResponse.json({ error: 'Seul le créateur du groupe peut ajouter des membres.' }, { status: 403 });
  }

  const body = await request.json();
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  }
  if (userId === sessionId) {
    return NextResponse.json({ error: 'Vous êtes déjà dans le groupe' }, { status: 400 });
  }

  try {
    await assertGroupMembersAllowed(sessionId, [userId]);
  } catch {
    return NextResponse.json(
      { error: 'Ce collaborateur doit d’abord être ajouté par email.' },
      { status: 403 }
    );
  }

  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  });
  if (already) {
    return NextResponse.json({ error: 'Membre déjà présent' }, { status: 400 });
  }

  await prisma.groupMember.create({
    data: { groupId: id, userId },
  });

  const updated = await prisma.group.findUnique({
    where: { id },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });
  return NextResponse.json(serializeGroup(updated!), { status: 201 });
}
