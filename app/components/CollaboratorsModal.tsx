'use client';

import { useState, useEffect } from 'react';
import { User } from '../types';
import styles from './Sidebar.module.css';
import { IconX } from './icons';

interface CollaboratorsModalProps {
  open: boolean;
  onClose: () => void;
  assignableUsers: User[];
  currentUser: User;
  isGuest: boolean;
  onAddContact: (email: string) => Promise<void>;
  onRemoveContact: (memberId: string) => Promise<void>;
}

export default function CollaboratorsModal({
  open,
  onClose,
  assignableUsers,
  currentUser,
  isGuest,
  onAddContact,
  onRemoveContact,
}: CollaboratorsModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEmailInput('');
      setAddError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || addBusy || isGuest) return;
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

  const avatarStyles = [
    ...assignableUsers.map(u => `.collab-avatar-${u.id} { --avatar-color: ${u.color}; }`),
  ].join('\n');

  return (
    <>
      <style>{avatarStyles}</style>
      <div
        className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-0 pb-0 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collaborators-title"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Fermer"
          onClick={onClose}
        />
        <div
          className="relative z-10 flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-700 bg-slate-800 shadow-2xl sm:rounded-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-4 py-3 sm:px-5">
            <h2 id="collaborators-title" className="text-lg font-semibold text-white">
              Collaborateurs
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
              aria-label="Fermer"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {isGuest ? (
              <p className="text-sm text-slate-400">
                Connectez-vous pour inviter des collègues par e-mail et leur assigner des tâches.
              </p>
            ) : (
              <>
                <p className="mb-3 text-[13px] leading-snug text-slate-400">
                  Saisissez l&apos;e-mail d&apos;un compte Neurix existant pour pouvoir lui assigner des tâches.
                </p>
                <form onSubmit={handleAdd} className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => {
                        setEmailInput(e.target.value);
                        setAddError(null);
                      }}
                      placeholder="email@exemple.com"
                      className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      disabled={addBusy}
                      autoComplete="email"
                    />
                    <button
                      type="submit"
                      disabled={addBusy || !emailInput.trim()}
                      className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
                    >
                      {addBusy ? '…' : 'Ajouter'}
                    </button>
                  </div>
                  {addError ? (
                    <p className="text-xs text-red-400">{addError}</p>
                  ) : null}
                </form>

                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Équipe ({assignableUsers.length})
                </p>
                <ul className="space-y-1">
                  {assignableUsers.map(user => (
                    <li
                      key={user.id}
                      className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm ${
                        currentUser.id === user.id ? 'bg-slate-700/80' : 'bg-slate-700/30'
                      }`}
                    >
                      <div className={`${styles.userAvatar} collab-avatar-${user.id}`}>{user.initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-200">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      {currentUser.id === user.id ? (
                        <span className="shrink-0 text-[11px] text-indigo-400">vous</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveContact(user.id)}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-red-950/50 hover:text-red-400"
                        >
                          Retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
