import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/prisma';
import { createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import {
  exchangeCodeForTokens,
  fetchGoogleProfile,
  getAuthBaseUrl,
  type GoogleProfile,
} from '@/app/lib/google-oauth';

export const runtime = 'nodejs';

const STATE_COOKIE = 'agenda_oauth_state';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const email = profile.email.toLowerCase();

  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogle) return byGoogle;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw new Error('ACCOUNT_CONFLICT');
    }
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.sub },
    });
  }

  const count = await prisma.user.count();
  const name = profile.name?.trim() || email.split('@')[0] || 'Utilisateur';

  return prisma.user.create({
    data: {
      email,
      passwordHash: null,
      googleId: profile.sub,
      name,
      color: COLORS[count % COLORS.length],
      initials: makeInitials(name),
    },
  });
}

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
