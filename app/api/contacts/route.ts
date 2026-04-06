import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Collaborateurs ajoutés par email (pour assignation des tâches) */
export async function GET() {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const links = await prisma.teamContact.findMany({
    where: { ownerId: sessionId },
    include: { member: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    links.map((link: { member: User }) => toPublicUser(link.member))
  );
}

/** Ajouter un collaborateur par son email (doit déjà avoir un compte) */
export async function POST(request: Request) {
  try {
    const sessionId = await getSessionUserId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!raw || !EMAIL_RE.test(raw)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { email: raw } });
    if (!target) {
      return NextResponse.json(
        { error: 'Aucun compte Agenda avec cet email. La personne doit d’abord s’inscrire.' },
        { status: 404 }
      );
    }

    if (target.id === sessionId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même' }, { status: 400 });
    }

    await prisma.teamContact.upsert({
      where: {
        ownerId_memberId: { ownerId: sessionId, memberId: target.id },
      },
      create: { ownerId: sessionId, memberId: target.id },
      update: {},
    });

    return NextResponse.json(toPublicUser(target), { status: 201 });
  } catch (err: unknown) {
    console.error('[contacts POST]', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
