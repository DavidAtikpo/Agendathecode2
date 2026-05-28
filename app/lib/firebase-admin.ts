import * as admin from 'firebase-admin';
import { prisma } from './prisma';

// Singleton — initialize once
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    privateKey
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

export const fcmMessaging = admin.apps.length ? admin.messaging() : null;

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
  }
) {
  if (!fcmMessaging) {
    console.warn('[FCM] firebase-admin not initialised – check env vars');
    return;
  }

  const rows = await prisma.deviceToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });
  if (rows.length === 0) return;

  const messages: admin.messaging.Message[] = rows.map((r) => ({
    token: r.token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    android: {
      priority: 'high',
      notification: { channelId: 'neurix_default', sound: 'default' },
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
