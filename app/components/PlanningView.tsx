'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note, Task, TaskStatus } from '../types';
import {
  PLANNING_DAY_MS,
  addPlanningDays,
  barGeometryPx,
  parsePlanningDateMs,
  startOfPlanningDay,
} from '../lib/planning-dates';
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
  return addPlanningDays(ms, days);
}

const DAY_MS = PLANNING_DAY_MS;

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

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-slate-500/30 text-slate-300',
  medium: 'bg-sky-500/25 text-sky-300',
  high: 'bg-amber-500/25 text-amber-300',
  urgent: 'bg-rose-500/25 text-rose-300',
};

function formatShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function startOfDay(ms: number) {
  return startOfPlanningDay(ms);
}

function buildRows(notes: Note[], tasks: Task[]): PlanningRow[] {
  const out: PlanningRow[] = [];

  for (const t of tasks) {
    const created = parsePlanningDateMs(t.createdAt) ?? Date.now();
    const startMs = startOfDay(created);
    const due = parsePlanningDateMs(t.dueDate);
    const endMs = due != null ? startOfDay(due) : addDays(startMs, 14);
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
    const created = parsePlanningDateMs(n.createdAt) ?? Date.now();
    const startMs = startOfDay(created);
    const remindRaw = parsePlanningDateMs(n.remindAt);
    const remindMs = remindRaw != null ? startOfDay(remindRaw) : null;
    const updatedMs = parsePlanningDateMs(n.updatedAt) ?? startMs;
    const endMs = remindMs ?? startOfDay(Math.max(updatedMs, startMs + DAY_MS));
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

  /* Tâches actives en haut, terminées en bas ; au sein de chaque groupe : plus récent d'abord. */
  const doneGroup = (r: PlanningRow) =>
    r.kind === 'task' && r.statusLabel === 'Terminé' ? 1 : 0;
  out.sort((a, b) => {
    const gd = doneGroup(a) - doneGroup(b);
    if (gd !== 0) return gd;
    return b.startMs - a.startMs || b.endMs - a.endMs;
  });
  return out;
}

function durationDays(startMs: number, endMs: number) {
  const start = startOfDay(startMs);
  const endInclusive = startOfDay(endMs);
  return Math.max(1, Math.round((endInclusive - start) / DAY_MS) + 1);
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

function statusBadgeColor(statusLabel: string, kind: PlanningKind) {
  if (kind === 'note') return 'bg-sky-500/20 text-sky-300';
  if (statusLabel === 'Terminé') return 'bg-emerald-500/20 text-emerald-300';
  if (statusLabel === 'Révision') return 'bg-violet-500/20 text-violet-300';
  if (statusLabel === 'En cours' || statusLabel === 'En cours de test') return 'bg-amber-500/20 text-amber-300';
  if (statusLabel === 'Urgence / bug') return 'bg-rose-500/20 text-rose-300';
  return 'bg-indigo-500/20 text-indigo-300';
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
  users?: import('../types').User[];
  compactLayout?: boolean;
}

/* ─── Panneau de détails ─────────────────────────────────────────────────── */
function DetailPanel({
  row,
  task,
  note,
  userMap,
  onClose,
}: {
  row: PlanningRow;
  task: Task | undefined;
  note: Note | undefined;
  userMap: Map<string, import('../types').User>;
  onClose: () => void;
}) {
  const pal = barPalette(row);
  const pct = row.progressPct ?? 0;

  return (
    <div
      className="flex h-full w-[min(100vw-2rem,20rem)] shrink-0 flex-col border-l border-slate-700/80 bg-slate-900 shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.5)] md:relative md:w-72 md:max-w-none"
    >
      {/* En-tête */}
      <div className="flex shrink-0 items-start gap-2 border-b border-slate-700/80 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${
                row.kind === 'task' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-sky-500/20 text-sky-200'
              }`}
            >
              {row.kind === 'task' ? 'Tâche' : 'Note'}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${statusBadgeColor(row.statusLabel, row.kind)}`}>
              {row.statusLabel}
            </span>
            {row.priorityLabel && task && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${PRIORITY_COLOR[task.priority] ?? 'bg-slate-500/30 text-slate-300'}`}>
                {row.priorityLabel}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold leading-snug text-slate-100">{row.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-slate-700/60 hover:text-slate-200"
          aria-label="Fermer"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Corps scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Barre de progression */}
        {row.progressPct != null && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Progression</span>
              <span className="tabular-nums font-medium text-slate-200">{pct}%</span>
            </div>
            <div className={`relative h-2 w-full overflow-hidden rounded-full ${pal.track}`}>
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${pal.fillStrong} transition-all duration-300`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Début</p>
            <p className="text-xs font-medium text-slate-200">{formatFull(new Date(row.startMs).toISOString())}</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-3 py-2">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {row.kind === 'task' ? 'Échéance' : 'Rappel'}
            </p>
            <p className="text-xs font-medium text-slate-200">{formatFull(new Date(row.endMs).toISOString())}</p>
          </div>
        </div>

        {/* Durée */}
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Durée</p>
          <p className="text-xs font-medium text-slate-200">
            {durationDays(row.startMs, row.endMs)} jour{durationDays(row.startMs, row.endMs) > 1 ? 's' : ''}
          </p>
        </div>

        {/* Description (tâche) */}
        {task && task.description && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Description</p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{task.description}</p>
          </div>
        )}

        {/* Contenu (note) */}
        {note && note.content && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Contenu</p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 line-clamp-[12]">{note.content}</p>
          </div>
        )}

        {/* Rappel e-mail (note) */}
        {note && note.reminderByEmail && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <path d="M1 5l7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rappel e-mail activé
          </div>
        )}

        {/* Assignés (tâche) */}
        {task && task.assignedTo.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Assigné{task.assignedTo.length > 1 ? 's' : ''} ({task.assignedTo.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {task.assignedTo.map(uid => {
                const u = userMap.get(uid);
                return (
                  <div key={uid} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
                      style={{ backgroundColor: u?.color ?? '#6366f1' }}
                    >
                      {u?.initials ?? uid.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-xs text-slate-200">
                      {u?.name ?? uid}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pièces jointes (tâche) */}
        {task && task.assets && task.assets.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Pièce{task.assets.length > 1 ? 's' : ''} jointe{task.assets.length > 1 ? 's' : ''} ({task.assets.length})
            </p>
            <div className="space-y-1">
              {task.assets.map(a => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded bg-slate-800/60 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
                >
                  <svg className="h-3 w-3 shrink-0 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 2h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                    <path d="M10 2v4h4" strokeLinejoin="round" />
                  </svg>
                  <span className="truncate">{a.originalName}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Pièces jointes (note) */}
        {note && note.assets && note.assets.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Pièce{note.assets.length > 1 ? 's' : ''} jointe{note.assets.length > 1 ? 's' : ''} ({note.assets.length})
            </p>
            {/* Vignettes images */}
            {note.assets.some(a => a.mediaType.startsWith('image/')) ? (
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {note.assets
                  .filter(a => a.mediaType.startsWith('image/'))
                  .slice(0, 6)
                  .map(a => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square overflow-hidden rounded border border-slate-700 bg-slate-900 transition-colors hover:border-indigo-500/60"
                      title={a.originalName}
                    >
                      <img
                        src={a.url}
                        alt={a.originalName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
              </div>
            ) : null}
            <div className="space-y-1">
              {note.assets
                .filter(a => !a.mediaType.startsWith('image/'))
                .map(a => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded bg-slate-800/60 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
                  >
                    <svg className="h-3 w-3 shrink-0 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 2h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                      <path d="M10 2v4h4" strokeLinejoin="round" />
                    </svg>
                    <span className="truncate">{a.originalName}</span>
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Métadonnées bas */}
        <div className="border-t border-slate-700/60 pt-3 space-y-1">
          {task && (
            <p className="text-[10px] text-slate-600">
              Créé le {formatFull(task.createdAt)}
            </p>
          )}
          {task && task.updatedAt !== task.createdAt && (
            <p className="text-[10px] text-slate-600">
              Mis à jour le {formatFull(task.updatedAt)}
            </p>
          )}
          {note && (
            <p className="text-[10px] text-slate-600">
              Créé le {formatFull(note.createdAt)}
            </p>
          )}
          {note && note.updatedAt !== note.createdAt && (
            <p className="text-[10px] text-slate-600">
              Mis à jour le {formatFull(note.updatedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Composant principal ────────────────────────────────────────────────── */
export default function PlanningView({ notes, tasks, users = [], compactLayout }: PlanningViewProps) {
  const [filter, setFilter] = useState<'all' | 'tasks' | 'notes'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Frise un peu plus compacte sur mobile pour que les barres tiennent mieux en largeur utile */
  const [narrowViewport, setNarrowViewport] = useState(false);
  /** Colonnes Tâche / Début / Fin / … — masquables pour n’afficher que la frise Gantt */
  const [taskGridVisible, setTaskGridVisible] = useState(true);
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const topHeaderScrollRef = useRef<HTMLDivElement>(null);
  const syncingVertical = useRef(false);
  const syncingHorizontal = useRef(false);
  const skipRightHorizontalEcho = useRef(false);

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const noteMap = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(n.id, n);
    return m;
  }, [notes]);

  const userMap = useMemo(() => {
    const m = new Map<string, import('../types').User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const rows = useMemo(() => {
    const base = buildRows(notes, tasks);
    if (filter === 'tasks') return base.filter(r => r.kind === 'task');
    if (filter === 'notes') return base.filter(r => r.kind === 'note');
    return base;
  }, [notes, tasks, filter]);

  const selectedRow = useMemo(
    () => (selectedId ? rows.find(r => r.id === selectedId) ?? null : null),
    [selectedId, rows],
  );

  /* Fermer le détail si la ligne disparaît (filtre changé) */
  useEffect(() => {
    if (selectedId && !rows.find(r => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [rows, selectedId]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setNarrowViewport(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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

  const totalDays = Math.max(1, spanMs / DAY_MS);
  const pxPerDay = useMemo(() => {
    const ideal = narrowViewport ? 12 : 14;
    const minW = narrowViewport ? 320 : 640;
    const maxW = 4200;
    const w = totalDays * ideal;
    if (w < minW) return minW / totalDays;
    if (w > maxW) return maxW / totalDays;
    return ideal;
  }, [totalDays, narrowViewport]);

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

  const timelineWidthPx = useMemo(
    () => Math.round(monthSegments.reduce((sum, seg) => sum + seg.widthPx, 0)),
    [monthSegments],
  );

  const syncVerticalFrom = useCallback((source: 'left' | 'right') => {
    if (syncingVertical.current) return;
    const left = leftBodyRef.current;
    const right = rightBodyRef.current;
    if (!right) return;
    if (!left) return;
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
  const todayX = ((startOfDay(Date.now()) - rangeMin) / DAY_MS) * pxPerDay;

  const cell = compactLayout ? 'text-[11px]' : 'text-xs';
  const th = compactLayout ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      {/* Barre d'outils */}
      <div
        className={`shrink-0 border-b border-slate-700/80 bg-slate-900/90 ${compactLayout ? 'px-3 py-2' : 'px-4 py-3'}`}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <IconCalendar className="h-5 w-5 shrink-0 text-indigo-400" />
            <div className="min-w-0">
              <h2 className={`font-semibold tracking-tight text-white ${compactLayout ? 'text-sm' : 'text-base'}`}>
                Planning
              </h2>
              <p className="text-[11px] text-slate-500">Diagramme de Gantt — tableau et frise synchronisés.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTaskGridVisible(v => !v)}
            aria-pressed={taskGridVisible}
            title={taskGridVisible ? 'Masquer le tableau (colonnes Tâche, Début, Fin…)' : 'Afficher le tableau'}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors touch-manipulation sm:ml-0 ${
              taskGridVisible
                ? 'border-slate-600/60 bg-slate-800/90 text-slate-200 hover:bg-slate-800'
                : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
            }`}
          >
            <svg className="h-4 w-4 shrink-0 opacity-90" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              {taskGridVisible ? (
                <>
                  <rect x="2" y="3" width="5" height="10" rx="1" />
                  <path strokeLinecap="round" d="M10 4h4M10 8h4M10 12h4" />
                </>
              ) : (
                <>
                  <rect x="2" y="3" width="5" height="10" rx="1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8l3-2.5v5L9 8z" />
                </>
              )}
            </svg>
            <span className="max-[380px]:sr-only">{taskGridVisible ? 'Masquer tableau' : 'Tableau'}</span>
          </button>
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
        <div className="relative flex min-h-0 min-w-0 flex-1 border-t border-slate-800/80">
          {taskGridVisible ? (
            <div
              className={`flex w-[min(9.75rem,36vw)] shrink-0 flex-col border-r border-slate-300 bg-white shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)] sm:max-w-[min(100%,380px)] ${
                compactLayout ? 'sm:w-[min(100%,280px)]' : 'sm:w-[min(100%,340px)]'
              }`}
            >
              <div
                className={`flex shrink-0 items-stretch gap-0 border-b border-slate-200 bg-slate-50 text-black ${th} font-semibold uppercase tracking-wider`}
                style={{ minHeight: compactLayout ? 52 : 56 }}
              >
                <div
                  className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_46px_46px_26px_28px_minmax(0,72px)] items-center gap-x-0.5 px-1.5 py-2"
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
                <button
                  type="button"
                  onClick={() => setTaskGridVisible(false)}
                  className="flex w-8 shrink-0 items-center justify-center border-l border-slate-200 text-black hover:bg-slate-100 touch-manipulation"
                  title="Masquer le tableau"
                  aria-label="Masquer le tableau des tâches"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 12L6 8l4-4" />
                  </svg>
                </button>
              </div>
              <div
                ref={leftBodyRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-x-contain sm:overflow-x-hidden"
                onScroll={onLeftScroll}
              >
                {rows.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(prev => (prev === r.id ? null : r.id))}
                    className={`grid min-w-[272px] w-full grid-cols-[minmax(0,1fr)_46px_46px_26px_28px_minmax(0,72px)] items-center gap-x-0.5 border-b border-slate-200 px-1.5 text-left text-black ${cell} transition-colors ${
                      selectedId === r.id
                        ? 'bg-indigo-50 ring-inset ring-1 ring-indigo-300'
                        : i % 2 === 1
                          ? 'bg-slate-50 hover:bg-slate-100'
                          : 'bg-white hover:bg-slate-50'
                    }`}
                    style={{ height: rowH }}
                  >
                    <div className="min-w-0 pl-1">
                      <div className="flex min-h-0 items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none ${
                            r.kind === 'task' ? 'bg-indigo-100 text-indigo-900' : 'bg-sky-100 text-sky-900'
                          }`}
                        >
                          {r.kind === 'task' ? 'T' : 'N'}
                        </span>
                        <span className="truncate font-medium leading-tight text-black" title={r.title}>
                          {r.title}
                          {r.priorityLabel && !compactLayout ? (
                            <span className="font-normal text-black/60"> · {r.priorityLabel}</span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                    <span className="text-center tabular-nums text-black">{formatShort(new Date(r.startMs).toISOString())}</span>
                    <span className="text-center tabular-nums text-black">{formatShort(new Date(r.endMs).toISOString())}</span>
                    <span className="text-center tabular-nums text-black/80">{durationDays(r.startMs, r.endMs)}</span>
                    <span className="text-center tabular-nums text-black">
                      {r.progressPct != null ? `${r.progressPct}` : '—'}
                    </span>
                    <span className="truncate text-center text-[10px] leading-tight text-black/80" title={r.statusLabel}>
                      {r.statusLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTaskGridVisible(true)}
              className="flex w-9 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-slate-700/80 bg-slate-900/95 py-2 text-slate-400 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)] hover:bg-slate-800/90 hover:text-slate-200 touch-manipulation"
              title="Afficher le tableau (Tâche, Début, Fin…)"
              aria-label="Afficher le tableau des tâches"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l4-4-4-4" />
              </svg>
              <span className="px-0.5 text-[8px] font-bold uppercase leading-none tracking-tight">Tab.</span>
            </button>
          )}

          {/* Frise temporelle (style Gantt SaaS) — min-w-0 + flex-1 pour que la zone reste visible sur mobile */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#121820]">
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
              className="relative min-h-0 flex-1 overflow-auto overscroll-x-contain touch-pan-x"
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
                {/* Ligne « aujourd'hui » */}
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
                  const { leftPx, widthPx: barW } = barGeometryPx(
                    r.startMs,
                    r.endMs,
                    rangeMin,
                    pxPerDay,
                    timelineWidthPx,
                  );
                  const pal = barPalette(r);
                  const pct = r.progressPct ?? 0;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(prev => (prev === r.id ? null : r.id))}
                      className={`absolute left-0 right-0 box-border flex w-full cursor-pointer items-center border-b border-slate-800/90 pl-1 pr-2 transition-colors ${
                        selectedId === r.id
                          ? 'bg-indigo-500/10'
                          : i % 2 === 1
                            ? 'bg-slate-900/40 hover:bg-slate-800/40'
                            : 'bg-slate-900/20 hover:bg-slate-800/30'
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panneau de détails : overlay sur mobile pour ne pas masquer la frise */}
          {selectedRow && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/55 md:hidden"
                aria-label="Fermer le détail"
                onClick={() => setSelectedId(null)}
              />
              <div className="fixed inset-y-0 right-0 z-50 flex h-full max-md:box-border max-md:pt-[env(safe-area-inset-top)] max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:static md:z-auto md:h-full md:max-w-none md:shrink-0 md:pb-0">
                <DetailPanel
                  row={selectedRow}
                  task={selectedRow.kind === 'task' ? taskMap.get(selectedRow.id.slice(5)) : undefined}
                  note={selectedRow.kind === 'note' ? noteMap.get(selectedRow.id.slice(5)) : undefined}
                  userMap={userMap}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
