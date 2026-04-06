import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyPassword, createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Ce compte utilise la connexion Google. Cliquez sur « Continuer avec Google ».' },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const res = NextResponse.json(toPublicUser(user));
    res.cookies.set(getCookieName(), token, sessionCookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('[auth/login]', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
