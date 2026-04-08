import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';
import { mergePreferences, normalizePreferences, type UserPreferences } from '@/app/lib/user-preferences';

export const runtime = 'nodejs';

/**
 * Met à jour les préférences du compte connecté (fusion partielle).
 */
export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<UserPreferences>;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const current = normalizePreferences(user.preferences);
    const patch: Partial<UserPreferences> = {};

    if (body.density === 'compact' || body.density === 'comfortable') patch.density = body.density;
    if (body.locale === 'fr' || body.locale === 'en') patch.locale = body.locale;
    if (typeof body.notesShowWhatsApp === 'boolean') patch.notesShowWhatsApp = body.notesShowWhatsApp;

    const next = mergePreferences(current, patch);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { preferences: next as object },
    });

    return NextResponse.json(toPublicUser(updated, { includePasswordLoginHint: true }));
  } catch (e: unknown) {
    console.error('[user/preferences]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
