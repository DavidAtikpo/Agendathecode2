import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import { verifyGoogleIdToken, fetchGoogleProfile } from '@/app/lib/google-oauth';
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
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!idToken && !accessToken) {
      return NextResponse.json({ error: 'idToken ou accessToken manquant' }, { status: 400 });
    }

    let profile;
    if (idToken) {
      try {
        profile = await verifyGoogleIdToken(idToken);
      } catch (idErr) {
        // Jeton Android (aud = client OAuth mobile) : repli sur accessToken si disponible.
        if (!accessToken) throw idErr;
        profile = await fetchGoogleProfile(accessToken);
      }
    } else {
      profile = await fetchGoogleProfile(accessToken);
    }

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
