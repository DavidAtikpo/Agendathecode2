'use client';

import { Fragment, useMemo, useState } from 'react';
import type { TrainingSession, User } from '../types';
import {
  assignmentFor,
  formatSessionDate,
  matchesOrganizerFilter,
  sessionConfirmLabel,
  sessionRoleLabel,
  sessionStatusLabel,
  statusBadgeClass,
  type OrganizerStatusFilter,
} from '../lib/session-labels';
import { useI18n } from '@/app/lib/i18n';
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

const ORGANIZER_FILTER_KEYS: OrganizerStatusFilter[] = [
  'all',
  'pending',
  'accepted',
  'declined',
  'confirmed',
];

export default function SessionsOrganizerView({
  sessions,
  currentUser,
  compactLayout,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
}: SessionsOrganizerViewProps) {
  const { locale, t } = useI18n();
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
      setError(err instanceof Error ? err.message : t('common.status.error'));
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
      setError(err instanceof Error ? err.message : t('common.status.error'));
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
              {t('sessions.organizer.title')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('sessions.organizer.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(v => !v)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            {showCreate ? t('sessions.organizer.closeForm') : t('sessions.organizer.newSession')}
          </button>
        </div>

        {showCreate ? (
          <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <p className="text-xs text-slate-500">{t('sessions.organizer.autoTitleHint')}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.start')}
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.end')}
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.examOptional')}
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400 sm:col-span-2 lg:col-span-1">
                {t('sessions.organizer.formateurEmail')}
                <input type="email" value={formateurEmail} onChange={e => setFormateurEmail(e.target.value)}
                  placeholder={t('sessions.organizer.formateurPlaceholder')}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400 sm:col-span-2">
                {t('sessions.organizer.assessorEmail')}
                <input type="email" value={assessorEmail} onChange={e => setAssessorEmail(e.target.value)}
                  placeholder={t('sessions.organizer.assessorPlaceholder')}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
            </div>
            <button type="submit" disabled={busy || !startDate || !endDate}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50">
              {busy ? t('sessions.organizer.creating') : t('sessions.organizer.propose')}
            </button>
          </form>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label={t('sessions.organizer.filterAria')}>
          {ORGANIZER_FILTER_KEYS.map(key => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-teal-500/25 text-teal-200'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(`sessions.organizer.filters.${key}`)}
              <span className="ml-1 tabular-nums opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-auto ${pad}`}>
        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <p className="text-sm">{t('sessions.organizer.emptyFilter')}</p>
            {owned.length === 0 ? (
              <p className="mt-1 text-xs">{t('sessions.organizer.emptyOwned')}</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/80">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.session')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.period')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.formateur')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.assessor')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.globalState')}</th>
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
                          {formatSessionDate(s.startDate, locale)} → {formatSessionDate(s.endDate, locale)}
                          {s.examDate ? (
                            <span className="mt-0.5 block text-teal-400/80">
                              {t('sessions.organizer.exam')} {formatSessionDate(s.examDate, locale)}
                            </span>
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
                                  {sessionStatusLabel(formateur.status, locale)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">{t('common.labels.none')}</span>
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
                                  {sessionStatusLabel(assessor.status, locale)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">{t('common.labels.none')}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                            {sessionConfirmLabel(s, locale)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => (editing ? setEditId(null) : openEdit(s))}
                            className="text-xs text-teal-400 hover:text-teal-300"
                          >
                            {editing ? t('sessions.organizer.cancel') : t('sessions.organizer.edit')}
                          </button>
                        </td>
                      </tr>
                      {editing ? (
                        <tr className="border-b border-slate-800 bg-slate-800/40">
                          <td colSpan={6} className="px-3 py-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.start')}
                                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.end')}
                                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.exam')}
                                <input type="date" value={editExam} onChange={e => setEditExam(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {sessionRoleLabel('formateur', locale)}
                                <input type="email" value={editFormateur} onChange={e => setEditFormateur(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400 sm:col-span-2">
                                {sessionRoleLabel('assessor', locale)}
                                <input type="email" value={editAssessor} onChange={e => setEditAssessor(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" disabled={busy} onClick={() => void handleSaveEdit(s.id)}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-500 disabled:opacity-50">
                                {t('sessions.organizer.save')}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  if (!confirm(t('sessions.organizer.deleteConfirm'))) return;
                                  setBusy(true);
                                  try {
                                    await onDeleteSession(s.id);
                                    setEditId(null);
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : t('common.status.error'));
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                              >
                                {t('sessions.organizer.delete')}
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
