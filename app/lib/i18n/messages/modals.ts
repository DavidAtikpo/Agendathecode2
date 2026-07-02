export const modalsMessages = {
  fr: {
    collaborators: {
      title: 'Collaborateurs',
      guestHint:
        'Connectez-vous pour inviter des collègues par e-mail et leur assigner des tâches.',
      intro:
        'Saisissez l\'e-mail d\'un compte Neurix existant pour pouvoir lui assigner des tâches.',
      emailPlaceholder: 'email@exemple.com',
      add: 'Ajouter',
      team: 'Équipe ({count})',
      you: 'vous',
      remove: 'Retirer',
      errors: {
        addFailed: 'Impossible d\'ajouter le collaborateur',
      },
    },
    buyCredits: {
      title: 'Acheter des crédits IA',
      subtitle: 'Chat · Réunions · Notes assistées',
      currentBalance: 'Solde actuel',
      credit: 'crédit',
      credits: 'crédits',
      pricePerPack: 'Prix par pack',
      creditsPerPack: 'Crédits par pack',
      validity: 'Validité',
      validityValue: '1 an à partir de l\'achat',
      averageCost: 'Coût moyen',
      averageCostValue: '1 msg = 1 cr. · 1 réunion = 5 cr.',
      packCount: 'Nombre de packs',
      creditsGained: 'Crédits obtenus',
      newBalance: 'Nouveau solde',
      total: 'Total',
      pay: 'Payer {price} $ · Obtenir {credits} crédits',
      redirecting: 'Redirection vers le paiement…',
      stripeNote: 'Paiement sécurisé par Stripe · Aucun abonnement',
    },
    proFeatures: {
      title: 'Fonctionnalités Neurix Pro',
      intro:
        'Vision produit : gratuit utile, Pro pour scale, Business pour les structures. Les pastilles indiquent ce qui est déjà en place ou en construction.',
      statusLive: 'Disponible',
      statusPlanned: 'À venir',
      statusLiveTitle: 'Partiellement ou totalement disponible',
      statusPlannedTitle: 'Prévu sur la feuille de route',
      guestSubscribe:
        'Connectez-vous pour souscrire à Pro une fois votre compte créé.',
      guestCreateAccount: 'Créez un compte pour synchroniser vos notes et tâches dans le cloud.',
      priceShown: 'Tarif affiché au paiement :',
      priceStripe: 'Tarif selon configuration Stripe.',
      upgrade: 'Passer à Pro',
      notAvailable:
        'L\'abonnement Pro n\'est pas encore proposé à la souscription. Les fonctionnalités payantes seront annoncées ici lorsqu\'elles seront prêtes.',
      thankYou:
        'Merci de soutenir Neurix Pro — les blocs « À venir » seront déployés progressivement.',
      blocks: {
        team: {
          title: 'Équipe & rôles',
          intro: 'Structurer les accès et les invitations.',
          bullets: [
            'Rôles admin / membre et permissions fines.',
            'Invitation par lien sécurisé.',
            'Version gratuite : limite de collaborateurs ; Pro : palier élargi ou illimité selon offre.',
          ],
        },
        files: {
          title: 'Pièces jointes & export',
          intro: 'Conserver et sortir vos données.',
          bullets: [
            'Fichiers attachés aux notes et aux tâches.',
            'Export PDF, Markdown et sauvegarde complète du compte.',
          ],
        },
        integrations: {
          title: 'Intégrations Pro',
          intro: 'Connecter Neurix à votre stack.',
          bullets: [
            'Google Calendar / Outlook : rappels et échéances de tâches.',
            'Slack / Teams : notifications d\'équipe.',
            'Webhooks pour automatiser avec vos outils.',
          ],
        },
        ai: {
          title: 'IA avec plafond clair',
          intro: 'Coût maîtrisé côté gratuit, valeur renforcée en Pro.',
          bullets: [
            'Gratuit : assistant IA avec usage raisonnable (évolution vers un quota mensuel affiché).',
            'Pro : réponses plus longues (limite de tokens augmentée), modèle configurable, priorité sur le contexte notes/tâches.',
          ],
        },
        reminders: {
          title: 'Rappels & notifications avancés',
          intro: 'Au-delà du navigateur et de l\'e-mail.',
          bullets: [
            'Déjà : rappels navigateur, e-mail (compte connecté), lien WhatsApp pour rappels.',
            'Pro (feuille de route) : récurrence, rappels d\'équipe, SMS (ex. Twilio), volumes plus élevés.',
          ],
        },
        views: {
          title: 'Tableaux & vues premium',
          intro: 'Autres façons de voir le travail.',
          bullets: [
            'Vue calendrier, timeline, filtres sauvegardés.',
            'Tags / labels, recherche full-text avancée.',
          ],
        },
        enterprise: {
          title: 'Conformité & confiance (B2B)',
          intro: 'Pour organisations.',
          bullets: [
            'Domaine d\'équipe, politiques de données.',
            'SSO Google Workspace / SAML — offre Business dédiée.',
          ],
        },
        api: {
          title: 'API & automatisation',
          intro: 'Brancher Neurix ailleurs.',
          bullets: [
            'API REST ou connecteurs Zapier / Make.',
            'Souvent réservé à l\'offre Business ou en option.',
          ],
        },
      },
    },
    proBanner: {
      activeTitle: 'Neurix Pro est actif',
      activeBody:
        'Vous bénéficiez déjà de l\'IA étendue et des rappels par e-mail. Les autres blocs (équipe & rôles, pièces jointes, intégrations Google/Slack, vues calendrier, SSO, API…) sont sur la feuille de route — consultez le catalogue pour voir le statut Disponible vs À venir.',
      activeBodyStrongAi: 'IA étendue',
      activeBodyStrongEmail: 'rappels par e-mail',
      viewPillars: 'Voir les {count} piliers Pro',
      hideBanner: 'Masquer ce bandeau',
      freeTitle: 'Découvrez tout ce que vise Neurix Pro',
      freeBody:
        'Équipe & rôles (admin / membre, invitation par lien, limites gratuites vs Pro), pièces jointes & export (PDF, Markdown, backup), intégrations (Calendar, Outlook, Slack, Teams, webhooks), IA avec plafond clair en gratuit vs contexte étendu en Pro, rappels avancés, vues premium, conformité B2B (SSO), API / Zapier… Le détail et le statut de chaque bloc sont dans le catalogue.',
      freeBodyLabels: {
        team: 'Équipe & rôles',
        files: 'pièces jointes & export',
        integrations: 'intégrations',
        ai: 'IA',
        reminders: 'rappels',
        views: 'vues premium',
        enterprise: 'conformité B2B',
        api: 'API / Zapier',
      },
      fromPrice: 'À partir de {price}.',
      catalog: 'Catalogue ({count} blocs)',
      upgrade: 'Passer à Pro',
      hide: 'Masquer',
    },
  },
  en: {
    collaborators: {
      title: 'Collaborators',
      guestHint: 'Sign in to invite colleagues by email and assign them tasks.',
      intro: 'Enter the email of an existing Neurix account to assign tasks to them.',
      emailPlaceholder: 'email@example.com',
      add: 'Add',
      team: 'Team ({count})',
      you: 'you',
      remove: 'Remove',
      errors: {
        addFailed: 'Could not add collaborator',
      },
    },
    buyCredits: {
      title: 'Buy AI credits',
      subtitle: 'Chat · Meetings · Assisted notes',
      currentBalance: 'Current balance',
      credit: 'credit',
      credits: 'credits',
      pricePerPack: 'Price per pack',
      creditsPerPack: 'Credits per pack',
      validity: 'Validity',
      validityValue: '1 year from purchase',
      averageCost: 'Average cost',
      averageCostValue: '1 msg = 1 cr. · 1 meeting = 5 cr.',
      packCount: 'Number of packs',
      creditsGained: 'Credits gained',
      newBalance: 'New balance',
      total: 'Total',
      pay: 'Pay ${price} · Get {credits} credits',
      redirecting: 'Redirecting to checkout…',
      stripeNote: 'Secure payment by Stripe · No subscription',
    },
    proFeatures: {
      title: 'Neurix Pro features',
      intro:
        'Product vision: useful free tier, Pro to scale, Business for organizations. Badges show what is live or in progress.',
      statusLive: 'Available',
      statusPlanned: 'Coming soon',
      statusLiveTitle: 'Partially or fully available',
      statusPlannedTitle: 'Planned on the roadmap',
      guestSubscribe: 'Sign in to subscribe to Pro once your account is created.',
      guestCreateAccount: 'Create an account to sync your notes and tasks to the cloud.',
      priceShown: 'Price shown at checkout:',
      priceStripe: 'Price depends on Stripe configuration.',
      upgrade: 'Upgrade to Pro',
      notAvailable:
        'Pro subscription is not available yet. Paid features will be announced here when ready.',
      thankYou:
        'Thanks for supporting Neurix Pro — "Coming soon" blocks will roll out gradually.',
      blocks: {
        team: {
          title: 'Team & roles',
          intro: 'Structure access and invitations.',
          bullets: [
            'Admin / member roles and fine-grained permissions.',
            'Secure invite links.',
            'Free tier: collaborator limits; Pro: higher or unlimited tiers depending on plan.',
          ],
        },
        files: {
          title: 'Attachments & export',
          intro: 'Keep and export your data.',
          bullets: [
            'Files attached to notes and tasks.',
            'PDF, Markdown export and full account backup.',
          ],
        },
        integrations: {
          title: 'Pro integrations',
          intro: 'Connect Neurix to your stack.',
          bullets: [
            'Google Calendar / Outlook: reminders and task due dates.',
            'Slack / Teams: team notifications.',
            'Webhooks to automate with your tools.',
          ],
        },
        ai: {
          title: 'AI with clear limits',
          intro: 'Controlled cost on free, stronger value on Pro.',
          bullets: [
            'Free: AI assistant with reasonable usage (moving toward a visible monthly quota).',
            'Pro: longer answers (higher token limit), configurable model, priority notes/tasks context.',
          ],
        },
        reminders: {
          title: 'Advanced reminders & notifications',
          intro: 'Beyond browser and email.',
          bullets: [
            'Already: browser reminders, email (signed-in account), WhatsApp link for reminders.',
            'Pro (roadmap): recurrence, team reminders, SMS (e.g. Twilio), higher volumes.',
          ],
        },
        views: {
          title: 'Boards & premium views',
          intro: 'Other ways to see your work.',
          bullets: [
            'Calendar view, timeline, saved filters.',
            'Tags / labels, advanced full-text search.',
          ],
        },
        enterprise: {
          title: 'Compliance & trust (B2B)',
          intro: 'For organizations.',
          bullets: [
            'Team domain, data policies.',
            'Google Workspace / SAML SSO — dedicated Business plan.',
          ],
        },
        api: {
          title: 'API & automation',
          intro: 'Plug Neurix elsewhere.',
          bullets: [
            'REST API or Zapier / Make connectors.',
            'Often reserved for Business or as an add-on.',
          ],
        },
      },
    },
    proBanner: {
      activeTitle: 'Neurix Pro is active',
      activeBody:
        'You already have extended AI and email reminders. Other blocks (team & roles, attachments, Google/Slack integrations, calendar views, SSO, API…) are on the roadmap — check the catalog for Available vs Coming soon status.',
      activeBodyStrongAi: 'extended AI',
      activeBodyStrongEmail: 'email reminders',
      viewPillars: 'View all {count} Pro pillars',
      hideBanner: 'Hide this banner',
      freeTitle: 'Discover everything Neurix Pro aims to deliver',
      freeBody:
        'Team & roles (admin / member, invite links, free vs Pro limits), attachments & export (PDF, Markdown, backup), integrations (Calendar, Outlook, Slack, Teams, webhooks), AI with clear free limits vs extended Pro context, advanced reminders, premium views, B2B compliance (SSO), API / Zapier… Details and status for each block are in the catalog.',
      freeBodyLabels: {
        team: 'Team & roles',
        files: 'attachments & export',
        integrations: 'integrations',
        ai: 'AI',
        reminders: 'reminders',
        views: 'premium views',
        enterprise: 'B2B compliance',
        api: 'API / Zapier',
      },
      fromPrice: 'From {price}.',
      catalog: 'Catalog ({count} blocks)',
      upgrade: 'Upgrade to Pro',
      hide: 'Hide',
    },
  },
} as const;
