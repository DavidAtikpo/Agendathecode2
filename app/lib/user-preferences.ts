/**
 * Préférences utilisateur persistées en JSON (`User.preferences`).
 * Toute clé inconnue est ignorée ; les valeurs sont fusionnées avec les défauts.
 */
export type UserPreferences = {
  /** Espacement général des listes (notes / tâches). */
  density: 'comfortable' | 'compact';
  /** Langue d’interface souhaitée (traductions progressives). */
  locale: 'fr' | 'en';
  /** Afficher le bloc « Rappels via WhatsApp » sous l’en-tête des notes. */
  notesShowWhatsApp: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  density: 'comfortable',
  locale: 'fr',
  notesShowWhatsApp: true,
};

export function normalizePreferences(raw: unknown): UserPreferences {
  const base = { ...DEFAULT_USER_PREFERENCES };
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;

  if (o.density === 'compact' || o.density === 'comfortable') {
    base.density = o.density;
  }
  if (o.locale === 'fr' || o.locale === 'en') {
    base.locale = o.locale;
  }
  if (typeof o.notesShowWhatsApp === 'boolean') {
    base.notesShowWhatsApp = o.notesShowWhatsApp;
  }

  return base;
}

/** Fusionne un patch partiel sur des préférences déjà normalisées. */
export function mergePreferences(
  current: UserPreferences,
  patch: Partial<UserPreferences>,
): UserPreferences {
  return normalizePreferences({ ...current, ...patch });
}
