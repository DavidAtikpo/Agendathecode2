import { prisma } from '@/app/lib/prisma';
import { sendTaskNotificationEmail } from '@/app/lib/email';
import { sendPushToUser } from '@/app/lib/firebase-admin';
import { getGroupMemberIds } from '@/app/lib/group-access';

type GroupNotifyEvent = 'created' | 'assigned' | 'moved' | 'comment';

export async function notifyGroupAboutTask(opts: {
  groupId: string;
  excludeUserId: string;
  taskTitle: string;
  event: GroupNotifyEvent;
  actorName?: string | null;
  status?: string;
  commentPreview?: string;
  taskId: string;
}): Promise<void> {
  const memberIds = await getGroupMemberIds(opts.groupId);
  const recipients = memberIds.filter(id => id !== opts.excludeUserId);
  if (recipients.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: recipients } },
    select: { id: true, email: true, name: true },
  });

  for (const u of users) {
    let pushTitle = '';
    let pushBody = '';
    let emailEvent: 'created' | 'assigned' | 'moved' | null = null;

    switch (opts.event) {
      case 'created':
        pushTitle = '📋 Nouvelle tâche de groupe';
        pushBody = `${opts.actorName ?? 'Quelqu\'un'} a créé « ${opts.taskTitle} »`;
        emailEvent = 'created';
        break;
      case 'assigned':
        pushTitle = '📋 Tâche assignée dans le groupe';
        pushBody = `${opts.actorName ?? 'Quelqu\'un'} a assigné « ${opts.taskTitle} »`;
        emailEvent = 'assigned';
        break;
      case 'moved':
        pushTitle = '🔄 Statut modifié (groupe)';
        pushBody = `« ${opts.taskTitle} » → ${opts.status ?? ''}`;
        emailEvent = 'moved';
        break;
      case 'comment':
        pushTitle = `💬 ${opts.actorName ?? 'Commentaire'} — ${opts.taskTitle}`;
        pushBody = opts.commentPreview ?? 'Nouveau commentaire';
        break;
    }

    await sendPushToUser(u.id, {
      title: pushTitle,
      body: pushBody,
      data: {
        type: opts.event === 'comment' ? 'task_comment' : `group_task_${opts.event}`,
        taskId: opts.taskId,
        groupId: opts.groupId,
        ...(opts.status ? { status: opts.status } : {}),
      },
    });

    if (emailEvent && u.email) {
      const notify = await sendTaskNotificationEmail(u.email, {
        taskTitle: opts.taskTitle,
        event: emailEvent,
        actorName: opts.actorName ?? null,
        status: opts.status,
      });
      if (!notify.ok) {
        console.warn('[group-notify] email failed:', notify.error);
      }
    }
  }
}
