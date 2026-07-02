import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendPasswordResetEmail } from '@/app/lib/email';
import { getPublicSiteBaseUrl } from '@/app/lib/site-base-url';
import {
  generatePasswordResetToken,
  PASSWORD_RESET_TTL_MS,
} from '@/app/lib/password-reset';
import { normalizePreferences } from '@/app/lib/user-preferences';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Réponse générique — évite l’énumération des comptes. */
const GENERIC_OK = {
  message:
    'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé.',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.active !== false && user.passwordHash) {
      const { raw, hash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hash, expiresAt },
        }),
      ]);

      const resetUrl = `${getPublicSiteBaseUrl()}/reset-password?token=${raw}`;
      const prefs = normalizePreferences(user.preferences);
      const locale = prefs.locale === 'en' ? 'en' : 'fr';

      const sent = await sendPasswordResetEmail(user.email, {
        name: user.name,
        resetUrl,
        locale,
      });

      if (!sent.ok && process.env.NODE_ENV === 'development') {
        console.warn('[auth/forgot-password] email failed:', sent.error);
      }
    }

    return NextResponse.json(GENERIC_OK);
  } catch (err: unknown) {
    console.error('[auth/forgot-password]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
