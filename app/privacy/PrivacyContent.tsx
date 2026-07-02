'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/app/lib/i18n';
import { staticMessages } from '@/app/lib/i18n/messages/static';
import { StaticPageLayout } from '@/app/components/static/StaticPageLayout';

const SITE_URL = 'https://neurix.qrthecode2.com';
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? 'pmcides@gmail.com';
const LAST_UPDATED = 'May 28, 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PrivacyContent() {
  const { locale, t } = useI18n();
  const sections = staticMessages[locale].privacy.sections;

  return (
    <StaticPageLayout>
      <p className="mb-2 text-sm text-slate-400">
        {t('static.common.lastUpdated', { date: LAST_UPDATED })}
      </p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {t('static.privacy.title')}
      </h1>
      <p className="mb-10 text-base leading-relaxed text-slate-400">{t('static.privacy.intro')}</p>

      <Section title={sections.controller.title}>
        <p>{sections.controller.body1}</p>
        <p>
          {sections.controller.contactLabel}{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          {sections.controller.siteLabel}{' '}
          <a
            href={SITE_URL}
            className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
          >
            {SITE_URL}
          </a>
        </p>
      </Section>

      <Section title={sections.collected.title}>
        <p>{sections.collected.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{sections.collected.account}</li>
          <li>{sections.collected.content}</li>
          <li>{sections.collected.collaboration}</li>
          <li>{sections.collected.technical}</li>
          <li>{sections.collected.billing}</li>
          <li>{sections.collected.local}</li>
        </ul>
        <p>{sections.collected.micCamera}</p>
      </Section>

      <Section title={sections.purposes.title}>
        <ul className="list-disc space-y-2 pl-5">
          {sections.purposes.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title={sections.legalBasis.title}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{sections.legalBasis.contract}</li>
          <li>{sections.legalBasis.consent}</li>
          <li>{sections.legalBasis.legitimate}</li>
          <li>{sections.legalBasis.legal}</li>
        </ul>
      </Section>

      <Section title={sections.processors.title}>
        <p>{sections.processors.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{sections.processors.google}</li>
          <li>{sections.processors.stripe}</li>
          <li>{sections.processors.cloudinary}</li>
          <li>{sections.processors.ai}</li>
          <li>{sections.processors.hosting}</li>
        </ul>
        <p>{sections.processors.outro}</p>
      </Section>

      <Section title={sections.retention.title}>
        <ul className="list-disc space-y-2 pl-5">
          <li>{sections.retention.account}</li>
          <li>{sections.retention.push}</li>
          <li>{sections.retention.billing}</li>
          <li>{sections.retention.logs}</li>
        </ul>
      </Section>

      <Section title={sections.rights.title}>
        <p>{sections.rights.intro}</p>
        <ul className="list-disc space-y-2 pl-5">
          {sections.rights.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          {sections.rights.deleteAccount}{' '}
          <Link
            href="/delete-account"
            className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
          >
            {SITE_URL}/delete-account
          </Link>
          .
        </p>
        <p>{t('static.privacy.sections.rights.contact', { email: CONTACT_EMAIL })}</p>
      </Section>

      <Section title={sections.security.title}>
        <p>{sections.security.body}</p>
      </Section>

      <Section title={sections.children.title}>
        <p>{sections.children.body1}</p>
        <p>{sections.children.body2}</p>
      </Section>

      <Section title={sections.cookies.title}>
        <p>{sections.cookies.body}</p>
      </Section>

      <Section title={sections.changes.title}>
        <p>{sections.changes.body}</p>
      </Section>

      <Section title={sections.contact.title}>
        <p>
          {sections.contact.body}{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      <footer className="mt-12 border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
        <p>{t('static.common.copyright', { year: String(new Date().getFullYear()) })}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
            neurix.qrthecode2.com
          </Link>
          <Link href="/delete-account" className="text-indigo-400 hover:text-indigo-300">
            {t('static.common.deleteAccount')}
          </Link>
        </p>
      </footer>
    </StaticPageLayout>
  );
}
