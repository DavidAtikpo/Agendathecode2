import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_RELEASES } from '@/app/lib/app-release-config';

const SITE_URL = 'https://neurix.qrthecode2.com';
const APK_PATH = '/downloads/neurix.apk';

export const metadata: Metadata = {
  title: 'Télécharger Neurix — Application Android',
  description:
    'Téléchargez et installez l\'application mobile Neurix sur Android 7.0 (Nougat) et versions ultérieures.',
  alternates: {
    canonical: `${SITE_URL}/download`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DownloadPage() {
  const android = APP_RELEASES.android;

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo (1).png"
              alt="Neurix"
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="font-semibold text-white">Neurix</span>
          </Link>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Télécharger l&apos;application Neurix
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-400">
          Compatible avec les téléphones et tablettes Android{' '}
          <strong className="text-slate-200">7.0 (Nougat) et versions ultérieures</strong>.
          Version actuelle : <strong className="text-slate-200">{android.latestVersion}</strong>.
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
          Télécharger l&apos;APK Android
        </a>

        <section className="mb-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Étapes d&apos;installation</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
            <li>Téléchargez le fichier <code className="rounded bg-slate-900 px-1.5 py-0.5">neurix.apk</code> avec le bouton ci-dessus.</li>
            <li>
              Ouvrez le fichier téléchargé depuis vos notifications ou votre dossier{' '}
              <strong className="text-slate-200">Téléchargements</strong>.
            </li>
            <li>
              Si Android affiche un avertissement, autorisez l&apos;installation depuis{' '}
              <strong className="text-slate-200">« Sources inconnues »</strong> pour votre navigateur
              (paramètre demandé une seule fois).
            </li>
            <li>Appuyez sur <strong className="text-slate-200">Installer</strong>, puis ouvrez l&apos;application.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Vous avez déjà l&apos;application ?</h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Si une mise à jour est disponible, Neurix vous en informe automatiquement à l&apos;ouverture
            de l&apos;application. Il vous suffira d&apos;appuyer sur « Mettre à jour » pour revenir sur
            cette page et installer la dernière version.
          </p>
        </section>

        <p className="text-xs text-slate-500">
          En cas de problème d&apos;installation, contactez le support depuis l&apos;application ou par
          e-mail.
        </p>
      </main>
    </div>
  );
}
