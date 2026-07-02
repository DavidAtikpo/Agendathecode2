'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { messages } from './messages';
import { t } from './translate';
import type { AppLocale } from './types';

export { messages, t };
export type { AppLocale };

type I18nContextValue = {
  locale: AppLocale;
  t: (key: string, params?: Record<string, string | number>) => string;
  dateLocale: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params) => t(messages as unknown as Parameters<typeof t>[0], locale, key, params),
      dateLocale: locale === 'en' ? 'en-US' : 'fr-FR',
    }),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

/** Safe hook for optional provider (static pages with fallback locale). */
export function useI18nOptional(fallback: AppLocale = 'en'): I18nContextValue {
  const ctx = useContext(I18nContext);
  return useMemo(
    () =>
      ctx ?? {
        locale: fallback,
        t: (key, params) => t(messages as unknown as Parameters<typeof t>[0], fallback, key, params),
        dateLocale: fallback === 'en' ? 'en-US' : 'fr-FR',
      },
    [ctx, fallback],
  );
}
