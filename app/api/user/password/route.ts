import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId, hashPassword, verifyPassword } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';

export const runtime = 'nodejs';

/**
 * Change le mot de passe du compte connecté (comptes avec mot de passe uniquement).
 */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const body = (await request.json()) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mot de passe actuel et nouveau mot de passe requis' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Ce compte utilise la connexion Google. Aucun mot de passe à modifier.' },
        { status: 400 },
      );
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json(toPublicUser(updated, { includePasswordLoginHint: true }));
  } catch (e: unknown) {
    console.error('[user/password]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
