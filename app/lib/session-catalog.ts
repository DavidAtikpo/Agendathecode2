import { catalogPrisma } from '@/app/lib/catalog-prisma';

export type SessionCatalogPays = 'France' | 'Togo';

export interface SessionCatalogItem {
  id: string;
  slug: string;
  pays: SessionCatalogPays;
  annee: string;
  mois: string;
  dates: string;
  label: string;
  ordre: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export function buildSessionLabel(annee: string, mois: string, dates: string): string {
  return `${annee} ${mois} ${dates}`;
}

function toItem(row: {
  id: string;
  slug: string;
  pays: string;
  annee: string;
  mois: string;
  dates: string;
  ordre: number;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SessionCatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    pays: row.pays as SessionCatalogPays,
    annee: row.annee,
    mois: row.mois,
    dates: row.dates,
    label: buildSessionLabel(row.annee, row.mois, row.dates),
    ordre: row.ordre,
    actif: row.actif,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSessionCatalog(options?: {
  pays?: SessionCatalogPays;
  actifOnly?: boolean;
}): Promise<SessionCatalogItem[]> {
  const rows = await catalogPrisma.sessionCatalog.findMany({
    where: {
      ...(options?.pays ? { pays: options.pays } : {}),
      ...(options?.actifOnly ? { actif: true } : {}),
    },
    orderBy: [{ ordre: 'asc' }, { annee: 'asc' }, { mois: 'asc' }],
  });
  return rows.map(toItem);
}

export async function getSessionCatalogBySlug(
  slug: string,
  pays?: SessionCatalogPays,
): Promise<SessionCatalogItem | null> {
  const row = await catalogPrisma.sessionCatalog.findFirst({
    where: {
      slug,
      ...(pays ? { pays } : {}),
      actif: true,
    },
  });
  return row ? toItem(row) : null;
}

export async function isValidSessionCatalogLabel(label: string): Promise<boolean> {
  const trimmed = label.trim();
  if (!trimmed) return false;

  const sessions = await listSessionCatalog({ actifOnly: true });
  return sessions.some((s) => s.label === trimmed);
}

export function slugifySession(annee: string, mois: string, pays: SessionCatalogPays): string {
  const base = `${pays}-${annee}-${mois}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return base.replace(/^-+|-+$/g, '');
}

export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await catalogPrisma.sessionCatalog.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export interface SessionCatalogWriteInput {
  slug?: string;
  pays: SessionCatalogPays;
  annee: string;
  mois: string;
  dates: string;
  ordre?: number;
  actif?: boolean;
}

export async function createSessionCatalogItem(
  input: SessionCatalogWriteInput,
): Promise<SessionCatalogItem> {
  const baseSlug = input.slug?.trim() || slugifySession(input.annee, input.mois, input.pays);
  const slug = await ensureUniqueSlug(baseSlug);

  const row = await catalogPrisma.sessionCatalog.create({
    data: {
      slug,
      pays: input.pays,
      annee: input.annee.trim(),
      mois: input.mois.trim(),
      dates: input.dates.trim(),
      ordre: input.ordre ?? 0,
      actif: input.actif ?? true,
    },
  });

  return toItem(row);
}

export async function updateSessionCatalogItem(
  id: string,
  input: SessionCatalogWriteInput,
): Promise<SessionCatalogItem> {
  const baseSlug = input.slug?.trim() || slugifySession(input.annee, input.mois, input.pays);
  const slug = await ensureUniqueSlug(baseSlug, id);

  const row = await catalogPrisma.sessionCatalog.update({
    where: { id },
    data: {
      slug,
      pays: input.pays,
      annee: input.annee.trim(),
      mois: input.mois.trim(),
      dates: input.dates.trim(),
      ordre: input.ordre ?? 0,
      actif: input.actif ?? true,
    },
  });

  return toItem(row);
}

export async function deleteSessionCatalogItem(id: string): Promise<void> {
  await catalogPrisma.sessionCatalog.delete({ where: { id } });
}
