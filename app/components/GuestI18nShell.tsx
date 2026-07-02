'use client';

import { useEffect, useState } from 'react';
import { I18nProvider, type AppLocale } from '@/app/lib/i18n';
import { readGuestLocale } from '@/app/lib/read-guest-locale';

export default function GuestI18nShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>('en');

  useEffect(() => {
    setLocale(readGuestLocale());
  }, []);

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
