/**
 * Catalogue affiché dans l’app (offre Pro & différenciation gratuit / payant).
 * `live` = déjà livré ou partiellement ; `planned` = feuille de route.
 */
export type ProFeatureStatus = 'live' | 'planned';

export type ProFeatureBlock = {
  id: string;
  title: string;
  intro: string;
  status: ProFeatureStatus;
  bullets: string[];
};

export const PRO_FEATURE_BLOCKS: ProFeatureBlock[] = [
  {
    id: 'team',
    title: 'Équipe & rôles',
    intro: 'Structurer les accès et les invitations.',
    status: 'planned',
    bullets: [
      'Rôles admin / membre et permissions fines.',
      'Invitation par lien sécurisé.',
      'Version gratuite : limite de collaborateurs ; Pro : palier élargi ou illimité selon offre.',
    ],
  },
  {
    id: 'files',
    title: 'Pièces jointes & export',
    intro: 'Conserver et sortir vos données.',
    status: 'planned',
    bullets: [
      'Fichiers attachés aux notes et aux tâches.',
      'Export PDF, Markdown et sauvegarde complète du compte.',
    ],
  },
  {
    id: 'integrations',
    title: 'Intégrations Pro',
    intro: 'Connecter Neurix à votre stack.',
    status: 'planned',
    bullets: [
      'Google Calendar / Outlook : rappels et échéances de tâches.',
      'Slack / Teams : notifications d’équipe.',
      'Webhooks pour automatiser avec vos outils.',
    ],
  },
  {
    id: 'ai',
    title: 'IA avec plafond clair',
    intro: 'Coût maîtrisé côté gratuit, valeur renforcée en Pro.',
    status: 'live',
    bullets: [
      'Gratuit : assistant IA avec usage raisonnable (évolution vers un quota mensuel affiché).',
      'Pro : réponses plus longues (limite de tokens augmentée), modèle configurable, priorité sur le contexte notes/tâches.',
    ],
  },
  {
    id: 'reminders',
    title: 'Rappels & notifications avancés',
    intro: 'Au-delà du navigateur et de l’e-mail.',
    status: 'live',
    bullets: [
      'Déjà : rappels navigateur, e-mail (compte connecté), lien WhatsApp pour rappels.',
      'Pro (feuille de route) : récurrence, rappels d’équipe, SMS (ex. Twilio), volumes plus élevés.',
    ],
  },
  {
    id: 'views',
    title: 'Tableaux & vues premium',
    intro: 'Autres façons de voir le travail.',
    status: 'planned',
    bullets: [
      'Vue calendrier, timeline, filtres sauvegardés.',
      'Tags / labels, recherche full-text avancée.',
    ],
  },
  {
    id: 'enterprise',
    title: 'Conformité & confiance (B2B)',
    intro: 'Pour organisations.',
    status: 'planned',
    bullets: [
      'Domaine d’équipe, politiques de données.',
      'SSO Google Workspace / SAML — offre Business dédiée.',
    ],
  },
  {
    id: 'api',
    title: 'API & automatisation',
    intro: 'Brancher Neurix ailleurs.',
    status: 'planned',
    bullets: [
      'API REST ou connecteurs Zapier / Make.',
      'Souvent réservé à l’offre Business ou en option.',
    ],
  },
];

export function statusLabel(s: ProFeatureStatus): { label: string; short: string } {
  if (s === 'live') {
    return { label: 'Partiellement ou totalement disponible', short: 'Disponible' };
  }
  return { label: 'Prévu sur la feuille de route', short: 'À venir' };
}
