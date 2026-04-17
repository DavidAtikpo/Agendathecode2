import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { tasksVisibleToUser } from '@/app/lib/task-access';
import { ensureCloudinary } from '@/app/lib/cloudinary';
import { TASK_WITH_RELATIONS_INCLUDE, serializeTask } from '@/app/lib/task-serialize';
import { TaskAssetKind } from '@prisma/client';

type Ctx = { params: Promise<{ id: string }> };

const MAX_FILE_BYTES = 100 * 1024 * 1024;

function toKind(v: unknown): TaskAssetKind {
  return v === 'output' ? TaskAssetKind.output : TaskAssetKind.input;
}

export async function GET(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const task = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId) },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  return NextResponse.json(serializeTask(task));
}

export async function POST(request: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const cloud = ensureCloudinary();
  if (!cloud) {
    return NextResponse.json({ error: 'Cloudinary non configuré' }, { status: 500 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.task.findFirst({
    where: { id, ...tasksVisibleToUser(sessionId) },
    include: { assignees: true },
  });
  if (!existing) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });

  const form = await request.formData();
  const file = form.get('file');
  const kind = toKind(form.get('kind'));
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Fichier invalide (max 100MB)' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isVideo = file.type.startsWith('video/');
  const folder = `agenda/tasks/${id}/${kind}`;
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(
      {
        folder,
        resource_type: isVideo ? 'video' : 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(bytes);
  });

  await prisma.taskAsset.create({
    data: {
      taskId: id,
      uploaderId: sessionId,
      kind,
      mediaType: file.type || 'application/octet-stream',
      originalName: file.name,
      bytes: file.size,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    },
  });

  const task = await prisma.task.findUnique({
    where: { id },
    include: TASK_WITH_RELATIONS_INCLUDE,
  });
  if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  return NextResponse.json(serializeTask(task));
}
