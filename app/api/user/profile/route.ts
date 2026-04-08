import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';
import { initialsFromName, isValidAvatarColor } from '@/app/lib/user-display';

export const runtime = 'nodejs';

const NAME_MAX = 80;

/**
 * Met à jour le profil affiché (nom, couleur d’avatar). Les initiales sont recalculées si le nom change.
 */
export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const body = (await request.json()) as { name?: unknown; color?: unknown };
    const nameRaw = typeof body.name === 'string' ? body.name.trim() : undefined;
    const colorRaw = typeof body.color === 'string' ? body.color.trim() : undefined;

    if (nameRaw === undefined && colorRaw === undefined) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const data: { name?: string; color?: string; initials?: string } = {};

    if (nameRaw !== undefined) {
      if (!nameRaw || nameRaw.length > NAME_MAX) {
        return NextResponse.json(
          { error: `Le nom doit contenir entre 1 et ${NAME_MAX} caractères` },
          { status: 400 },
        );
      }
      data.name = nameRaw;
      data.initials = initialsFromName(nameRaw);
    }

    if (colorRaw !== undefined) {
      if (!isValidAvatarColor(colorRaw)) {
        return NextResponse.json({ error: 'Couleur invalide (format #RRGGBB)' }, { status: 400 });
      }
      data.color = colorRaw;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json(toPublicUser(updated, { includePasswordLoginHint: true }));
  } catch (e: unknown) {
    console.error('[user/profile]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
