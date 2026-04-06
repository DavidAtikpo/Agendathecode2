'use client';

import { useState } from 'react';
import { User } from '../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeView: 'notes' | 'tasks';
  onViewChange: (view: 'notes' | 'tasks') => void;
  assignableUsers: User[];
  currentUser: User;
  isGuest: boolean;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onAddContact: (email: string) => Promise<void>;
  onRemoveContact: (memberId: string) => Promise<void>;
  onLogout: () => void;
  noteCount: number;
  taskCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
  /** Abonnement Stripe */
  onUpgrade: () => void | Promise<void>;
  onManageBilling: () => void | Promise<void>;
  /** Libellé prix (ex. « 9,99 €/mois »), depuis la config serveur */
  proPriceLabel?: string | null;
  /** Fermer le menu mobile après une action (navigation, chat, etc.) */
  onNavAction?: () => void;
  className?: string;
}

export default function Sidebar({
  activeView,
  onViewChange,
  assignableUsers,
  currentUser,
  isGuest,
  onOpenLogin,
  onOpenRegister,
  onAddContact,
  onRemoveContact,
  onLogout,
  noteCount,
  taskCount,
  chatOpen,
  onToggleChat,
  onUpgrade,
  onManageBilling,
  proPriceLabel = null,
  onNavAction,
  className = '',
}: SidebarProps) {
  const [emailInput, setEmailInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || addBusy) return;
    setAddError(null);
    setAddBusy(true);
    try {
      await onAddContact(emailInput.trim());
      setEmailInput('');
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAddBusy(false);
    }
  };

  const afterNav = () => onNavAction?.();

  // Generate CSS for dynamic avatar colors
  const avatarColorStyles = [
    ...assignableUsers.map(user => `.avatar-${user.id} { --avatar-color: ${user.color}; }`),
    `.avatar-current { --avatar-color: ${currentUser.color}; }`
  ].join('\n');

  return (
    <>
      <style>{avatarColorStyles}</style>
      <aside
      className={`w-64 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 min-h-0 ${className}`.trim()}
    >
      {isGuest && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <p className="text-[11px] text-amber-200/90 leading-snug mb-2">
            <span className="font-semibold text-amber-300">Mode essai</span> — vos données restent sur cet appareil. Connectez-vous pour les sauvegarder dans le cloud.
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

      {/* Brand */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={styles.brandAvatar}>
            <span className="text-white font-bold text-base">A</span>
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight">Agenda</h1>
            <p className="text-xs text-slate-500">Idées & Collaboration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            onViewChange('notes');
            afterNav();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
            activeView === 'notes'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
          }`}
        >
          <span className="text-base">💡</span>
          <span>Idées & Notes</span>
          {noteCount > 0 && (
            <span className="ml-auto bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
            activeView === 'tasks'
              ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
          }`}
        >
          <span className="text-base">📋</span>
          <span>Tableau des tâches</span>
          {taskCount > 0 && (
            <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {taskCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onToggleChat();
            afterNav();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
            chatOpen
              ? 'bg-violet-500/20 text-violet-300 shadow-sm'
              : 'text-slate-400 hover:bg-slate-700/70 hover:text-slate-200'
          }`}
        >
          <span className="text-base">🤖</span>
          <span>Assistant IA</span>
          {chatOpen && (
            <span className="ml-auto w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
          )}
        </button>
      </nav>

      {/* Collaborateurs */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 px-1">
          Collaborateurs
        </p>
        {isGuest ? (
          <p className="text-[11px] text-slate-500 px-1 leading-snug">
            Connectez-vous pour ajouter des collègues par email et leur assigner des tâches.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 px-1 mb-2 leading-snug">
              Entrez l&apos;email d&apos;un compte Agenda existant pour pouvoir lui assigner des tâches.
            </p>
            <form onSubmit={handleAdd} className="space-y-1.5 mb-3">
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setAddError(null); }}
                  placeholder="email@exemple.com"
                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  disabled={addBusy}
                />
                <button
                  type="submit"
                  disabled={addBusy || !emailInput.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium shrink-0"
                >
                  {addBusy ? '…' : 'Ajouter'}
                </button>
              </div>
              {addError && (
                <p className="text-[11px] text-red-400 px-0.5 leading-snug">{addError}</p>
              )}
            </form>
          </>
        )}

        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {assignableUsers.map(user => (
            <div
              key={user.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                currentUser.id === user.id ? 'bg-slate-700/80' : 'hover:bg-slate-700/40'
              }`}
            >
              <div
                className={`${styles.userAvatar} avatar-${user.id}`}
              >
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-300 text-xs truncate">{user.name}</p>
                <p className="text-slate-600 text-[10px] truncate">{user.email}</p>
              </div>
              {currentUser.id === user.id ? (
                <span className="text-indigo-400 text-[10px] shrink-0">vous</span>
              ) : !isGuest ? (
                <button
                  type="button"
                  onClick={() => onRemoveContact(user.id)}
                  className="text-slate-600 hover:text-red-400 text-[10px] px-1 shrink-0"
                  title="Retirer de ma liste"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="p-3 border-t border-slate-700/50 space-y-2">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className={`${styles.currentUserAvatar} avatar-current`}
          >
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {isGuest ? 'Données locales uniquement' : currentUser.email}
            </p>
          </div>
          {!isGuest && currentUser.plan === 'pro' ? (
            <span className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Pro
            </span>
          ) : null}
        </div>
        {!isGuest && (
          <div className="space-y-1.5 pt-1">
            {currentUser.plan === 'pro' ? (
              <button
                type="button"
                onClick={() => {
                  void onManageBilling();
                  afterNav();
                }}
                className="w-full text-left text-xs text-slate-400 hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors touch-manipulation"
              >
                Facturation
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void onUpgrade();
                  afterNav();
                }}
                className="w-full text-left text-xs text-slate-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors touch-manipulation flex items-center justify-between"
              >
                <span>Passer à Pro</span>
                <span className="text-amber-400 text-[10px]">✨</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onLogout();
                afterNav();
              }}
              className="w-full text-left text-xs text-slate-500 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors touch-manipulation"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
