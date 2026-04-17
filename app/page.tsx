'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import CollaboratorsModal from './components/CollaboratorsModal';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBars3,
  IconBell,
  IconClipboardList,
  IconLightBulb,
  IconSparkles,
} from './components/icons';
import NotesSection from './components/NotesSection';
import TaskBoard from './components/TaskBoard';
import ChatPanel from './components/ChatPanel';
import ProPlanBanner from './components/ProPlanBanner';
import ProFeaturesModal from './components/ProFeaturesModal';
import { Note, Task, User, ChatMessage, TaskStatus } from './types';
import { useNoteReminders, formatReminderLabel } from './lib/useNoteReminders';
import { normalizeWhatsAppPhone } from './lib/whatsappReminder';
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  type UserPreferences,
} from './lib/user-preferences';
import SettingsModal from './components/SettingsModal';
import { PRO_SUBSCRIPTION_SALES_ENABLED } from './lib/feature-flags';
import { countUnreadAssignedTasks } from './lib/assigned-task-badge';

const fetchOpts: RequestInit = { credentials: 'include' };

/** Logo dans `public/` (fichier avec espace dans le nom) */
const BRAND_LOGO = '/logo (1).png';
const BRAND_NAME = 'Neurix';

const GUEST_USER_ID = '__guest__';
const GUEST_USER: User = {
  id: GUEST_USER_ID,
  email: 'mode-essai@local',
  name: 'Mode essai',
  color: '#64748b',
  initials: 'M',
  plan: 'free',
  preferences: DEFAULT_USER_PREFERENCES,
};

const LS_NOTES = 'agenda-guest-notes';
const LS_TASKS = 'agenda-guest-tasks';
const LS_CHAT_GUEST = 'agenda-guest-chat';
const LS_CHAT_USER = 'agenda-chat';
const LS_WHATSAPP_PHONE = 'agenda-whatsapp-phone';
const LS_WHATSAPP_AUTO = 'agenda-whatsapp-reminder-auto';
const LS_GUEST_PREFERENCES = 'agenda-guest-preferences';

function genId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/** Ancien statut Kanban `issues` → `urgent` (localStorage invité / réponses API héritées). */
function migrateLegacyTaskStatus(task: Task): Task {
  const nextStatus = (task.status as string) === 'issues' ? 'urgent' : task.status;
  const normalizedAssigned = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo
      ? [String(task.assignedTo)]
      : [];
  return {
    ...task,
    status: nextStatus,
    assignedTo: normalizedAssigned,
    assets: Array.isArray(task.assets) ? task.assets : [],
  };
}

function loadGuestFromLocalStorage(): {
  notes: Note[];
  tasks: Task[];
  chat: ChatMessage[];
} {
  try {
    const n = localStorage.getItem(LS_NOTES);
    const t = localStorage.getItem(LS_TASKS);
    const c = localStorage.getItem(LS_CHAT_GUEST);
    return {
      notes: n ? JSON.parse(n) : [],
      tasks: t ? (JSON.parse(t) as Task[]).map(migrateLegacyTaskStatus) : [],
      chat: c ? JSON.parse(c) : [],
    };
  } catch {
    return { notes: [], tasks: [], chat: [] };
  }
}

async function migrateGuestDataToServer(): Promise<void> {
  const { notes: guestNotes, tasks: guestTasks } = loadGuestFromLocalStorage();
  for (const n of guestNotes) {
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...fetchOpts,
      body: JSON.stringify({
        title: n.title,
        content: n.content,
        pinned: n.pinned,
        remindAt: n.remindAt ?? null,
        reminderByEmail: n.reminderByEmail !== false,
      }),
    });
  }
  for (const t of guestTasks) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...fetchOpts,
      body: JSON.stringify({
        title: t.title,
        description: t.description,
        status: (t.status as string) === 'issues' ? 'urgent' : t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      }),
    });
  }
  localStorage.removeItem(LS_NOTES);
  localStorage.removeItem(LS_TASKS);
}

/* ── Modale connexion / inscription ── */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_config: 'Connexion Google non configurée sur le serveur (variables GOOGLE_* et AUTH_URL).',
  google_state: 'Session expirée ou invalide. Réessayez.',
  google_denied: 'Connexion Google annulée.',
  google_unverified: 'Votre compte Google doit avoir un e-mail vérifié.',
  google_conflict: 'Ce compte e-mail est déjà lié à un autre compte Google.',
  google_failed: 'La connexion Google a échoué.',
  google_missing: 'Réponse Google incomplète.',
  google_oauth: 'Erreur OAuth Google.',
};

function AuthModal({
  open,
  initialTab,
  onClose,
  onAuthenticated,
  oauthError,
}: {
  open: boolean;
  initialTab: 'login' | 'register';
  onClose: () => void;
  onAuthenticated: (user: User) => Promise<void>;
  oauthError: string | null;
}) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
      if (initialTab === 'login') setName('');
    }
  }, [open, initialTab]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Connexion impossible');
      await onAuthenticated(data as User);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Inscription impossible');
      await onAuthenticated(data as User);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: 'login' | 'register') => {
    setTab(next);
    setError(null);
    if (next === 'login') setName('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div className="max-h-[min(90dvh,100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm mb-4 flex items-center gap-1.5 transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          Fermer
        </button>
        <div className="flex flex-col items-center mx-auto mb-5">
          <img
            src={BRAND_LOGO}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 object-contain drop-shadow-lg"
          />
          <p className="mt-3 text-lg font-bold tracking-tight text-white">{BRAND_NAME}</p>
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-1">Sauvegarder sur le cloud</h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          {tab === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
        </p>

        {(error || oauthError) && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error ?? oauthError}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-white py-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </a>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-2 text-slate-500">ou e-mail</span>
          </div>
        </div>

        {tab === 'login' ? (
          <>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 mt-2"
              >
                {busy ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => switchTo('register')} className="text-indigo-400 hover:text-indigo-300 font-medium">
                Créer un compte
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom affiché</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="Votre prénom ou pseudo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mot de passe (min. 8 caractères)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 mt-2"
              >
                {busy ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
              Déjà un compte ?{' '}
              <button type="button" onClick={() => switchTo('login')} className="text-indigo-400 hover:text-indigo-300 font-medium">
                Se connecter
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <IconAlertTriangle className="h-12 w-12 text-red-400/90" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-red-400 mb-2">Erreur</h2>
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-4 px-6">
        <img
          src={BRAND_LOGO}
          alt=""
          width={72}
          height={72}
          className="h-[4.5rem] w-[4.5rem] object-contain animate-pulse"
        />
        <p className="text-xl font-bold tracking-tight text-white">{BRAND_NAME}</p>
        <p className="text-slate-500 text-sm">Chargement…</p>
      </div>
    </div>
  );
}

async function loadAppData(): Promise<{ contacts: User[]; notes: Note[]; tasks: Task[] }> {
  const [c, n, t] = await Promise.all([
    fetch('/api/contacts', fetchOpts).then(r => {
      if (!r.ok) throw new Error('Impossible de charger les collaborateurs');
      return r.json();
    }),
    fetch('/api/notes', fetchOpts).then(r => {
      if (!r.ok) throw new Error('Impossible de charger les notes');
      return r.json();
    }),
    fetch('/api/tasks', fetchOpts).then(r => {
      if (!r.ok) throw new Error('Impossible de charger les tâches');
      return r.json();
    }),
  ]);
  return { contacts: c, notes: n, tasks: (t as Task[]).map(migrateLegacyTaskStatus) };
}

export default function HomePage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'notes' | 'tasks'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  /** null = mode essai (données locales) */
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authOauthError, setAuthOauthError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collaboratorsModalOpen, setCollaboratorsModalOpen] = useState(false);
  const [proFeaturesModalOpen, setProFeaturesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [assignedInAppNotice, setAssignedInAppNotice] = useState<string | null>(null);
  const prevAssignedBadgeRef = useRef(0);
  const [whatsappPhone, setWhatsappPhone] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(LS_WHATSAPP_PHONE) ?? '';
    } catch {
      return '';
    }
  });
  const [whatsappAutoOpen, setWhatsappAutoOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(LS_WHATSAPP_AUTO) === '1';
    } catch {
      return false;
    }
  });
  const [guestPreferences, setGuestPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
    try {
      const raw = localStorage.getItem(LS_GUEST_PREFERENCES);
      if (!raw) return DEFAULT_USER_PREFERENCES;
      return normalizePreferences(JSON.parse(raw));
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  });

  const isGuest = currentUser === null;
  const displayUser = useMemo((): User => {
    if (currentUser) return currentUser;
    return { ...GUEST_USER, preferences: guestPreferences };
  }, [currentUser, guestPreferences]);

  const layoutPreferences = useMemo(
    () => displayUser.preferences ?? DEFAULT_USER_PREFERENCES,
    [displayUser],
  );

  const assignedTaskBadgeCount = useMemo(
    () =>
      isGuest
        ? 0
        : countUnreadAssignedTasks(tasks, displayUser.id, layoutPreferences),
    [isGuest, tasks, displayUser.id, layoutPreferences],
  );

  /** Dernière mise à jour parmi les notes et tâches affichées (pour l’indicateur dans la sidebar). */
  const lastDataUpdatedAt = useMemo(() => {
    let max = 0;
    for (const n of notes) {
      const t = new Date(n.updatedAt).getTime();
      if (!Number.isNaN(t) && t > max) max = t;
    }
    for (const task of tasks) {
      const t = new Date(task.updatedAt).getTime();
      if (!Number.isNaN(t) && t > max) max = t;
    }
    return max > 0 ? new Date(max).toISOString() : null;
  }, [notes, tasks]);

  const markAssignedInboxSeen = useCallback(async () => {
    if (isGuest) return;
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify({ assignedInboxLastSeenAt: new Date().toISOString() }),
      });
      if (!res.ok) return;
      const u: User = await res.json();
      setCurrentUser(u);
    } catch {
      /* ignore */
    }
  }, [isGuest]);

  useEffect(() => {
    if (activeView !== 'tasks' || isGuest) return;
    void markAssignedInboxSeen();
  }, [activeView, isGuest, markAssignedInboxSeen]);

  useEffect(() => {
    if (isGuest || loading) return;
    const prev = prevAssignedBadgeRef.current;
    if (prev === 0 && assignedTaskBadgeCount > 0) {
      const msg =
        assignedTaskBadgeCount === 1
          ? 'Une nouvelle tâche vous est assignée.'
          : `${assignedTaskBadgeCount} nouvelles tâches vous sont assignées.`;
      setAssignedInAppNotice(msg);
      const t = window.setTimeout(() => setAssignedInAppNotice(null), 9000);
      prevAssignedBadgeRef.current = assignedTaskBadgeCount;
      return () => window.clearTimeout(t);
    }
    prevAssignedBadgeRef.current = assignedTaskBadgeCount;
  }, [loading, isGuest, assignedTaskBadgeCount]);

  const chatTier = useMemo(() => {
    if (isGuest) return 'guest' as const;
    return currentUser?.plan === 'pro' ? ('pro' as const) : ('free' as const);
  }, [isGuest, currentUser?.plan]);

  const assignableUsers = useMemo(() => {
    if (isGuest) return [GUEST_USER];
    const seen = new Set<string>([currentUser!.id]);
    const out: User[] = [currentUser!];
    for (const c of contacts) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  }, [currentUser, contacts, isGuest]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('auth_error');
    if (!code) return;
    setAuthOauthError(AUTH_ERROR_MESSAGES[code] ?? `Erreur de connexion (${code}).`);
    setAuthTab('login');
    setAuthModalOpen(true);
    router.replace('/', { scroll: false });
  }, [router]);

  const hydrateFromSession = useCallback(async (me: User) => {
    setCurrentUser(me);
    const data = await loadAppData();
    setContacts(data.contacts);
    setNotes(data.notes);
    setTasks(data.tasks);
    try {
      const raw = localStorage.getItem(LS_CHAT_USER);
      if (raw) setChatMessages(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/me', fetchOpts);
        if (cancelled) return;
        if (r.ok) {
          const me: User = await r.json();
          if (cancelled) return;
          await hydrateFromSession(me);
        } else {
          const g = loadGuestFromLocalStorage();
          if (!cancelled) {
            setNotes(g.notes);
            setTasks(g.tasks);
            setChatMessages(g.chat);
          }
        }
      } catch {
        if (!cancelled) {
          const g = loadGuestFromLocalStorage();
          setNotes(g.notes);
          setTasks(g.tasks);
          setChatMessages(g.chat);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromSession]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_WHATSAPP_PHONE, whatsappPhone);
      localStorage.setItem(LS_WHATSAPP_AUTO, whatsappAutoOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [whatsappPhone, whatsappAutoOpen]);

  useEffect(() => {
    if (loading || !isGuest) return;
    localStorage.setItem(LS_NOTES, JSON.stringify(notes));
  }, [notes, loading, isGuest]);

  useEffect(() => {
    if (loading || !isGuest) return;
    localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
  }, [tasks, loading, isGuest]);

  useEffect(() => {
    if (loading) return;
    if (isGuest) {
      localStorage.setItem(LS_CHAT_GUEST, JSON.stringify(chatMessages));
    } else {
      localStorage.setItem(LS_CHAT_USER, JSON.stringify(chatMessages));
    }
  }, [chatMessages, loading, isGuest]);

  const onAuthenticated = useCallback(
    async (user: User) => {
      setDbError(null);
      try {
        await migrateGuestDataToServer();
        await hydrateFromSession(user);
      } catch (e: unknown) {
        setDbError(e instanceof Error ? e.message : 'Erreur');
      }
    },
    [hydrateFromSession]
  );

  const addContactByEmail = useCallback(async (email: string) => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...fetchOpts,
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Impossible d’ajouter le collaborateur');
    setContacts(prev => {
      const rest = prev.filter(u => u.id !== data.id);
      return [...rest, data as User];
    });
  }, []);

  const removeContact = useCallback(async (memberId: string) => {
    await fetch(`/api/contacts/${memberId}`, { method: 'DELETE', ...fetchOpts });
    setContacts(prev => prev.filter(u => u.id !== memberId));
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
    setContacts([]);
    const g = loadGuestFromLocalStorage();
    setNotes(g.notes);
    setTasks(g.tasks);
    setChatMessages(g.chat);
    setAuthTab('login');
  }, []);

  const [billingFlash, setBillingFlash] = useState<string | null>(null);
  const [proPriceLabel, setProPriceLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/billing/config');
        if (!r.ok || cancelled) return;
        const data = (await r.json()) as { proPriceLabel?: string | null };
        if (!cancelled && data.proPriceLabel) setProPriceLabel(data.proPriceLabel);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST', ...fetchOpts });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? 'Impossible d’ouvrir le paiement');
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      setBillingFlash(e instanceof Error ? e.message : 'Erreur de paiement');
    }
  }, []);

  const openBillingPortal = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST', ...fetchOpts });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? 'Portail indisponible');
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      setBillingFlash(e instanceof Error ? e.message : 'Erreur facturation');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'success') return;
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 20;
    const delayMs = 700;

    const trySyncPro = async () => {
      const r = await fetch('/api/auth/me', fetchOpts);
      if (!r.ok || cancelled) return;
      const me: User = await r.json();
      if (me.plan === 'pro') {
        try {
          localStorage.removeItem('neurix-pro-banner-dismiss');
        } catch {
          /* ignore */
        }
        await hydrateFromSession(me);
        if (!cancelled) {
          setBillingFlash('Merci ! Neurix Pro est activé sur votre compte.');
        }
        router.replace('/', { scroll: false });
        return;
      }
      attempt += 1;
      if (attempt < maxAttempts && !cancelled) {
        setTimeout(() => void trySyncPro(), delayMs);
      } else if (!cancelled) {
        await hydrateFromSession(me);
        setBillingFlash(
          'Paiement enregistré. Le statut Pro peut prendre quelques secondes : actualisez la page si le badge Pro n’apparaît pas.',
        );
        router.replace('/', { scroll: false });
      }
    };

    void trySyncPro();
    return () => {
      cancelled = true;
    };
  }, [router, hydrateFromSession]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'cancel') return;
    setBillingFlash('Paiement annulé.');
    router.replace('/', { scroll: false });
  }, [router]);

  const addNote = useCallback(
    async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (isGuest) {
        const now = new Date().toISOString();
        const note: Note = {
          ...data,
          id: genId(),
          createdAt: now,
          updatedAt: now,
          ownerId: displayUser.id,
          ownerName: displayUser.name,
          ownerInitials: displayUser.initials,
          ownerColor: displayUser.color,
          sharedWith: data.sharedWith ?? [],
        };
        setNotes(prev => [note, ...prev]);
        return;
      }
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify(data),
      });
      const note: Note = await res.json();
      setNotes(prev => [note, ...prev]);
    },
    [isGuest, displayUser]
  );

  const updateNote = useCallback(
    async (id: string, data: Partial<Note>) => {
      if (isGuest) {
        const now = new Date().toISOString();
        setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...data, updatedAt: now } : n)));
        return;
      }
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify(data),
      });
      const updated: Note = await res.json();
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
    },
    [isGuest]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (isGuest) {
        setNotes(prev => prev.filter(n => n.id !== id));
        return;
      }
      await fetch(`/api/notes/${id}`, { method: 'DELETE', ...fetchOpts });
      setNotes(prev => prev.filter(n => n.id !== id));
    },
    [isGuest]
  );

  const addTask = useCallback(
    async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      if (isGuest) {
        const now = new Date().toISOString();
        const task: Task = {
          ...data,
          id: genId(),
          createdBy: GUEST_USER_ID,
          createdAt: now,
          updatedAt: now,
        };
        setTasks(prev => [task, ...prev]);
        return;
      }
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify(data),
      });
      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        throw new Error(`Réponse invalide du serveur (${res.status})`);
      }
      if (!res.ok) {
        const msg =
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Impossible de créer la tâche (${res.status})`;
        throw new Error(msg);
      }
      setTasks(prev => [payload as Task, ...prev]);
    },
    [isGuest]
  );

  const updateTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      if (isGuest) {
        const now = new Date().toISOString();
        setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...data, updatedAt: now } : t)));
        return;
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify(data),
      });
      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        throw new Error(`Réponse invalide du serveur (${res.status})`);
      }
      if (!res.ok) {
        const msg =
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Impossible de mettre à jour la tâche (${res.status})`;
        throw new Error(msg);
      }
      setTasks(prev => prev.map(t => (t.id === id ? (payload as Task) : t)));
    },
    [isGuest]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (isGuest) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return;
      }
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', ...fetchOpts });
      if (!res.ok) {
        let payload: unknown;
        try {
          payload = await res.json();
        } catch {
          throw new Error(`Erreur ${res.status}`);
        }
        const msg =
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Impossible de supprimer (${res.status})`;
        throw new Error(msg);
      }
      setTasks(prev => prev.filter(t => t.id !== id));
    },
    [isGuest]
  );

  const moveTask = useCallback(
    async (id: string, status: TaskStatus) => {
      if (isGuest) {
        const now = new Date().toISOString();
        setTasks(prev => prev.map(t => (t.id === id ? { ...t, status, updatedAt: now } : t)));
        return;
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...fetchOpts,
        body: JSON.stringify({ status }),
      });
      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        throw new Error(`Réponse invalide du serveur (${res.status})`);
      }
      if (!res.ok) {
        const msg =
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Impossible de déplacer la tâche (${res.status})`;
        throw new Error(msg);
      }
      setTasks(prev => prev.map(t => (t.id === id ? (payload as Task) : t)));
    },
    [isGuest]
  );

  const sendChatMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: genId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      const history = [...chatMessages, userMsg];
      setChatMessages(history);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...fetchOpts,
          body: JSON.stringify({
            messages: history.map(m => ({ role: m.role, content: m.content })),
            context: buildContext(notes, tasks, assignableUsers, displayUser),
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setChatMessages(prev => [
          ...prev,
          { id: genId(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setChatMessages(prev => [
          ...prev,
          { id: genId(), role: 'assistant', content: `Erreur : ${msg}`, timestamp: new Date().toISOString() },
        ]);
      }
    },
    [chatMessages, notes, tasks, assignableUsers, displayUser]
  );

  const clearChat = useCallback(() => setChatMessages([]), []);

  const { inAppReminder, dismissInApp, openWhatsAppForNote } = useNoteReminders(notes, {
    whatsappPhoneRaw: whatsappPhone,
    whatsappAutoOpen,
  });

  const handleSettingsSaved = useCallback((u: User) => {
    if (currentUser === null) {
      const p = u.preferences ?? DEFAULT_USER_PREFERENCES;
      setGuestPreferences(p);
      try {
        localStorage.setItem(LS_GUEST_PREFERENCES, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    } else {
      setCurrentUser(u);
    }
  }, [currentUser]);

  if (loading) return <LoadingScreen />;
  if (dbError) return <ErrorScreen message={dbError} />;

  const openCollaboratorsPanel = () => {
    if (isGuest) {
      setAuthTab('login');
      setAuthModalOpen(true);
    } else {
      setCollaboratorsModalOpen(true);
    }
  };

  const sidebarProps = {
    activeView,
    onViewChange: setActiveView,
    currentUser: displayUser,
    isGuest,
    onOpenLogin: () => {
      setAuthTab('login');
      setAuthModalOpen(true);
    },
    onOpenRegister: () => {
      setAuthTab('register');
      setAuthModalOpen(true);
    },
    onLogout: logout,
    noteCount: notes.length,
    assignedTaskBadgeCount,
    chatOpen,
    onToggleChat: () => setChatOpen(o => !o),
    ...(PRO_SUBSCRIPTION_SALES_ENABLED ? { onUpgrade: startCheckout } : {}),
    onManageBilling: openBillingPortal,
    proPriceLabel,
    onOpenProFeatures: () => setProFeaturesModalOpen(true),
    onOpenSettings: () => setSettingsModalOpen(true),
    lastDataUpdatedAt,
  };

  return (
    <>
      {assignedInAppNotice && (
        <div className="fixed bottom-24 left-3 right-3 z-[94] flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-950/95 px-4 py-3 text-sm text-rose-100 shadow-xl md:bottom-6 md:left-auto md:right-6 md:max-w-md">
          <span>{assignedInAppNotice}</span>
          <button
            type="button"
            onClick={() => setAssignedInAppNotice(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-rose-200 hover:bg-rose-900/80"
          >
            OK
          </button>
        </div>
      )}
      {billingFlash && (
        <div className="fixed bottom-24 left-3 right-3 z-[95] flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/95 px-4 py-3 text-sm text-emerald-100 shadow-xl md:bottom-6 md:left-auto md:right-6 md:max-w-md">
          <span>{billingFlash}</span>
          <button
            type="button"
            onClick={() => setBillingFlash(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-emerald-300 hover:bg-emerald-900/80"
          >
            OK
          </button>
        </div>
      )}
      {inAppReminder && (
        <div
          className="fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/95 px-4 py-3 shadow-xl backdrop-blur-sm sm:left-auto sm:right-4 sm:max-w-md"
          role="status"
        >
          <div className="flex items-start gap-3">
            <IconBell className="h-6 w-6 shrink-0 text-amber-400/90" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-100">Rappel : {inAppReminder.title}</p>
              {inAppReminder.content?.trim() ? (
                <p className="mt-1 line-clamp-3 text-xs text-amber-200/80">{inAppReminder.content}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-amber-400/90">
                Prévu le {formatReminderLabel(inAppReminder.remindAt!)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {normalizeWhatsAppPhone(whatsappPhone) ? (
              <button
                type="button"
                onClick={() => openWhatsAppForNote(inAppReminder)}
                className="touch-manipulation rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Ouvrir dans WhatsApp
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissInApp}
              className="rounded-lg px-3 py-2 text-xs text-amber-200 hover:bg-amber-900/80"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-slate-900 text-slate-100 md:h-screen md:flex-row">
        <div className="hidden h-full flex-shrink-0 md:flex">
          <Sidebar {...sidebarProps} />
        </div>

        {mobileMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-label="Fermer le menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(20rem,88vw)] flex-col shadow-2xl md:hidden">
              <Sidebar
                {...sidebarProps}
                preferExpanded
                onNavAction={() => setMobileMenuOpen(false)}
                className="h-full w-full min-w-0 overflow-y-auto"
              />
            </div>
          </>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header
            className={`shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5 ${
              activeView === 'tasks' ? 'hidden' : 'hidden md:flex'
            }`}
          >
            <h2 className="text-sm font-medium text-slate-300">
              {activeView === 'notes' ? 'Idées & notes' : 'Tableau des tâches'}
            </h2>
            <button
              type="button"
              onClick={openCollaboratorsPanel}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 touch-manipulation"
            >
              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Collaborateurs
              {!isGuest && assignableUsers.length > 1 ? (
                <span className="rounded-full bg-indigo-500/25 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200">
                  {assignableUsers.length}
                </span>
              ) : null}
            </button>
          </header>

          <header className="flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
            <button
              type="button"
              className="-ml-1 touch-manipulation rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 active:bg-slate-700"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="min-w-0 flex-1 truncate font-semibold text-white">{BRAND_NAME}</span>
            <button
              type="button"
              onClick={openCollaboratorsPanel}
              className="relative touch-manipulation rounded-xl p-2.5 text-slate-300 hover:bg-slate-800 active:bg-slate-700"
              aria-label={
                !isGuest && assignableUsers.length > 1
                  ? `Collaborateurs (${assignableUsers.length})`
                  : 'Collaborateurs'
              }
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {!isGuest && assignableUsers.length > 1 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-500 px-0.5 text-[10px] font-bold leading-none text-white">
                  {assignableUsers.length}
                </span>
              ) : null}
            </button>
          </header>

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <ProPlanBanner
              isGuest={isGuest}
              plan={currentUser?.plan}
              proPriceLabel={proPriceLabel}
              subscriptionSalesEnabled={PRO_SUBSCRIPTION_SALES_ENABLED}
              {...(PRO_SUBSCRIPTION_SALES_ENABLED ? { onUpgrade: startCheckout } : {})}
              onOpenDetails={() => setProFeaturesModalOpen(true)}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeView === 'notes' ? (
                <NotesSection
                  notes={notes}
                  onAdd={addNote}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  currentUser={displayUser}
                  collaborators={assignableUsers}
                  isGuest={isGuest}
                  whatsappPhone={whatsappPhone}
                  onWhatsappPhoneChange={setWhatsappPhone}
                  whatsappAutoOpen={whatsappAutoOpen}
                  onWhatsappAutoOpenChange={setWhatsappAutoOpen}
                  compactLayout={layoutPreferences.density === 'compact'}
                  showWhatsAppSection={layoutPreferences.notesShowWhatsApp !== false}
                />
              ) : (
                <TaskBoard
                  tasks={tasks}
                  users={assignableUsers}
                  currentUser={displayUser}
                  onAdd={addTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onMove={moveTask}
                  compactLayout={layoutPreferences.density === 'compact'}
                  onOpenCollaborators={isGuest ? undefined : openCollaboratorsPanel}
                  collaboratorTeamSize={assignableUsers.length}
                />
              )}
            </div>
          </main>

          <nav
            className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-slate-700 bg-slate-800/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-sm md:hidden"
            aria-label="Navigation principale"
          >
            <button
              type="button"
              onClick={() => setActiveView('notes')}
              className={`flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                activeView === 'notes' ? 'text-indigo-300' : 'text-slate-500'
              }`}
            >
              <IconLightBulb className="h-6 w-6" />
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tasks')}
              className={`relative flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                activeView === 'tasks' ? 'text-indigo-300' : 'text-slate-500'
              }`}
            >
              <span className="relative inline-flex">
                <IconClipboardList className="h-6 w-6" />
                {!isGuest && assignedTaskBadgeCount > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold leading-none text-white">
                    {assignedTaskBadgeCount > 99 ? '99+' : assignedTaskBadgeCount}
                  </span>
                ) : null}
              </span>
              Tâches
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(o => !o)}
              className={`flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                chatOpen ? 'text-violet-300' : 'text-slate-500'
              }`}
            >
              <IconSparkles className="h-6 w-6" />
              IA
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-slate-500"
            >
              <IconBars3 className="h-6 w-6" />
              Plus
            </button>
          </nav>
        </div>

        {chatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onClose={() => setChatOpen(false)}
            onClear={clearChat}
            chatTier={chatTier}
          />
        )}
      </div>

      <CollaboratorsModal
        open={collaboratorsModalOpen}
        onClose={() => setCollaboratorsModalOpen(false)}
        assignableUsers={assignableUsers}
        currentUser={displayUser}
        isGuest={isGuest}
        onAddContact={addContactByEmail}
        onRemoveContact={removeContact}
      />

      <ProFeaturesModal
        open={proFeaturesModalOpen}
        onClose={() => setProFeaturesModalOpen(false)}
        plan={currentUser?.plan}
        isGuest={isGuest}
        proPriceLabel={proPriceLabel}
        upgradeOfferAvailable={PRO_SUBSCRIPTION_SALES_ENABLED}
        {...(PRO_SUBSCRIPTION_SALES_ENABLED ? { onUpgrade: startCheckout } : {})}
      />

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        user={displayUser}
        onSaved={handleSettingsSaved}
        isGuest={isGuest}
      />

      <AuthModal
        open={authModalOpen}
        initialTab={authTab}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthOauthError(null);
        }}
        onAuthenticated={onAuthenticated}
        oauthError={authOauthError}
      />
    </>
  );
}

function buildContext(notes: Note[], tasks: Task[], users: User[], currentUser: User): string {
  const notesSummary =
    notes.length === 0
      ? 'Aucune note'
      : notes
          .slice(0, 15)
          .map(n => {
            const r =
              n.remindAt != null
                ? ` [rappel ${new Date(n.remindAt).toLocaleString('fr-FR')}]`
                : '';
            return `• "${n.title}"${r}: ${n.content.slice(0, 120)}`;
          })
          .join('\n');

  const tasksSummary =
    tasks.length === 0
      ? 'Aucune tâche'
      : tasks
          .slice(0, 20)
          .map(t => {
            const assignees = t.assignedTo
              .map(id => users.find(u => u.id === id)?.name)
              .filter((name): name is string => Boolean(name));
            const assigneeLabel = assignees.length > 0 ? assignees.join(', ') : 'non assignée';
            return `• [${t.status.toUpperCase()}] "${t.title}" (priorité: ${t.priority}, assignée à: ${assigneeLabel})`;
          })
          .join('\n');

  return `Utilisateur actuel : ${currentUser.name} (${currentUser.email})
Équipe : ${users.map(u => `${u.name} <${u.email}>`).join(', ')}

=== NOTES (${notes.length}) ===
${notesSummary}

=== TÂCHES (${tasks.length}) ===
${tasksSummary}`;
}
