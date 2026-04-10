/**
 * URL canonique du site en production (domaine custom).
 * Utilisée pour OAuth Google et les URLs Stripe quand `AUTH_URL` n’est pas défini.
 *
 * **Google Cloud Console** — client OAuth type « Application Web », URI de redirection autorisés :
 * `{PUBLIC_URL}/api/auth/google/callback`
 * Ex. : `https://neurix.qrthecode2.com/api/auth/google/callback`
 */
export const DEFAULT_PUBLIC_SITE_URL = 'https://neurix.qrthecode2.com';

/**
 * Base publique du site (sans slash final).
 *
 * 1. `AUTH_URL` si défini (recommandé sur Vercel pour forcer le domaine custom).
 * 2. Déploiement **production** Vercel → domaine canonique (évite `redirect_uri_mismatch`
 *    si Google n’a enregistré que le custom domain et pas `*.vercel.app`).
 * 3. Preview / dev Vercel → `VERCEL_URL` (ex. branche preview).
 * 4. `NODE_ENV === 'production'` hors Vercel → domaine canonique.
 * 5. Sinon → localhost pour `next dev`.
 */
export function getPublicSiteBaseUrl(): string {
  const auth = process.env.AUTH_URL?.trim();
  if (auth) return auth.replace(/\/$/, '');

  if (process.env.VERCEL_ENV === 'production') {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, '')}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  return 'http://localhost:3000';
}
