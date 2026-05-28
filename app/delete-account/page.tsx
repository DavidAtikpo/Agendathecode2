import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

const SITE_URL = 'https://neurix.qrthecode2.com';
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? 'pmcides@gmail.com';
const LAST_UPDATED = '28 mai 2026';

const MAILTO_DELETE = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'Demande de suppression de compte Neurix',
)}&body=${encodeURIComponent(
  `Bonjour,

Je souhaite supprimer mon compte Neurix et les données associées.

Adresse e-mail du compte : [indiquez votre e-mail]
Application utilisée : [site web / application Android]

Merci de confirmer la prise en charge de ma demande.

Cordialement,
[Votre nom]`,
)}`;

export const metadata: Metadata = {
  title: 'Suppression de compte — Neurix',
  description:
    'Demandez la suppression de votre compte Neurix et des données associées (application mobile et site web).',
  alternates: {
    canonical: `${SITE_URL}/delete-account`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function DeleteAccountPage() {
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
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Confidentialité
            </Link>
            <Link
              href="/"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Accueil
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-2 text-sm text-slate-400">Dernière mise à jour : {LAST_UPDATED}</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Suppression de compte et des données
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-400">
          Conformément au RGPD et aux exigences des stores d&apos;applications, vous pouvez demander
          la suppression de votre compte <strong className="text-slate-200">Neurix</strong> et des
          données personnelles associées (site web et application mobile).
        </p>

        <div className="mb-10 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">Demander la suppression</h2>
          <p className="mb-4 text-sm text-slate-300">
            Envoyez un e-mail depuis l&apos;adresse liée à votre compte Neurix. Nous traiterons votre
            demande dans un délai maximal de <strong className="text-slate-200">30 jours</strong>{' '}
            (en général sous 7 jours ouvrés).
          </p>
          <a
            href={MAILTO_DELETE}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Envoyer une demande par e-mail
          </a>
          <p className="mt-3 text-xs text-slate-400">
            Ou écrivez à{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{' '}
            avec l&apos;objet « Demande de suppression de compte Neurix ».
          </p>
        </div>

        <Section title="Informations à fournir">
          <p>Pour traiter votre demande rapidement, indiquez :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>L&apos;adresse e-mail de votre compte Neurix ;</li>
            <li>Si vous utilisez le site web, l&apos;application Android, ou les deux ;</li>
            <li>Toute précision utile (ex. compte créé via Google).</li>
          </ul>
        </Section>

        <Section title="Données supprimées">
          <p>Lors de la suppression définitive du compte, nous supprimons notamment :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Profil (nom, e-mail, préférences, avatar) ;</li>
            <li>Notes, tâches, commentaires et pièces jointes que vous avez créés ;</li>
            <li>Liens d&apos;équipe et partages associés à votre compte ;</li>
            <li>Historique de l&apos;assistant IA lié à votre compte sur nos serveurs ;</li>
            <li>Jetons de notification push (FCM) enregistrés pour votre appareil ;</li>
            <li>Identifiants de session et données de connexion.</li>
          </ul>
          <p>
            Les fichiers hébergés chez nos prestataires (ex. Cloudinary) liés à votre compte sont
            également supprimés ou rendus inaccessibles dans le cadre de cette opération.
          </p>
        </Section>

        <Section title="Données que nous pouvons conserver">
          <p>
            Certaines données peuvent être conservées plus longtemps lorsque la loi l&apos;exige ou
            pour des motifs légitimes limités :
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Données de facturation et transactions (abonnement Pro, crédits IA) : durée imposée par
              les obligations comptables et fiscales ;
            </li>
            <li>
              Journaux techniques anonymisés ou agrégés à des fins de sécurité, sans identification
              directe ;
            </li>
            <li>
              Copies de sauvegarde : suppression ou anonymisation sous un délai supplémentaire
              raisonnable (jusqu&apos;à 90 jours).
            </li>
          </ul>
        </Section>

        <Section title="Avant de supprimer votre compte">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Exportez ou sauvegardez vos notes et tâches importantes (l&apos;application et le site
              ne proposent pas encore d&apos;export automatique complet).
            </li>
            <li>
              Si vous avez un abonnement <strong className="text-slate-200">Neurix Pro</strong>,
              annulez-le depuis la facturation (Stripe) avant ou après la demande ; la suppression du
              compte n&apos;annule pas automatiquement un abonnement actif chez Stripe.
            </li>
            <li>
              La suppression est <strong className="text-slate-200">irréversible</strong>.
            </li>
          </ul>
        </Section>

        <Section title="Autres droits">
          <p>
            Pour un accès, une rectification ou une limitation du traitement sans supprimer votre
            compte, consultez nos{' '}
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 hover:underline">
              règles de confidentialité
            </Link>{' '}
            ou contactez-nous à la même adresse e-mail.
          </p>
        </Section>

        <footer className="mt-12 border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Neurix</p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
              Règles de confidentialité
            </Link>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">
              Accueil
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
