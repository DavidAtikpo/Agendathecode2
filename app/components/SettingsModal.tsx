'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import type { UserPreferences } from '../lib/user-preferences';
import { DEFAULT_USER_PREFERENCES, mergePreferences } from '../lib/user-preferences';
import { USER_AVATAR_COLORS } from '../lib/user-display';
import { IconX } from './icons';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  onSaved: (user: User) => void;
  /** Mode essai : enregistrement local uniquement (pas d’API). */
  isGuest?: boolean;
};

export default function SettingsModal({ open, onClose, user, onSaved, isGuest = false }: SettingsModalProps) {
  const base = user.preferences ?? DEFAULT_USER_PREFERENCES;
  const [density, setDensity] = useState<UserPreferences['density']>(base.density);
  const [locale, setLocale] = useState<UserPreferences['locale']>(base.locale);
  const [notesShowWhatsApp, setNotesShowWhatsApp] = useState(base.notesShowWhatsApp);
  const [profileName, setProfileName] = useState(user.name);
  const [profileColor, setProfileColor] = useState(user.color);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChangePassword = isGuest ? false : user.hasPasswordLogin !== false;

  useEffect(() => {
    if (!open) return;
    const p = user.preferences ?? DEFAULT_USER_PREFERENCES;
    setDensity(p.density);
    setLocale(p.locale);
    setNotesShowWhatsApp(p.notesShowWhatsApp);
    setProfileName(user.name);
    setProfileColor(user.color);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, [open, user.preferences, user.id, user.name, user.color, user.hasPasswordLogin]);

  const avatarColorChoices = useMemo(() => {
    const preset = new Set<string>(USER_AVATAR_COLORS);
    if (profileColor && !preset.has(profileColor)) {
      return [...USER_AVATAR_COLORS, profileColor];
    }
    return [...USER_AVATAR_COLORS];
  }, [profileColor]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isGuest) {
        const preferences = mergePreferences(user.preferences ?? DEFAULT_USER_PREFERENCES, {
          density,
          locale,
          notesShowWhatsApp,
        });
        onSaved({ ...user, preferences });
        onClose();
        return;
      }

      const basePrefs = user.preferences ?? DEFAULT_USER_PREFERENCES;
      const prefsChanged =
        density !== basePrefs.density ||
        locale !== basePrefs.locale ||
        notesShowWhatsApp !== basePrefs.notesShowWhatsApp;
      const profileChanged =
        profileName.trim() !== user.name || profileColor !== user.color;
      const wantsPasswordChange = newPassword.trim().length > 0;

      if (wantsPasswordChange && canChangePassword) {
        if (!currentPassword) {
          throw new Error('Saisissez votre mot de passe actuel');
        }
        if (newPassword.length < 8) {
          throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('La confirmation ne correspond pas au nouveau mot de passe');
        }
      }

      if (!prefsChanged && !profileChanged && !wantsPasswordChange) {
        onClose();
        return;
      }

      let merged: User = user;

      if (wantsPasswordChange && canChangePassword) {
        const res = await fetch('/api/user/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });
        const data = (await res.json()) as User & { error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Mot de passe impossible à modifier');
        }
        merged = { ...merged, ...data };
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      if (profileChanged) {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: profileName.trim(),
            color: profileColor,
          }),
        });
        const data = (await res.json()) as User & { error?: string };
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Profil impossible à enregistrer');
        merged = { ...merged, ...data };
      }

      if (prefsChanged) {
        const res = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            density,
            locale,
            notesShowWhatsApp,
          }),
        });
        const data = (await res.json()) as User & { error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Enregistrement impossible');
        }
        merged = data as User;
      }

      onSaved(merged);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[97] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 flex h-[min(92dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-800 shadow-2xl sm:h-[min(88vh,36rem)] sm:rounded-2xl"
        onClick={ev => ev.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Paramètres personnels
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

        <form onSubmit={e => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-5">
              <p className="text-sm text-slate-400">
                {isGuest
                  ? 'En mode essai, les réglages sont stockés sur cet appareil uniquement.'
                  : 'Ces réglages sont enregistrés sur votre compte et s’appliquent sur cet appareil.'}
              </p>

              {!isGuest ? (
                <div className="space-y-4 rounded-xl border border-slate-600/60 bg-slate-800/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profil</p>
                  <div>
                    <label htmlFor="settings-profile-name" className="mb-2 block text-xs text-slate-400">
                      Nom affiché
                    </label>
                    <input
                      id="settings-profile-name"
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      maxLength={80}
                      autoComplete="name"
                      className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-xs text-slate-400">E-mail</span>
                    <p className="rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-300">
                      {user.email}
                    </p>
                  </div>

                  {user.hasPasswordLogin === false ? (
                    <p className="text-xs leading-relaxed text-slate-500">
                      Connexion Google uniquement — il n’y a pas de mot de passe sur ce compte.
                    </p>
                  ) : canChangePassword ? (
                    <div className="space-y-3 border-t border-slate-700/60 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Mot de passe
                      </p>
                      <div>
                        <label htmlFor="settings-current-pw" className="mb-2 block text-xs text-slate-400">
                          Mot de passe actuel
                        </label>
                        <input
                          id="settings-current-pw"
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                          className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-new-pw" className="mb-2 block text-xs text-slate-400">
                          Nouveau mot de passe (min. 8 caractères)
                        </label>
                        <input
                          id="settings-new-pw"
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-confirm-pw" className="mb-2 block text-xs text-slate-400">
                          Confirmer le nouveau mot de passe
                        </label>
                        <input
                          id="settings-confirm-pw"
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <span className="mb-2 block text-xs text-slate-400">Couleur de l’avatar</span>
                    <div className="flex flex-wrap gap-2">
                      {avatarColorChoices.map(c => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onClick={() => setProfileColor(c)}
                          className={`h-9 w-9 rounded-full border-2 transition-transform touch-manipulation ${
                            profileColor === c
                              ? 'scale-110 border-white shadow-md'
                              : 'border-transparent hover:scale-105 hover:border-slate-500'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Couleur ${c}`}
                          aria-pressed={profileColor === c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Densité d’affichage
                </label>
                <select
                  value={density}
                  onChange={e => setDensity(e.target.value as UserPreferences['density'])}
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="comfortable">Confortable (espacements standards)</option>
                  <option value="compact">Compact (plus de contenu visible)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Langue
                </label>
                <select
                  value={locale}
                  onChange={e => setLocale(e.target.value as UserPreferences['locale'])}
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="en">English (interface progressive)</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-600/80 bg-slate-800/50 p-3">
                <input
                  type="checkbox"
                  checked={notesShowWhatsApp}
                  onChange={e => setNotesShowWhatsApp(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600"
                />
                <span className="text-sm leading-snug text-slate-300">
                  Afficher la section <span className="text-slate-200">Rappels via WhatsApp</span> sous les notes
                  (réglages du numéro et options).
                </span>
              </label>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-700 bg-slate-800 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
