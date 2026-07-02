import type { Metadata } from 'next';
import GuestI18nShell from '@/app/components/GuestI18nShell';
import DownloadContent from './DownloadContent';

const SITE_URL = 'https://neurix.qrthecode2.com';

export const metadata: Metadata = {
  title: 'Download Neurix — Android app',
  description:
    'Download and install the Neurix mobile app on Android 7.0 (Nougat) and later.',
  alternates: {
    canonical: `${SITE_URL}/download`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DownloadPage() {
  return (
    <GuestI18nShell>
      <DownloadContent />
    </GuestI18nShell>
  );
}
