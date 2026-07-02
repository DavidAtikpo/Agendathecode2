import type { Metadata } from 'next';
import GuestI18nShell from '@/app/components/GuestI18nShell';
import PrivacyContent from './PrivacyContent';

const SITE_URL = 'https://neurix.qrthecode2.com';

export const metadata: Metadata = {
  title: 'Privacy policy — Neurix',
  description:
    'Neurix privacy policy: data collected, purposes, subprocessors, GDPR rights, and contact.',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <GuestI18nShell>
      <PrivacyContent />
    </GuestI18nShell>
  );
}
