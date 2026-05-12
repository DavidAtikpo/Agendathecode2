import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSessionUserId } from '@/app/lib/auth';
import { ensureCloudinary } from '@/app/lib/cloudinary';
import { NOTE_WITH_RELATIONS_INCLUDE, serializeNote } from '@/app/lib/note-serialize';

type Ctx = { params: Promise<{ id: string; assetId: string }> };

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'P2021') return true;
  if (typeof e.message === 'string') {
    const m = e.message.toLowerCase();
    return (
      m.includes('does not exist') &&
      (m.includes('noteasset') || m.includes('note_asset') || m.includes('"noteasset"'))
    );
  }
  return false;
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const sessionId = await getSessionUserId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const { id, assetId } = await ctx.params;

    const note = await prisma.note.findFirst({
      where: { id, userId: sessionId },
      select: { id: true },
    });
    if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });

    const asset = await prisma.noteAsset.findFirst({
      where: { id: assetId, noteId: id },
    });
    if (!asset) return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });

    /* Tente la suppression Cloudinary (best-effort : on continue même en cas d’échec). */
    const cloud = ensureCloudinary();
    if (cloud && asset.publicId) {
      const isVideo = asset.mediaType.startsWith('video/');
      try {
        await cloud.uploader.destroy(asset.publicId, {
          resource_type: isVideo ? 'video' : 'image',
          invalidate: true,
        });
      } catch {
        try {
          await cloud.uploader.destroy(asset.publicId, { resource_type: 'raw', invalidate: true });
        } catch {
          /* on ignore : l’entrée DB est de toute façon supprimée. */
        }
      }
    }

    await prisma.noteAsset.delete({ where: { id: assetId } });

    const full = await prisma.note.findUnique({
      where: { id },
      include: NOTE_WITH_RELATIONS_INCLUDE,
    });
    if (!full) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    return NextResponse.json(serializeNote(full));
  } catch (err) {
    console.error('[notes/:id/assets/:assetId DELETE]', err);
    if (isMissingTableError(err)) {
      return NextResponse.json(
        {
          error:
            'Table « NoteAsset » introuvable. Lancez `npx prisma db push` pour appliquer la migration.',
        },
        { status: 500 },
      );
    }
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
