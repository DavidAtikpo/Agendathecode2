import nodemailer from 'nodemailer';

/**
 * Envoi des rappels par SMTP (ex. Gmail avec mot de passe d’application).
 * Variables : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM (nom affiché), SMTP_FROM_EMAIL (adresse expéditeur).
 */

export type SendReminderResult = { ok: true } | { ok: false; error: string };

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  /** Les mots de passe d’application Gmail sont parfois collés avec des espaces */
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');
  const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  if (!host || !user || !pass || Number.isNaN(port)) return null;
  return { host, port, user, pass };
}

function buildFromHeader(): string | null {
  const email = process.env.SMTP_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim();
  if (!email) return null;
  const name = process.env.SMTP_FROM?.trim() || 'Agenda';
  return `${name} <${email}>`;
}

function getTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg) return null;
  const { host, port, user, pass } = cfg;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendReminderEmail(
  to: string,
  params: { title: string; content: string }
): Promise<SendReminderResult> {
  const transporter = getTransporter();
  const from = buildFromHeader();

  if (!transporter || !from) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS, …) — e-mail non envoyé');
    }
    return { ok: false, error: 'SMTP non configuré' };
  }

  const safeTitle = escapeHtml(params.title);
  const bodyText = params.content?.trim() || '(aucun contenu)';
  const safeBody = escapeHtml(bodyText).replace(/\n/g, '<br/>');

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `🔔 Rappel Agenda : ${params.title}`,
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
<p style="font-size:14px;color:#64748b;">Rappel prévu pour votre idée :</p>
<h1 style="font-size:18px;margin:8px 0;">${safeTitle}</h1>
<div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:8px;font-size:14px;">${safeBody}</div>
<p style="margin-top:24px;font-size:12px;color:#94a3b8;">— Agenda</p>
</body></html>`,
    });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
