/** URL du portail a-finpart / webirata (connexion formateurs). */
export function getWebirataPortalUrl(): string {
  const raw = process.env.WEBIRATA_APP_URL?.trim() || 'https://a-finpart.com';
  return raw.replace(/\/$/, '');
}
