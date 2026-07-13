import { NextResponse } from 'next/server';
import { requireSessionCatalogManager } from '@/app/lib/session-catalog-auth';
import {
  deleteSessionCatalogItem,
  updateSessionCatalogItem,
  type SessionCatalogPays,
} from '@/app/lib/session-catalog';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function parsePays(raw: unknown): SessionCatalogPays | null {
  if (raw === 'France' || raw === 'Togo') return raw;
  return null;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireSessionCatalogManager();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json();
  const pays = parsePays(body.pays);
  const annee = typeof body.annee === 'string' ? body.annee.trim() : '';
  const mois = typeof body.mois === 'string' ? body.mois.trim() : '';
  const dates = typeof body.dates === 'string' ? body.dates.trim() : '';

  if (!pays || !annee || !mois || !dates) {
    return NextResponse.json(
      { message: 'Pays, année, mois et dates sont requis' },
      { status: 400 },
    );
  }

  try {
    const updated = await updateSessionCatalogItem(id, {
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      pays,
      annee,
      mois,
      dates,
      ordre: typeof body.ordre === 'number' ? body.ordre : Number(body.ordre) || 0,
      actif: body.actif !== false,
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur mise à jour';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSessionCatalogManager();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteSessionCatalogItem(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur suppression';
    return NextResponse.json({ message }, { status: 500 });
  }
}
