export const staticMessages = {
  fr: {
    common: {
      backHome: 'Retour à l\'accueil',
      home: 'Accueil',
      privacy: 'Confidentialité',
      privacyRules: 'Règles de confidentialité',
      deleteAccount: 'Suppression de compte',
      lastUpdated: 'Dernière mise à jour : {date}',
      copyright: '© {year} Neurix — Tous droits réservés.',
      copyrightShort: '© {year} Neurix',
    },
    privacy: {
      metaTitle: 'Règles de confidentialité — Neurix',
      metaDescription:
        'Politique de confidentialité de Neurix : données collectées, finalités, sous-traitants, droits RGPD et contact.',
      title: 'Règles de confidentialité',
      intro:
        'La présente politique explique comment Neurix (site web et application mobile) collecte, utilise, conserve et protège vos données personnelles, conformément au Règlement général sur la protection des données (RGPD) et aux exigences des stores d\'applications.',
      sections: {
        controller: {
          title: '1. Responsable du traitement',
          body1: 'L\'éditeur du service Neurix est responsable du traitement des données décrites ci-dessous.',
          contactLabel: 'Contact confidentialité :',
          siteLabel: 'Site :',
        },
        collected: {
          title: '2. Données que nous collectons',
          intro: 'Selon votre utilisation du service, nous pouvons traiter :',
          account:
            'Données de compte : nom, adresse e-mail, mot de passe (haché) ou identifiant Google (connexion OAuth), couleur d\'avatar, préférences d\'affichage (langue, densité, etc.).',
          content:
            'Contenus que vous créez : notes, tâches, commentaires de tâches, pièces jointes (images, documents), transcriptions et comptes-rendus de réunions, messages échangés avec l\'assistant IA.',
          collaboration:
            'Données de collaboration : contacts d\'équipe ajoutés par e-mail, assignations de tâches, partages de notes.',
          technical:
            'Données techniques : identifiants de session, jetons de notification push (FCM) liés à votre appareil mobile, type de plateforme (ex. Android), journaux techniques limités (erreurs, sécurité).',
          billing:
            'Données de facturation (si vous souscrivez à Neurix Pro ou achetez des crédits IA) : identifiants client Stripe, statut d\'abonnement ; les numéros de carte bancaire sont traités directement par Stripe, et non stockés sur nos serveurs.',
          local:
            'Données locales sur votre appareil (application mobile) : préférence de thème clair/sombre, historique de chat IA local tant que vous n\'êtes pas connecté, numéro WhatsApp saisi pour les rappels (stockage local uniquement).',
          micCamera:
            'Microphone et caméra : l\'application mobile peut demander l\'accès au micro pour la dictée de réunions et à la caméra pour joindre des photos. Ces accès ne sont utilisés que lorsque vous lancez explicitement la fonction concernée.',
        },
        purposes: {
          title: '3. Finalités du traitement',
          items: [
            'Créer et gérer votre compte, vous authentifier et synchroniser vos données.',
            'Fournir les fonctionnalités de notes, tâches, planning, réunions et collaboration.',
            'Envoyer des notifications (assignation de tâche, commentaires, rappels, partages).',
            'Envoyer des rappels par e-mail lorsque vous activez cette option sur une note.',
            'Proposer l\'assistant IA et la correction/structuration de transcriptions.',
            'Gérer les abonnements Pro et l\'achat de crédits IA via Stripe.',
            'Assurer la sécurité, prévenir la fraude et améliorer le service.',
            'Respecter nos obligations légales.',
          ],
        },
        legalBasis: {
          title: '4. Bases légales (RGPD)',
          contract: 'Exécution du contrat : fourniture du service Neurix.',
          consent:
            'Consentement : notifications push, connexion Google, envoi de rappels e-mail, accès micro/caméra, messages à l\'IA.',
          legitimate: 'Intérêt légitime : sécurité du service, support, amélioration technique.',
          legal: 'Obligation légale : conservation de certaines données de facturation.',
        },
        processors: {
          title: '5. Sous-traitants et destinataires',
          intro: 'Nous faisons appel à des prestataires qui peuvent traiter vos données pour notre compte, notamment :',
          google: 'Google — connexion OAuth (Google Sign-In) et notifications push (Firebase Cloud Messaging).',
          stripe: 'Stripe — paiements et abonnements.',
          cloudinary: 'Cloudinary — hébergement des fichiers joints (images, documents).',
          ai: 'Fournisseurs d\'IA (ex. OpenAI, Anthropic) — traitement des messages et transcriptions que vous soumettez à l\'assistant ou aux outils de réunion.',
          hosting: 'Hébergeur base de données — stockage sécurisé des comptes et contenus (PostgreSQL).',
          outro:
            'Ces prestataires n\'utilisent vos données que selon nos instructions et leurs propres politiques de confidentialité. Certains peuvent être situés hors Union européenne ; dans ce cas, des garanties appropriées (clauses contractuelles types, etc.) sont mises en place lorsque requis.',
        },
        retention: {
          title: '6. Durée de conservation',
          account:
            'Données de compte et contenus : conservés tant que votre compte est actif, puis supprimés ou anonymisés dans un délai raisonnable après suppression du compte.',
          push: 'Jetons de notification push : supprimés lors de la déconnexion ou de la suppression du compte.',
          billing: 'Données de facturation : conservées selon les obligations comptables et fiscales applicables.',
          logs: 'Journaux techniques : conservés pour une durée limitée, sauf obligation légale contraire.',
        },
        rights: {
          title: '7. Vos droits',
          intro: 'Conformément au RGPD, vous disposez des droits suivants :',
          items: [
            'Accès, rectification, effacement de vos données.',
            'Limitation du traitement et opposition, dans les cas prévus par la loi.',
            'Portabilité de vos données (format structuré, lorsque applicable).',
            'Retrait de votre consentement à tout moment (sans affecter la licéité du traitement antérieur).',
            'Introduction d\'une réclamation auprès de la CNIL (www.cnil.fr).',
          ],
          deleteAccount:
            'Suppression de compte : vous pouvez demander la suppression de votre compte et des données associées via notre page dédiée :',
          contact: 'Pour exercer vos droits, contactez-nous à {email}. Nous pourrons vous demander une preuve d\'identité.',
        },
        security: {
          title: '8. Sécurité',
          body:
            'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement des mots de passe, sessions sécurisées, accès restreint, sauvegardes) pour protéger vos données contre l\'accès non autorisé, la perte ou la divulgation.',
        },
        children: {
          title: '9. Enfants de moins de 13 ans',
          body1:
            'Neurix n\'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données personnelles auprès d\'enfants de moins de 13 ans. Si vous êtes parent ou tuteur et pensez qu\'un enfant nous a fourni des données, contactez-nous afin que nous puissions les supprimer.',
          body2:
            'L\'utilisation du service par un mineur doit se faire avec l\'accord d\'un parent ou tuteur légal, conformément à la réglementation applicable.',
        },
        cookies: {
          title: '10. Cookies et traceurs (site web)',
          body:
            'Le site utilise des cookies ou technologies similaires strictement nécessaires au fonctionnement (session de connexion) et, le cas échéant, des services tiers (ex. publicité ou analytics) selon votre configuration. Vous pouvez gérer les cookies via les paramètres de votre navigateur.',
        },
        changes: {
          title: '11. Modifications',
          body:
            'Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut de la page. En cas de changement important, nous vous en informerons par un moyen approprié (notification in-app, e-mail ou bandeau sur le site).',
        },
        contact: {
          title: '12. Contact',
          body: 'Pour toute question relative à cette politique ou à vos données personnelles :',
        },
      },
    },
    deleteAccount: {
      metaTitle: 'Suppression de compte — Neurix',
      metaDescription:
        'Demandez la suppression de votre compte Neurix et des données associées (application mobile et site web).',
      title: 'Suppression de compte et des données',
      intro:
        'Conformément au RGPD et aux exigences des stores d\'applications, vous pouvez demander la suppression de votre compte Neurix et des données personnelles associées (site web et application mobile).',
      request: {
        title: 'Demander la suppression',
        body: 'Envoyez un e-mail depuis l\'adresse liée à votre compte Neurix. Nous traiterons votre demande dans un délai maximal de 30 jours (en général sous 7 jours ouvrés).',
        cta: 'Envoyer une demande par e-mail',
        alt: 'Ou écrivez à {email} avec l\'objet « Demande de suppression de compte Neurix ».',
      },
      mailSubject: 'Demande de suppression de compte Neurix',
      provide: {
        title: 'Informations à fournir',
        intro: 'Pour traiter votre demande rapidement, indiquez :',
        items: [
          'L\'adresse e-mail de votre compte Neurix ;',
          'Si vous utilisez le site web, l\'application Android, ou les deux ;',
          'Toute précision utile (ex. compte créé via Google).',
        ],
      },
      deleted: {
        title: 'Données supprimées',
        intro: 'Lors de la suppression définitive du compte, nous supprimons notamment :',
        items: [
          'Profil (nom, e-mail, préférences, avatar) ;',
          'Notes, tâches, commentaires et pièces jointes que vous avez créés ;',
          'Liens d\'équipe et partages associés à votre compte ;',
          'Historique de l\'assistant IA lié à votre compte sur nos serveurs ;',
          'Jetons de notification push (FCM) enregistrés pour votre appareil ;',
          'Identifiants de session et données de connexion.',
        ],
        outro:
          'Les fichiers hébergés chez nos prestataires (ex. Cloudinary) liés à votre compte sont également supprimés ou rendus inaccessibles dans le cadre de cette opération.',
      },
      retained: {
        title: 'Données que nous pouvons conserver',
        intro:
          'Certaines données peuvent être conservées plus longtemps lorsque la loi l\'exige ou pour des motifs légitimes limités :',
        items: [
          'Données de facturation et transactions (abonnement Pro, crédits IA) : durée imposée par les obligations comptables et fiscales ;',
          'Journaux techniques anonymisés ou agrégés à des fins de sécurité, sans identification directe ;',
          'Copies de sauvegarde : suppression ou anonymisation sous un délai supplémentaire raisonnable (jusqu\'à 90 jours).',
        ],
      },
      before: {
        title: 'Avant de supprimer votre compte',
        items: [
          'Exportez ou sauvegardez vos notes et tâches importantes (l\'application et le site ne proposent pas encore d\'export automatique complet).',
          'Si vous avez un abonnement Neurix Pro, annulez-le depuis la facturation (Stripe) avant ou après la demande ; la suppression du compte n\'annule pas automatiquement un abonnement actif chez Stripe.',
          'La suppression est irréversible.',
        ],
      },
      otherRights: {
        title: 'Autres droits',
        body:
          'Pour un accès, une rectification ou une limitation du traitement sans supprimer votre compte, consultez nos règles de confidentialité ou contactez-nous à la même adresse e-mail.',
      },
    },
    download: {
      metaTitle: 'Télécharger Neurix — Application Android',
      metaDescription:
        'Téléchargez et installez l\'application mobile Neurix sur Android 7.0 (Nougat) et versions ultérieures.',
      title: 'Télécharger l\'application Neurix',
      intro:
        'Compatible avec les téléphones et tablettes Android 7.0 (Nougat) et versions ultérieures. Version actuelle : {version}.',
      cta: 'Télécharger l\'APK Android',
      install: {
        title: 'Étapes d\'installation',
        steps: [
          'Téléchargez le fichier neurix.apk avec le bouton ci-dessus.',
          'Ouvrez le fichier téléchargé depuis vos notifications ou votre dossier Téléchargements.',
          'Si Android affiche un avertissement, autorisez l\'installation depuis « Sources inconnues » pour votre navigateur (paramètre demandé une seule fois).',
          'Appuyez sur Installer, puis ouvrez l\'application.',
        ],
      },
      alreadyInstalled: {
        title: 'Vous avez déjà l\'application ?',
        body:
          'Si une mise à jour est disponible, Neurix vous en informe automatiquement à l\'ouverture de l\'application. Il vous suffira d\'appuyer sur « Mettre à jour » pour revenir sur cette page et installer la dernière version.',
      },
      support: 'En cas de problème d\'installation, contactez le support depuis l\'application ou par e-mail.',
    },
  },
  en: {
    common: {
      backHome: 'Back to home',
      home: 'Home',
      privacy: 'Privacy',
      privacyRules: 'Privacy policy',
      deleteAccount: 'Delete account',
      lastUpdated: 'Last updated: {date}',
      copyright: '© {year} Neurix — All rights reserved.',
      copyrightShort: '© {year} Neurix',
    },
    privacy: {
      metaTitle: 'Privacy policy — Neurix',
      metaDescription:
        'Neurix privacy policy: data collected, purposes, subprocessors, GDPR rights, and contact.',
      title: 'Privacy policy',
      intro:
        'This policy explains how Neurix (website and mobile app) collects, uses, stores, and protects your personal data, in accordance with the General Data Protection Regulation (GDPR) and app store requirements.',
      sections: {
        controller: {
          title: '1. Data controller',
          body1: 'The publisher of Neurix is the controller for the data described below.',
          contactLabel: 'Privacy contact:',
          siteLabel: 'Website:',
        },
        collected: {
          title: '2. Data we collect',
          intro: 'Depending on how you use the service, we may process:',
          account:
            'Account data: name, email address, password (hashed) or Google identifier (OAuth sign-in), avatar color, display preferences (language, density, etc.).',
          content:
            'Content you create: notes, tasks, task comments, attachments (images, documents), meeting transcripts and summaries, messages exchanged with the AI assistant.',
          collaboration:
            'Collaboration data: team contacts added by email, task assignments, note sharing.',
          technical:
            'Technical data: session identifiers, push notification tokens (FCM) linked to your mobile device, platform type (e.g. Android), limited technical logs (errors, security).',
          billing:
            'Billing data (if you subscribe to Neurix Pro or buy AI credits): Stripe customer identifiers, subscription status; card numbers are processed directly by Stripe and are not stored on our servers.',
          local:
            'Local data on your device (mobile app): light/dark theme preference, local AI chat history while signed out, WhatsApp number entered for reminders (local storage only).',
          micCamera:
            'Microphone and camera: the mobile app may request microphone access for meeting dictation and camera access to attach photos. These permissions are used only when you explicitly start the related feature.',
        },
        purposes: {
          title: '3. Processing purposes',
          items: [
            'Create and manage your account, authenticate you, and sync your data.',
            'Provide notes, tasks, planning, meetings, and collaboration features.',
            'Send notifications (task assignment, comments, reminders, sharing).',
            'Send email reminders when you enable that option on a note.',
            'Provide the AI assistant and transcription structuring/correction.',
            'Manage Pro subscriptions and AI credit purchases via Stripe.',
            'Ensure security, prevent fraud, and improve the service.',
            'Comply with legal obligations.',
          ],
        },
        legalBasis: {
          title: '4. Legal bases (GDPR)',
          contract: 'Contract performance: providing the Neurix service.',
          consent:
            'Consent: push notifications, Google sign-in, email reminders, microphone/camera access, messages to AI.',
          legitimate: 'Legitimate interest: service security, support, technical improvement.',
          legal: 'Legal obligation: retention of certain billing data.',
        },
        processors: {
          title: '5. Subprocessors and recipients',
          intro: 'We use providers that may process your data on our behalf, including:',
          google: 'Google — OAuth sign-in (Google Sign-In) and push notifications (Firebase Cloud Messaging).',
          stripe: 'Stripe — payments and subscriptions.',
          cloudinary: 'Cloudinary — hosting of attached files (images, documents).',
          ai: 'AI providers (e.g. OpenAI, Anthropic) — processing messages and transcripts you submit to the assistant or meeting tools.',
          hosting: 'Database host — secure storage of accounts and content (PostgreSQL).',
          outro:
            'These providers use your data only under our instructions and their own privacy policies. Some may be located outside the European Union; appropriate safeguards (standard contractual clauses, etc.) are implemented when required.',
        },
        retention: {
          title: '6. Retention period',
          account:
            'Account data and content: kept while your account is active, then deleted or anonymized within a reasonable time after account deletion.',
          push: 'Push notification tokens: removed when you sign out or delete your account.',
          billing: 'Billing data: kept according to applicable accounting and tax obligations.',
          logs: 'Technical logs: kept for a limited period unless a legal obligation requires otherwise.',
        },
        rights: {
          title: '7. Your rights',
          intro: 'Under the GDPR, you have the following rights:',
          items: [
            'Access, rectification, and erasure of your data.',
            'Restriction of processing and objection, where provided by law.',
            'Data portability (structured format, where applicable).',
            'Withdrawal of consent at any time (without affecting prior lawful processing).',
            'Lodge a complaint with your supervisory authority (e.g. CNIL in France).',
          ],
          deleteAccount:
            'Account deletion: you can request deletion of your account and associated data via our dedicated page:',
          contact: 'To exercise your rights, contact us at {email}. We may ask for proof of identity.',
        },
        security: {
          title: '8. Security',
          body:
            'We implement appropriate technical and organizational measures (password hashing, secure sessions, restricted access, backups) to protect your data against unauthorized access, loss, or disclosure.',
        },
        children: {
          title: '9. Children under 13',
          body1:
            'Neurix is not intended for children under 13. We do not knowingly collect personal data from children under 13. If you are a parent or guardian and believe a child provided us data, contact us so we can delete it.',
          body2:
            'Use of the service by a minor must be with the consent of a parent or legal guardian, as required by applicable law.',
        },
        cookies: {
          title: '10. Cookies and trackers (website)',
          body:
            'The website uses cookies or similar technologies strictly necessary for operation (sign-in session) and, where applicable, third-party services (e.g. ads or analytics) depending on your configuration. You can manage cookies in your browser settings.',
        },
        changes: {
          title: '11. Changes',
          body:
            'We may update this policy. The last updated date appears at the top of the page. For significant changes, we will notify you appropriately (in-app notification, email, or site banner).',
        },
        contact: {
          title: '12. Contact',
          body: 'For any question about this policy or your personal data:',
        },
      },
    },
    deleteAccount: {
      metaTitle: 'Delete account — Neurix',
      metaDescription:
        'Request deletion of your Neurix account and associated data (mobile app and website).',
      title: 'Account and data deletion',
      intro:
        'In accordance with the GDPR and app store requirements, you can request deletion of your Neurix account and associated personal data (website and mobile app).',
      request: {
        title: 'Request deletion',
        body: 'Send an email from the address linked to your Neurix account. We will process your request within 30 days (usually within 7 business days).',
        cta: 'Send a request by email',
        alt: 'Or write to {email} with the subject "Neurix account deletion request".',
      },
      mailSubject: 'Neurix account deletion request',
      provide: {
        title: 'Information to provide',
        intro: 'To process your request quickly, include:',
        items: [
          'The email address of your Neurix account;',
          'Whether you use the website, the Android app, or both;',
          'Any useful detail (e.g. account created via Google).',
        ],
      },
      deleted: {
        title: 'Data deleted',
        intro: 'When the account is permanently deleted, we remove in particular:',
        items: [
          'Profile (name, email, preferences, avatar);',
          'Notes, tasks, comments, and attachments you created;',
          'Team links and sharing associated with your account;',
          'AI assistant history linked to your account on our servers;',
          'Push notification tokens (FCM) registered for your device;',
          'Session identifiers and sign-in data.',
        ],
        outro:
          'Files hosted with our providers (e.g. Cloudinary) linked to your account are also deleted or made inaccessible as part of this operation.',
      },
      retained: {
        title: 'Data we may retain',
        intro:
          'Some data may be kept longer when required by law or for limited legitimate reasons:',
        items: [
          'Billing and transaction data (Pro subscription, AI credits): period required by accounting and tax obligations;',
          'Anonymized or aggregated technical logs for security purposes, without direct identification;',
          'Backup copies: deletion or anonymization within a reasonable additional period (up to 90 days).',
        ],
      },
      before: {
        title: 'Before deleting your account',
        items: [
          'Export or back up important notes and tasks (the app and site do not yet offer a full automatic export).',
          'If you have a Neurix Pro subscription, cancel it from billing (Stripe) before or after the request; deleting the account does not automatically cancel an active Stripe subscription.',
          'Deletion is irreversible.',
        ],
      },
      otherRights: {
        title: 'Other rights',
        body:
          'For access, rectification, or restriction of processing without deleting your account, see our privacy policy or contact us at the same email address.',
      },
    },
    download: {
      metaTitle: 'Download Neurix — Android app',
      metaDescription:
        'Download and install the Neurix mobile app on Android 7.0 (Nougat) and later.',
      title: 'Download the Neurix app',
      intro:
        'Compatible with Android phones and tablets running 7.0 (Nougat) and later. Current version: {version}.',
      cta: 'Download Android APK',
      install: {
        title: 'Installation steps',
        steps: [
          'Download the neurix.apk file using the button above.',
          'Open the downloaded file from your notifications or Downloads folder.',
          'If Android shows a warning, allow installation from "Unknown sources" for your browser (one-time setting).',
          'Tap Install, then open the app.',
        ],
      },
      alreadyInstalled: {
        title: 'Already have the app?',
        body:
          'If an update is available, Neurix notifies you automatically when you open the app. Tap "Update" to return to this page and install the latest version.',
      },
      support: 'If you have installation issues, contact support from the app or by email.',
    },
  },
} as const;
