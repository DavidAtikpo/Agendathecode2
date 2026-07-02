import type { Metadata } from 'next';
import GuestI18nShell from '@/app/components/GuestI18nShell';
import DeleteAccountContent from './DeleteAccountContent';

const SITE_URL = 'https://neurix.qrthecode2.com';

export const metadata: Metadata = {
  title: 'Delete account — Neurix',
  description:
    'Request deletion of your Neurix account and associated data (mobile app and website).',
  alternates: {
    canonical: `${SITE_URL}/delete-account`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DeleteAccountPage() {
  return (
    <GuestI18nShell>
      <DeleteAccountContent />
    </GuestI18nShell>
  );
}
