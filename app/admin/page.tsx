'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { I18nProvider, useI18n, type AppLocale } from '@/app/lib/i18n';
import {
  ROLE_BADGE_COLORS,
  getRoleDescriptions,
  getRoleLabels,
  type AppUserRole,
  normalizeAppUserRole,
} from '@/app/lib/user-roles';

const BRAND_LOGO = '/logo (1).png';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  role: AppUserRole;
  active: boolean;
  aiCredits: number;
  aiCreditsExpiresAt: string | null;
  unreadNotificationCount: number;
  createdAt: string;
  hasGoogle: boolean;
  hasPassword: boolean;
  hasStripeSubscription: boolean;
  notesCount: number;
  tasksCount: number;
  groupsCount: number;
  sessionsCreatedCount: number;
  sessionAssignmentsCount: number;
}
interface AdminNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

interface Stats {
  totalUsers: number;
  proUsers: number;
  adminUsers: number;
  organizerUsers: number;
  formateurUsers: number;
  assessorUsers: number;
  disabledUsers: number;
  totalNotes: number;
  totalTasks: number;
  totalSessions: number;
  totalGroups: number;
  totalCreditsInCirculation: number;
  tasksByStatus: Record<string, number>;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    plan: string;
    role: string;
  }[];
}
function StatCard({
  label,
  value,
  color = 'text-white',
  dateLocale,
}: {
  label: string;
  value: string | number;
  color?: string;
  dateLocale: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString(dateLocale) : value}</p>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${color}`}>{label}</span>;
}

function RoleBadge({ role, roleLabels }: { role: string; roleLabels: Record<AppUserRole, string> }) {
  const r = normalizeAppUserRole(role);
  return <Badge label={roleLabels[r]} color={ROLE_BADGE_COLORS[r]} />;
}

function formatDate(iso: string, dateLocale: string, withTime = false) {
  return new Date(iso).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function authLabel(u: AdminUser, t: ReturnType<typeof useI18n>['t']) {
  if (u.hasGoogle && u.hasPassword) return t('admin.auth.googlePassword');
  if (u.hasGoogle) return t('admin.auth.google');
  if (u.hasPassword) return t('admin.auth.password');
  return t('common.labels.none');
}

function AdminPageInner() {
  const router = useRouter();
  const { t, dateLocale } = useI18n();
  const locale: AppLocale = dateLocale === 'en-US' ? 'en' : 'fr';
  const roleLabels = useMemo(() => getRoleLabels(locale), [locale]);
  const roleDescriptions = useMemo(() => getRoleDescriptions(locale), [locale]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'pro'>('all');
  const [filterRole, setFilterRole] = useState<'all' | AppUserRole>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'disabled'>('all');
  // Edit modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<{
    plan: 'free' | 'pro';
    role: AppUserRole;
    aiCredits: number;
    active: boolean;
  }>({
    plan: 'free',
    role: 'user',
    aiCredits: 0,
    active: true,
  });  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Notes drawer
  const [viewingNotes, setViewingNotes] = useState<AdminUser | null>(null);
  const [userNotes, setUserNotes] = useState<AdminNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
      ]);
      if (statsRes.status === 401 || usersRes.status === 401) { router.push('/'); return; }
      if (statsRes.status === 403 || usersRes.status === 403) {
        setError(t('admin.accessDenied'));
        setLoading(false);
        return;
      }
      const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()]);
      setStats(statsData);
      setUsers(usersData);
    } catch {
      setError(t('admin.loadError'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({ plan: u.plan, role: u.role, aiCredits: u.aiCredits, active: u.active });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? t('common.status.error')); return; }
      const updated: AdminUser = await res.json();
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ active: !u.active }),
    });
    if (res.ok) {
      const updated: AdminUser = await res.json();
      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    }
  };

  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? t('common.status.error')); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteConfirm(null);
    void fetchData();
  };

  const openNotes = async (u: AdminUser) => {
    setViewingNotes(u);
    setNotesLoading(true);
    setUserNotes([]);
    setExpandedNote(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { credentials: 'include' });
      if (res.ok) setUserNotes(await res.json());
    } finally {
      setNotesLoading(false);
    }
  };

  const filtered = useMemo(() => users.filter(u => {
    if (filterPlan !== 'all' && u.plan !== filterPlan) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterActive === 'active' && !u.active) return false;
    if (filterActive === 'disabled' && u.active) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      roleLabels[u.role].toLowerCase().includes(q)
    );
  }), [users, filterPlan, filterRole, filterActive, search, roleLabels]);

  const roleCounts = useMemo(() => {
    const counts: Record<AppUserRole, number> = {
      user: 0,
      admin: 0,
      organizer: 0,
      formateur: 0,
      assessor: 0,
    };
    for (const u of users) counts[u.role] += 1;
    return counts;
  }, [users]);
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
        {t('admin.loading')}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="max-w-sm rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-lg font-semibold text-red-300">{error}</p>
        <button onClick={() => router.push('/')} className="mt-4 rounded-xl bg-slate-700 px-6 py-2 text-sm font-medium text-white hover:bg-slate-600">
          {t('admin.backHome')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={BRAND_LOGO} alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-base font-bold text-white">{t('admin.title')}</h1>
              <p className="text-xs text-slate-500">{t('admin.subtitle')}</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700">
            {t('admin.backToApp')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">

        {/* Stats */}
        {stats && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('admin.overview')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label={t('admin.stats.users')} value={stats.totalUsers} color="text-indigo-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.pro')} value={stats.proUsers} color="text-amber-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.disabled')} value={stats.disabledUsers} color="text-red-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.notes')} value={stats.totalNotes} color="text-emerald-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.tasks')} value={stats.totalTasks} color="text-blue-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.aiCredits')} value={stats.totalCreditsInCirculation} color="text-rose-300" dateLocale={dateLocale} />
            </div>

            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-3">{t('admin.trainingTeams')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label={t('admin.stats.organizers')} value={stats.organizerUsers} color="text-teal-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.trainers')} value={stats.formateurUsers} color="text-indigo-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.assessors')} value={stats.assessorUsers} color="text-sky-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.admins')} value={stats.adminUsers} color="text-violet-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.sessions')} value={stats.totalSessions} color="text-cyan-300" dateLocale={dateLocale} />
              <StatCard label={t('admin.stats.groups')} value={stats.totalGroups} color="text-fuchsia-300" dateLocale={dateLocale} />
            </div>

            {/* Rôles — légende */}
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('admin.accountRoles')}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(roleLabels) as AppUserRole[]).map(r => (
                  <div key={r} className="flex gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                    <RoleBadge role={r} roleLabels={roleLabels} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 leading-snug">{roleDescriptions[r]}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-500 tabular-nums">
                        {roleCounts[r] === 1
                          ? t('admin.accountCount', { count: roleCounts[r] })
                          : t('admin.accountCountPlural', { count: roleCounts[r] })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tasks by status */}
              {Object.keys(stats.tasksByStatus).length > 0 && (
                <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('admin.tasksByStatus')}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.tasksByStatus).map(([status, count]) => {
                      const statusKey = `admin.taskStatus.${status}`;
                      const statusLabel = t(statusKey);
                      return (
                      <span key={status} className="rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-300">
                        {statusLabel === statusKey ? status : statusLabel} : <strong className="text-white">{count}</strong>
                      </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent signups */}
              {stats.recentUsers.length > 0 && (
                <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('admin.recentSignups')}</p>
                  <ul className="space-y-2">
                    {stats.recentUsers.map(u => (
                      <li key={u.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Badge label={u.plan} color={u.plan === 'pro' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-600/50 text-slate-400'} />
                          <RoleBadge role={u.role} roleLabels={roleLabels} />
                          <span className="text-[10px] text-slate-600 whitespace-nowrap">
                            {formatDate(u.createdAt, dateLocale)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Users table */}
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.users', { filtered: filtered.length, total: users.length })}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Plan filter */}
              <div className="flex rounded-xl border border-slate-600 bg-slate-800 overflow-hidden text-xs font-medium">
                {(['all', 'free', 'pro'] as const).map(v => (
                  <button key={v} onClick={() => setFilterPlan(v)}
                    className={`px-3 py-1.5 transition-colors ${filterPlan === v ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {v === 'all' ? t('admin.filters.allPlans') : v === 'free' ? t('common.labels.free') : t('common.labels.pro')}
                  </button>
                ))}
              </div>
              {/* Role filter */}
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value as 'all' | AppUserRole)}
                className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">{t('admin.filters.allRoles')}</option>
                {(Object.keys(roleLabels) as AppUserRole[]).map(r => (
                  <option key={r} value={r}>{roleLabels[r]}</option>
                ))}
              </select>              {/* Active filter */}
              <div className="flex rounded-xl border border-slate-600 bg-slate-800 overflow-hidden text-xs font-medium">
                {([['all', t('admin.filters.all')], ['active', t('admin.filters.active')], ['disabled', t('admin.filters.disabled')]] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setFilterActive(v)}
                    className={`px-3 py-1.5 transition-colors ${filterActive === v ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('admin.filters.searchPlaceholder')}
                className="w-48 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">{t('admin.table.user')}</th>
                  <th className="px-4 py-3">{t('admin.table.status')}</th>
                  <th className="px-4 py-3">{t('admin.table.planRole')}</th>
                  <th className="px-4 py-3">{t('admin.table.auth')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.credits')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.notes')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.tasks')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.groups')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.sessions')}</th>
                  <th className="px-4 py-3">{t('admin.table.joined')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.table.actions')}</th>                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-700/30 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {u.hasStripeSubscription && (
                          <span className="text-[10px] text-amber-500/90">{t('admin.table.stripe')}</span>
                        )}
                      </div>
                    </td>                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleActive(u)}
                        title={u.active ? t('admin.status.deactivateTitle') : t('admin.status.activateTitle')}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase transition-colors cursor-pointer ${
                          u.active
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-red-500/20 hover:text-red-300'
                            : 'bg-red-500/20 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-300'
                        }`}
                      >
                        {u.active ? t('admin.status.active') : t('admin.status.disabled')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge label={u.plan} color={u.plan === 'pro' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-600/50 text-slate-400'} />
                        <RoleBadge role={u.role} roleLabels={roleLabels} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{authLabel(u, t)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="tabular-nums text-slate-300">{u.aiCredits.toLocaleString(dateLocale)}</div>
                      {u.aiCreditsExpiresAt && (
                        <div className="text-[10px] text-slate-600">
                          exp. {formatDate(u.aiCreditsExpiresAt, dateLocale)}
                        </div>
                      )}
                    </td>                    <td className="px-4 py-3 text-right">
                      {u.notesCount > 0 ? (
                        <button onClick={() => void openNotes(u)} className="tabular-nums text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
                          {u.notesCount}
                        </button>
                      ) : (
                        <span className="tabular-nums text-slate-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{u.tasksCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{u.groupsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="tabular-nums text-slate-400">{u.sessionsCreatedCount}</div>
                      {u.sessionAssignmentsCount > 0 && (
                        <div className="text-[10px] text-indigo-400/80">
                          {t('admin.table.proposals', { count: u.sessionAssignmentsCount })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(u.createdAt, dateLocale)}
                    </td>                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors">
                          {t('admin.actions.edit')}
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => void deleteUser(u.id)} className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-500">{t('admin.actions.confirm')}</button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-600">{t('admin.actions.no')}</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(u.id)} className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                            {t('admin.actions.deleteShort')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">{t('admin.table.empty')}</td></tr>
                )}              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── Edit modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-700 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">{t('admin.editModal.title')}</h3>
              <p className="text-xs text-slate-500">{editingUser.name} · {editingUser.email}</p>
            </div>
            <div className="space-y-4 px-5 py-4">
              {/* Détails compte (lecture seule) */}
              <div className="rounded-xl border border-slate-600 bg-slate-900/50 p-3 space-y-2 text-xs">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">{t('admin.editModal.accountDetails')}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300">
                  <span className="text-slate-500">{t('admin.editModal.id')}</span>
                  <span className="truncate font-mono text-[10px]">{editingUser.id}</span>
                  <span className="text-slate-500">{t('admin.editModal.joined')}</span>
                  <span>{formatDate(editingUser.createdAt, dateLocale, true)}</span>
                  <span className="text-slate-500">{t('admin.editModal.auth')}</span>
                  <span>{authLabel(editingUser, t)}</span>
                  <span className="text-slate-500">{t('admin.editModal.stripe')}</span>
                  <span>{editingUser.hasStripeSubscription ? t('admin.editModal.stripeActive') : t('common.labels.none')}</span>
                  <span className="text-slate-500">{t('admin.editModal.groups')}</span>
                  <span>{editingUser.groupsCount}</span>
                  <span className="text-slate-500">{t('admin.editModal.sessionsCreated')}</span>
                  <span>{editingUser.sessionsCreatedCount}</span>
                  <span className="text-slate-500">{t('admin.editModal.proposalsReceived')}</span>
                  <span>{editingUser.sessionAssignmentsCount}</span>
                  <span className="text-slate-500">{t('admin.editModal.notesTasks')}</span>
                  <span>{editingUser.notesCount} / {editingUser.tasksCount}</span>
                  <span className="text-slate-500">{t('admin.editModal.unreadNotifications')}</span>
                  <span>{editingUser.unreadNotificationCount}</span>
                  {editingUser.aiCreditsExpiresAt && (
                    <>
                      <span className="text-slate-500">{t('admin.editModal.creditsExpire')}</span>
                      <span>{formatDate(editingUser.aiCreditsExpiresAt, dateLocale, true)}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">{t('admin.editModal.plan')}</label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm(f => ({ ...f, plan: e.target.value as 'free' | 'pro' }))}
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500">
                  <option value="free">{t('admin.editModal.planFree')}</option>
                  <option value="pro">{t('admin.editModal.planPro')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">{t('admin.editModal.accountRole')}</label>
                <select
                  value={editForm.role}
                  onChange={e =>
                    setEditForm(f => ({
                      ...f,
                      role: e.target.value as AppUserRole,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500">
                  {(Object.keys(roleLabels) as AppUserRole[]).map(r => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                  {roleDescriptions[editForm.role]}
                </p>
              </div>              <div>
                <label className="text-xs font-medium text-slate-400">{t('admin.editModal.aiCredits')}</label>
                <input type="number" min={0} value={editForm.aiCredits}
                  onChange={e => setEditForm(f => ({ ...f, aiCredits: parseInt(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{t('admin.editModal.accountActive')}</p>
                  <p className="text-xs text-slate-500">{t('admin.editModal.accountActiveHint')}</p>
                </div>
                <button onClick={() => setEditForm(f => ({ ...f, active: !f.active }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${editForm.active ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${editForm.active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
              <button onClick={() => setEditingUser(null)} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200">{t('admin.actions.cancel')}</button>
              <button onClick={() => void saveEdit()} disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                {saving ? t('admin.actions.saving') : t('admin.actions.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes drawer ── */}
      {viewingNotes && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingNotes(null)} />
          <div className="relative z-10 flex h-[80vh] sm:h-[85vh] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('admin.notesDrawer.title', { name: viewingNotes.name })}</h3>
                <p className="text-xs text-slate-500">{viewingNotes.email}</p>
              </div>
              <button onClick={() => setViewingNotes(null)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600">{t('admin.actions.close')}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notesLoading && (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400 mr-2" />
                  {t('admin.notesDrawer.loading')}
                </div>
              )}
              {!notesLoading && userNotes.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">{t('admin.notesDrawer.empty')}</p>
              )}
              {userNotes.map(note => (
                <div key={note.id} className="rounded-xl border border-slate-700 bg-slate-900/60">
                  <button
                    onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                    className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{note.title || t('admin.notesDrawer.untitled')}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(note.updatedAt).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {note.pinned && ' · 📌'}
                      </p>
                    </div>
                    <span className="shrink-0 text-slate-500 text-xs mt-0.5">{expandedNote === note.id ? '▲' : '▼'}</span>
                  </button>
                  {expandedNote === note.id && (
                    <div className="px-4 pb-4 border-t border-slate-700/50">
                      <p className="mt-3 text-xs text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {note.content || t('admin.notesDrawer.emptyContent')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [locale] = useState<AppLocale>('en');
  return (
    <I18nProvider locale={locale}>
      <AdminPageInner />
    </I18nProvider>
  );
}
