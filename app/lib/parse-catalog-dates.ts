const MOIS_INDEX: Record<string, number> = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

export interface ParsedCatalogDates {
  startDate: string;
  endDate: string;
  examDate: string | null;
}

function normalizeMoisKey(mois: string): string {
  return mois
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Convertit une entrée catalogue (année + mois + texte dates) en dates ISO. */
export function parseCatalogSessionDates(
  annee: string,
  mois: string,
  dates: string,
): ParsedCatalogDates | null {
  const year = Number.parseInt(annee.trim(), 10);
  const month = MOIS_INDEX[mois.trim().toLowerCase()] ?? MOIS_INDEX[normalizeMoisKey(mois)];
  if (!Number.isFinite(year) || !month) return null;

  const text = dates.trim();
  const range = /du\s+(\d{1,2})\s+au\s+(\d{1,2})/i.exec(text);
  if (!range) return null;

  const startDay = Number.parseInt(range[1], 10);
  const endDay = Number.parseInt(range[2], 10);
  const startDate = toIsoDate(year, month, startDay);
  const endDate = toIsoDate(year, month, endDay);
  if (!startDate || !endDate) return null;

  let examDate: string | null = null;
  const exam = /examen\s+(\d{1,2})/i.exec(text);
  if (exam) {
    examDate = toIsoDate(year, month, Number.parseInt(exam[1], 10));
  }

  return { startDate, endDate, examDate };
}
