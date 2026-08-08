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

const MOIS_PATTERN =
  'janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre';

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

function resolveMonth(mois: string | undefined, fallback: number): number | null {
  if (!mois) return fallback;
  const key = mois.trim().toLowerCase();
  return MOIS_INDEX[key] ?? MOIS_INDEX[normalizeMoisKey(mois)] ?? null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseExamDate(
  text: string,
  endYear: number,
  endMonth: number,
  endDay: number,
): string | null {
  const exam = /examen\s+(\d{1,2})/i.exec(text);
  if (!exam) return null;

  const examDay = Number.parseInt(exam[1], 10);
  let examDate = toIsoDate(endYear, endMonth, examDay);
  if (examDate) return examDate;

  const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
  const nextYear = endMonth === 12 ? endYear + 1 : endYear;
  examDate = toIsoDate(nextYear, nextMonth, examDay);
  if (examDate) return examDate;

  if (examDay > endDay) {
    return toIsoDate(endYear, endMonth, examDay);
  }

  return null;
}

/** Convertit une entrée catalogue (année + mois + texte dates) en dates ISO. */
export function parseCatalogSessionDates(
  annee: string,
  mois: string,
  dates: string,
): ParsedCatalogDates | null {
  const year = Number.parseInt(annee.trim(), 10);
  const catalogMonth =
    MOIS_INDEX[mois.trim().toLowerCase()] ?? MOIS_INDEX[normalizeMoisKey(mois)];
  if (!Number.isFinite(year) || !catalogMonth) return null;

  const text = dates.trim();
  const range = new RegExp(
    `du\\s+(\\d{1,2})(?:\\s+(${MOIS_PATTERN}))?\\s+au\\s+(\\d{1,2})(?:\\s+(${MOIS_PATTERN}))?`,
    'i',
  ).exec(text);
  if (!range) return null;

  const startDay = Number.parseInt(range[1], 10);
  const endDay = Number.parseInt(range[3], 10);
  const startMonth = resolveMonth(range[2], catalogMonth);
  const endMonth = resolveMonth(range[4], catalogMonth);
  if (!startMonth || !endMonth) return null;

  let startYear = year;
  let endYear = year;
  if (endMonth < startMonth) {
    endYear = year + 1;
  }

  const startDate = toIsoDate(startYear, startMonth, startDay);
  const endDate = toIsoDate(endYear, endMonth, endDay);
  if (!startDate || !endDate) return null;
  if (endDate < startDate) return null;

  const examDate = parseExamDate(text, endYear, endMonth, endDay);

  return { startDate, endDate, examDate };
}
