import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

const SITE_URL = 'https://neurix.qrthecode2.com';
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ?? 'pmcides@gmail.com';
const LAST_UPDATED = '28 mai 2026';

export const metadata: Metadata = {
  title: 'Règles de confidentialité — Neurix',
  description:
    'Politique de confidentialité de Neurix : données collectées, finalités, sous-traitants, droits RGPD et contact.',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
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

export default function PrivacyPage() {
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
          <Link
            href="/"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-2 text-sm text-slate-400">Dernière mise à jour : {LAST_UPDATED}</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Règles de confidentialité
        </h1>
        <p className="mb-10 text-base leading-relaxed text-slate-400">
          La présente politique explique comment <strong className="text-slate-200">Neurix</strong>{' '}
          (site web et application mobile) collecte, utilise, conserve et protège vos données
          personnelles, conformément au Règlement général sur la protection des données (RGPD) et aux
          exigences des stores d&apos;applications.
        </p>

        <Section title="1. Responsable du traitement">
          <p>
            L&apos;éditeur du service Neurix est responsable du traitement des données décrites
            ci-dessous.
          </p>
          <p>
            Contact confidentialité :{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            Site :{' '}
            <a
              href={SITE_URL}
              className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
            >
              {SITE_URL}
            </a>
          </p>
        </Section>

        <Section title="2. Données que nous collectons">
          <p>Selon votre utilisation du service, nous pouvons traiter :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-200">Données de compte</strong> : nom, adresse e-mail,
              mot de passe (haché) ou identifiant Google (connexion OAuth), couleur d&apos;avatar,
              préférences d&apos;affichage (langue, densité, etc.).
            </li>
            <li>
              <strong className="text-slate-200">Contenus que vous créez</strong> : notes, tâches,
              commentaires de tâches, pièces jointes (images, documents), transcriptions et
              comptes-rendus de réunions, messages échangés avec l&apos;assistant IA.
            </li>
            <li>
              <strong className="text-slate-200">Données de collaboration</strong> : contacts
              d&apos;équipe ajoutés par e-mail, assignations de tâches, partages de notes.
            </li>
            <li>
              <strong className="text-slate-200">Données techniques</strong> : identifiants de
              session, jetons de notification push (FCM) liés à votre appareil mobile, type de
              plateforme (ex. Android), journaux techniques limités (erreurs, sécurité).
            </li>
            <li>
              <strong className="text-slate-200">Données de facturation</strong> (si vous souscrivez
              à Neurix Pro ou achetez des crédits IA) : identifiants client Stripe, statut
              d&apos;abonnement ; les numéros de carte bancaire sont traités directement par{' '}
              <strong className="text-slate-200">Stripe</strong>, et non stockés sur nos serveurs.
            </li>
            <li>
              <strong className="text-slate-200">Données locales sur votre appareil</strong>{' '}
              (application mobile) : préférence de thème clair/sombre, historique de chat IA local
              tant que vous n&apos;êtes pas connecté, numéro WhatsApp saisi pour les rappels
              (stockage local uniquement).
            </li>
          </ul>
          <p>
            <strong className="text-slate-200">Microphone et caméra</strong> : l&apos;application
            mobile peut demander l&apos;accès au micro pour la dictée de réunions et à la caméra
            pour joindre des photos. Ces accès ne sont utilisés que lorsque vous lancez
            explicitement la fonction concernée.
          </p>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul className="list-disc space-y-2 pl-5">
            <li>Créer et gérer votre compte, vous authentifier et synchroniser vos données.</li>
            <li>Fournir les fonctionnalités de notes, tâches, planning, réunions et collaboration.</li>
            <li>Envoyer des notifications (assignation de tâche, commentaires, rappels, partages).</li>
            <li>Envoyer des rappels par e-mail lorsque vous activez cette option sur une note.</li>
            <li>Proposer l&apos;assistant IA et la correction/structuration de transcriptions.</li>
            <li>Gérer les abonnements Pro et l&apos;achat de crédits IA via Stripe.</li>
            <li>Assurer la sécurité, prévenir la fraude et améliorer le service.</li>
            <li>Respecter nos obligations légales.</li>
          </ul>
        </Section>

        <Section title="4. Bases légales (RGPD)">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-200">Exécution du contrat</strong> : fourniture du
              service Neurix.
            </li>
            <li>
              <strong className="text-slate-200">Consentement</strong> : notifications push,
              connexion Google, envoi de rappels e-mail, accès micro/caméra, messages à l&apos;IA.
            </li>
            <li>
              <strong className="text-slate-200">Intérêt légitime</strong> : sécurité du service,
              support, amélioration technique.
            </li>
            <li>
              <strong className="text-slate-200">Obligation légale</strong> : conservation de
              certaines données de facturation.
            </li>
          </ul>
        </Section>

        <Section title="5. Sous-traitants et destinataires">
          <p>
            Nous faisons appel à des prestataires qui peuvent traiter vos données pour notre compte,
            notamment :
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-slate-200">Google</strong> — connexion OAuth (Google Sign-In)
              et notifications push (Firebase Cloud Messaging).
            </li>
            <li>
              <strong className="text-slate-200">Stripe</strong> — paiements et abonnements.
            </li>
            <li>
              <strong className="text-slate-200">Cloudinary</strong> — hébergement des fichiers
              joints (images, documents).
            </li>
            <li>
              <strong className="text-slate-200">Fournisseurs d&apos;IA</strong> (ex. OpenAI,
              Anthropic) — traitement des messages et transcriptions que vous soumettez à
              l&apos;assistant ou aux outils de réunion.
            </li>
            <li>
              <strong className="text-slate-200">Hébergeur base de données</strong> — stockage
              sécurisé des comptes et contenus (PostgreSQL).
            </li>
          </ul>
          <p>
            Ces prestataires n&apos;utilisent vos données que selon nos instructions et leurs propres
            politiques de confidentialité. Certains peuvent être situés hors Union européenne ; dans
            ce cas, des garanties appropriées (clauses contractuelles types, etc.) sont mises en
            place lorsque requis.
          </p>
        </Section>

        <Section title="6. Durée de conservation">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Données de compte et contenus : conservés tant que votre compte est actif, puis
              supprimés ou anonymisés dans un délai raisonnable après suppression du compte.
            </li>
            <li>
              Jetons de notification push : supprimés lors de la déconnexion ou de la suppression du
              compte.
            </li>
            <li>
              Données de facturation : conservées selon les obligations comptables et fiscales
              applicables.
            </li>
            <li>
              Journaux techniques : conservés pour une durée limitée, sauf obligation légale
              contraire.
            </li>
          </ul>
        </Section>

        <Section title="7. Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Accès, rectification, effacement de vos données.</li>
            <li>Limitation du traitement et opposition, dans les cas prévus par la loi.</li>
            <li>Portabilité de vos données (format structuré, lorsque applicable).</li>
            <li>Retrait de votre consentement à tout moment (sans affecter la licéité du traitement antérieur).</li>
            <li>Introduction d&apos;une réclamation auprès de la CNIL (www.cnil.fr).</li>
          </ul>
          <p>
            <strong className="text-slate-200">Suppression de compte :</strong> vous pouvez demander
            la suppression de votre compte et des données associées via notre page dédiée :{' '}
            <Link
              href="/delete-account"
              className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
            >
              {SITE_URL}/delete-account
            </Link>
            .
          </p>
          <p>
            Pour exercer vos droits, contactez-nous à{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            . Nous pourrons vous demander une preuve d&apos;identité.
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement
            des mots de passe, sessions sécurisées, accès restreint, sauvegardes) pour protéger vos
            données contre l&apos;accès non autorisé, la perte ou la divulgation.
          </p>
        </Section>

        <Section title="9. Enfants de moins de 13 ans">
          <p>
            Neurix n&apos;est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas
            sciemment de données personnelles auprès d&apos;enfants de moins de 13 ans. Si vous
            êtes parent ou tuteur et pensez qu&apos;un enfant nous a fourni des données, contactez-nous
            afin que nous puissions les supprimer.
          </p>
          <p>
            L&apos;utilisation du service par un mineur doit se faire avec l&apos;accord d&apos;un
            parent ou tuteur légal, conformément à la réglementation applicable.
          </p>
        </Section>

        <Section title="10. Cookies et traceurs (site web)">
          <p>
            Le site utilise des cookies ou technologies similaires strictement nécessaires au
            fonctionnement (session de connexion) et, le cas échéant, des services tiers (ex.
            publicité ou analytics) selon votre configuration. Vous pouvez gérer les cookies via
            les paramètres de votre navigateur.
          </p>
        </Section>

        <Section title="11. Modifications">
          <p>
            Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en
            haut de la page. En cas de changement important, nous vous en informerons par un moyen
            approprié (notification in-app, e-mail ou bandeau sur le site).
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Pour toute question relative à cette politique ou à vos données personnelles :{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="mt-12 border-t border-slate-700 pt-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Neurix — Tous droits réservés.</p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
              neurix.qrthecode2.com
            </Link>
            <Link href="/delete-account" className="text-indigo-400 hover:text-indigo-300">
              Suppression de compte
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
