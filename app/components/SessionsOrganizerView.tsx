'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { TrainingSession, User } from '../types';
import {
  assignmentsForRole,
  formatSessionDate,
  matchesOrganizerFilter,
  sessionConfirmLabel,
  sessionRoleLabel,
  sessionStatusLabel,
  statusBadgeClass,
  type OrganizerStatusFilter,
} from '../lib/session-labels';
import type { SessionAssignmentRole, SessionAssignmentView } from '../types';
import { useI18n } from '@/app/lib/i18n';
import { CatalogSessionPicker, type CatalogSessionOption } from './CatalogSessionPicker';
import type { ParsedCatalogDates } from '@/app/lib/parse-catalog-dates';
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
    formateurEmails?: string[];
    assessorEmails?: string[];
    auditeurEmails?: string[];
  }) => Promise<TrainingSession>;
  onUpdateSession: (
    sessionId: string,
    payload: {
      startDate?: string;
      endDate?: string;
      altStartDate?: string | null;
      altEndDate?: string | null;
      examDate?: string | null;
      formateurEmails?: string[];
      assessorEmails?: string[];
      auditeurEmails?: string[];
    },
  ) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  /** Ouvre la vue « Dates de sessions » (catalogue). */
  onOpenSessionDates?: () => void;
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

type StaffPickRole = 'formateur' | 'assessor' | 'auditeur';

function staffForRole(staffList: StaffListItem[], role: StaffPickRole) {
  return staffList.filter(s => s.role === role && s.active);
}

function StaffMultiSelect({
  selectedEmails,
  onChange,
  role,
  staffList,
  label,
  emptyHint,
}: {
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  role: StaffPickRole;
  staffList: StaffListItem[];
  label: string;
  emptyHint: string;
}) {
  const options = staffForRole(staffList, role);
  const toggle = (email: string) => {
    if (selectedEmails.includes(email)) {
      onChange(selectedEmails.filter(e => e !== email));
    } else {
      onChange([...selectedEmails, email]);
    }
  };
  return (
    <div className="text-xs text-slate-400">
      <span className="font-medium text-slate-300">{label}</span>
      <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800/80 p-1">
        {options.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-slate-500">{emptyHint}</p>
        ) : (
          options.map(s => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-700/60"
            >
              <input
                type="checkbox"
                checked={selectedEmails.includes(s.email)}
                onChange={() => toggle(s.email)}
                className="rounded border-slate-500"
              />
              <span className="min-w-0 truncate text-slate-200">
                {s.name} <span className="text-slate-500">({s.email})</span>
              </span>
            </label>
          ))
        )}
      </div>
      {selectedEmails.length > 0 ? (
        <p className="mt-1 text-[10px] text-teal-400/90">
          {selectedEmails.length} sélectionné(s)
        </p>
      ) : null}
    </div>
  );
}

function AssigneeStack({
  assignees,
  locale,
}: {
  assignees: SessionAssignmentView[];
  locale: string;
}) {
  if (assignees.length === 0) {
    return <span className="text-xs text-slate-600">—</span>;
  }
  return (
    <ul className="space-y-2">
      {assignees.map(a => (
        <li key={a.id} className="flex items-center gap-2">
          <div
            className={`${styles.userAvatar} collab-avatar-${a.user.id}`}
            style={{ ['--avatar-color' as string]: a.user.color }}
          >
            {a.user.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-200">{a.user.name}</p>
            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${statusBadgeClass(a.status)}`}>
              {sessionStatusLabel(a.status, locale as 'fr' | 'en')}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface StaffListItem {
  id: string;
  email: string;
  name: string;
  role: 'formateur' | 'assessor' | 'auditeur';
  active: boolean;
}

function staffProposalsOnOwned(staffId: string, owned: TrainingSession[]) {
  return owned.flatMap(s =>
    s.assignments
      .filter(a => a.user.id === staffId)
      .map(a => ({
        sessionId: s.id,
        sessionTitle: s.title,
        role: a.role,
        status: a.status,
      })),
  );
}

export default function SessionsOrganizerView({
  sessions,
  currentUser,
  compactLayout,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onOpenSessionDates,
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
  const [formateurEmails, setFormateurEmails] = useState<string[]>([]);
  const [assessorEmails, setAssessorEmails] = useState<string[]>([]);
  const [auditeurEmails, setAuditeurEmails] = useState<string[]>([]);
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
  const [editFormateurEmails, setEditFormateurEmails] = useState<string[]>([]);
  const [editAssessorEmails, setEditAssessorEmails] = useState<string[]>([]);
  const [editAuditeurEmails, setEditAuditeurEmails] = useState<string[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<CatalogSessionOption[]>([]);
  const [catalogPays, setCatalogPays] = useState<'France' | 'Togo'>('France');
  const [catalogAId, setCatalogAId] = useState('');
  const [catalogBId, setCatalogBId] = useState('');
  const [staffCatalogPays, setStaffCatalogPays] = useState<'France' | 'Togo'>('France');
  const [staffCatalogAId, setStaffCatalogAId] = useState('');
  const [staffCatalogBId, setStaffCatalogBId] = useState('');
  const [editCatalogPays, setEditCatalogPays] = useState<'France' | 'Togo'>('France');
  const [editCatalogAId, setEditCatalogAId] = useState('');
  const [editCatalogBId, setEditCatalogBId] = useState('');
  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [staffListLoading, setStaffListLoading] = useState(false);
  const [showStaffList, setShowStaffList] = useState(true);

  const fetchStaffList = useCallback(async () => {
    setStaffListLoading(true);
    try {
      const res = await fetch('/api/staff', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setStaffList(data as StaffListItem[]);
    } catch {
      /* ignore */
    } finally {
      setStaffListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStaffList();
  }, [fetchStaffList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/session-catalog', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setCatalogOptions(data.filter((row: CatalogSessionOption) => row.actif !== false));
        }
      } catch {
        /* catalogue optionnel */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPrimaryDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setStartDate('');
      setEndDate('');
      setExamDate('');
      return;
    }
    setStartDate(parsed.startDate);
    setEndDate(parsed.endDate);
    setExamDate(parsed.examDate ?? '');
  };

  const applyAltDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setAltStartDate('');
      setAltEndDate('');
      return;
    }
    setAltStartDate(parsed.startDate);
    setAltEndDate(parsed.endDate);
  };

  const applyStaffPrimaryDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setStaffStart('');
      setStaffEnd('');
      setStaffExam('');
      return;
    }
    setStaffStart(parsed.startDate);
    setStaffEnd(parsed.endDate);
    setStaffExam(parsed.examDate ?? '');
  };

  const applyStaffAltDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setStaffAltStart('');
      setStaffAltEnd('');
      return;
    }
    setStaffAltStart(parsed.startDate);
    setStaffAltEnd(parsed.endDate);
  };

  const applyEditPrimaryDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setEditStart('');
      setEditEnd('');
      setEditExam('');
      return;
    }
    setEditStart(parsed.startDate);
    setEditEnd(parsed.endDate);
    setEditExam(parsed.examDate ?? '');
  };

  const applyEditAltDates = (parsed: ParsedCatalogDates | null) => {
    if (!parsed) {
      setEditAltStart('');
      setEditAltEnd('');
      return;
    }
    setEditAltStart(parsed.startDate);
    setEditAltEnd(parsed.endDate);
  };

  const resetCreateCatalog = () => {
    setCatalogAId('');
    setCatalogBId('');
    setStartDate('');
    setEndDate('');
    setAltStartDate('');
    setAltEndDate('');
    setExamDate('');
  };

  const owned = useMemo(
    () => sessions.filter(s => s.createdBy === currentUser.id),
    [sessions, currentUser.id],
  );

  const staffListSorted = useMemo(() => {
    return [...staffList].sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [staffList, locale]);

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
    setEditFormateurEmails(assignmentsForRole(s, 'formateur').map(a => a.user.email));
    setEditAssessorEmails(assignmentsForRole(s, 'assessor').map(a => a.user.email));
    setEditAuditeurEmails(assignmentsForRole(s, 'auditeur').map(a => a.user.email));
    setEditCatalogAId('');
    setEditCatalogBId('');
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
        formateurEmails,
        assessorEmails,
        auditeurEmails,
      });
      setStartDate('');
      setEndDate('');
      setAltStartDate('');
      setAltEndDate('');
      setExamDate('');
      setFormateurEmails([]);
      setAssessorEmails([]);
      setAuditeurEmails([]);
      resetCreateCatalog();
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
      void fetchStaffList();
      setStaffFirstName('');
      setStaffLastName('');
      setStaffEmail('');
      setStaffStart('');
      setStaffEnd('');
      setStaffAltStart('');
      setStaffAltEnd('');
      setStaffExam('');
      setStaffCatalogAId('');
      setStaffCatalogBId('');
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
        formateurEmails: editFormateurEmails,
        assessorEmails: editAssessorEmails,
        auditeurEmails: editAuditeurEmails,
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
          {onOpenSessionDates ? (
            <button
              type="button"
              onClick={onOpenSessionDates}
              className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20"
            >
              {t('sessions.organizer.openSessionDates')}
            </button>
          ) : null}
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
              <CatalogSessionPicker
                options={catalogOptions}
                pays={staffCatalogPays}
                onPaysChange={(p) => {
                  setStaffCatalogPays(p);
                  setStaffCatalogAId('');
                  setStaffCatalogBId('');
                  applyStaffPrimaryDates(null);
                  applyStaffAltDates(null);
                }}
                optionAId={staffCatalogAId}
                optionBId={staffCatalogBId}
                onOptionAChange={(id, parsed) => {
                  setStaffCatalogAId(id);
                  applyStaffPrimaryDates(parsed);
                }}
                onOptionBChange={(id, parsed) => {
                  setStaffCatalogBId(id);
                  applyStaffAltDates(parsed);
                }}
                compact
              />
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
            <CatalogSessionPicker
              options={catalogOptions}
              pays={catalogPays}
              onPaysChange={(p) => {
                setCatalogPays(p);
                setCatalogAId('');
                setCatalogBId('');
                applyPrimaryDates(null);
                applyAltDates(null);
              }}
              optionAId={catalogAId}
              optionBId={catalogBId}
              onOptionAChange={(id, parsed) => {
                setCatalogAId(id);
                applyPrimaryDates(parsed);
              }}
              onOptionBChange={(id, parsed) => {
                setCatalogBId(id);
                applyAltDates(parsed);
              }}
            />
            <p className="text-xs text-slate-500">{t('sessions.organizer.multiInviteHint')}</p>
            <div className="grid gap-3 lg:grid-cols-3">
              <StaffMultiSelect
                label={t('sessions.organizer.formateurEmail')}
                selectedEmails={formateurEmails}
                onChange={setFormateurEmails}
                role="formateur"
                staffList={staffList}
                emptyHint={t('sessions.organizer.staffList.empty')}
              />
              <StaffMultiSelect
                label={t('sessions.organizer.assessorEmail')}
                selectedEmails={assessorEmails}
                onChange={setAssessorEmails}
                role="assessor"
                staffList={staffList}
                emptyHint={t('sessions.organizer.staffList.empty')}
              />
              <StaffMultiSelect
                label={t('sessions.roles.auditeur')}
                selectedEmails={auditeurEmails}
                onChange={setAuditeurEmails}
                role="auditeur"
                staffList={staffList}
                emptyHint={t('sessions.organizer.staffList.empty')}
              />
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

        <section className="mb-4 rounded-xl border border-slate-700/80 bg-slate-900/50">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {t('sessions.organizer.staffList.title')}
                </h3>
                <p className="text-[11px] text-slate-500">{t('sessions.organizer.staffList.subtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchStaffList()}
                  disabled={staffListLoading}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  {staffListLoading
                    ? t('sessions.organizer.staffList.refreshing')
                    : t('sessions.organizer.staffList.refresh')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStaffList(v => !v)}
                  className="rounded-lg border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  {showStaffList ? t('sessions.organizer.staffList.hide') : t('sessions.organizer.staffList.show')}
                </button>
              </div>
            </div>
            {showStaffList ? (
              staffListLoading && staffListSorted.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  {t('sessions.organizer.staffList.loading')}
                </p>
              ) : staffListSorted.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  {t('sessions.organizer.staffList.empty')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2">{t('sessions.organizer.staffList.colName')}</th>
                        <th className="px-3 py-2">{t('sessions.organizer.staffList.colEmail')}</th>
                        <th className="px-3 py-2">{t('sessions.organizer.staffList.colRole')}</th>
                        <th className="px-3 py-2">{t('sessions.organizer.staffList.colProposals')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffListSorted.map(member => {
                        const proposals = staffProposalsOnOwned(member.id, owned);
                        const roleKey = member.role as 'formateur' | 'assessor' | 'auditeur';
                        const roleLabel =
                          roleKey === 'auditeur'
                            ? t('sessions.roles.auditeur')
                            : sessionRoleLabel(roleKey, locale);
                        return (
                          <tr
                            key={member.id}
                            className="border-b border-slate-800/60 hover:bg-slate-800/30"
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-100">
                              {member.name}
                              {!member.active ? (
                                <span className="ml-1.5 text-[10px] text-red-400">
                                  ({t('sessions.organizer.staffList.inactive')})
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-slate-400">{member.email}</td>
                            <td className="px-3 py-2.5">
                              <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                                {roleLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-400">
                              {proposals.length === 0 ? (
                                <span className="text-amber-400/90">
                                  {t('sessions.organizer.staffList.noProposal')}
                                </span>
                              ) : (
                                <ul className="space-y-1">
                                  {proposals.map(p => (
                                    <li key={`${p.sessionId}-${p.role}`}>
                                      <span className="text-slate-300">{p.sessionTitle}</span>
                                      <span className="text-slate-600"> · </span>
                                      <span className="text-slate-500">
                                        {sessionRoleLabel(p.role, locale)}
                                      </span>
                                      <span className="text-slate-600"> · </span>
                                      <span
                                        className={`rounded px-1 py-0.5 text-[10px] ${statusBadgeClass(p.status)}`}
                                      >
                                        {sessionStatusLabel(p.status, locale)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </section>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <p className="text-sm">{t('sessions.organizer.emptyFilter')}</p>
            {owned.length === 0 ? (
              <p className="mt-1 text-xs">{t('sessions.organizer.emptyOwned')}</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/80">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.session')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.period')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.formateur')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.assessor')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.auditeur')}</th>
                  <th className="px-3 py-2.5">{t('sessions.organizer.table.globalState')}</th>
                  <th className="px-3 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const formateurs = assignmentsForRole(s, 'formateur');
                  const assessors = assignmentsForRole(s, 'assessor');
                  const auditeurs = assignmentsForRole(s, 'auditeur');
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
                        <td className="px-3 py-3 align-top">
                          <AssigneeStack assignees={formateurs} locale={locale} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <AssigneeStack assignees={assessors} locale={locale} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <AssigneeStack assignees={auditeurs} locale={locale} />
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
                          <td colSpan={7} className="px-3 py-4">
                            <CatalogSessionPicker
                              options={catalogOptions}
                              pays={editCatalogPays}
                              onPaysChange={(p) => {
                                setEditCatalogPays(p);
                                setEditCatalogAId('');
                                setEditCatalogBId('');
                              }}
                              optionAId={editCatalogAId}
                              optionBId={editCatalogBId}
                              onOptionAChange={(id, parsed) => {
                                setEditCatalogAId(id);
                                if (parsed) applyEditPrimaryDates(parsed);
                              }}
                              onOptionBChange={(id, parsed) => {
                                setEditCatalogBId(id);
                                if (parsed) applyEditAltDates(parsed);
                                else applyEditAltDates(null);
                              }}
                              compact
                            />
                            <div className="mt-3 grid gap-3 lg:grid-cols-3">
                              <StaffMultiSelect
                                label={sessionRoleLabel('formateur', locale)}
                                selectedEmails={editFormateurEmails}
                                onChange={setEditFormateurEmails}
                                role="formateur"
                                staffList={staffList}
                                emptyHint={t('sessions.organizer.staffList.empty')}
                              />
                              <StaffMultiSelect
                                label={sessionRoleLabel('assessor', locale)}
                                selectedEmails={editAssessorEmails}
                                onChange={setEditAssessorEmails}
                                role="assessor"
                                staffList={staffList}
                                emptyHint={t('sessions.organizer.staffList.empty')}
                              />
                              <StaffMultiSelect
                                label={t('sessions.roles.auditeur')}
                                selectedEmails={editAuditeurEmails}
                                onChange={setEditAuditeurEmails}
                                role="auditeur"
                                staffList={staffList}
                                emptyHint={t('sessions.organizer.staffList.empty')}
                              />
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
