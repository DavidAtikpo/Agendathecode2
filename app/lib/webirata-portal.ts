/** URL du portail a-finpart / webirata (connexion formateurs). */
export function getWebirataPortalUrl(): string {
  const raw = process.env.WEBIRATA_APP_URL?.trim() || 'https://www.a-finpart.com';
  return raw.replace(/\/$/, '');
}

/** Page admin a-finpart (organisateurs / admins Neurix). */
export function getWebirataAdminUrl(): string {
  const fromEnv = process.env.WEBIRATA_ADMIN_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return `${getWebirataPortalUrl()}/admin`;
}
