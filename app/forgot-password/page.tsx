import type { Metadata } from 'next';
import GuestI18nShell from '@/app/components/GuestI18nShell';
import ForgotPasswordContent from './ForgotPasswordContent';

export const metadata: Metadata = {
  title: 'Forgot password — Neurix',
  description: 'Reset your Neurix account password.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <GuestI18nShell>
      <ForgotPasswordContent />
    </GuestI18nShell>
  );
}
