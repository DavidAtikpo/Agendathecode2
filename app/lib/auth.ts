import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';

const COOKIE_NAME = 'agenda_token';

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === 'development') {
    return new TextEncoder().encode('dev-insecure-agenda-secret');
  }
  throw new Error('AUTH_SECRET manquant dans .env.local (requis en production)');
}

export async function hashPassword(password: string) {
  return bcryptHash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcryptCompare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') return null;
  return sub;
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function getCookieName() {
  return COOKIE_NAME;
}
