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
    altStartDate?: string | null;
    altEndDate?: string | null;
    examDate?: string | null;
    formateurEmail?: string;
    assessorEmail?: string;
  }) => Promise<TrainingSession>;
  onUpdateSession: (
    sessionId: string,
    payload: {
      startDate?: string;
      endDate?: string;
      altStartDate?: string | null;
      altEndDate?: string | null;
      examDate?: string | null;
      formateurEmail?: string | null;
      assessorEmail?: string | null;
    },
  ) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onCreateStaff?: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    role: 'formateur' | 'assessor' | 'auditeur';
    sendInvite?: boolean;
    session?: {
      startDate: string;
      endDate: string;
      altStartDate?: string | null;
      altEndDate?: string | null;
      examDate?: string | null;
    };
  }) => Promise<void>;
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
  onCreateStaff,
}: SessionsOrganizerViewProps) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<OrganizerStatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [altStartDate, setAltStartDate] = useState('');
  const [altEndDate, setAltEndDate] = useState('');
  const [examDate, setExamDate] = useState('');
  const [formateurEmail, setFormateurEmail] = useState('');
  const [assessorEmail, setAssessorEmail] = useState('');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'formateur' | 'assessor' | 'auditeur'>('formateur');
  const [staffSendInvite, setStaffSendInvite] = useState(true);
  const [staffAddDates, setStaffAddDates] = useState(false);
  const [staffStart, setStaffStart] = useState('');
  const [staffEnd, setStaffEnd] = useState('');
  const [staffAltStart, setStaffAltStart] = useState('');
  const [staffAltEnd, setStaffAltEnd] = useState('');
  const [staffExam, setStaffExam] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editAltStart, setEditAltStart] = useState('');
  const [editAltEnd, setEditAltEnd] = useState('');
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
    setEditAltStart(s.altStartDate ?? '');
    setEditAltEnd(s.altEndDate ?? '');
    setEditExam(s.examDate ?? '');
    setEditFormateur(assignmentFor(s, 'formateur')?.user.email ?? '');
    setEditAssessor(assignmentFor(s, 'assessor')?.user.email ?? '');
    setError(null);
  };

  const formatPeriod = (s: TrainingSession) => {
    const a = `${formatSessionDate(s.startDate, locale)} → ${formatSessionDate(s.endDate, locale)}`;
    if (s.altStartDate && s.altEndDate) {
      const b = `${formatSessionDate(s.altStartDate, locale)} → ${formatSessionDate(s.altEndDate, locale)}`;
      return (
        <>
          <span className="block">{t('sessions.organizer.optionAShort')} : {a}</span>
          <span className="mt-0.5 block text-amber-400/90">{t('sessions.organizer.optionBShort')} : {b}</span>
        </>
      );
    }
    return a;
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
        altStartDate: altStartDate.trim() || null,
        altEndDate: altEndDate.trim() || null,
        examDate: examDate.trim() || null,
        formateurEmail: formateurEmail.trim() || undefined,
        assessorEmail: assessorEmail.trim() || undefined,
      });
      setStartDate('');
      setEndDate('');
      setAltStartDate('');
      setAltEndDate('');
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !onCreateStaff) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Parameters<NonNullable<typeof onCreateStaff>>[0] = {
        firstName: staffFirstName.trim(),
        lastName: staffLastName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
        sendInvite: staffSendInvite,
      };
      if (staffAddDates && staffStart && staffEnd) {
        payload.session = {
          startDate: staffStart,
          endDate: staffEnd,
          altStartDate: staffAltStart.trim() || null,
          altEndDate: staffAltEnd.trim() || null,
          examDate: staffExam.trim() || null,
        };
      }
      await onCreateStaff(payload);
      setSuccess(t('sessions.organizer.staff.created'));
      setStaffFirstName('');
      setStaffLastName('');
      setStaffEmail('');
      setStaffStart('');
      setStaffEnd('');
      setStaffAltStart('');
      setStaffAltEnd('');
      setStaffExam('');
      setStaffAddDates(false);
      setShowStaff(false);
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
        altStartDate: editAltStart.trim() || null,
        altEndDate: editAltEnd.trim() || null,
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
          {onCreateStaff ? (
            <button
              type="button"
              onClick={() => setShowStaff(v => !v)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {showStaff ? t('sessions.organizer.closeForm') : t('sessions.organizer.staff.title')}
            </button>
          ) : null}
        </div>

        {showStaff && onCreateStaff ? (
          <form onSubmit={handleCreateStaff} className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <p className="text-xs text-slate-500">{t('sessions.organizer.staff.subtitle')}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.staff.firstName')}
                <input value={staffFirstName} onChange={e => setStaffFirstName(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.staff.lastName')}
                <input value={staffLastName} onChange={e => setStaffLastName(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400 sm:col-span-2">
                {t('sessions.organizer.staff.email')}
                <input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.staff.role')}
                <select value={staffRole} onChange={e => setStaffRole(e.target.value as typeof staffRole)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200">
                  <option value="formateur">{t('sessions.roles.formateur')}</option>
                  <option value="assessor">{t('sessions.roles.assessor')}</option>
                  <option value="auditeur">{t('sessions.roles.auditeur')}</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-3">
                <input type="checkbox" checked={staffSendInvite} onChange={e => setStaffSendInvite(e.target.checked)} />
                {t('sessions.organizer.staff.sendInvite')}
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-4">
                <input type="checkbox" checked={staffAddDates} onChange={e => setStaffAddDates(e.target.checked)} />
                {t('sessions.organizer.staff.addDates')}
              </label>
            </div>
            {staffAddDates ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-lg border border-slate-700/80 p-3">
                <label className="block text-xs text-slate-400">
                  {t('sessions.organizer.optionA')}
                  <input type="date" value={staffStart} onChange={e => setStaffStart(e.target.value)} required={staffAddDates}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
                </label>
                <label className="block text-xs text-slate-400">
                  {t('sessions.organizer.optionAEnd')}
                  <input type="date" value={staffEnd} onChange={e => setStaffEnd(e.target.value)} required={staffAddDates}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
                </label>
                <label className="block text-xs text-slate-400">
                  {t('sessions.organizer.examOptional')}
                  <input type="date" value={staffExam} onChange={e => setStaffExam(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
                </label>
                <label className="block text-xs text-slate-400">
                  {t('sessions.organizer.optionB')}
                  <input type="date" value={staffAltStart} onChange={e => setStaffAltStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
                </label>
                <label className="block text-xs text-slate-400">
                  {t('sessions.organizer.optionBEnd')}
                  <input type="date" value={staffAltEnd} onChange={e => setStaffAltEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
                </label>
              </div>
            ) : null}
            <button type="submit" disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {busy ? t('sessions.organizer.staff.creating') : t('sessions.organizer.staff.create')}
            </button>
          </form>
        ) : null}

        {showCreate ? (
          <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <p className="text-xs text-slate-500">{t('sessions.organizer.autoTitleHint')}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.optionA')}
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.optionAEnd')}
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.examOptional')}
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.optionB')}
                <input type="date" value={altStartDate} onChange={e => setAltStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200" />
              </label>
              <label className="block text-xs text-slate-400">
                {t('sessions.organizer.optionBEnd')}
                <input type="date" value={altEndDate} onChange={e => setAltEndDate(e.target.value)}
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
        {success ? <p className="mb-3 text-sm text-emerald-400">{success}</p> : null}

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
                          {formatPeriod(s)}
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
                                {t('sessions.organizer.optionA')}
                                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.optionAEnd')}
                                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.exam')}
                                <input type="date" value={editExam} onChange={e => setEditExam(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.optionB')}
                                <input type="date" value={editAltStart} onChange={e => setEditAltStart(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm" />
                              </label>
                              <label className="text-xs text-slate-400">
                                {t('sessions.organizer.optionBEnd')}
                                <input type="date" value={editAltEnd} onChange={e => setEditAltEnd(e.target.value)}
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
