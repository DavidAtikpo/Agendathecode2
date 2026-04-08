'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Note, User } from '../types';
import {
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
  formatReminderLabel,
  formatReminderRelative,
  requestReminderPermission,
} from '../lib/useNoteReminders';
import { normalizeWhatsAppPhone } from '../lib/whatsappReminder';
import {
  IconBell,
  IconChevronDown,
  IconChevronUp,
  IconEnvelope,
  IconLightBulb,
  IconMicrophone,
  IconPencil,
  IconPin,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from './icons';

interface NotesSectionProps {
  notes: Note[];
  onAdd: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, data: Partial<Note>) => void;
  onDelete: (id: string) => void;
  currentUser: User;
  /** Mode essai : pas d’e-mail automatique serveur */
  isGuest: boolean;
  /** Préférences : liste plus serrée */
  compactLayout?: boolean;
  /** Préférences : afficher le bloc WhatsApp sous l’en-tête */
  showWhatsAppSection?: boolean;
  whatsappPhone: string;
  onWhatsappPhoneChange: (value: string) => void;
  whatsappAutoOpen: boolean;
  onWhatsappAutoOpenChange: (value: boolean) => void;
}

interface FormData {
  title: string;
  content: string;
  /** Valeur pour input datetime-local */
  remindLocal: string;
  reminderByEmail: boolean;
}

/* ── Speech Recognition types ── */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function useSpeechRecognition(onTranscript: (text: string, isFinal: boolean) => void) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      onTranscript(final || interim, !!final);
    };

    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else start();
  }, [recording, start, stop]);

  return { recording, supported, toggle };
}

export default function NotesSection({
  notes,
  onAdd,
  onUpdate,
  onDelete,
  currentUser,
  isGuest,
  whatsappPhone,
  onWhatsappPhoneChange,
  whatsappAutoOpen,
  onWhatsappAutoOpenChange,
  compactLayout = false,
  showWhatsAppSection = true,
}: NotesSectionProps) {
  const padHeader = compactLayout ? 'px-3 py-3 sm:px-4 sm:py-4' : 'px-4 py-4 sm:px-6 sm:py-5';
  const padSection = compactLayout ? 'px-3 sm:px-4' : 'px-4 sm:px-6';
  const padContent = compactLayout ? 'p-3 sm:p-4' : 'p-4 sm:p-6';

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    title: '',
    content: '',
    remindLocal: '',
    reminderByEmail: true,
  });
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes.filter(
      n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const pinned = filtered.filter(n => n.pinned);
  const regular = filtered.filter(n => !n.pinned);

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    return notes
      .filter(n => n.remindAt && new Date(n.remindAt).getTime() > now)
      .sort((a, b) => new Date(a.remindAt!).getTime() - new Date(b.remindAt!).getTime())
      .slice(0, 12);
  }, [notes]);

  const openAdd = () => {
    setEditingNote(null);
    setForm({
      title: '',
      content: '',
      remindLocal: '',
      reminderByEmail: !isGuest,
    });
    setShowModal(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content,
      remindLocal: toDatetimeLocalValue(note.remindAt),
      reminderByEmail: isGuest ? false : note.reminderByEmail !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const remindAt = fromDatetimeLocalValue(form.remindLocal);
    if (remindAt) {
      void requestReminderPermission();
    }
    const emailOk = !isGuest && !!remindAt && form.reminderByEmail;
    if (editingNote) {
      onUpdate(editingNote.id, {
        title: form.title.trim(),
        content: form.content,
        remindAt: remindAt ?? null,
        reminderByEmail: emailOk,
      });
    } else {
      onAdd({
        title: form.title.trim(),
        content: form.content,
        pinned: false,
        remindAt: remindAt ?? null,
        reminderByEmail: emailOk,
      });
    }
    setShowModal(false);
  };

  /* Microphone feeds into the content textarea */
  const handleTranscript = useCallback((text: string) => {
    setForm(f => ({ ...f, content: text }));
  }, []);

  const { recording, supported, toggle: toggleMic } = useSpeechRecognition(handleTranscript);

  /* Auto-focus content textarea when modal opens */
  useEffect(() => {
    if (showModal && contentRef.current) {
      setTimeout(() => contentRef.current?.focus(), 50);
    }
  }, [showModal]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className={`flex flex-shrink-0 flex-col gap-3 border-b border-slate-700 sm:flex-row sm:items-center sm:gap-4 ${padHeader}`}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-xl">Idées & Notes</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-full min-w-0 sm:max-w-sm sm:flex-1">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex w-full shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:ml-auto sm:w-auto sm:py-2"
        >
          <IconPlus className="h-4 w-4" />
          <span>Nouvelle idée</span>
        </button>
      </div>

      {showWhatsAppSection ? (
      <details className={`flex-shrink-0 border-b border-slate-700/60 bg-slate-900/40 py-2 ${padSection}`}>
        <summary className="cursor-pointer list-none text-xs text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-slate-400 hover:text-slate-300">Rappels via WhatsApp</span>
          <span className="ml-2 text-[10px] text-slate-600">(optionnel)</span>
        </summary>
        <div className="mt-3 space-y-2 pb-1">
          <label className="block text-[11px] font-medium text-slate-500">
            Votre numéro (indicatif pays, sans +)
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="ex. 33612345678"
            value={whatsappPhone}
            onChange={e => onWhatsappPhoneChange(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500/80 focus:outline-none"
          />
          {whatsappPhone && !normalizeWhatsAppPhone(whatsappPhone) ? (
            <p className="text-[11px] text-amber-500/90">10 à 15 chiffres attendus (indicatif inclus).</p>
          ) : null}
          {whatsappPhone && normalizeWhatsAppPhone(whatsappPhone) ? (
            <p className="text-[11px] text-emerald-500/90">Numéro reconnu — au rappel, un message sera prêt dans WhatsApp.</p>
          ) : null}
          <label className="flex cursor-pointer items-start gap-2 pt-1">
            <input
              type="checkbox"
              checked={whatsappAutoOpen}
              onChange={e => onWhatsappAutoOpenChange(e.target.checked)}
              className="mt-0.5 rounded border-slate-600"
            />
            <span className="text-[11px] leading-snug text-slate-500">
              Si les notifications du navigateur sont désactivées, ouvrir WhatsApp automatiquement au moment du rappel
              (peut être bloqué par le navigateur).
            </span>
          </label>
          <p className="text-[10px] leading-relaxed text-slate-600">
            WhatsApp ne permet pas d’envoyer une vraie notification push depuis Neurix sans API Business. Ici, une
            conversation s’ouvre avec le texte du rappel — en général vers votre propre numéro pour vous l’envoyer.
            Avec les notifications activées, un clic sur la notification ouvre aussi WhatsApp.
          </p>
        </div>
      </details>
      ) : null}

      {upcomingReminders.length > 0 && (
        <div className={`flex-shrink-0 border-b border-slate-700/80 bg-slate-800/30 py-3 ${padSection}`}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Prochains rappels
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
            {upcomingReminders.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => openEdit(n)}
                className="flex-shrink-0 touch-manipulation rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/15"
              >
                <span className="flex max-w-[14rem] items-center gap-1.5 truncate text-xs font-medium text-amber-100">
                  <IconBell className="h-3.5 w-3.5 shrink-0 text-amber-300/90" />
                  {n.title}
                </span>
                <span className="mt-0.5 block text-[10px] text-amber-200/80">
                  {formatReminderRelative(n.remindAt!)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${padContent}`}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-5 flex justify-center">
              <IconLightBulb className="h-20 w-20 text-slate-600" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Aucune idée pour l&apos;instant</h3>
            <p className="text-slate-500 mb-6 max-w-xs">
              Capturez vos premières idées avant qu&apos;elles ne s&apos;envolent !
            </p>
            <button
              onClick={openAdd}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              Ajouter ma première idée
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="mb-3 flex justify-center">
              <IconSearch className="h-12 w-12 text-slate-600" aria-hidden />
            </div>
            <p>Aucune note ne correspond à &quot;{search}&quot;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <IconPin className="h-3.5 w-3.5 text-amber-500/80" />
                  Épinglées
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pinned.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expanded={expandedId === note.id}
                      onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                      onEdit={() => openEdit(note)}
                      onDelete={() => onDelete(note.id)}
                      onTogglePin={() => onUpdate(note.id, { pinned: !note.pinned })}
                    />
                  ))}
                </div>
              </section>
            )}
            {regular.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Toutes les notes
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {regular.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      expanded={expandedId === note.id}
                      onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                      onEdit={() => openEdit(note)}
                      onDelete={() => onDelete(note.id)}
                      onTogglePin={() => onUpdate(note.id, { pinned: !note.pinned })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => { if (recording) toggleMic(); setShowModal(false); }}
        >
          <div
            className="max-h-[min(100dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 border-b-0 bg-slate-800 shadow-2xl sm:rounded-2xl sm:border-b"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                {editingNote ? (
                  <>
                    <IconPencil className="h-5 w-5 text-indigo-400" />
                    Modifier la note
                  </>
                ) : (
                  <>
                    <IconLightBulb className="h-5 w-5 text-indigo-400" />
                    Nouvelle idée
                  </>
                )}
              </h3>
              <button
                onClick={() => { if (recording) toggleMic(); setShowModal(false); }}
                className="text-slate-500 hover:text-slate-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') contentRef.current?.focus(); }}
                  placeholder="Titre de l'idée..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Content + Microphone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Contenu
                  </label>

                  {/* Mic button */}
                  {supported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        recording
                          ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 animate-pulse'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                      }`}
                      title={recording ? "Arrêter l'enregistrement" : 'Dicter mon idée'}
                    >
                      {recording ? (
                        <>
                          <span className="w-2 h-2 bg-white rounded-full" />
                          <span>Écoute…</span>
                        </>
                      ) : (
                        <>
                          <IconMicrophone className="h-3.5 w-3.5" />
                          <span>Dicter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    ref={contentRef}
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder={
                      recording
                        ? 'Parlez maintenant, votre texte apparaît ici…'
                        : 'Développez votre idée ici, ou utilisez le bouton Dicter.'
                    }
                    rows={7}
                    className={`w-full bg-slate-700 border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none transition-colors ${
                      recording
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-slate-600 focus:border-indigo-500'
                    }`}
                  />
                  {recording && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1 bg-red-400 rounded-full animate-bounce"
                          style={{
                            height: `${8 + i * 4}px`,
                            animationDelay: `${i * 100}ms`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {recording && (
                  <p className="text-xs text-red-400/80 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                    Enregistrement en cours — cliquez sur &quot;Écoute…&quot; pour arrêter
                  </p>
                )}
              </div>

              {/* Rappel */}
              <div className="rounded-xl border border-slate-600/80 bg-slate-800/50 p-3">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Rappel (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={form.remindLocal}
                  onChange={e => {
                    const v = e.target.value;
                    setForm(f => ({
                      ...f,
                      remindLocal: v,
                      reminderByEmail: v ? f.reminderByEmail : false,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                  Vous recevrez une notification à l&apos;heure prévue (navigateur ou bannière dans l&apos;app). Autorisez les
                  notifications si demandé.
                </p>
                {!isGuest && form.remindLocal ? (
                  <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-600/60 bg-slate-800/80 p-2.5">
                    <input
                      type="checkbox"
                      checked={form.reminderByEmail}
                      onChange={e => setForm(f => ({ ...f, reminderByEmail: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-600"
                    />
                    <span className="text-[11px] leading-snug text-slate-400">
                      <span className="font-medium text-slate-300">E-mail dans ma boîte</span> — à l&apos;heure du rappel,
                      envoi automatique sur <span className="text-indigo-400">{currentUser.email}</span> (SMTP + cron
                      serveur).
                    </span>
                  </label>
                ) : null}
                {isGuest && form.remindLocal ? (
                  <p className="mt-2 text-[11px] text-slate-600">
                    Connectez-vous pour recevoir aussi le rappel par e-mail sur votre compte.
                  </p>
                ) : null}
                {form.remindLocal && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, remindLocal: '', reminderByEmail: false }))}
                    className="mt-2 text-xs text-amber-400/90 hover:text-amber-300"
                  >
                    Effacer le rappel
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-700 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
              <button
                onClick={() => { if (recording) toggleMic(); setShowModal(false); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim()}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                {editingNote ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Note Card ── */
interface NoteCardProps {
  note: Note;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function NoteCard({ note, expanded, onToggleExpand, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const [hover, setHover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = note.content.length > 160 ? note.content.slice(0, 160) + '…' : note.content;
  const needsExpand = note.content.length > 160;

  return (
    <div
      className={`bg-slate-800 border rounded-2xl p-4 transition-all ${
        note.pinned
          ? 'border-indigo-500/40 shadow-lg shadow-indigo-500/5'
          : 'border-slate-700 hover:border-slate-600'
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDelete(false); }}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-slate-100 text-sm leading-snug flex-1">{note.title}</h4>
        <div className={`flex items-center gap-1 transition-opacity flex-shrink-0 ${hover ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={onTogglePin}
            className={`text-slate-500 hover:text-amber-400 transition-colors p-0.5 ${note.pinned ? 'text-amber-400' : ''}`}
            title={note.pinned ? 'Désépingler' : 'Épingler'}
          >
            <IconPin className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="text-slate-500 hover:text-indigo-400 transition-colors p-0.5"
            title="Modifier"
          >
            <IconPencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <button
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 text-xs px-1.5 py-0.5 bg-red-500/20 rounded-lg transition-colors"
            >
              Confirmer
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
              title="Supprimer"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {note.content && (
        <div className="mb-3">
          <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
            {expanded ? note.content : preview}
          </p>
          {needsExpand && (
            <button
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs mt-1.5 transition-colors"
            >
              {expanded ? (
                <>
                  <IconChevronUp className="h-3.5 w-3.5" />
                  Voir moins
                </>
              ) : (
                <>
                  <IconChevronDown className="h-3.5 w-3.5" />
                  Voir plus
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {note.remindAt ? (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                new Date(note.remindAt).getTime() > Date.now() ? 'text-amber-400/95' : 'text-slate-500'
              }`}
            >
              <IconBell className="h-3 w-3 shrink-0 opacity-90" />
              {new Date(note.remindAt).getTime() > Date.now()
                ? formatReminderRelative(note.remindAt)
                : `Prévu ${formatReminderLabel(note.remindAt)}`}
            </span>
          ) : (
            <span />
          )}
          <span className="text-slate-600 text-xs">{timeAgo(note.updatedAt)}</span>
        </div>
        {note.reminderEmailSentAt ? (
          <p className="text-[10px] text-emerald-500/90 flex items-center gap-1">
            <IconEnvelope className="h-3 w-3 shrink-0" />
            E-mail envoyé · {formatReminderLabel(note.reminderEmailSentAt)}
          </p>
        ) : null}
        {!note.reminderEmailSentAt &&
        note.remindAt &&
        note.reminderByEmail !== false &&
        new Date(note.remindAt).getTime() > Date.now() ? (
          <p className="text-[10px] text-slate-600 flex items-center gap-1">
            <IconEnvelope className="h-3 w-3 shrink-0 opacity-70" />
            E-mail automatique prévu à cette heure
          </p>
        ) : null}
      </div>
    </div>
  );
}
