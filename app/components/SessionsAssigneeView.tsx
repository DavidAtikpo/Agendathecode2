'use client';

import { useMemo, useState } from 'react';
import type { SessionAssignmentRole, TrainingSession, User } from '../types';
import {
  ROLE_LABEL,
  STATUS_LABEL,
  formatSessionDate,
  matchesAssigneeFilter,
  myAssignment,
  statusBadgeClass,
  type AssigneeStatusFilter,
} from '../lib/session-labels';

interface SessionsAssigneeViewProps {
  sessions: TrainingSession[];
  currentUser: User;
  compactLayout?: boolean;
  onRespondSession: (
    sessionId: string,
    role: SessionAssignmentRole,
    status: 'accepted' | 'declined',
  ) => Promise<void>;
}

const FILTERS: { key: AssigneeStatusFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'Disponible' },
  { key: 'declined', label: 'Indisponible' },
];

export default function SessionsAssigneeView({
  sessions,
  currentUser,
  compactLayout,
  onRespondSession,
}: SessionsAssigneeViewProps) {
  const [filter, setFilter] = useState<AssigneeStatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assigned = useMemo(
    () => sessions.filter(s => myAssignment(s, currentUser.id)),
    [sessions, currentUser.id],
  );

  const filtered = useMemo(
    () => assigned.filter(s => matchesAssigneeFilter(s, currentUser.id, filter)),
    [assigned, currentUser.id, filter],
  );

  const counts = useMemo(() => {
    const c = { all: assigned.length, pending: 0, accepted: 0, declined: 0 };
    for (const s of assigned) {
      const mine = myAssignment(s, currentUser.id);
      if (!mine) continue;
      if (mine.status === 'pending') c.pending += 1;
      if (mine.status === 'accepted') c.accepted += 1;
      if (mine.status === 'declined') c.declined += 1;
    }
    return c;
  }, [assigned, currentUser.id]);

  const respond = async (
    sessionId: string,
    role: SessionAssignmentRole,
    status: 'accepted' | 'declined',
  ) => {
    setBusyId(sessionId);
    setError(null);
    try {
      await onRespondSession(sessionId, role, status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const pad = compactLayout ? 'px-3 py-3' : 'px-4 py-4 md:px-6 md:py-5';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <div className={`shrink-0 border-b border-slate-700/80 bg-slate-900/90 ${pad}`}>
        <h2 className={`font-semibold text-white ${compactLayout ? 'text-base' : 'text-lg'}`}>
          Mes propositions
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Sessions où vous êtes formateur ou assessor — validez ou refusez votre disponibilité.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-70">({counts[f.key]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-auto ${pad}`}>
        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <p className="text-sm">
              {assigned.length === 0
                ? 'Aucune proposition reçue pour le moment.'
                : 'Aucune session pour ce filtre.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map(s => {
              const mine = myAssignment(s, currentUser.id)!;
              const busy = busyId === s.id;
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border px-4 py-4 ${
                    mine.status === 'pending'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : mine.status === 'accepted'
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-200">
                          {ROLE_LABEL[mine.role]}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(mine.status)}`}>
                          {STATUS_LABEL[mine.status]}
                        </span>
                      </div>
                      <p className="font-medium text-slate-100">{s.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatSessionDate(s.startDate)} → {formatSessionDate(s.endDate)}
                        {s.examDate ? ` · Examen ${formatSessionDate(s.examDate)}` : ''}
                      </p>
                      {s.creatorName ? (
                        <p className="mt-1 text-xs text-slate-500">Organisateur : {s.creatorName}</p>
                      ) : null}
                    </div>
                  </div>

                  {mine.status === 'pending' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(s.id, mine.role, 'accepted')}
                        className="min-w-[8rem] flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:flex-none sm:px-6"
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(s.id, mine.role, 'declined')}
                        className="min-w-[8rem] flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 sm:flex-none sm:px-6"
                      >
                        Indisponible
                      </button>
                    </div>
                  ) : mine.respondedAt ? (
                    <p className="mt-3 text-[11px] text-slate-500">
                      Répondu le{' '}
                      {new Date(mine.respondedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
