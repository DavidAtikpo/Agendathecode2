import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendReminderEmail } from '@/app/lib/email';

/**
 * À appeler par un cron (ex. Vercel Cron toutes les 5 min) avec :
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.note.findMany({
    where: {
      remindAt: { lte: now },
      reminderEmailSentAt: null,
      reminderByEmail: true,
      userId: { not: null },
    },
    include: { user: true },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const note of due) {
    if (!note.user?.email) continue;

    const result = await sendReminderEmail(note.user.email, {
      title: note.title,
      content: note.content,
    });

    if (result.ok) {
      await prisma.note.update({
        where: { id: note.id },
        data: { reminderEmailSentAt: new Date() },
      });
      sent += 1;
    } else {
      errors.push(`${note.id}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: due.length,
    sent,
    errors: errors.length ? errors : undefined,
  });
}
