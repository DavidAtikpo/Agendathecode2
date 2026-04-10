'use client';

import { useState } from 'react';
import { User } from '../types';
import styles from './Sidebar.module.css';
import { IconChevronDown, IconClipboardList, IconLightBulb, IconSettings, IconSparkles } from './icons';

const BRAND_LOGO = '/logo (1).png';
const BRAND_NAME = 'Neurix';

interface SidebarProps {
  activeView: 'notes' | 'tasks';
  onViewChange: (view: 'notes' | 'tasks') => void;
  currentUser: User;
  isGuest: boolean;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  noteCount: number;
  /** Badge sur « Tâches » : nouvelles assignations (non lues). */
  assignedTaskBadgeCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  /** Souscription Pro (absent = offre non proposée). */
  onUpgrade?: () => void | Promise<void>;
  onManageBilling: () => void | Promise<void>;
  /** Libellé prix (ex. « 9,99 €/mois »), depuis la config serveur */
  proPriceLabel?: string | null;
  /** Fermer le menu mobile après une action (navigation, chat, etc.) */
  onNavAction?: () => void;
  /** Ouvre la modale catalogue Pro (feuille de route + avantages). */
  onOpenProFeatures?: () => void;
  /** Préférences (densité, langue, WhatsApp, etc.). */
  onOpenSettings?: () => void;
  className?: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
      {children}
    </p>
  );
}

export default function Sidebar({
  activeView,
  onViewChange,
  currentUser,
  isGuest,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  noteCount,
  assignedTaskBadgeCount,
  chatOpen,
  onToggleChat,
  onUpgrade,
  onManageBilling,
  proPriceLabel = null,
  onNavAction,
  onOpenProFeatures,
  onOpenSettings,
  className = '',
}: SidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const afterNav = () => onNavAction?.();

  const avatarColorStyles = `.avatar-current { --avatar-color: ${currentUser.color}; }`;

  const navBtn = (active: boolean, activeClass: string) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
      active
        ? `${activeClass} shadow-sm`
        : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
    }`;

  return (
    <>
      <style>{avatarColorStyles}</style>
      <aside
        className={`w-64 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 min-h-0 h-full ${className}`.trim()}
        aria-label="Menu principal"
      >
        <header className="shrink-0 p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_LOGO}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-white tracking-tight text-base leading-tight">{BRAND_NAME}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Idées & collaboration</p>
            </div>
          </div>
        </header>

        {isGuest && (
          <div className="shrink-0 mx-3 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <p className="text-[11px] text-amber-200/90 leading-snug mb-2">
              <span className="font-semibold text-amber-300">Mode essai</span> — données locales. Connectez-vous pour
              sauvegarder dans le cloud.
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onOpenLogin();
                  afterNav();
                }}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium py-2 rounded-lg touch-manipulation"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenRegister();
                  afterNav();
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium py-2 rounded-lg border border-slate-600 touch-manipulation"
              >
                Créer un compte
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col px-3 pt-3">
          <SectionLabel>Navigation</SectionLabel>
          <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 pb-2" aria-label="Vues et assistant">
            <button
              type="button"
              onClick={() => {
                onViewChange('notes');
                afterNav();
              }}
              className={navBtn(activeView === 'notes', 'bg-indigo-500/20 text-indigo-300')}
            >
              <IconLightBulb
                className={`h-5 w-5 shrink-0 ${activeView === 'notes' ? 'text-indigo-300' : 'text-slate-400'}`}
              />
              <span>Idées & notes</span>
              {noteCount > 0 && (
                <span className="ml-auto bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center tabular-nums">
                  {noteCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onViewChange('tasks');
                afterNav();
              }}
              className={navBtn(activeView === 'tasks', 'bg-indigo-500/20 text-indigo-300')}
            >
              <IconClipboardList
                className={`h-5 w-5 shrink-0 ${activeView === 'tasks' ? 'text-indigo-300' : 'text-slate-400'}`}
              />
              <span>Tableau des tâches</span>
              {assignedTaskBadgeCount > 0 && (
                <span
                  className="ml-auto bg-rose-500/25 text-rose-300 text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center tabular-nums font-semibold"
                  title="Tâches qui vous sont assignées"
                >
                  {assignedTaskBadgeCount > 99 ? '99+' : assignedTaskBadgeCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleChat();
                afterNav();
              }}
              className={navBtn(chatOpen, 'bg-violet-500/20 text-violet-300')}
            >
              <IconSparkles className={`h-5 w-5 shrink-0 ${chatOpen ? 'text-violet-300' : 'text-slate-400'}`} />
              <span>Assistant IA</span>
              {chatOpen && (
                <span className="ml-auto w-2 h-2 bg-violet-400 rounded-full animate-pulse" title="Ouvert" />
              )}
            </button>
          </nav>
        </div>

        <footer className="shrink-0 border-t border-slate-700 p-3">
          {isGuest ? (
            <div className="space-y-2">
              <SectionLabel>Compte</SectionLabel>
              <div className="flex items-center gap-2.5 px-1">
                <div className={`${styles.currentUserAvatar} avatar-current`}>{currentUser.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">Données locales uniquement</p>
                </div>
              </div>
              {onOpenSettings ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    afterNav();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-800/50 px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/60 touch-manipulation"
                >
                  <IconSettings className="h-4 w-4 text-slate-400" />
                  Paramètres
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/40">
              <button
                type="button"
                onClick={() => setAccountOpen(o => !o)}
                aria-expanded={accountOpen}
                className="flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors hover:bg-slate-700/40 touch-manipulation"
              >
                <div className={`${styles.currentUserAvatar} avatar-current shrink-0`}>{currentUser.initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Compte</p>
                  <p className="text-sm font-medium text-slate-200 truncate">{currentUser.name}</p>
                </div>
                {currentUser.plan === 'pro' ? (
                  <span className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Pro
                  </span>
                ) : null}
                <IconChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {accountOpen && (
                <div className="space-y-1 border-t border-slate-700/60 px-2 py-2">
                  <p className="truncate px-1 text-xs text-slate-500">{currentUser.email}</p>
                  {currentUser.plan === 'pro' ? (
                    <p className="px-1 text-[10px] leading-tight text-amber-500/85">IA étendue · rappels e-mail</p>
                  ) : null}
                  {currentUser.plan === 'pro' ? (
                    <button
                      type="button"
                      onClick={() => {
                        void onManageBilling();
                        afterNav();
                      }}
                      className="w-full rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 touch-manipulation"
                    >
                      Facturation
                    </button>
                  ) : onUpgrade ? (
                    <button
                      type="button"
                      onClick={() => {
                        void onUpgrade();
                        afterNav();
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs text-amber-200/95 hover:bg-slate-700/50 touch-manipulation"
                    >
                      <span>Passer à Pro</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {proPriceLabel ? (
                          <span className="text-[10px] font-medium text-amber-400/90">{proPriceLabel}</span>
                        ) : null}
                        <IconSparkles className="h-3.5 w-3.5 text-amber-400/90" aria-hidden />
                      </span>
                    </button>
                  ) : null}
                  {onOpenProFeatures ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProFeatures();
                        afterNav();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-400 hover:bg-slate-700/50 hover:text-amber-200/90 touch-manipulation"
                    >
                      <IconSparkles className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
                      Fonctionnalités Pro & feuille de route
                    </button>
                  ) : null}
                  {onOpenSettings ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        afterNav();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 touch-manipulation"
                    >
                      <IconSettings className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      Paramètres
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      afterNav();
                    }}
                    className="w-full rounded-lg px-2 py-2 text-left text-xs text-slate-500 hover:bg-slate-700/50 hover:text-red-400 touch-manipulation"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
