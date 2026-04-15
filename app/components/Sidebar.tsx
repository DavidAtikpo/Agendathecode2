'use client';

import { useState } from 'react';
import { User } from '../types';
import styles from './Sidebar.module.css';
import {
  IconChevronDown,
  IconChevronRight,
  IconClipboardList,
  IconClock,
  IconLightBulb,
  IconSettings,
  IconSparkles,
} from './icons';

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
  /** ISO — dernière `updatedAt` parmi notes et tâches chargées. */
  lastDataUpdatedAt?: string | null;
  /** Tiroir mobile : menu toujours large (pas de mode réduit). */
  preferExpanded?: boolean;
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
  lastDataUpdatedAt = null,
  preferExpanded = false,
}: SidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  /** Réduit par défaut ; invité ou tiroir mobile : toujours large. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const expanded = preferExpanded || isGuest || !sidebarCollapsed;
  const afterNav = () => onNavAction?.();

  const avatarColorStyles = `.avatar-current { --avatar-color: ${currentUser.color}; }`;

  const navBtn = (active: boolean, activeClass: string) =>
    `w-full flex items-center rounded-xl text-sm font-medium transition-all touch-manipulation relative ${
      expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
    } ${
      active
        ? `${activeClass} shadow-sm`
        : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
    }`;

  const lastUpdateLabel = (() => {
    if (!lastDataUpdatedAt?.trim()) return null;
    const d = new Date(lastDataUpdatedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  })();

  return (
    <>
      <style>{avatarColorStyles}</style>
      <aside
        className={`flex h-full min-h-0 flex-shrink-0 flex-col border-r border-slate-700 bg-slate-800 transition-[width] duration-200 ease-out ${
          expanded ? 'w-64' : 'w-[4.5rem]'
        } ${className}`.trim()}
        aria-label="Menu principal"
      >
        <header className={`shrink-0 border-b border-slate-700 ${expanded ? 'p-4' : 'px-2 py-3'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3' : 'flex-col gap-2'}`}>
            <img
              src={BRAND_LOGO}
              alt=""
              width={40}
              height={40}
              className={`shrink-0 object-contain ${expanded ? 'h-10 w-10' : 'h-9 w-9'}`}
            />
            {expanded ? (
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight tracking-tight text-white">{BRAND_NAME}</h1>
                <p className="mt-0.5 text-[11px] text-slate-500">Idées & collaboration</p>
              </div>
            ) : null}
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

        <div className={`flex min-h-0 flex-1 flex-col pt-3 ${expanded ? 'px-3' : 'px-1.5'}`}>
          {expanded ? <SectionLabel>Navigation</SectionLabel> : null}
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-2" aria-label="Vues et assistant">
            <button
              type="button"
              onClick={() => {
                onViewChange('notes');
                afterNav();
              }}
              className={navBtn(activeView === 'notes', 'bg-indigo-500/20 text-indigo-300')}
              title={expanded ? undefined : 'Idées & notes'}
            >
              <IconLightBulb
                className={`h-5 w-5 shrink-0 ${activeView === 'notes' ? 'text-indigo-300' : 'text-slate-400'}`}
              />
              {expanded ? <span className="min-w-0 truncate">Idées & notes</span> : null}
              {expanded && noteCount > 0 ? (
                <span className="ml-auto min-w-[1.25rem] rounded-full bg-slate-700 px-2 py-0.5 text-center text-xs tabular-nums text-slate-300">
                  {noteCount}
                </span>
              ) : null}
              {!expanded && noteCount > 0 ? (
                <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-slate-400" aria-label={`${noteCount} notes`} />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                onViewChange('tasks');
                afterNav();
              }}
              className={navBtn(activeView === 'tasks', 'bg-indigo-500/20 text-indigo-300')}
              title={expanded ? undefined : 'Tableau des tâches'}
            >
              <IconClipboardList
                className={`h-5 w-5 shrink-0 ${activeView === 'tasks' ? 'text-indigo-300' : 'text-slate-400'}`}
              />
              {expanded ? <span className="min-w-0 truncate">Tableau des tâches</span> : null}
              {expanded && assignedTaskBadgeCount > 0 ? (
                <span
                  className="ml-auto min-w-[1.25rem] rounded-full bg-rose-500/25 px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-rose-300"
                  title="Tâches qui vous sont assignées"
                >
                  {assignedTaskBadgeCount > 99 ? '99+' : assignedTaskBadgeCount}
                </span>
              ) : null}
              {!expanded && assignedTaskBadgeCount > 0 ? (
                <span
                  className="absolute right-0.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold leading-none text-white"
                  aria-label={`${assignedTaskBadgeCount} tâches assignées`}
                >
                  {assignedTaskBadgeCount > 9 ? '9+' : assignedTaskBadgeCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleChat();
                afterNav();
              }}
              className={navBtn(chatOpen, 'bg-violet-500/20 text-violet-300')}
              title={expanded ? undefined : 'Assistant IA'}
            >
              <IconSparkles className={`h-5 w-5 shrink-0 ${chatOpen ? 'text-violet-300' : 'text-slate-400'}`} />
              {expanded ? <span className="min-w-0 truncate">Assistant IA</span> : null}
              {expanded && chatOpen ? (
                <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-violet-400" title="Ouvert" />
              ) : null}
              {!expanded && chatOpen ? (
                <span className="absolute right-1 top-1.5 h-2 w-2 animate-pulse rounded-full bg-violet-400" title="Assistant ouvert" />
              ) : null}
            </button>
          </nav>
        </div>

        {!isGuest && !preferExpanded ? (
          <div className="shrink-0 border-t border-slate-700/80 px-1 py-1">
            <button
              type="button"
              onClick={() => {
                setSidebarCollapsed(prev => {
                  const next = !prev;
                  if (next) setAccountOpen(false);
                  return next;
                });
              }}
              className="flex w-full touch-manipulation items-center justify-center rounded-lg py-2 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
              aria-expanded={expanded}
              title={expanded ? 'Réduire le menu' : 'Agrandir le menu'}
            >
              <IconChevronRight
                className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        ) : null}

        {lastUpdateLabel ? (
          <div
            className={`shrink-0 border-t border-slate-700/80 ${expanded ? 'px-3 py-2.5' : 'flex justify-center px-1 py-2'}`}
            title={expanded ? undefined : `Dernière modification des données : ${lastUpdateLabel}`}
          >
            {expanded ? (
              <p className="text-[10px] leading-snug text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-slate-400">
                  <IconClock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  Dernière modification
                </span>
                <span className="mt-1 block text-slate-400">{lastUpdateLabel}</span>
              </p>
            ) : (
              <span className="inline-flex text-slate-500" aria-label={`Dernière modification : ${lastUpdateLabel}`}>
                <IconClock className="h-4 w-4" />
              </span>
            )}
          </div>
        ) : null}

        <footer className={`shrink-0 border-t border-slate-700 ${expanded ? 'p-3' : 'p-2'}`}>
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
                onClick={() => {
                  if (!expanded) {
                    setSidebarCollapsed(false);
                    setAccountOpen(true);
                    return;
                  }
                  setAccountOpen(o => !o);
                }}
                aria-expanded={accountOpen}
                title={expanded ? undefined : 'Compte — agrandit le menu'}
                className={`flex w-full touch-manipulation items-center text-left transition-colors hover:bg-slate-700/40 ${
                  expanded ? 'gap-2.5 px-2.5 py-2.5' : 'justify-center px-0 py-2'
                }`}
              >
                <div className={`${styles.currentUserAvatar} avatar-current shrink-0`}>{currentUser.initials}</div>
                {expanded ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Compte</p>
                      <p className="truncate text-sm font-medium text-slate-200">{currentUser.name}</p>
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
                  </>
                ) : null}
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
