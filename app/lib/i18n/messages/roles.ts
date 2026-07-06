export const rolesMessages = {
  fr: {
    labels: {
      user: 'Utilisateur',
      admin: 'Administrateur',
      organizer: 'Organisateur',
      formateur: 'Formateur',
      assessor: 'Assessor',
      auditeur: 'Auditeur',
    },
    descriptions: {
      user: 'Accès standard : notes, tâches, réunions. Groupes si membre (création réservée au Pro).',
      admin: 'Accès complet à l\'application et au panneau d\'administration.',
      organizer: 'Crée et gère les sessions formation (formateurs / assessors). Accès aux groupes.',
      formateur: 'Reçoit et répond aux propositions de session en tant que formateur. Pas de groupes.',
      assessor: 'Reçoit et répond aux propositions de session en tant qu\'assessor. Pas de groupes.',
      auditeur: 'Compte auditeur créé par l\'organisateur — accès limité, pas de groupes.',
    },
    errors: {
      groupsForbidden: 'Les groupes ne sont pas disponibles pour les comptes Formateur, Assessor et Auditeur.',
    },
  },
  en: {
    labels: {
      user: 'User',
      admin: 'Administrator',
      organizer: 'Organizer',
      formateur: 'Trainer',
      assessor: 'Assessor',
      auditeur: 'Auditor',
    },
    descriptions: {
      user: 'Standard access: notes, tasks, meetings. Groups when invited (creation reserved for Pro).',
      admin: 'Full access to the app and admin panel.',
      organizer: 'Creates and manages training sessions (trainers / assessors). Access to groups.',
      formateur: 'Receives and responds to session proposals as a trainer. No groups.',
      assessor: 'Receives and responds to session proposals as an assessor. No groups.',
      auditeur: 'Auditor account created by the organizer — limited access, no groups.',
    },
    errors: {
      groupsForbidden: 'Groups are not available for Trainer, Assessor and Auditor accounts.',
    },
  },
} as const;
