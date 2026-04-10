'use client';

import { PRO_FEATURE_BLOCKS, statusLabel } from '../lib/pro-features-catalog';
import { IconSparkles, IconX } from './icons';

type ProFeaturesModalProps = {
  open: boolean;
  onClose: () => void;
  /** Utilisateur connecté : gratuit ou Pro */
  plan: 'free' | 'pro' | undefined;
  isGuest: boolean;
  proPriceLabel?: string | null;
  /** Quand false, pas de bouton / texte pour souscrire. */
  upgradeOfferAvailable: boolean;
  onUpgrade?: () => void | Promise<void>;
};

export default function ProFeaturesModal({
  open,
  onClose,
  plan,
  isGuest,
  proPriceLabel,
  upgradeOfferAvailable,
  onUpgrade,
}: ProFeaturesModalProps) {
  if (!open) return null;

  const isPro = plan === 'pro';

  return (
    <div
      className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-features-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-3xl flex-col rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/35">
              <IconSparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 id="pro-features-title" className="text-lg font-semibold text-white">
                Fonctionnalités Neurix Pro
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Vision produit : gratuit utile, Pro pour scale, Business pour les structures. Les pastilles indiquent ce qui
                est déjà en place ou en construction.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Fermer"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {PRO_FEATURE_BLOCKS.map(block => {
              const st = statusLabel(block.status);
              return (
                <article
                  key={block.id}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">{block.title}</h3>
                    <span
                      title={st.label}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        block.status === 'live'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-600/50 text-slate-400'
                      }`}
                    >
                      {st.short}
                    </span>
                  </div>
                  <p className="text-[12px] leading-snug text-slate-500">{block.intro}</p>
                  <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-slate-400">
                    {block.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-600">·</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          {isGuest ? (
            <p className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-center text-sm text-slate-400">
              {upgradeOfferAvailable
                ? 'Connectez-vous pour souscrire à Pro une fois votre compte créé.'
                : 'Créez un compte pour synchroniser vos notes et tâches dans le cloud.'}
            </p>
          ) : !isPro && upgradeOfferAvailable ? (
            <div className="mt-5 flex flex-col items-stretch gap-2 border-t border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                {proPriceLabel ? (
                  <>
                    Tarif affiché au paiement : <span className="text-slate-200">{proPriceLabel}</span>
                  </>
                ) : (
                  'Tarif selon configuration Stripe.'
                )}
              </p>
              {onUpgrade ? (
                <button
                  type="button"
                  onClick={() => {
                    void onUpgrade();
                    onClose();
                  }}
                  className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
                >
                  Passer à Pro
                </button>
              ) : null}
            </div>
          ) : !isPro && !upgradeOfferAvailable ? (
            <p className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-center text-sm text-slate-400">
              L’abonnement Pro n’est pas encore proposé à la souscription. Les fonctionnalités payantes seront annoncées ici
              lorsqu’elles seront prêtes.
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-amber-200/80">
              Merci de soutenir Neurix Pro — les blocs « À venir » seront déployés progressivement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
