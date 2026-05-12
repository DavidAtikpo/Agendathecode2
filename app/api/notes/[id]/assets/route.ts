import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { ensureCloudinary } from '@/app/lib/cloudinary';
import { NOTE_WITH_RELATIONS_INCLUDE, serializeNote } from '@/app/lib/note-serialize';

type Ctx = { params: Promise<{ id: string }> };

const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Note visible : propriétaire OU collaborateur destinataire d’un partage. */
function noteVisibleWhere(sessionId: string, id: string) {
  return {
    id,
    OR: [{ userId: sessionId }, { shares: { some: { userId: sessionId } } }],
  };
}

export async function GET(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const note = await prisma.note.findFirst({
    where: noteVisibleWhere(sessionId, id),
    include: NOTE_WITH_RELATIONS_INCLUDE,
  });
  if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
  return NextResponse.json(serializeNote(note));
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
  /* Seul le propriétaire peut joindre une pièce (lecture seule pour les partages). */
  const existing = await prisma.note.findFirst({
    where: { id, userId: sessionId },
  });
  if (!existing) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Fichier invalide (max 50 Mo)' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isVideo = file.type.startsWith('video/');
  const folder = `agenda/notes/${id}`;
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

  await prisma.noteAsset.create({
    data: {
      noteId: id,
      uploaderId: sessionId,
      mediaType: file.type || 'application/octet-stream',
      originalName: file.name,
      bytes: file.size,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    },
  });

  const note = await prisma.note.findUnique({
    where: { id },
    include: NOTE_WITH_RELATIONS_INCLUDE,
  });
  if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
  return NextResponse.json(serializeNote(note));
}
