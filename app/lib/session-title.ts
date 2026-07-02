/** Titre auto : « Du 15 au 19 (Examen 20) juin 2026 » */
export function buildSessionTitle(start: Date, end: Date, exam: Date | null): string {
  const day = (d: Date) => d.getUTCDate();
  const monthYear = end.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const capMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
  const examPart = exam ? ` (Examen ${day(exam)})` : '';
  return `Du ${day(start)} au ${day(end)}${examPart} ${capMonth}`;
}

export function parseDateOnly(raw: unknown): Date | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
