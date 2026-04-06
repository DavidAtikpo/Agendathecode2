/** Base publique (sans slash final), alignée sur AUTH_URL / Google OAuth */
export function getBillingBaseUrl(): string {
  const u = process.env.AUTH_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}
