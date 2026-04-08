'use client';

import { useCallback, useEffect, useState } from 'react';
import { PRO_FEATURE_BLOCKS } from '../lib/pro-features-catalog';
import { IconSparkles } from './icons';

const LS_PRO_DISMISS = 'neurix-pro-banner-dismiss';
const LS_FREE_DISMISS = 'neurix-free-upsell-dismiss';

const PILIER_COUNT = PRO_FEATURE_BLOCKS.length;

type ProPlanBannerProps = {
  isGuest: boolean;
  plan: 'free' | 'pro' | undefined;
  proPriceLabel?: string | null;
  onUpgrade: () => void | Promise<void>;
  /** Ouvre la modale détaillée (catalogue + feuille de route). */
  onOpenDetails: () => void;
};

export default function ProPlanBanner({
  isGuest,
  plan,
  proPriceLabel,
  onUpgrade,
  onOpenDetails,
}: ProPlanBannerProps) {
  const [proDismissed, setProDismissed] = useState(true);
  const [freeDismissed, setFreeDismissed] = useState(true);

  useEffect(() => {
    try {
      setProDismissed(localStorage.getItem(LS_PRO_DISMISS) === '1');
      setFreeDismissed(localStorage.getItem(LS_FREE_DISMISS) === '1');
    } catch {
      setProDismissed(false);
      setFreeDismissed(false);
    }
  }, []);

  const dismissPro = useCallback(() => {
    try {
      localStorage.setItem(LS_PRO_DISMISS, '1');
    } catch {
      /* ignore */
    }
    setProDismissed(true);
  }, []);

  const dismissFree = useCallback(() => {
    try {
      localStorage.setItem(LS_FREE_DISMISS, '1');
    } catch {
      /* ignore */
    }
    setFreeDismissed(true);
  }, []);

  if (isGuest) return null;

  if (plan === 'pro' && !proDismissed) {
    return (
      <div className="shrink-0 border-b border-amber-500/25 bg-gradient-to-r from-amber-950/90 to-slate-900/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
              <IconSparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-100">Neurix Pro est actif</p>
              <p className="mt-1.5 text-[13px] leading-snug text-amber-100/85">
                Vous bénéficiez déjà de l&apos;<strong className="text-amber-50">IA étendue</strong> et des{' '}
                <strong className="text-amber-50">rappels par e-mail</strong>. Les autres blocs (équipe & rôles, pièces
                jointes, intégrations Google/Slack, vues calendrier, SSO, API…) sont sur la feuille de route — consultez le
                catalogue pour voir le statut <span className="text-emerald-300/95">Disponible</span> vs{' '}
                <span className="text-slate-400">À venir</span>.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="rounded-lg border border-amber-500/40 bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-800/40"
                >
                  Voir les {PILIER_COUNT} piliers Pro
                </button>
                <button
                  type="button"
                  onClick={dismissPro}
                  className="rounded-lg px-3 py-1.5 text-xs text-amber-200/70 hover:text-amber-100"
                >
                  Masquer ce bandeau
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (plan === 'free' && !freeDismissed) {
    return (
      <div className="shrink-0 border-b border-slate-700/80 bg-slate-800/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200">Découvrez tout ce que vise Neurix Pro</p>
            <p className="mt-1 text-[13px] leading-snug text-slate-400">
              <strong className="font-medium text-slate-300">Équipe & rôles</strong> (admin / membre, invitation par lien,
              limites gratuites vs Pro), <strong className="font-medium text-slate-300">pièces jointes & export</strong>{' '}
              (PDF, Markdown, backup), <strong className="font-medium text-slate-300">intégrations</strong> (Calendar,
              Outlook, Slack, Teams, webhooks), <strong className="font-medium text-slate-300">IA</strong> avec plafond
              clair en gratuit vs contexte étendu en Pro, <strong className="font-medium text-slate-300">rappels</strong>{' '}
              avancés, <strong className="font-medium text-slate-300">vues premium</strong>,{' '}
              <strong className="font-medium text-slate-300">conformité B2B</strong> (SSO),{' '}
              <strong className="font-medium text-slate-300">API / Zapier</strong>… Le détail et le statut de chaque bloc
              sont dans le catalogue.
              {proPriceLabel ? (
                <>
                  {' '}
                  <span className="text-slate-300">À partir de {proPriceLabel}.</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenDetails}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              Catalogue ({PILIER_COUNT} blocs)
            </button>
            <button
              type="button"
              onClick={() => void onUpgrade()}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
            >
              Passer à Pro
            </button>
            <button type="button" onClick={dismissFree} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300">
              Masquer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
