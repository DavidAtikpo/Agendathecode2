'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useI18n } from '@/app/lib/i18n';
import { StaticPageLayout } from '@/app/components/static/StaticPageLayout';
import type { User } from '@/app/types';

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token')?.trim() ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-300">{t('auth.resetPassword.missingToken')}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
          {t('auth.resetPassword.requestNewLink')}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.resetPassword.minLength'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.resetPassword.mismatch'));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = (await res.json()) as User & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t('auth.resetPassword.invalidToken'));
      }
      setDone(true);
      setTimeout(() => router.replace('/'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.status.error'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        {t('auth.resetPassword.success')}
      </p>
    );
  }

  return (
    <form onSubmit={e => void handleSubmit(e)} className="max-w-md space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('auth.resetPassword.newPassword')}
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('auth.resetPassword.confirmPassword')}
        </label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {busy ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
      </button>
      <Link
        href="/forgot-password"
        className="block text-center text-sm text-slate-500 hover:text-slate-300"
      >
        {t('auth.resetPassword.requestNewLink')}
      </Link>
    </form>
  );
}

export default function ResetPasswordContent() {
  const { t } = useI18n();

  return (
    <StaticPageLayout>
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
        {t('auth.resetPassword.title')}
      </h1>
      <p className="mb-8 text-sm text-slate-400">{t('auth.resetPassword.subtitle')}</p>
      <Suspense fallback={<p className="text-sm text-slate-400">{t('common.status.loading')}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </StaticPageLayout>
  );
}
