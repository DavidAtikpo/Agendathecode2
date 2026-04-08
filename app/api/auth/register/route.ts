import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { hashPassword, createSessionToken, sessionCookieOptions, getCookieName } from '@/app/lib/auth';
import { toPublicUser } from '@/app/lib/user-public';
import { initialsFromName, USER_AVATAR_COLORS } from '@/app/lib/user-display';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
    }

    const count = await prisma.user.count();
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        color: USER_AVATAR_COLORS[count % USER_AVATAR_COLORS.length],
        initials: initialsFromName(name),
      },
    });

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ ...toPublicUser(user, { includePasswordLoginHint: true }), token }, { status: 201 });
    res.cookies.set(getCookieName(), token, sessionCookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('[auth/register]', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
