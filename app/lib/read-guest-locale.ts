import type { AppLocale } from '@/app/lib/i18n/types';
import { DEFAULT_USER_PREFERENCES, normalizePreferences } from '@/app/lib/user-preferences';

const LS_GUEST_PREFERENCES = 'agenda-guest-preferences';

export function readGuestLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES.locale;
  try {
    const raw = localStorage.getItem(LS_GUEST_PREFERENCES);
    if (!raw) return DEFAULT_USER_PREFERENCES.locale;
    return normalizePreferences(JSON.parse(raw)).locale;
  } catch {
    return DEFAULT_USER_PREFERENCES.locale;
  }
}
