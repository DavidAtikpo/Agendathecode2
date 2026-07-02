'use client';

import { useI18n } from '@/app/lib/i18n';
import { staticMessages } from '@/app/lib/i18n/messages/static';
import { APP_RELEASES } from '@/app/lib/app-release-config';
import { StaticPageLayout } from '@/app/components/static/StaticPageLayout';

const APK_PATH = '/downloads/neurix.apk';

export default function DownloadContent() {
  const { locale, t } = useI18n();
  const copy = staticMessages[locale].download;
  const android = APP_RELEASES.android;

  return (
    <StaticPageLayout>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mb-8 text-base leading-relaxed text-slate-400">
        {t('static.download.intro', { version: android.latestVersion })}
      </p>

      <a
        href={APK_PATH}
        download
        className="mb-10 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />
        </svg>
        {copy.cta}
      </a>

      <section className="mb-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{copy.install.title}</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
          {copy.install.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-white">{copy.alreadyInstalled.title}</h2>
        <p className="text-sm leading-relaxed text-slate-400">{copy.alreadyInstalled.body}</p>
      </section>

      <p className="text-xs text-slate-500">{copy.support}</p>
    </StaticPageLayout>
  );
}
