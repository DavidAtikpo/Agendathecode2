'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SessionAssignmentRole, TrainingSession, User } from '../types';
import {
  formatSessionDate,
  matchesAssigneeFilter,
  myAssignment,
  sessionRoleLabel,
  sessionStatusLabel,
  statusBadgeClass,
  type AssigneeStatusFilter,
} from '../lib/session-labels';
import { useI18n } from '@/app/lib/i18n';

interface SessionsAssigneeViewProps {
  sessions: TrainingSession[];
  currentUser: User;
  compactLayout?: boolean;
  filter: AssigneeStatusFilter;
  onRespondSession: (
    sessionId: string,
    role: SessionAssignmentRole,
    status: 'accepted' | 'declined',
    acceptedOption?: 'primary' | 'alternative',
  ) => Promise<void>;
  /** Rafraîchit le profil (ex. lien a-finpart après acceptation). */
  onRefreshUser?: () => Promise<void>;
  onUserUpdated?: (user: User) => void;
}

export default function SessionsAssigneeView({
  sessions,
  currentUser,
  compactLayout,
  filter,
  onRespondSession,
  onRefreshUser,
  onUserUpdated,
}: SessionsAssigneeViewProps) {
  const { locale, t, dateLocale } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (onRefreshUser) await onRefreshUser();
        const res = await fetch('/api/user/webirata-sync', {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.user && onUserUpdated) onUserUpdated(data.user as User);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync une fois à l’ouverture de Mes propositions
  }, []);

  const assigned = useMemo(
    () => sessions.filter(s => myAssignment(s, currentUser.id)),
    [sessions, currentUser.id],
  );

  const filtered = useMemo(
    () => assigned.filter(s => matchesAssigneeFilter(s, currentUser.id, filter)),
    [assigned, currentUser.id, filter],
  );

  const respond = async (
    sessionId: string,
    role: SessionAssignmentRole,
    status: 'accepted' | 'declined',
    acceptedOption?: 'primary' | 'alternative',
  ) => {
    setBusyId(sessionId);
    setError(null);
    try {
      await onRespondSession(sessionId, role, status, acceptedOption);
      if (status === 'accepted' && onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.status.error'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <div className={`min-h-0 flex-1 overflow-auto ${compactLayout ? 'px-3 py-3' : 'px-4 py-4 md:px-6 md:py-5'}`}>
        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <p className="text-sm">
              {assigned.length === 0
                ? t('sessions.assignee.emptyNone')
                : t('sessions.assignee.emptyFilter')}
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
                          {sessionRoleLabel(mine.role, locale)}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(mine.status)}`}
                        >
                          {sessionStatusLabel(mine.status, locale)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-100">{s.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t('sessions.organizer.optionAShort')} :{' '}
                        {formatSessionDate(s.startDate, locale)} →{' '}
                        {formatSessionDate(s.endDate, locale)}
                        {s.altStartDate && s.altEndDate ? (
                          <span className="mt-0.5 block text-amber-400/90">
                            {t('sessions.organizer.optionBShort')} :{' '}
                            {formatSessionDate(s.altStartDate, locale)} →{' '}
                            {formatSessionDate(s.altEndDate, locale)}
                          </span>
                        ) : null}
                        {s.examDate
                          ? ` · ${t('sessions.organizer.exam')} ${formatSessionDate(s.examDate, locale)}`
                          : ''}
                      </p>
                      {s.creatorName ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {t('sessions.assignee.organizer', { name: s.creatorName })}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {mine.status === 'pending' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.altStartDate && s.altEndDate ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void respond(s.id, mine.role, 'accepted', 'primary')}
                            className="min-w-[8rem] flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:flex-none sm:px-4"
                          >
                            {t('sessions.assignee.acceptOptionA')}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void respond(s.id, mine.role, 'accepted', 'alternative')}
                            className="min-w-[8rem] flex-1 rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 sm:flex-none sm:px-4"
                          >
                            {t('sessions.assignee.acceptOptionB')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void respond(s.id, mine.role, 'accepted')}
                          className="min-w-[8rem] flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:flex-none sm:px-6"
                        >
                          {t('sessions.assignee.respondAvailable')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(s.id, mine.role, 'declined')}
                        className="min-w-[8rem] flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 sm:flex-none sm:px-6"
                      >
                        {t('sessions.assignee.respondUnavailable')}
                      </button>
                    </div>
                  ) : mine.respondedAt ? (
                    <p className="mt-3 text-[11px] text-slate-500">
                      {t('sessions.assignee.respondedAt', {
                        date: new Date(mine.respondedAt).toLocaleDateString(dateLocale, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
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
