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

/** Détecte une erreur Prisma « table inconnue » (NoteAsset pas migré). */
function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'P2021') return true; // The table `agenda.NoteAsset` does not exist
  if (typeof e.message === 'string') {
    const m = e.message.toLowerCase();
    return (
      m.includes('does not exist') &&
      (m.includes('noteasset') || m.includes('note_asset') || m.includes('"noteasset"'))
    );
  }
  return false;
}

export async function GET(_: Request, ctx: Ctx) {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const note = await prisma.note.findFirst({
      where: noteVisibleWhere(sessionId, id),
      include: NOTE_WITH_RELATIONS_INCLUDE,
    });
    if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    return NextResponse.json(serializeNote(note));
  } catch (err) {
    if (isMissingTableError(err)) {
      return NextResponse.json(
        {
          error:
            'Table « NoteAsset » introuvable. Lancez `npx prisma db push` pour appliquer la migration.',
        },
        { status: 500 },
      );
    }
    console.error('[notes/:id/assets GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const sessionId = await getSessionUserId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const cloud = ensureCloudinary();
    if (!cloud) {
      return NextResponse.json(
        {
          error:
            'Cloudinary non configuré. Renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans .env.',
        },
        { status: 500 },
      );
    }

    const { id } = await ctx.params;
    /* Seul le propriétaire peut joindre une pièce (lecture seule pour les partages). */
    const existing = await prisma.note.findFirst({
      where: { id, userId: sessionId },
    });
    if (!existing) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });

    let form: FormData;
    try {
      form = await request.formData();
    } catch (err) {
      console.error('[notes/:id/assets POST] formData parse failed', err);
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fichier invalide (max 50 Mo)' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    /* Pour les documents (PDF, Office, zip, etc.) on utilise « raw » :
       les URLs `/image/upload/*.pdf` sont bloquées en 401 par défaut côté
       Cloudinary, alors que `/raw/upload/...` est servi sans restriction. */
    const resourceType: 'image' | 'video' | 'raw' = isImage
      ? 'image'
      : isVideo
        ? 'video'
        : 'raw';
    const folder = `agenda/notes/${id}`;

    let uploaded: { secure_url: string; public_id: string };
    try {
      uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloud.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
          },
          (err, result) => {
            if (err || !result) {
              reject(err ?? new Error('Cloudinary upload failed'));
              return;
            }
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        );
        stream.end(bytes);
      });
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Upload Cloudinary impossible';
      console.error('[notes/:id/assets POST] cloudinary upload failed', err);
      return NextResponse.json({ error: `Cloudinary : ${msg}` }, { status: 502 });
    }

    try {
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
    } catch (err) {
      console.error('[notes/:id/assets POST] noteAsset.create failed', err);
      if (isMissingTableError(err)) {
        return NextResponse.json(
          {
            error:
              'Table « NoteAsset » introuvable en base. Exécutez `npx prisma db push` (ou `npx prisma migrate dev --name add_note_assets`) puis réessayez.',
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Enregistrement impossible : ${err.message}`
              : 'Enregistrement impossible',
        },
        { status: 500 },
      );
    }

    const note = await prisma.note.findUnique({
      where: { id },
      include: NOTE_WITH_RELATIONS_INCLUDE,
    });
    if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    return NextResponse.json(serializeNote(note));
  } catch (err) {
    console.error('[notes/:id/assets POST] unhandled', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Erreur serveur : ${err.message}`
            : 'Erreur serveur inconnue',
      },
      { status: 500 },
    );
  }
}
