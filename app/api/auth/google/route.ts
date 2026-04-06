import { NextResponse } from 'next/server';
import { buildGoogleAuthorizeUrl, generateOAuthState, getAuthBaseUrl } from '@/app/lib/google-oauth';

export const runtime = 'nodejs';

const STATE_COOKIE = 'agenda_oauth_state';

export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
      return NextResponse.redirect(new URL('/?auth_error=google_config', getAuthBaseUrl()));
    }
    const state = generateOAuthState();
    const url = buildGoogleAuthorizeUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return res;
  } catch (e) {
    console.error('[auth/google]', e);
    return NextResponse.redirect(new URL('/?auth_error=google_config', getAuthBaseUrl()));
  }
}
