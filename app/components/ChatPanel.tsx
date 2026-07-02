'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from '../types';
import { useI18n } from '@/app/lib/i18n';
import { IconArrowRight, IconSparkles, IconTrash, IconX } from './icons';

/** Même ressource que la sidebar / écran de chargement (`public/logo (1).png`). */
const BRAND_LOGO = '/logo (1).png';

function AssistantLogoMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  return (
    <div
      className={`${box} shrink-0 overflow-hidden rounded-xl bg-slate-900/40 ring-1 ring-violet-500/25`}
    >
      <img src={BRAND_LOGO} alt="" className="h-full w-full object-contain p-0.5" />
    </div>
  );
}

export type ChatTier = 'guest' | 'free' | 'pro';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
  onClear: () => void;
  /** Différencie l'affichage et la limite côté API (gratuit vs Pro). */
  chatTier: ChatTier;
  /** Crédits IA restants (null = invité) */
  chatCredits: number | null;
  /** ISO string d'expiration des crédits, ou null */
  chatCreditsExpiresAt: string | null;
  /** Ouvre la modale d'achat de crédits */
  onBuyCredits: () => void;
}

const SUGGESTION_KEYS = [
  'recentIdeas',
  'summarizeTasks',
  'suggestIdeas',
  'reviewTasks',
  'organizeTasks',
] as const;

function formatTime(iso: string, dateLocale: string) {
  return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
}

function CreditBadge({
  credits,
  expiresAt,
  t,
  dateLocale,
}: {
  credits: number;
  expiresAt: string | null;
  t: ReturnType<typeof useI18n>['t'];
  dateLocale: string;
}) {
  const low = credits < 100;
  const empty = credits <= 0;

  let label =
    credits === 1
      ? t('chat.credits.label', { count: credits })
      : t('chat.credits.labelPlural', { count: credits });
  if (expiresAt) {
    const d = new Date(expiresAt);
    label += ` · ${t('chat.credits.expires', {
      date: d.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: '2-digit' }),
    })}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
        empty
          ? 'bg-red-500/15 text-red-400 ring-red-500/30'
          : low
          ? 'bg-amber-500/15 text-amber-400 ring-amber-500/30'
          : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${empty ? 'bg-red-400' : low ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      {label}
    </span>
  );
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onClose,
  onClear,
  chatTier,
  chatCredits,
  chatCreditsExpiresAt,
  onBuyCredits,
}: ChatPanelProps) {
  const { t, dateLocale } = useI18n();
  const suggestions = useMemo(
    () => SUGGESTION_KEYS.map(key => t(`chat.suggestions.${key}`)),
    [t],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasCredits = chatCredits !== null && chatCredits > 0;
  const isGuest = chatTier === 'guest';
  const canChat = !isGuest && hasCredits;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending || !canChat) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    try {
      await onSendMessage(msg);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleSuggestion = async (suggestion: string) => {
    if (sending || !canChat) return;
    setSending(true);
    try {
      await onSendMessage(suggestion);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBuyCredits = () => onBuyCredits();

  return (
    <div
      className="fixed inset-0 z-[60] flex min-h-0 flex-col bg-slate-800 pt-[env(safe-area-inset-top)] md:static md:inset-auto md:z-auto md:h-full md:w-80 md:flex-shrink-0 md:border-l md:border-slate-700 md:pt-0"
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.aria.panel')}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <AssistantLogoMark size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white">{t('chat.header.title')}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isGuest && chatCredits !== null ? (
                <CreditBadge credits={chatCredits} expiresAt={chatCreditsExpiresAt} t={t} dateLocale={dateLocale} />
              ) : (
                <p className="text-xs text-slate-500">
                  {isGuest ? t('chat.header.guestHint') : t('chat.header.poweredBy')}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-700"
              title={t('chat.aria.clear')}
              aria-label={t('chat.aria.clear')}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300 md:h-7 md:w-7 md:min-h-0 md:min-w-0"
            aria-label={t('chat.aria.close')}
          >
            <IconX className="h-5 w-5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>

      {/* No credits / guest banner */}
      {!isGuest && !hasCredits && (
        <div className="flex-shrink-0 mx-4 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-300 mb-1 flex items-center gap-2">
            <IconSparkles className="h-4 w-4 shrink-0" />
            {t('chat.credits.depletedTitle')}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            {t('chat.credits.depletedBody')}
          </p>
          <div className="rounded-xl bg-slate-700/50 p-3 mb-3 text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('chat.credits.pack')}</span>
              <span className="font-semibold text-white">{t('chat.credits.packPrice')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>{t('chat.credits.packMessages')}</span>
              <span>{t('chat.credits.packValidity')}</span>
            </div>
          </div>
          <button
            onClick={handleBuyCredits}
            className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {t('chat.credits.buyFrom')}
          </button>
        </div>
      )}

      {/* Low credits warning */}
      {!isGuest && hasCredits && chatCredits! < 100 && (
        <div className="flex-shrink-0 mx-4 mt-4 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-amber-400">
            {chatCredits === 1
              ? t('chat.credits.lowRemaining', { count: chatCredits! })
              : t('chat.credits.lowRemainingPlural', { count: chatCredits! })}
          </p>
          <button
            onClick={handleBuyCredits}
            className="flex-shrink-0 text-xs bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg px-2.5 py-1 transition-colors"
          >
            {t('chat.credits.recharge')}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Welcome card */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
              <p className="text-sm font-medium text-violet-300 mb-2 flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-violet-400 shrink-0" />
                {t('chat.welcome.greeting')}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('chat.welcome.intro')}
              </p>
              <ul className="mt-2 space-y-1.5">
                {(
                  [
                    'develop',
                    'manage',
                    'connect',
                    'recall',
                  ] as const
                ).map(key => (
                  <li key={key} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span>{t(`chat.welcome.bullets.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            {canChat && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('chat.suggestions.title')}
                </p>
                <div className="space-y-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s)}
                      disabled={sending}
                      className="w-full text-left text-xs bg-slate-700/70 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 rounded-xl px-3 py-2.5 text-slate-300 transition-all disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mr-2 mt-0.5 flex-shrink-0">
                    <AssistantLogoMark size="sm" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-sm shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1.5 ${
                      msg.role === 'user' ? 'text-indigo-200/70' : 'text-slate-500'
                    }`}
                  >
                    {formatTime(msg.timestamp, dateLocale)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="mr-2 mt-0.5 flex-shrink-0">
                  <AssistantLogoMark size="sm" />
                </div>
                <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions when there are messages */}
      {messages.length > 0 && canChat && (
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(s)}
              disabled={sending}
              className="flex-shrink-0 text-xs bg-slate-700/70 hover:bg-slate-700 border border-slate-600/50 rounded-full px-3 py-1 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {s.length > 28 ? s.slice(0, 28) + '…' : s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
        {canChat ? (
          <>
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.input.placeholder')}
                rows={2}
                disabled={sending}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none disabled:opacity-50 min-h-0"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all flex-shrink-0 shadow-lg shadow-violet-500/20"
                aria-label={t('chat.aria.send')}
              >
                <IconArrowRight className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 text-center">
              {t('chat.input.hint')}
            </p>
          </>
        ) : (
          <div className="text-center">
            {isGuest ? (
              <p className="text-xs text-slate-500">{t('chat.input.guestBlocked')}</p>
            ) : (
              <button
                onClick={handleBuyCredits}
                className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {t('chat.credits.buyFrom')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
