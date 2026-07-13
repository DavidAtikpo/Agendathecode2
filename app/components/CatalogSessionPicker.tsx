'use client';

import { useI18n } from '@/app/lib/i18n';
import { parseCatalogSessionDates } from '@/app/lib/parse-catalog-dates';

export interface CatalogSessionOption {
  id: string;
  pays: 'France' | 'Togo';
  label: string;
  annee: string;
  mois: string;
  dates: string;
  actif: boolean;
}

interface CatalogSessionPickerProps {
  options: CatalogSessionOption[];
  pays: 'France' | 'Togo';
  onPaysChange: (pays: 'France' | 'Togo') => void;
  optionAId: string;
  optionBId: string;
  onOptionAChange: (id: string, parsed: ReturnType<typeof parseCatalogSessionDates>) => void;
  onOptionBChange: (id: string, parsed: ReturnType<typeof parseCatalogSessionDates>) => void;
  compact?: boolean;
}

export function CatalogSessionPicker({
  options,
  pays,
  onPaysChange,
  optionAId,
  optionBId,
  onOptionAChange,
  onOptionBChange,
  compact = false,
}: CatalogSessionPickerProps) {
  const { t } = useI18n();
  const filtered = options.filter((o) => o.pays === pays && o.actif);

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-2 text-sm text-slate-200';

  return (
    <div className={`space-y-3 ${compact ? '' : 'rounded-lg border border-slate-700/80 p-3'}`}>
      <p className="text-xs text-slate-500">{t('sessions.organizer.catalog.hint')}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs text-slate-400">
          {t('sessions.organizer.catalog.pays')}
          <select
            value={pays}
            onChange={(e) => onPaysChange(e.target.value as 'France' | 'Togo')}
            className={inputClass}
          >
            <option value="France">France</option>
            <option value="Togo">Togo</option>
          </select>
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2 lg:col-span-2">
          {t('sessions.organizer.catalog.optionA')}
          <select
            value={optionAId}
            onChange={(e) => {
              const id = e.target.value;
              const item = filtered.find((o) => o.id === id);
              onOptionAChange(id, item ? parseCatalogSessionDates(item.annee, item.mois, item.dates) : null);
            }}
            required
            className={inputClass}
          >
            <option value="">{t('sessions.organizer.catalog.choose')}</option>
            {filtered.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400 sm:col-span-2 lg:col-span-3">
          {t('sessions.organizer.catalog.optionB')}
          <select
            value={optionBId}
            onChange={(e) => {
              const id = e.target.value;
              const item = filtered.find((o) => o.id === id);
              onOptionBChange(id, item ? parseCatalogSessionDates(item.annee, item.mois, item.dates) : null);
            }}
            className={inputClass}
          >
            <option value="">{t('sessions.organizer.catalog.none')}</option>
            {filtered.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-amber-400/90">{t('sessions.organizer.catalog.empty')}</p>
      ) : null}
    </div>
  );
}
