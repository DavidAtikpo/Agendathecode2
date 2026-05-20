export const PLANNING_DAY_MS = 86400000;

/** Interprète une date ISO ou `YYYY-MM-DD` en jour civil local (évite le décalage UTC). */
export function parsePlanningDateMs(value: string | undefined | null): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  const datePart = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (datePart) {
    const y = Number(datePart[1]);
    const mo = Number(datePart[2]) - 1;
    const d = Number(datePart[3]);
    const t = new Date(y, mo, d).getTime();
    return Number.isNaN(t) ? null : t;
  }

  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

export function startOfPlanningDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addPlanningDays(ms: number, days: number) {
  return ms + days * PLANNING_DAY_MS;
}

export function barIntervalFromRow(startMs: number, endMs: number) {
  const start = startOfPlanningDay(startMs);
  const endExclusive = startOfPlanningDay(endMs) + PLANNING_DAY_MS;
  return { startMs: start, endMsExclusive: endExclusive };
}

export function barGeometryPx(
  startMs: number,
  endMs: number,
  rangeMin: number,
  pxPerDay: number,
  maxWidth: number,
) {
  const { startMs: barStart, endMsExclusive } = barIntervalFromRow(startMs, endMs);
  const leftPx = ((barStart - rangeMin) / PLANNING_DAY_MS) * pxPerDay;
  const rightPx = ((endMsExclusive - rangeMin) / PLANNING_DAY_MS) * pxPerDay;
  const left = Math.max(0, leftPx);
  const width = Math.max(8, Math.min(maxWidth, rightPx) - left);
  return { leftPx: left, widthPx: width };
}
