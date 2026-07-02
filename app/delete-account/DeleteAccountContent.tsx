'use client';

import Link from 'next/link';
import { useI18n } from '@/app/lib/i18n';
import { staticMessages } from '@/app/lib/i18n/messages/static';
import { StaticPageLayout } from '@/app/components/static/StaticPageLayout';

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? 'pmcides@gmail.com';
const LAST_UPDATED = 'May 28, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function DeleteAccountContent() {
  const { locale, t } = useI18n();
  const copy = staticMessages[locale].deleteAccount;

  const mailtoDelete = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    copy.mailSubject,
  )}&body=${encodeURIComponent(
    locale === 'fr'
      ? `Bonjour,

Je souhaite supprimer mon compte Neurix et les données associées.

Adresse e-mail du compte : [indiquez votre e-mail]
Application utilisée : [site web / application Android]

Merci de confirmer la prise en charge de ma demande.

Cordialement,
[Votre nom]`
      : `Hello,

I would like to delete my Neurix account and associated data.

Account email address: [your email]
Application used: [website / Android app]

Please confirm you have received my request.

Best regards,
[Your name]`,
  )}`;

  return (
    <StaticPageLayout
      headerLinks={
        <Link href="/privacy" className="text-sm text-slate-400 hover:text-slate-200">
          {t('static.common.privacy')}
        </Link>
      }
    >
      <p className="mb-2 text-sm text-slate-400">
        {t('static.common.lastUpdated', { date: LAST_UPDATED })}
      </p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mb-8 text-base leading-relaxed text-slate-400">{copy.intro}</p>

      <div className="mb-10 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">{copy.request.title}</h2>
        <p className="mb-4 text-sm text-slate-300">{copy.request.body}</p>
        <a
          href={mailtoDelete}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {copy.request.cta}
        </a>
        <p className="mt-3 text-xs text-slate-400">
          {t('static.deleteAccount.request.alt', { email: CONTACT_EMAIL })}
        </p>
      </div>

      <Section title={copy.provide.title}>
        <p>{copy.provide.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          {copy.provide.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title={copy.deleted.title}>
        <p>{copy.deleted.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          {copy.deleted.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{copy.deleted.outro}</p>
      </Section>

      <Section title={copy.retained.title}>
        <p>{copy.retained.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          {copy.retained.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title={copy.before.title}>
        <ul className="list-disc space-y-2 pl-5">
          {copy.before.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title={copy.otherRights.title}>
        <p>{copy.otherRights.body}</p>
      </Section>

      <footer className="mt-12 border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
        <p>{t('static.common.copyrightShort', { year: String(new Date().getFullYear()) })}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
            {t('static.common.privacyRules')}
          </Link>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            {t('static.common.home')}
          </Link>
        </p>
      </footer>
    </StaticPageLayout>
  );
}
