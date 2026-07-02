'use client';

import Link from 'next/link';
import { useI18n } from '@/app/lib/i18n';

export function StaticPageLayout({
  children,
  headerLinks,
}: {
  children: React.ReactNode;
  headerLinks?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo (1).png"
              alt={t('common.brand.name')}
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="font-semibold text-white">{t('common.brand.name')}</span>
          </Link>
          <div className="flex items-center gap-4">
            {headerLinks}
            <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
              {t('static.common.backHome')}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
