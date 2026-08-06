/** URL du site Agenda ouverte dans la fenêtre Electron (sans slash final). */
const DEFAULT_APP_URL = 'https://neurix.qrthecode2.com';

function normalizeBaseUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return DEFAULT_APP_URL;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

module.exports = {
  appUrl: normalizeBaseUrl(process.env.ELECTRON_APP_URL),
};
