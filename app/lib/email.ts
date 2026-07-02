import nodemailer from 'nodemailer';

/**
 * Envoi des rappels par SMTP (ex. Gmail avec mot de passe d’application).
 * Variables : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM (nom affiché), SMTP_FROM_EMAIL (adresse expéditeur).
 */

export type SendReminderResult = { ok: true } | { ok: false; error: string };
export type SendTaskNotificationResult = { ok: true } | { ok: false; error: string };
export type SendPasswordResetResult = { ok: true } | { ok: false; error: string };

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

export async function sendTaskNotificationEmail(
  to: string,
  params: {
    taskTitle: string;
    event: 'created' | 'moved' | 'assigned';
    actorName?: string | null;
    status?: string;
  }
): Promise<SendTaskNotificationResult> {
  const transporter = getTransporter();
  const from = buildFromHeader();

  if (!transporter || !from) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS, …) — e-mail non envoyé');
    }
    return { ok: false, error: 'SMTP non configuré' };
  }

  const safeTitle = escapeHtml(params.taskTitle);
  const actor = params.actorName?.trim() || 'Un collaborateur';
  const safeActor = escapeHtml(actor);
  const statusLine = params.status ? `<p style="margin:8px 0 0;font-size:14px;color:#334155;">Statut : <strong>${escapeHtml(params.status)}</strong></p>` : '';

  const subject =
    params.event === 'created'
      ? `🆕 Nouvelle tâche assignée : ${params.taskTitle}`
      : params.event === 'moved'
        ? `🔄 Tâche déplacée : ${params.taskTitle}`
        : `👤 Tâche assignée : ${params.taskTitle}`;
  const intro =
    params.event === 'created'
      ? `${safeActor} vous a assigné une nouvelle tâche.`
      : params.event === 'moved'
        ? `${safeActor} a déplacé une tâche qui vous est assignée.`
        : `${safeActor} vous a assigné cette tâche.`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
<p style="font-size:14px;color:#64748b;">Notification Agenda</p>
<h1 style="font-size:18px;margin:8px 0;">${safeTitle}</h1>
<p style="margin:12px 0 0;font-size:14px;color:#334155;">${intro}</p>
${statusLine}
<p style="margin-top:24px;font-size:12px;color:#94a3b8;">— Agenda</p>
</body></html>`,
    });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  params: { name: string; resetUrl: string; locale?: 'fr' | 'en' },
): Promise<SendPasswordResetResult> {
  const transporter = getTransporter();
  const from = buildFromHeader();

  if (!transporter || !from) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] SMTP non configuré — e-mail de réinitialisation non envoyé');
      console.info('[email] Lien reset (dev):', params.resetUrl);
    }
    return { ok: false, error: 'SMTP non configuré' };
  }

  const en = params.locale === 'en';
  const safeName = escapeHtml(params.name.trim() || (en ? 'there' : 'utilisateur'));
  const safeUrl = escapeHtml(params.resetUrl);

  const subject = en
    ? '🔑 Reset your Neurix password'
    : '🔑 Réinitialisation de votre mot de passe Neurix';
  const intro = en
    ? `Hello ${safeName},`
    : `Bonjour ${safeName},`;
  const body = en
    ? 'We received a request to reset your password. Click the button below — the link expires in 1 hour.'
    : 'Nous avons reçu une demande de réinitialisation de mot de passe. Cliquez sur le bouton ci-dessous — le lien expire dans 1 heure.';
  const cta = en ? 'Reset password' : 'Réinitialiser le mot de passe';
  const ignore = en
    ? 'If you did not request this, you can ignore this email.'
    : 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.';
  const footer = en ? '— Neurix' : '— Neurix';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;">
<p style="font-size:14px;color:#64748b;">${intro}</p>
<p style="margin:12px 0;font-size:14px;color:#334155;">${body}</p>
<p style="margin:24px 0;">
  <a href="${safeUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px;">${cta}</a>
</p>
<p style="font-size:12px;color:#64748b;word-break:break-all;">${safeUrl}</p>
<p style="margin-top:24px;font-size:12px;color:#94a3b8;">${ignore}</p>
<p style="margin-top:8px;font-size:12px;color:#94a3b8;">${footer}</p>
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
