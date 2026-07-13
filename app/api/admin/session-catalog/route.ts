import { NextResponse } from 'next/server';
import { requireSessionCatalogManager } from '@/app/lib/session-catalog-auth';
import {
  createSessionCatalogItem,
  listSessionCatalog,
  type SessionCatalogPays,
} from '@/app/lib/session-catalog';

export const runtime = 'nodejs';

function parsePays(raw: unknown): SessionCatalogPays | null {
  if (raw === 'France' || raw === 'Togo') return raw;
  return null;
}

export async function GET() {
  const auth = await requireSessionCatalogManager();
  if (!auth.ok) return auth.response;

  try {
    const rows = await listSessionCatalog();
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionCatalogManager();
  if (!auth.ok) return auth.response;

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
    const created = await createSessionCatalogItem({
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      pays,
      annee,
      mois,
      dates,
      ordre: typeof body.ordre === 'number' ? body.ordre : Number(body.ordre) || 0,
      actif: body.actif !== false,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur enregistrement';
    return NextResponse.json({ message }, { status: 500 });
  }
}
