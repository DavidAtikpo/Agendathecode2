import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import {
  exchangeCodeForTokens,
  fetchGoogleProfile,
  getAuthBaseUrl,
} from '@/app/lib/google-oauth';
import { findOrCreateGoogleUser } from '@/app/lib/google-user';

export const runtime = 'nodejs';

const STATE_COOKIE = 'agenda_oauth_state';

export async function GET(request: Request) {
  const base = getAuthBaseUrl();
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(code)}`, base));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');

  if (oauthErr) {
    return fail(oauthErr === 'access_denied' ? 'google_denied' : 'google_oauth');
  }
  if (!code || !state) {
    return fail('google_missing');
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  if (!expected || expected !== state) {
    return fail('google_state');
  }

  try {
    const { access_token } = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(access_token);

    if (!profile.email_verified) {
      return fail('google_unverified');
    }

    const user = await findOrCreateGoogleUser(profile);
    const token = await createSessionToken(user.id);

    const res = NextResponse.redirect(new URL('/', base));
    res.cookies.set(getCookieName(), token, sessionCookieOptions());
    res.cookies.set(STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return res;
  } catch (e: unknown) {
    console.error('[auth/google/callback]', e);
    if (e instanceof Error && e.message === 'ACCOUNT_CONFLICT') {
      return fail('google_conflict');
    }
    return fail('google_failed');
  }
}
