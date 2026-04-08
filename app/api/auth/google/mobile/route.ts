import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import { verifyGoogleIdToken } from '@/app/lib/google-oauth';
import { findOrCreateGoogleUser } from '@/app/lib/google-user';
import { toPublicUser } from '@/app/lib/user-public';

export const runtime = 'nodejs';

/**
 * Connexion Google depuis l’app mobile (Flutter) : body { idToken }.
 * Le JWT est vérifié côté serveur ; audiences = GOOGLE_CLIENT_ID + GOOGLE_MOBILE_AUDIENCES.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    if (!idToken) {
      return NextResponse.json({ error: 'idToken manquant' }, { status: 400 });
    }

    const profile = await verifyGoogleIdToken(idToken);

    if (!profile.email_verified) {
      return NextResponse.json({ error: 'E-mail Google non vérifié' }, { status: 403 });
    }

    const user = await findOrCreateGoogleUser(profile);
    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ ...toPublicUser(user, { includePasswordLoginHint: true }), token });
    res.cookies.set(getCookieName(), token, sessionCookieOptions());
    return res;
  } catch (e: unknown) {
    console.error('[auth/google/mobile]', e);
    if (e instanceof Error && e.message === 'ACCOUNT_CONFLICT') {
      return NextResponse.json(
        { error: 'Ce compte e-mail est déjà lié à un autre compte Google.' },
        { status: 409 }
      );
    }
    const msg = e instanceof Error ? e.message : 'Connexion Google impossible';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
