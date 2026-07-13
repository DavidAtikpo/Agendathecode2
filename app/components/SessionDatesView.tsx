'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/app/lib/i18n';
import {
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '@/app/components/icons';

interface SessionCatalogRow {
  id: string;
  slug: string;
  pays: 'France' | 'Togo';
  annee: string;
  mois: string;
  dates: string;
  label: string;
  ordre: number;
  actif: boolean;
}

const MOIS_OPTIONS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const PAYS_OPTIONS = [
  { value: 'France', label: 'France' },
  { value: 'Togo', label: 'Togo' },
] as const;

const emptyForm = {
  slug: '',
  pays: 'France' as 'France' | 'Togo',
  annee: String(new Date().getFullYear()),
  mois: 'janvier',
  dates: '',
  ordre: 0,
  actif: true,
};

interface SessionDatesViewProps {
  compactLayout?: boolean;
}

export default function SessionDatesView({ compactLayout = false }: SessionDatesViewProps) {
  const { t } = useI18n();
  const pad = compactLayout ? 'px-3 py-2.5' : 'px-4 py-3';

  const [rows, setRows] = useState<SessionCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paysFilter, setPaysFilter] = useState<'all' | 'France' | 'Togo'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchRows = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);
      const res = await fetch('/api/admin/session-catalog', { credentials: 'include' });
      if (res.status === 403) {
        setError(t('sessionDates.accessDenied'));
        return;
      }
      if (!res.ok) throw new Error(t('sessionDates.loadError'));
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sessionDates.loadError'));
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filteredRows = useMemo(() => {
    if (paysFilter === 'all') return rows;
    return rows.filter((r) => r.pays === paysFilter);
  }, [rows, paysFilter]);

  const previewLabel = `${form.annee} ${form.mois} ${form.dates}`.trim();

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, ordre: rows.length });
    setModalOpen(true);
  };

  const openEdit = (row: SessionCatalogRow) => {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      pays: row.pays,
      annee: row.annee,
      mois: row.mois,
      dates: row.dates,
      ordre: row.ordre,
      actif: row.actif,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRows({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.annee.trim() || !form.mois.trim() || !form.dates.trim()) return;
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim() || undefined,
        pays: form.pays,
        annee: form.annee.trim(),
        mois: form.mois.trim(),
        dates: form.dates.trim(),
        ordre: form.ordre,
        actif: form.actif,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/session-catalog/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || t('sessionDates.saveError'));
        }
        const updated = await res.json();
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? updated : r)).sort((a, b) => a.ordre - b.ordre),
        );
      } else {
        const res = await fetch('/api/admin/session-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || t('sessionDates.saveError'));
        }
        const created = await res.json();
        setRows((prev) => [...prev, created].sort((a, b) => a.ordre - b.ordre));
      }
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sessionDates.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('sessionDates.deleteConfirm'))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/session-catalog/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(t('sessionDates.deleteError'));
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sessionDates.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0f1419]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <div className={`shrink-0 border-b border-slate-700/80 bg-slate-900/90 ${pad}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`font-semibold text-white ${compactLayout ? 'text-base' : 'text-lg'}`}>
              {t('sessionDates.title')}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{t('sessionDates.description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              <IconRefresh className="h-4 w-4" />
              {refreshing ? t('sessionDates.refreshing') : t('sessionDates.refresh')}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <IconPlus className="h-4 w-4" />
              {t('sessionDates.new')}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {(['all', 'France', 'Togo'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaysFilter(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                paysFilter === p
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p === 'all' ? t('sessionDates.filterAll') : p}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">{t('sessionDates.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-900/95 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('sessionDates.colOrder')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('sessionDates.colSlug')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('sessionDates.colCountry')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('sessionDates.colLabel')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('sessionDates.colStatus')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('sessionDates.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-3 text-slate-500">{row.ordre}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-indigo-300">{row.slug}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          row.pays === 'France'
                            ? 'bg-blue-500/15 text-blue-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {row.pays}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-100">{row.label}</td>
                    <td className="px-3 py-3">
                      {row.actif ? (
                        <span className="font-medium text-emerald-400">{t('sessionDates.active')}</span>
                      ) : (
                        <span className="text-slate-500">{t('sessionDates.hidden')}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded p-1.5 text-slate-400 hover:bg-indigo-500/15 hover:text-indigo-300"
                          title={t('sessionDates.edit')}
                        >
                          <IconPencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                          title={t('sessionDates.delete')}
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? t('sessionDates.modalEdit') : t('sessionDates.modalCreate')}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded p-1 text-slate-400 hover:text-slate-200"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  {t('sessionDates.fieldCountry')}
                </label>
                <select
                  value={form.pays}
                  onChange={(e) => setForm((f) => ({ ...f, pays: e.target.value as 'France' | 'Togo' }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  {PAYS_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    {t('sessionDates.fieldYear')}
                  </label>
                  <input
                    type="text"
                    value={form.annee}
                    onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))}
                    placeholder="2026"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    {t('sessionDates.fieldMonth')}
                  </label>
                  <select
                    value={form.mois}
                    onChange={(e) => setForm((f) => ({ ...f, mois: e.target.value }))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    {MOIS_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  {t('sessionDates.fieldDates')}
                </label>
                <input
                  type="text"
                  value={form.dates}
                  onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))}
                  placeholder={t('sessionDates.fieldDatesPlaceholder')}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  {t('sessionDates.preview')} <strong className="text-slate-300">{previewLabel || '—'}</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    {t('sessionDates.fieldSlug')}
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder={t('sessionDates.fieldSlugPlaceholder')}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    {t('sessionDates.fieldOrder')}
                  </label>
                  <input
                    type="number"
                    value={form.ordre}
                    onChange={(e) => setForm((f) => ({ ...f, ordre: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                {t('sessionDates.fieldVisible')}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  {t('sessionDates.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving
                    ? t('sessionDates.saving')
                    : editingId
                      ? t('sessionDates.update')
                      : t('sessionDates.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
