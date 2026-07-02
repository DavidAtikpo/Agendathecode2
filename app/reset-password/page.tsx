import type { Metadata } from 'next';
import GuestI18nShell from '@/app/components/GuestI18nShell';
import ResetPasswordContent from './ResetPasswordContent';

export const metadata: Metadata = {
  title: 'Reset password — Neurix',
  description: 'Choose a new password for your Neurix account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <GuestI18nShell>
      <ResetPasswordContent />
    </GuestI18nShell>
  );
}
