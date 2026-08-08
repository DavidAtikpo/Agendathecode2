import { prisma } from '@/app/lib/prisma';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import {
  getTrainingCenterDisplayName,
  sendSessionProposalEmail,
  type StaffInviteRole,
} from '@/app/lib/email';
import { getPublicSiteBaseUrl } from '@/app/lib/site-base-url';

/** Push + e-mail de proposition de session (hors invitation de création de compte). */
export async function notifySessionProposal(options: {
  userId: string;
  role: string;
  sessionId: string;
  sessionTitle: string;
  organizerName: string;
  datesChanged?: boolean;
  /** Si true, n’envoie pas l’e-mail (ex. déjà inclus dans l’invitation de compte). */
  skipEmail?: boolean;
}): Promise<void> {
  const {
    userId,
    role,
    sessionId,
    sessionTitle,
    organizerName,
    datesChanged = false,
    skipEmail = false,
  } = options;

  await sendPushToUser(userId, {
    title: datesChanged ? '📅 Session modifiée' : '📅 Proposition de session',
    body: `${organizerName} : ${sessionTitle}`,
    data: { type: 'session_proposal', sessionId, role },
  });

  if (skipEmail) return;

  const staffRole =
    role === 'formateur' || role === 'assessor' || role === 'auditeur'
      ? (role as StaffInviteRole)
      : null;
  if (!staffRole) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  await sendSessionProposalEmail(user.email, {
    name: user.name,
    organizerName,
    organizationName: getTrainingCenterDisplayName(),
    staffRole,
    sessionTitle,
    dashboardUrl: getPublicSiteBaseUrl(),
    datesChanged,
    locale: 'fr',
  });
}
