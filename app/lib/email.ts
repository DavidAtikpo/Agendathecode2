import nodemailer from 'nodemailer';

/**
 * Envoi des rappels par SMTP (ex. Gmail avec mot de passe d’application).
 * Variables : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM (nom affiché), SMTP_FROM_EMAIL (adresse expéditeur).
 */

export type SendReminderResult = { ok: true } | { ok: false; error: string };
export type SendTaskNotificationResult = { ok: true } | { ok: false; error: string };
export type SendPasswordResetResult = { ok: true } | { ok: false; error: string };
export type SendStaffInvitationResult = { ok: true } | { ok: false; error: string };

export type StaffInviteRole = 'formateur' | 'assessor' | 'auditeur';

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

function staffRoleLabelFr(role: StaffInviteRole): string {
  if (role === 'formateur') return 'Formateur';
  if (role === 'assessor') return 'Assessor';
  return 'Auditeur';
}

function staffRoleLabelEn(role: StaffInviteRole): string {
  if (role === 'formateur') return 'Trainer';
  if (role === 'assessor') return 'Assessor';
  return 'Auditor';
}

/** Nom affiché du centre / organisme (env TRAINING_CENTER_NAME ou SMTP_FROM). */
export function getTrainingCenterDisplayName(): string {
  return (
    process.env.TRAINING_CENTER_NAME?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    'Centre de formation'
  );
}

/**
 * Invitation intervenant (formateur / assessor / auditeur) — pas un reset mot de passe oublié.
 */
export async function sendStaffInvitationEmail(
  to: string,
  params: {
    name: string;
    setupPasswordUrl: string;
    organizerName: string;
    organizationName?: string;
    staffRole: StaffInviteRole;
    sessionTitle?: string | null;
    locale?: 'fr' | 'en';
  },
): Promise<SendStaffInvitationResult> {
  const transporter = getTransporter();
  const from = buildFromHeader();

  if (!transporter || !from) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] SMTP non configuré — e-mail d\'invitation intervenant non envoyé');
      console.info('[email] Lien invitation (dev):', params.setupPasswordUrl);
    }
    return { ok: false, error: 'SMTP non configuré' };
  }

  const en = params.locale === 'en';
  const safeName = escapeHtml(params.name.trim() || (en ? 'there' : 'Bonjour'));
  const safeOrganizer = escapeHtml(params.organizerName.trim() || (en ? 'An organizer' : 'Un organisateur'));
  const orgName = escapeHtml(params.organizationName?.trim() || getTrainingCenterDisplayName());
  const safeUrl = escapeHtml(params.setupPasswordUrl);
  const roleLabel = en ? staffRoleLabelEn(params.staffRole) : staffRoleLabelFr(params.staffRole);
  const sessionTitle = params.sessionTitle?.trim();
  const hasSession = Boolean(sessionTitle);
  const safeSession = sessionTitle ? escapeHtml(sessionTitle) : '';

  const subject = en
    ? hasSession
      ? `📅 Session proposal — ${safeOrganizer} (${orgName})`
      : `👋 Your trainer account — ${orgName}`
    : hasSession
      ? `📅 Proposition de session — ${safeOrganizer} (${orgName})`
      : `👋 Votre compte intervenant — ${orgName}`;

  const intro = en
    ? `<p style="margin:12px 0;font-size:14px;color:#334155;"><strong>${safeOrganizer}</strong>, organizer at <strong>${orgName}</strong>, has created your <strong>${roleLabel}</strong> account on Neurix${
        hasSession ? ' and would like to propose the following training session:' : '.'
      }</p>`
    : `<p style="margin:12px 0;font-size:14px;color:#334155;"><strong>${safeOrganizer}</strong>, organisateur du centre de formation <strong>${orgName}</strong>, vous a créé un compte <strong>${roleLabel}</strong> sur Neurix${
        hasSession ? ' et vous propose la session de formation suivante&nbsp;:' : '.'
      }</p>`;

  const sessionBlock = hasSession
    ? `<p style="margin:16px 0;padding:14px;background:#ecfdf5;border-left:4px solid #14b8a6;border-radius:8px;font-size:15px;font-weight:600;color:#0f766e;">${safeSession}</p>`
    : '';

  const stepsTitle = en ? 'Next steps' : 'Prochaines étapes';
  const steps = en
    ? hasSession
      ? [
          'Click the button below to <strong>set your password</strong>',
          'Sign in to Neurix and open <strong>« My proposals »</strong>',
          'Confirm whether you are <strong>available</strong> for these dates or <strong>not available</strong>',
        ]
      : [
          'Click the button below to <strong>set your password</strong>',
          'Sign in and open your <strong>planning dashboard</strong> (« My proposals »)',
          'You will be able to accept or decline future session proposals',
        ]
    : hasSession
      ? [
          'Cliquez sur le bouton ci-dessous pour <strong>définir votre mot de passe</strong>',
          'Connectez-vous à Neurix et ouvrez <strong>« Mes propositions »</strong>',
          'Indiquez si vous êtes <strong>disponible</strong> pour ces dates ou si vous <strong>n\'êtes pas libre</strong>',
        ]
      : [
          'Cliquez sur le bouton ci-dessous pour <strong>définir votre mot de passe</strong>',
          'Connectez-vous et accédez à votre <strong>tableau de planification</strong> (« Mes propositions »)',
          'Vous pourrez valider ou refuser les propositions de sessions qui vous seront envoyées',
        ];

  const stepsHtml = steps
    .map(
      (s, i) =>
        `<li style="margin:6px 0;font-size:14px;color:#334155;">${i + 1}. ${s}</li>`,
    )
    .join('');

  const cta = en
    ? hasSession
      ? 'Set my password and view the proposal'
      : 'Set my password and access my dashboard'
    : hasSession
      ? 'Définir mon mot de passe et voir la proposition'
      : 'Définir mon mot de passe et accéder à mon espace';

  const expiry = en
    ? 'This link expires in 1 hour.'
    : 'Ce lien est valable 1 heure.';

  const contactEmail = 'pm@cides.tf';
  const contact = en
    ? `Contact the management: <a href="mailto:${contactEmail}" style="color:#0d9488;text-decoration:none;">${contactEmail}</a>`
    : `Contactez la direction : <a href="mailto:${contactEmail}" style="color:#0d9488;text-decoration:none;">${contactEmail}</a>`;

  const footer = en ? '— Neurix' : '— Neurix';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
<p style="font-size:14px;color:#64748b;">${en ? 'Hello' : 'Bonjour'} ${safeName},</p>
${intro}
${sessionBlock}
<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#475569;">${stepsTitle}</p>
<ol style="margin:0 0 16px;padding-left:20px;">${stepsHtml}</ol>
<p style="margin:24px 0;">
  <a href="${safeUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px;">${cta}</a>
</p>
<p style="font-size:12px;color:#64748b;word-break:break-all;">${safeUrl}</p>
<p style="margin-top:16px;font-size:12px;color:#94a3b8;">${expiry}</p>
<p style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;">${contact}</p>
<p style="margin-top:8px;font-size:12px;color:#94a3b8;">${footer}</p>
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
