/** Indicatif + numéro, chiffres uniquement (ex. 33612345678), sans + ni espaces. */

export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function buildWhatsAppReminderUrl(phoneDigits: string, title: string, content: string): string {
  const body = content?.trim() ? content.trim() : '(pas de contenu)';
  const text = `🔔 Rappel Agenda\n\n*${title}*\n\n${body}`;
  return `https://wa.me/${phoneDigits}?${new URLSearchParams({ text }).toString()}`;
}
