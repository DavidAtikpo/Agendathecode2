import type { AppLocale } from '../types';
import { adminMessages } from './admin';
import { authMessages } from './auth';
import { chatMessages } from './chat';
import { commonMessages } from './common';
import { groupsMessages } from './groups';
import { modalsMessages } from './modals';
import { notesMessages } from './notes';
import { pageMessages } from './app-page';
import { planningMessages } from './planning';
import { rolesMessages } from './roles';
import { sessionsMessages } from './sessions';
import { sessionDatesMessages } from './session-dates';
import { settingsMessages } from './settings';
import { sidebarMessages } from './sidebar';
import { staticMessages } from './static';
import { tasksMessages } from './tasks';

function mergeLocale(locale: AppLocale) {
  return {
    common: commonMessages[locale],
    sidebar: sidebarMessages[locale],
    auth: authMessages[locale],
    settings: settingsMessages[locale],
    tasks: tasksMessages[locale],
    groups: groupsMessages[locale],
    sessions: sessionsMessages[locale],
    sessionDates: sessionDatesMessages[locale],
    planning: planningMessages[locale],
    notes: notesMessages[locale],
    chat: chatMessages[locale],
    modals: modalsMessages[locale],
    admin: adminMessages[locale],
    static: staticMessages[locale],
    roles: rolesMessages[locale],
    page: pageMessages[locale],
  };
}

export const messages = {
  fr: mergeLocale('fr'),
  en: mergeLocale('en'),
} as const;

export {
  adminMessages,
  authMessages,
  chatMessages,
  commonMessages,
  groupsMessages,
  modalsMessages,
  notesMessages,
  pageMessages,
  planningMessages,
  rolesMessages,
  sessionsMessages,
  sessionDatesMessages,
  settingsMessages,
  sidebarMessages,
  staticMessages,
  tasksMessages,
};
