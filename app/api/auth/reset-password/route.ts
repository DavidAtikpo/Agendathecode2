import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
  getCookieName,
} from '@/app/lib/auth';
import { hashPasswordResetToken } from '@/app/lib/password-reset';
import { toPublicUser } from '@/app/lib/user-public';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 },
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      if (record) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      }
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 });
    }

    const user = record.user;
    if (user.active === false) {
      return NextResponse.json(
        { error: 'Ce compte a été désactivé. Contactez un administrateur.' },
        { status: 403 },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    ]);

    const sessionToken = await createSessionToken(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const res = NextResponse.json({
      ...toPublicUser(updated, { includePasswordLoginHint: true }),
      token: sessionToken,
    });
    res.cookies.set(getCookieName(), sessionToken, sessionCookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('[auth/reset-password]', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
