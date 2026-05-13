'use client';

import { useState } from 'react';
import { IconX, IconSparkles } from './icons';

const PACK_PRICE = 5; // USD
const CREDITS_PER_PACK = 2500;

const QUICK_OPTIONS = [1, 2, 5, 10] as const;

interface BuyCreditsModalProps {
  currentCredits: number;
  onClose: () => void;
  onBuy: (quantity: number) => Promise<void>;
}

export default function BuyCreditsModal({ currentCredits, onClose, onBuy }: BuyCreditsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [customInput, setCustomInput] = useState('');
  const [buying, setBuying] = useState(false);

  const effectiveQty = customInput !== '' ? (parseInt(customInput, 10) || 1) : quantity;
  const safeQty = Math.max(1, Math.min(100, effectiveQty));
  const totalCredits = safeQty * CREDITS_PER_PACK;
  const totalPrice = safeQty * PACK_PRICE;

  const handleQuick = (q: number) => {
    setQuantity(q);
    setCustomInput('');
  };

  const handleCustomChange = (v: string) => {
    setCustomInput(v.replace(/\D/g, ''));
    setQuantity(0);
  };

  const handleBuy = async () => {
    if (buying) return;
    setBuying(true);
    try {
      await onBuy(safeQty);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
              <IconSparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Acheter des crédits IA</p>
              <p className="text-xs text-slate-500">Chat · Réunions · Notes assistées</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-700 hover:text-slate-300 transition-colors"
            aria-label="Fermer"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Current balance */}
          {currentCredits > 0 && (
            <div className="rounded-xl bg-slate-700/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Solde actuel</span>
              <span className="text-sm font-semibold text-white">
                {currentCredits.toLocaleString('fr-FR')} crédit{currentCredits !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Prix par pack</span>
              <span className="font-semibold text-white">{PACK_PRICE} $ USD</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Crédits par pack</span>
              <span className="font-semibold text-violet-300">{CREDITS_PER_PACK.toLocaleString('fr-FR')} crédits</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Validité</span>
              <span className="text-slate-300">1 an à partir de l'achat</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-violet-500/15">
              <span className="text-slate-500">Coût moyen</span>
              <span className="text-slate-500">1 msg = 1 cr. · 1 réunion = 5 cr.</span>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400">Nombre de packs</p>
            <div className="flex gap-2">
              {QUICK_OPTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleQuick(q)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                    quantity === q && customInput === ''
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {q}
                </button>
              ))}
              <input
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={e => handleCustomChange(e.target.value)}
                placeholder="…"
                className={`w-14 rounded-xl border py-2 text-center text-sm font-semibold bg-slate-700 text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${
                  customInput !== ''
                    ? 'border-violet-500 text-white'
                    : 'border-slate-600 focus:border-violet-500'
                }`}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-slate-700/60 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Crédits obtenus</span>
              <span className="text-sm font-bold text-violet-300">
                +{totalCredits.toLocaleString('fr-FR')} crédits
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Nouveau solde</span>
              <span className="text-xs text-slate-300">
                {(currentCredits + totalCredits).toLocaleString('fr-FR')} crédits
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-600 pt-1.5 mt-1.5">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="text-lg font-bold text-white">{totalPrice} $</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-5 py-4 flex flex-col gap-2">
          <button
            onClick={handleBuy}
            disabled={buying || safeQty < 1}
            className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-semibold py-3 transition-colors shadow-lg shadow-violet-500/20"
          >
            {buying
              ? 'Redirection vers le paiement…'
              : `Payer ${totalPrice} $ · Obtenir ${totalCredits.toLocaleString('fr-FR')} crédits`}
          </button>
          <p className="text-center text-xs text-slate-600">
            Paiement sécurisé par Stripe · Aucun abonnement
          </p>
        </div>
      </div>
    </div>
  );
}
