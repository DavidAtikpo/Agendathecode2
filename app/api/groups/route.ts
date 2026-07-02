import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { groupsVisibleToUser } from '@/app/lib/group-access';
import { assertGroupMembersAllowed } from '@/app/lib/group-assign';
import { GROUP_WITH_MEMBERS_INCLUDE, serializeGroup } from '@/app/lib/group-serialize';
import { assertUserIsPro, proRequiredMessage } from '@/app/lib/pro-plan';
import { canAccessGroups, groupsForbiddenForRoleMessage } from '@/app/lib/user-roles';

/** Liste des groupes dont l'utilisateur est membre. */
export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: { role: true },
  });
  if (!user || !canAccessGroups(user.role)) {
    return NextResponse.json([]);
  }

  const groups = await prisma.group.findMany({
    where: groupsVisibleToUser(sessionId),
    include: GROUP_WITH_MEMBERS_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(groups.map(serializeGroup));
}

/** Créer un groupe (nom + membres collaborateurs). */
export async function POST(request: Request) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const rawMembers = Array.isArray(body.memberIds) ? body.memberIds : [];
  const parsedIds: string[] = [];
  for (const v of rawMembers) {
    const id = typeof v === 'string' ? v.trim() : String(v).trim();
    if (id) parsedIds.push(id);
  }
  const memberIds = [...new Set(parsedIds)].filter(id => id !== sessionId);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nom du groupe requis (2 caractères min.)' }, { status: 400 });
  }
  if (memberIds.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 membres par groupe' }, { status: 400 });
  }

  const creator = await prisma.user.findUnique({
    where: { id: sessionId },
    select: { role: true },
  });
  if (!creator || !canAccessGroups(creator.role)) {
    return NextResponse.json({ error: groupsForbiddenForRoleMessage() }, { status: 403 });
  }

  try {
    await assertUserIsPro(sessionId);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'PRO_REQUIRED') {
      return NextResponse.json({ error: proRequiredMessage() }, { status: 403 });
    }
    throw e;
  }

  try {
    await assertGroupMembersAllowed(sessionId, memberIds);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'MEMBER_FORBIDDEN') {
      return NextResponse.json(
        { error: 'Vous ne pouvez ajouter que vos collaborateurs (ajoutés par email).' },
        { status: 403 }
      );
    }
    throw e;
  }

  const group = await prisma.group.create({
    data: {
      name,
      createdById: sessionId,
      members: {
        create: [{ userId: sessionId }, ...memberIds.map(userId => ({ userId }))],
      },
    },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });

  return NextResponse.json(serializeGroup(group), { status: 201 });
}
