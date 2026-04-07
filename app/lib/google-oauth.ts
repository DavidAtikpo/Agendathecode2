import { randomBytes } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function getAuthBaseUrl(): string {
  const u = process.env.AUTH_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function getGoogleRedirectUri(): string {
  return `${getAuthBaseUrl()}/api/auth/google/callback`;
}

export function generateOAuthState(): string {
  return randomBytes(24).toString('hex');
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID manquant');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<{ access_token: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Google OAuth non configuré');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Token Google (${res.status})`);
  }
  return { access_token: data.access_token };
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as GoogleProfile & { error?: string };
  if (!res.ok || !data.sub || !data.email) {
    throw new Error(data.error ?? 'Profil Google invalide');
  }
  return data;
}

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Client IDs autorisés comme `aud` du JWT (web + Android + iOS), séparés par des virgules. */
function googleJwtAudiences(): string[] {
  const extra = process.env.GOOGLE_MOBILE_AUDIENCES?.trim();
  const fromExtra = extra
    ? extra
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const web = process.env.GOOGLE_CLIENT_ID?.trim();
  const merged = web ? [web, ...fromExtra] : fromExtra;
  return [...new Set(merged)];
}

/**
 * Vérifie un id_token renvoyé par Google Sign-In (Flutter / iOS / Android).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audiences = googleJwtAudiences();
  if (audiences.length === 0) {
    throw new Error('Configurez GOOGLE_CLIENT_ID et/ou GOOGLE_MOBILE_AUDIENCES pour le login mobile');
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: audiences.length === 1 ? audiences[0]! : audiences,
  });

  const sub = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : '';
  const ev = payload.email_verified;
  const email_verified = ev === true || ev === 'true';
  const name =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : email.split('@')[0] || 'Utilisateur';

  if (!sub || !email) {
    throw new Error('Token Google incomplet (sub / email)');
  }

  return { sub, email, email_verified, name };
}
