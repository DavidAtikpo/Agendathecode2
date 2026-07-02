import * as admin from 'firebase-admin';
import { prisma } from './prisma';

function isValidFirebasePrivateKey(key: string | undefined): boolean {
  if (!key) return false;
  const normalized = key.replace(/\\n/g, '\n').trim();
  if (!normalized.includes('BEGIN PRIVATE KEY')) return false;
  if (normalized.includes('VOTRE_CLE') || normalized.includes('YOUR_PRIVATE_KEY')) {
    return false;
  }
  return normalized.length > 80;
}

function getMessaging(): admin.messaging.Messaging | null {
  if (admin.apps.length) {
    return admin.messaging();
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

  if (!projectId || !clientEmail || !isValidFirebasePrivateKey(privateKey)) {
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey!,
      }),
    });
    return admin.messaging();
  } catch (e) {
    console.warn('[FCM] firebase-admin init failed:', e);
    return null;
  }
}

/**
 * Send a push notification to all registered devices of a user.
 * Automatically removes stale tokens (unregistered / invalid).
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    badgeCount?: number;
  }
) {
  const fcmMessaging = getMessaging();
  if (!fcmMessaging) {
    console.warn('[FCM] firebase-admin not initialised – check env vars');
    return;
  }

  const rows = await prisma.deviceToken.findMany({
    where: { userId },
    select: { id: true, token: true, platform: true },
  });
  if (rows.length === 0) return;

  // Chaque notification envoyée incrémente le compteur persistant côté serveur
  // (remis à zéro quand l'utilisateur ouvre l'app — voir /api/user/notifications/seen).
  // Ceci garantit que le badge sur l'icône reflète TOUTES les notifications non vues,
  // pas seulement les tâches assignées.
  let resolvedBadgeCount = payload.badgeCount;
  if (resolvedBadgeCount === undefined) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { unreadNotificationCount: { increment: 1 } },
      select: { unreadNotificationCount: true },
    });
    resolvedBadgeCount = updated.unreadNotificationCount;
  }
  const badgeCount: number = resolvedBadgeCount;
  const data = {
    ...(payload.data ?? {}),
    badgeCount: String(badgeCount),
  };

  const messages: admin.messaging.Message[] = rows.map((r) => ({
    token: r.token,
    notification: { title: payload.title, body: payload.body },
    data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'neurix_default',
        sound: 'default',
        notificationCount: badgeCount > 0 ? badgeCount : undefined,
      },
    },
    apns: {
      payload: {
        aps: {
          badge: badgeCount,
          sound: 'default',
        },
      },
    },
  }));

  const result = await fcmMessaging.sendEach(messages);

  // Cleanup invalid tokens
  const invalidIds: string[] = [];
  result.responses.forEach((resp, i) => {
    const code = resp.error?.code ?? '';
    if (
      !resp.success &&
      (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token')
    ) {
      invalidIds.push(rows[i].id);
    }
  });
  if (invalidIds.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: invalidIds } } });
  }
}
