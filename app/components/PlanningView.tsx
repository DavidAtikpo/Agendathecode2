'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Task, TaskStatus } from '../types';
import { IconCalendar } from './icons';

type PlanningKind = 'task' | 'note';

interface PlanningRow {
  id: string;
  kind: PlanningKind;
  title: string;
  startMs: number;
  endMs: number;
  progressPct: number | null;
  statusLabel: string;
  typeLabel: string;
  priorityLabel?: string;
}

function addDays(ms: number, days: number) {
  return ms + days * 86400000;
}

const DAY_MS = 86400000;

function clampDateOrder(startMs: number, endMs: number) {
  if (endMs >= startMs) return { startMs, endMs };
  return { startMs, endMs: startMs + DAY_MS };
}

function taskStatusMeta(status: TaskStatus): { pct: number; label: string } {
  const m: Record<TaskStatus, { pct: number; label: string }> = {
    todo: { pct: 0, label: 'À faire' },
    urgent: { pct: 12, label: 'Urgence / bug' },
    doing: { pct: 45, label: 'En cours' },
    testing: { pct: 72, label: 'En cours de test' },
    review: { pct: 88, label: 'Révision' },
    done: { pct: 100, label: 'Terminé' },
  };
  return m[status];
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgent',
};

function formatShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildRows(notes: Note[], tasks: Task[]): PlanningRow[] {
  const out: PlanningRow[] = [];

  for (const t of tasks) {
    const startMs = new Date(t.createdAt).getTime();
    let endMs = t.dueDate ? new Date(t.dueDate).getTime() : addDays(startMs, 14);
    const { startMs: s, endMs: e } = clampDateOrder(startMs, endMs);
    const meta = taskStatusMeta(t.status);
    out.push({
      id: `task:${t.id}`,
      kind: 'task',
      title: t.title || 'Sans titre',
      startMs: s,
      endMs: e,
      progressPct: meta.pct,
      statusLabel: meta.label,
      typeLabel: 'Tâche',
      priorityLabel: PRIORITY_LABEL[t.priority] ?? t.priority,
    });
  }

  for (const n of notes) {
    const startMs = new Date(n.createdAt).getTime();
    const remindMs = n.remindAt ? new Date(n.remindAt).getTime() : null;
    const updatedMs = new Date(n.updatedAt).getTime();
    let endMs = remindMs ?? Math.max(updatedMs, startMs + DAY_MS);
    const { startMs: s, endMs: e } = clampDateOrder(startMs, endMs);
    let statusLabel = 'Idée / note';
    let progressPct: number | null = null;
    if (remindMs != null) {
      const now = Date.now();
      if (remindMs <= now) {
        progressPct = 100;
        statusLabel = 'Rappel échu';
      } else {
        const denom = remindMs - s;
        if (denom > 0) {
          progressPct = Math.min(99, Math.max(0, Math.round(((now - s) / denom) * 100)));
        } else {
          progressPct = null;
        }
        statusLabel = 'Rappel à venir';
      }
    }
    out.push({
      id: `note:${n.id}`,
      kind: 'note',
      title: n.title || 'Sans titre',
      startMs: s,
      endMs: e,
      progressPct,
      statusLabel,
      typeLabel: 'Note',
    });
  }

  out.sort((a, b) => a.startMs - b.startMs);
  return out;
}

function durationDays(startMs: number, endMs: number) {
  return Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
}

function barPalette(r: PlanningRow): { track: string; fillStrong: string } {
  if (r.kind === 'note') {
    return { track: 'bg-sky-950/80', fillStrong: 'bg-sky-400/90' };
  }
  if (r.statusLabel === 'Terminé') {
    return { track: 'bg-emerald-950/80', fillStrong: 'bg-emerald-400/95' };
  }
  if (r.statusLabel === 'Révision') {
    return { track: 'bg-violet-950/80', fillStrong: 'bg-violet-400/90' };
  }
  if (r.statusLabel === 'En cours' || r.statusLabel === 'En cours de test') {
    return { track: 'bg-amber-950/80', fillStrong: 'bg-amber-400/95' };
  }
  if (r.statusLabel === 'Urgence / bug') {
    return { track: 'bg-rose-950/80', fillStrong: 'bg-rose-400/95' };
  }
  return { track: 'bg-indigo-950/80', fillStrong: 'bg-indigo-400/90' };
}

interface MonthSegment {
  startMs: number;
  endMs: number;
  label: string;
  widthPx: number;
}

interface PlanningViewProps {
  notes: Note[];
  tasks: Task[];
  compactLayout?: boolean;
}

export default function PlanningView({ notes, tasks, compactLayout }: PlanningViewProps) {
  const [filter, setFilter] = useState<'all' | 'tasks' | 'notes'>('all');
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const topHeaderScrollRef = useRef<HTMLDivElement>(null);
  const syncingVertical = useRef(false);
  const syncingHorizontal = useRef(false);
  const skipRightHorizontalEcho = useRef(false);

  const rows = useMemo(() => {
    const base = buildRows(notes, tasks);
    if (filter === 'tasks') return base.filter(r => r.kind === 'task');
    if (filter === 'notes') return base.filter(r => r.kind === 'note');
    return base;
  }, [notes, tasks, filter]);

  const { rangeMin, rangeMax, spanMs } = useMemo(() => {
    if (rows.length === 0) {
      const now = Date.now();
      const min = startOfDay(addDays(now, -7));
      const max = startOfDay(addDays(now, 45)) + DAY_MS;
      return { rangeMin: min, rangeMax: max, spanMs: Math.max(DAY_MS, max - min) };
    }
    let min = startOfDay(rows[0].startMs);
    let max = startOfDay(rows[0].endMs) + DAY_MS;
    for (const r of rows) {
      min = Math.min(min, startOfDay(r.startMs));
      max = Math.max(max, startOfDay(r.endMs) + DAY_MS);
    }
    const pad = Math.max(7 * DAY_MS, (max - min) * 0.08);
    const rangeMin = min - pad;
    const rangeMax = max + pad;
    return { rangeMin, rangeMax, spanMs: Math.max(DAY_MS, rangeMax - rangeMin) };
  }, [rows]);

  const spanDays = Math.max(1, Math.ceil(spanMs / DAY_MS));
  const pxPerDay = useMemo(() => {
    const ideal = 14;
    const minW = 640;
    const maxW = 4200;
    const w = spanDays * ideal;
    if (w < minW) return minW / spanDays;
    if (w > maxW) return maxW / spanDays;
    return ideal;
  }, [spanDays]);

  const timelineWidthPx = Math.round(spanDays * pxPerDay);

  const monthSegments = useMemo((): MonthSegment[] => {
    const segs: MonthSegment[] = [];
    let cursor = rangeMin;
    const end = rangeMax;
    while (cursor < end) {
      const d = new Date(cursor);
      const y = d.getFullYear();
      const m = d.getMonth();
      const nextMonth = new Date(y, m + 1, 1).getTime();
      const segEnd = Math.min(nextMonth, end);
      const days = Math.max(1, (segEnd - cursor) / DAY_MS);
      segs.push({
        startMs: cursor,
        endMs: segEnd,
        label: formatMonthYear(new Date(cursor)),
        widthPx: days * pxPerDay,
      });
      cursor = segEnd;
    }
    return segs;
  }, [rangeMin, rangeMax, pxPerDay]);

  const syncVerticalFrom = useCallback((source: 'left' | 'right') => {
    if (syncingVertical.current) return;
    const left = leftBodyRef.current;
    const right = rightBodyRef.current;
    if (!left || !right) return;
    syncingVertical.current = true;
    const y = source === 'left' ? left.scrollTop : right.scrollTop;
    if (source === 'left') right.scrollTop = y;
    else left.scrollTop = y;
    requestAnimationFrame(() => {
      syncingVertical.current = false;
    });
  }, []);

  const onLeftScroll = useCallback(() => syncVerticalFrom('left'), [syncVerticalFrom]);
  const onRightScroll = useCallback(() => {
    syncVerticalFrom('right');
    if (skipRightHorizontalEcho.current) return;
    const right = rightBodyRef.current;
    const top = topHeaderScrollRef.current;
    if (!right || !top) return;
    syncingHorizontal.current = true;
    top.scrollLeft = right.scrollLeft;
    requestAnimationFrame(() => {
      syncingHorizontal.current = false;
    });
  }, [syncVerticalFrom]);

  useEffect(() => {
    const top = topHeaderScrollRef.current;
    const right = rightBodyRef.current;
    if (!top || !right) return;
    const onTopScroll = () => {
      if (syncingHorizontal.current) return;
      syncingHorizontal.current = true;
      skipRightHorizontalEcho.current = true;
      right.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => {
        syncingHorizontal.current = false;
        skipRightHorizontalEcho.current = false;
      });
    };
    top.addEventListener('scroll', onTopScroll, { passive: true });
    return () => top.removeEventListener('scroll', onTopScroll);
  }, []);

  const rowH = compactLayout ? 44 : 52;
  const todayX = ((Date.now() - rangeMin) / spanMs) * timelineWidthPx;

  const cell = compactLayout ? 'text-[11px]' : 'text-xs';
  const th = compactLayout ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <div
        className={`shrink-0 border-b border-slate-700/80 bg-slate-900/90 ${compactLayout ? 'px-3 py-2' : 'px-4 py-3'}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <IconCalendar className="h-5 w-5 shrink-0 text-indigo-400" />
            <div className="min-w-0">
              <h2 className={`font-semibold tracking-tight text-white ${compactLayout ? 'text-sm' : 'text-base'}`}>
                Planning
              </h2>
              <p className="text-[11px] text-slate-500">Diagramme de Gantt — tableau et frise synchronisés.</p>
            </div>
          </div>
          <div
            className="ml-auto flex shrink-0 rounded-lg border border-slate-600/60 bg-slate-800/90 p-0.5 shadow-inner"
            role="group"
            aria-label="Filtrer le planning"
          >
            {(
              [
                ['all', 'Tout'],
                ['tasks', 'Tâches'],
                ['notes', 'Notes'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors touch-manipulation ${
                  filter === key ? 'bg-indigo-500/30 text-indigo-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-20 text-center text-slate-500">
          <IconCalendar className="h-10 w-10 opacity-40" />
          <p className="text-sm">Aucune entrée à afficher pour ce filtre.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 border-t border-slate-800/80">
          {/* Panneau gauche : grille type MS Project / SaaS Gantt */}
          <div
            className={`flex shrink-0 flex-col border-r border-slate-700/80 bg-slate-900/95 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)] ${
              compactLayout ? 'w-[min(100%,280px)]' : 'w-[min(100%,340px)]'
            } max-w-[min(100%,380px)]`}
          >
            <div
              className={`grid shrink-0 grid-cols-[minmax(0,1fr)_46px_46px_26px_28px_minmax(0,72px)] gap-x-0.5 border-b border-slate-700/90 bg-slate-800/95 px-1.5 py-2 text-slate-500 ${th} font-semibold uppercase tracking-wider`}
              style={{ minHeight: compactLayout ? 52 : 56 }}
            >
              <span className="pl-1">Tâche</span>
              <span className="text-center">Début</span>
              <span className="text-center">Fin</span>
              <span className="text-center" title="Durée (jours)">
                J.
              </span>
              <span className="text-center">%</span>
              <span className="truncate pr-0.5 text-center">État</span>
            </div>
            <div
              ref={leftBodyRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              onScroll={onLeftScroll}
            >
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[minmax(0,1fr)_46px_46px_26px_28px_minmax(0,72px)] items-center gap-x-0.5 border-b border-slate-800/90 px-1.5 ${cell} ${
                    i % 2 === 1 ? 'bg-slate-800/25' : 'bg-transparent'
                  }`}
                  style={{ height: rowH }}
                >
                  <div className="min-w-0 pl-1">
                    <div className="flex min-h-0 items-center gap-1.5">
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none ${
                          r.kind === 'task' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-sky-500/20 text-sky-200'
                        }`}
                      >
                        {r.kind === 'task' ? 'T' : 'N'}
                      </span>
                      <span className="truncate font-medium leading-tight text-slate-100" title={r.title}>
                        {r.title}
                        {r.priorityLabel && !compactLayout ? (
                          <span className="font-normal text-slate-500"> · {r.priorityLabel}</span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <span className="text-center tabular-nums text-slate-400">{formatShort(new Date(r.startMs).toISOString())}</span>
                  <span className="text-center tabular-nums text-slate-400">{formatShort(new Date(r.endMs).toISOString())}</span>
                  <span className="text-center tabular-nums text-slate-500">{durationDays(r.startMs, r.endMs)}</span>
                  <span className="text-center tabular-nums text-slate-200">
                    {r.progressPct != null ? `${r.progressPct}` : '—'}
                  </span>
                  <span className="truncate text-center text-[10px] leading-tight text-slate-400" title={r.statusLabel}>
                    {r.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Frise temporelle (style Gantt SaaS) */}
          <div className="flex min-w-0 min-h-0 flex-1 flex-col bg-[#121820]">
            <div
              ref={topHeaderScrollRef}
              className="shrink-0 overflow-x-auto overflow-y-hidden border-b border-slate-700/80 bg-slate-800/90"
              style={{ minHeight: compactLayout ? 52 : 56 }}
            >
              <div className="flex h-full" style={{ width: timelineWidthPx, minHeight: compactLayout ? 52 : 56 }}>
                {monthSegments.map((seg, idx) => (
                  <div
                    key={`${seg.startMs}-${idx}`}
                    className="flex shrink-0 items-end border-r border-slate-600/40 pb-1 pl-2 text-[11px] font-medium capitalize text-slate-400"
                    style={{ width: seg.widthPx }}
                  >
                    {seg.label}
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={rightBodyRef}
              className="relative min-h-0 flex-1 overflow-auto"
              onScroll={onRightScroll}
            >
              <div
                className="relative"
                style={{
                  width: timelineWidthPx,
                  minHeight: rows.length * rowH,
                  backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent ${pxPerDay - 1}px, rgba(148,163,184,0.07) ${pxPerDay - 1}px, rgba(148,163,184,0.07) ${pxPerDay}px)`,
                  backgroundSize: `${timelineWidthPx}px 100%`,
                }}
              >
                {/* Ligne « aujourd’hui » */}
                {todayX >= 0 && todayX <= timelineWidthPx ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    style={{ left: todayX }}
                    aria-hidden
                  >
                    <span className="absolute -top-1 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-rose-600/95 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md">
                      Auj.
                    </span>
                  </div>
                ) : null}

                {rows.map((r, i) => {
                  const rawLeft = ((r.startMs - rangeMin) / spanMs) * timelineWidthPx;
                  const rawRight = ((r.endMs - rangeMin) / spanMs) * timelineWidthPx;
                  const leftPx = Math.max(0, rawLeft);
                  const rightPx = Math.min(timelineWidthPx, rawRight);
                  const barW = Math.max(8, rightPx - leftPx);
                  const pal = barPalette(r);
                  const pct = r.progressPct ?? 0;

                  return (
                    <div
                      key={r.id}
                      className={`absolute left-0 right-0 box-border flex items-center border-b border-slate-800/90 pl-1 pr-2 ${
                        i % 2 === 1 ? 'bg-slate-900/40' : 'bg-slate-900/20'
                      }`}
                      style={{ top: i * rowH, height: rowH, width: timelineWidthPx }}
                    >
                      <div
                        className={`relative h-[22px] max-w-full overflow-hidden rounded-md shadow-md ring-1 ring-black/25 ${pal.track}`}
                        style={{ marginLeft: leftPx, width: barW }}
                        title={`${r.title} — ${r.statusLabel}`}
                      >
                        {r.progressPct != null ? (
                          <div
                            className={`absolute inset-y-0 left-0 rounded-l-md ${pal.fillStrong} shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}
                            style={{ width: `${pct}%` }}
                          />
                        ) : null}
                        {r.progressPct != null && barW > 52 ? (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                            {pct}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
