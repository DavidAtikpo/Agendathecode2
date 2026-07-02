'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/app/lib/i18n';
import { StaticPageLayout } from '@/app/components/static/StaticPageLayout';

export default function ForgotPasswordContent() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t('common.status.error'));
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.status.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaticPageLayout>
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
        {t('auth.forgotPassword.title')}
      </h1>
      <p className="mb-8 text-sm text-slate-400">{t('auth.forgotPassword.subtitle')}</p>

      {sent ? (
        <div className="space-y-6">
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {t('auth.forgotPassword.success')}
          </p>
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-indigo-400 hover:text-indigo-300"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={e => void handleSubmit(e)} className="max-w-md space-y-4">
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('auth.fields.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder={t('auth.fields.emailPlaceholder')}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-slate-500 hover:text-slate-300"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </form>
      )}
    </StaticPageLayout>
  );
}
