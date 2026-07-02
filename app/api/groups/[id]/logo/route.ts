import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { ensureCloudinary } from '@/app/lib/cloudinary';
import { GROUP_WITH_MEMBERS_INCLUDE, serializeGroup } from '@/app/lib/group-serialize';

type Ctx = { params: Promise<{ id: string }> };

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Upload / remplacement du logo du groupe (créateur uniquement). */
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
  const group = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!group) {
    return NextResponse.json({ error: 'Seul le créateur peut modifier le logo.' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Le logo doit être une image' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Image invalide (max 5 Mo)' }, { status: 400 });
  }

  if (group.logoPublicId) {
    try {
      await cloud.uploader.destroy(group.logoPublicId, { resource_type: 'image' });
    } catch {
      /* ignore */
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(
      {
        folder: `agenda/groups/${id}`,
        resource_type: 'image',
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

  const updated = await prisma.group.update({
    where: { id },
    data: { logoUrl: uploaded.secure_url, logoPublicId: uploaded.public_id },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });

  return NextResponse.json(serializeGroup(updated));
}

export async function DELETE(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const cloud = ensureCloudinary();
  const { id } = await ctx.params;
  const group = await prisma.group.findFirst({
    where: { id, createdById: sessionId },
  });
  if (!group) {
    return NextResponse.json({ error: 'Seul le créateur peut supprimer le logo.' }, { status: 403 });
  }

  if (group.logoPublicId && cloud) {
    try {
      await cloud.uploader.destroy(group.logoPublicId, { resource_type: 'image' });
    } catch {
      /* ignore */
    }
  }

  const updated = await prisma.group.update({
    where: { id },
    data: { logoUrl: null, logoPublicId: null },
    include: GROUP_WITH_MEMBERS_INCLUDE,
  });

  return NextResponse.json(serializeGroup(updated));
}
