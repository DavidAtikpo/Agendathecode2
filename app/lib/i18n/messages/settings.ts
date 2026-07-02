export const settingsMessages = {
  fr: {
    title: 'Paramètres personnels',
    introGuest: 'En mode essai, les réglages sont stockés sur cet appareil uniquement.',
    introUser: 'Ces réglages sont enregistrés sur votre compte et s’appliquent sur cet appareil.',
    profile: {
      section: 'Profil',
      displayName: 'Nom affiché',
      displayNamePlaceholder: 'Votre nom',
      email: 'E-mail',
      googleOnly: 'Connexion Google uniquement — il n’y a pas de mot de passe sur ce compte.',
      avatarColor: 'Couleur de l’avatar',
      avatarColorAria: 'Couleur {color}',
    },
    password: {
      section: 'Mot de passe',
      current: 'Mot de passe actuel',
      new: 'Nouveau mot de passe (min. 8 caractères)',
      confirm: 'Confirmer le nouveau mot de passe',
      errors: {
        currentRequired: 'Saisissez votre mot de passe actuel',
        minLength: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
        mismatch: 'La confirmation ne correspond pas au nouveau mot de passe',
        changeFailed: 'Mot de passe impossible à modifier',
      },
    },
    display: {
      density: 'Densité d’affichage',
      densityComfortable: 'Confortable (espacements standards)',
      densityCompact: 'Compact (plus de contenu visible)',
      language: 'Langue',
      localeFr: 'Français',
      localeEn: 'English',
    },
    whatsapp: {
      checkbox:
        'Afficher la section Rappels via WhatsApp sous les notes (réglages du numéro et options).',
      checkboxHighlight: 'Rappels via WhatsApp',
    },
    actions: {
      cancel: 'Annuler',
      save: 'Enregistrer',
      saving: 'Enregistrement…',
    },
    errors: {
      profileSaveFailed: 'Profil impossible à enregistrer',
      saveFailed: 'Enregistrement impossible',
    },
  },
  en: {
    title: 'Personal settings',
    introGuest: 'In trial mode, settings are stored on this device only.',
    introUser: 'These settings are saved to your account and apply on this device.',
    profile: {
      section: 'Profile',
      displayName: 'Display name',
      displayNamePlaceholder: 'Your name',
      email: 'Email',
      googleOnly: 'Google sign-in only — there is no password on this account.',
      avatarColor: 'Avatar color',
      avatarColorAria: 'Color {color}',
    },
    password: {
      section: 'Password',
      current: 'Current password',
      new: 'New password (min. 8 characters)',
      confirm: 'Confirm new password',
      errors: {
        currentRequired: 'Enter your current password',
        minLength: 'The new password must be at least 8 characters',
        mismatch: 'Confirmation does not match the new password',
        changeFailed: 'Could not change password',
      },
    },
    display: {
      density: 'Display density',
      densityComfortable: 'Comfortable (standard spacing)',
      densityCompact: 'Compact (more content visible)',
      language: 'Language',
      localeFr: 'French',
      localeEn: 'English',
    },
    whatsapp: {
      checkbox:
        'Show the WhatsApp reminders section under notes (phone number and options).',
      checkboxHighlight: 'WhatsApp reminders',
    },
    actions: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving…',
    },
    errors: {
      profileSaveFailed: 'Could not save profile',
      saveFailed: 'Could not save',
    },
  },
} as const;
