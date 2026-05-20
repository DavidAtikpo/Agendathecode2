'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BRAND_LOGO = '/logo (1).png';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  role: 'admin' | 'user';
  aiCredits: number;
  aiCreditsExpiresAt: string | null;
  createdAt: string;
  hasGoogle: boolean;
  notesCount: number;
  tasksCount: number;
}

interface Stats {
  totalUsers: number;
  proUsers: number;
  adminUsers: number;
  totalNotes: number;
  totalTasks: number;
  totalCreditsInCirculation: number;
  tasksByStatus: Record<string, number>;
  recentUsers: { id: string; name: string; email: string; createdAt: string; plan: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'À faire',
  urgent: 'Urgent',
  doing: 'En cours',
  testing: 'Test',
  review: 'Révision',
  done: 'Terminé',
};

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ plan: 'free', role: 'user', aiCredits: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
      ]);

      if (statsRes.status === 401 || usersRes.status === 401) {
        router.push('/');
        return;
      }
      if (statsRes.status === 403 || usersRes.status === 403) {
        setError('Accès réservé aux administrateurs.');
        setLoading(false);
        return;
      }

      const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()]);
      setStats(statsData);
      setUsers(usersData);
    } catch {
      setError('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({ plan: u.plan, role: u.role, aiCredits: u.aiCredits });
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
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Erreur');
        return;
      }
      const updated: AdminUser = await res.json();
      setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      void fetchData();
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Erreur');
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      void fetchData();
    } catch {
      alert('Erreur réseau');
    }
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
          Chargement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="max-w-sm rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg font-semibold text-red-300">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-xl bg-slate-700 px-6 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={BRAND_LOGO} alt="" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-base font-bold text-white">Neurix Admin</h1>
              <p className="text-xs text-slate-500">Panneau d'administration</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            Retour à l'app
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
        {/* Stats */}
        {stats && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Vue d'ensemble</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Utilisateurs" value={stats.totalUsers} color="text-indigo-300" />
              <StatCard label="Pro" value={stats.proUsers} color="text-amber-300" />
              <StatCard label="Admins" value={stats.adminUsers} color="text-violet-300" />
              <StatCard label="Notes" value={stats.totalNotes} color="text-emerald-300" />
              <StatCard label="Tâches" value={stats.totalTasks} color="text-blue-300" />
              <StatCard label="Crédits en circ." value={stats.totalCreditsInCirculation} color="text-rose-300" />
            </div>

            {/* Tasks by status */}
            {Object.keys(stats.tasksByStatus).length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tâches par statut</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      {STATUS_LABELS[status] ?? status} : <strong className="text-white">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Users */}
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Utilisateurs ({filtered.length})
            </h2>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="w-full sm:w-72 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3 text-right">Crédits</th>
                  <th className="px-4 py-3 text-right">Notes</th>
                  <th className="px-4 py-3 text-right">Tâches</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {u.hasGoogle && (
                          <span className="text-[10px] text-slate-600">Google</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        u.plan === 'pro'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-600/50 text-slate-400'
                      }`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        u.role === 'admin'
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-slate-600/50 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                      {u.aiCredits.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{u.notesCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{u.tasksCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Modifier
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => void deleteUser(u.id)}
                              className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-600"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Suppr.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <div className="border-b border-slate-700 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">Modifier l'utilisateur</h3>
              <p className="text-xs text-slate-500">{editingUser.name} · {editingUser.email}</p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Rôle</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Crédits IA</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.aiCredits}
                  onChange={e => setEditForm(f => ({ ...f, aiCredits: parseInt(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
