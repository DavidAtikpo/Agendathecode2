'use client';

import { Fragment, useMemo, useState } from 'react';
import type { TrainingSession, User } from '../types';
import {
  ROLE_LABEL,
  STATUS_LABEL,
  assignmentFor,
  formatSessionDate,
  matchesOrganizerFilter,
  sessionConfirmLabel,
  statusBadgeClass,
  type OrganizerStatusFilter,
} from '../lib/session-labels';
import styles from './Sidebar.module.css';

interface SessionsOrganizerViewProps {
  sessions: TrainingSession[];
  currentUser: User;
  compactLayout?: boolean;
  onCreateSession: (payload: {
    startDate: string;
    endDate: string;
    examDate?: string | null;
    formateurEmail?: string;
    assessorEmail?: string;
  }) => Promise<TrainingSession>;
  onUpdateSession: (
    sessionId: string,
    payload: {
      startDate?: string;
      endDate?: string;
      examDate?: string | null;
      formateurEmail?: string | null;
      assessorEmail?: string | null;
    },
  ) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

const FILTERS: { key: OrganizerStatusFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'Disponible' },
  { key: 'declined', label: 'Indisponible' },
  { key: 'confirmed', label: 'Confirmées' },
];

export default function SessionsOrganizerView({
  sessions,
  currentUser,
  compactLayout,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
}: SessionsOrganizerViewProps) {
  const [filter, setFilter] = useState<OrganizerStatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [formateurEmail, setFormateurEmail] = useState('');
  const [assessorEmail, setAssessorEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editExam, setEditExam] = useState('');
  const [editFormateur, setEditFormateur] = useState('');
  const [editAssessor, setEditAssessor] = useState('');

  const owned = useMemo(
    () => sessions.filter(s => s.createdBy === currentUser.id),
    [sessions, currentUser.id],
  );

  const filtered = useMemo(
    () => owned.filter(s => matchesOrganizerFilter(s, filter)),
    [owned, filter],
  );

  const counts = useMemo(() => {
    const c = { all: owned.length, pending: 0, accepted: 0, declined: 0, confirmed: 0 };
    for (const s of owned) {
      if (matchesOrganizerFilter(s, 'pending')) c.pending += 1;
      if (matchesOrganizerFilter(s, 'accepted')) c.accepted += 1;
      if (matchesOrganizerFilter(s, 'declined')) c.declined += 1;
      if (matchesOrganizerFilter(s, 'confirmed')) c.confirmed += 1;
    }
    return c;
  }, [owned]);

  const openEdit = (s: TrainingSession) => {
    setEditId(s.id);
    setEditStart(s.startDate);
    setEditEnd(s.endDate);
    setEditExam(s.examDate ?? '');
    setEditFormateur(assignmentFor(s, 'formateur')?.user.email ?? '');
    setEditAssessor(assignmentFor(s, 'assessor')?.user.email ?? '');
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreateSession({
        startDate,
        endDate,
        examDate: examDate.trim() || null,
        formateurEmail: formateurEmail.trim() || undefined,
        assessorEmail: assessorEmail.trim() || undefined,
      });
      setStartDate('');
      setEndDate('');
      setExamDate('');
      setFormateurEmail('');
      setAssessorEmail('');
      setShowCreate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (sessionId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdateSession(sessionId, {
        startDate: editStart,
        endDate: editEnd,
        examDate: editExam.trim() || null,
        formateurEmail: editFormateur.trim() || null,
        assessorEmail: editAssessor.trim() || null,
      });
      setEditId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const pad = compactLayout ? 'px-3 py-3' : 'px-4 py-4 md:px-6 md:py-5';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <div className={`shrink-0 border-b border-slate-700/80 bg-slate-900/90 ${pad}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`font-semibold text-white ${compactLayout ? 'text-base' : 'text-lg'}`}>
              Gestion des sessions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Suivi formateurs et assessors — disponibilités et confirmations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(v => !v)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            {showCreate ? 'Fermer le formulaire' : 'Nouvelle session'}
          </button>
        </div>

        {showCreate ? (
          <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <p className="text-xs text-slate-500">Titre généré automatiquement à partir des dates.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs text-slate-400">
                Début
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                Fin
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                Examen (optionnel)
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400 sm:col-span-2 lg:col-span-1">
                Email formateur
                <input type="email" value={formateurEmail} onChange={e => setFormateurEmail(e.target.value)}
                  placeholder="formateur@exemple.com"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400 sm:col-span-2">
                Email assessor
                <input type="email" value={assessorEmail} onChange={e => setAssessorEmail(e.target.value)}
                  placeholder="assessor@exemple.com"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
            </div>
            <button type="submit" disabled={busy || !startDate || !endDate}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50">
              {busy ? 'Création…' : 'Proposer la session'}
            </button>
          </form>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrer par statut">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-teal-500/25 text-teal-200'
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
            <p className="text-sm">Aucune session pour ce filtre.</p>
            {owned.length === 0 ? (
              <p className="mt-1 text-xs">Créez une session pour proposer un formateur et un assessor.</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/80">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Session</th>
                  <th className="px-3 py-2.5">Période</th>
                  <th className="px-3 py-2.5">Formateur</th>
                  <th className="px-3 py-2.5">Assessor</th>
                  <th className="px-3 py-2.5">État global</th>
                  <th className="px-3 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const formateur = assignmentFor(s, 'formateur');
                  const assessor = assignmentFor(s, 'assessor');
                  const editing = editId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className="border-b border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/30">
                        <td className="px-3 py-3 font-medium text-slate-100">{s.title}</td>
                        <td className="px-3 py-3 text-xs text-slate-400">
                          {formatSessionDate(s.startDate)} → {formatSessionDate(s.endDate)}
                          {s.examDate ? (
                            <span className="mt-0.5 block text-teal-400/80">Examen {formatSessionDate(s.examDate)}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          {formateur ? (
                            <div className="flex items-center gap-2">
                              <div className={`${styles.userAvatar} collab-avatar-${formateur.user.id}`} style={{ ['--avatar-color' as string]: formateur.user.color }}>
                                {formateur.user.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs text-slate-200">{formateur.user.name}</p>
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${statusBadgeClass(formateur.status)}`}>
                                  {STATUS_LABEL[formateur.status]}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {assessor ? (
                            <div className="flex items-center gap-2">
                              <div className={`${styles.userAvatar} collab-avatar-${assessor.user.id}`} style={{ ['--avatar-color' as string]: assessor.user.color }}>
                                {assessor.user.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs text-slate-200">{assessor.user.name}</p>
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${statusBadgeClass(assessor.status)}`}>
                                  {STATUS_LABEL[assessor.status]}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {sessionConfirmLabel(s)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => (editing ? setEditId(null) : openEdit(s))}
                            className="text-xs text-teal-400 hover:text-teal-300"
                          >
                            {editing ? 'Annuler' : 'Modifier'}
                          </button>
                        </td>
                      </tr>
                      {editing ? (
                        <tr className="border-b border-slate-800 bg-slate-800/40">
                          <td colSpan={6} className="px-3 py-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <label className="text-xs text-slate-400">
                                Début
                                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                Fin
                                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                Examen
                                <input type="date" value={editExam} onChange={e => setEditExam(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {ROLE_LABEL.formateur}
                                <input type="email" value={editFormateur} onChange={e => setEditFormateur(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400 sm:col-span-2">
                                {ROLE_LABEL.assessor}
                                <input type="email" value={editAssessor} onChange={e => setEditAssessor(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" disabled={busy} onClick={() => void handleSaveEdit(s.id)}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-500 disabled:opacity-50">
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  if (!confirm('Supprimer cette session ?')) return;
                                  setBusy(true);
                                  try {
                                    await onDeleteSession(s.id);
                                    setEditId(null);
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : 'Erreur');
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{owned.flatMap(s => s.assignments.map(a => `.collab-avatar-${a.user.id}{--avatar-color:${a.user.color};}`)).join('\n')}</style>
    </div>
  );
}
