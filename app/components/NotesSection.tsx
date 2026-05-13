'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Note, NoteAsset, User } from '../types';
import {
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
  formatReminderLabel,
  formatReminderRelative,
  requestReminderPermission,
} from '../lib/useNoteReminders';
import type { UploadProgress } from '../lib/upload-with-progress';
import { normalizeWhatsAppPhone } from '../lib/whatsappReminder';
import {
  IconBell,
  IconCamera,
  IconChevronDown,
  IconChevronUp,
  IconClipboardList,
  IconEnvelope,
  IconFile,
  IconImage,
  IconLightBulb,
  IconMicrophone,
  IconPaperclip,
  IconPencil,
  IconPin,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from './icons';

interface NotesSectionProps {
  notes: Note[];
  /** Renvoie la note créée (si possible) afin d’y rattacher d’éventuelles pièces jointes en attente. */
  onAdd: (
    data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Note | void | Promise<Note | void>;
  onUpdate: (id: string, data: Partial<Note>) => void;
  onDelete: (id: string) => void;
  currentUser: User;
  /** Vous + collaborateurs (partage lecture). */
  collaborators: User[];
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
  /** Upload d’une photo/document Cloudinary. Renvoie la note mise à jour. */
  onUploadAsset?: (
    noteId: string,
    file: File,
    opts?: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal },
  ) => Promise<Note>;
  /** Suppression d’une pièce jointe. Renvoie la note mise à jour. */
  onDeleteAsset?: (noteId: string, assetId: string) => Promise<Note>;
  /** Conversion d’une note en tâche. Les pièces jointes sont déplacées sur la nouvelle tâche. */
  onConvertToTask?: (
    noteId: string,
    opts: { deleteOriginal: boolean },
  ) => Promise<unknown>;
}

interface FormData {
  title: string;
  content: string;
  /** Valeur pour input datetime-local */
  remindLocal: string;
  reminderByEmail: boolean;
  /** IDs collaborateurs avec accès lecture */
  sharedWith: string[];
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

function isNoteOwner(note: Note, currentUserId: string) {
  return (note.ownerId ?? currentUserId) === currentUserId;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const fixed = value >= 100 || idx === 0 ? 0 : 1;
  return `${value.toFixed(fixed)} ${units[idx]}`;
}

function isImageAsset(asset: NoteAsset) {
  return asset.mediaType.startsWith('image/');
}

function isPdfAsset(asset: NoteAsset) {
  return asset.mediaType === 'application/pdf' || asset.originalName.toLowerCase().endsWith('.pdf');
}

/** Ouvre le PDF dans Google Docs Viewer (iframe) pour éviter le téléchargement forcé. */
function getPdfViewerUrl(url: string) {
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}

function UploadProgressRow({
  percent,
  phase,
}: {
  percent: number | null;
  phase: 'uploading' | 'processing';
}) {
  const isIndeterminate = percent === null;
  const display = isIndeterminate ? null : Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="space-y-0.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/80">
        {isIndeterminate ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-500/80" />
        ) : (
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-out ${
              phase === 'processing' ? 'bg-emerald-500/90' : 'bg-indigo-500/90'
            }`}
            style={{ width: `${display}%` }}
          />
        )}
      </div>
      <p className="text-[10px] tabular-nums text-slate-400">
        {phase === 'processing'
          ? 'Traitement côté serveur…'
          : isIndeterminate
            ? 'Envoi en cours…'
            : `Envoi ${display}%`}
      </p>
    </div>
  );
}

export default function NotesSection({
  notes,
  onAdd,
  onUpdate,
  onDelete,
  currentUser,
  collaborators,
  isGuest,
  whatsappPhone,
  onWhatsappPhoneChange,
  whatsappAutoOpen,
  onWhatsappAutoOpenChange,
  compactLayout = false,
  showWhatsAppSection = true,
  onUploadAsset,
  onDeleteAsset,
  onConvertToTask,
}: NotesSectionProps) {
  const padHeader = compactLayout ? 'px-3 py-2 sm:px-4' : 'px-3 py-2.5 sm:px-5';
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
    sharedWith: [],
  });
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /* Pièces jointes : drafts (création) + état d’upload (édition) */
  type UploadStatus =
    | { kind: 'pending' }
    | { kind: 'uploading'; percent: number | null; phase: 'uploading' | 'processing' }
    | { kind: 'done' }
    | { kind: 'error'; message: string };
  const [draftAssets, setDraftAssets] = useState<File[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<UploadStatus[]>([]);
  const [editingUpload, setEditingUpload] = useState<
    { name: string; size: number; status: UploadStatus } | null
  >(null);
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadsSupported = !!onUploadAsset && !isGuest;

  const editingAssets = editingNote?.assets ?? [];

  const draftPreviews = useMemo(() => {
    return draftAssets.map(file => ({
      file,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    }));
  }, [draftAssets]);

  useEffect(() => {
    return () => {
      draftPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [draftPreviews]);

  const resetDrafts = useCallback(() => {
    setDraftAssets([]);
    setDraftStatuses([]);
    setEditingUpload(null);
    setAssetError(null);
  }, []);

  const handleEditingUpload = useCallback(
    async (file: File) => {
      if (!editingNote || !onUploadAsset) return;
      setAssetError(null);
      setAssetBusy(true);
      setEditingUpload({
        name: file.name,
        size: file.size,
        status: { kind: 'uploading', percent: 0, phase: 'uploading' },
      });
      try {
        const updated = await onUploadAsset(editingNote.id, file, {
          onProgress: p => {
            setEditingUpload(prev =>
              prev
                ? { ...prev, status: { kind: 'uploading', percent: p.percent, phase: p.phase } }
                : prev,
            );
          },
        });
        setEditingNote(updated);
        setEditingUpload(prev => (prev ? { ...prev, status: { kind: 'done' } } : prev));
        /* On nettoie l’indicateur après un court délai pour laisser voir le 100%. */
        window.setTimeout(() => setEditingUpload(null), 800);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload impossible';
        setAssetError(msg);
        setEditingUpload(prev => (prev ? { ...prev, status: { kind: 'error', message: msg } } : prev));
      } finally {
        setAssetBusy(false);
      }
    },
    [editingNote, onUploadAsset],
  );

  const handleEditingDeleteAsset = useCallback(
    async (assetId: string) => {
      if (!editingNote || !onDeleteAsset) return;
      setAssetError(null);
      setAssetBusy(true);
      try {
        const updated = await onDeleteAsset(editingNote.id, assetId);
        setEditingNote(updated);
      } catch (e: unknown) {
        setAssetError(e instanceof Error ? e.message : 'Suppression impossible');
      } finally {
        setAssetBusy(false);
      }
    },
    [editingNote, onDeleteAsset],
  );

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
      sharedWith: [],
    });
    resetDrafts();
    setShowModal(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content,
      remindLocal: toDatetimeLocalValue(note.remindAt),
      reminderByEmail: isGuest ? false : note.reminderByEmail !== false,
      sharedWith: [...(note.sharedWith ?? [])],
    });
    resetDrafts();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || assetBusy) return;
    const remindAt = fromDatetimeLocalValue(form.remindLocal);
    if (remindAt) {
      void requestReminderPermission();
    }
    const emailOk = !isGuest && !!remindAt && form.reminderByEmail;
    const sharePayload = !isGuest ? { sharedWith: form.sharedWith } : {};
    if (editingNote) {
      onUpdate(editingNote.id, {
        title: form.title.trim(),
        content: form.content,
        remindAt: remindAt ?? null,
        reminderByEmail: emailOk,
        ...sharePayload,
      });
      setShowModal(false);
      return;
    }

    setAssetError(null);
    let createdNote: Note | void;
    try {
      createdNote = await onAdd({
        title: form.title.trim(),
        content: form.content,
        pinned: false,
        remindAt: remindAt ?? null,
        reminderByEmail: emailOk,
        ...sharePayload,
      });
    } catch (e: unknown) {
      setAssetError(e instanceof Error ? e.message : 'Création impossible');
      return;
    }

    if (createdNote && draftAssets.length > 0 && onUploadAsset) {
      setAssetBusy(true);
      /* On démarre tous les fichiers en « pending » pour afficher leur barre. */
      setDraftStatuses(draftAssets.map(() => ({ kind: 'pending' })));
      let firstError: string | null = null;
      for (let i = 0; i < draftAssets.length; i++) {
        const file = draftAssets[i];
        setDraftStatuses(prev => {
          const next = [...prev];
          next[i] = { kind: 'uploading', percent: 0, phase: 'uploading' };
          return next;
        });
        try {
          await onUploadAsset(createdNote.id, file, {
            onProgress: p => {
              setDraftStatuses(prev => {
                const next = [...prev];
                next[i] = { kind: 'uploading', percent: p.percent, phase: p.phase };
                return next;
              });
            },
          });
          setDraftStatuses(prev => {
            const next = [...prev];
            next[i] = { kind: 'done' };
            return next;
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Upload impossible';
          if (!firstError) firstError = msg;
          setDraftStatuses(prev => {
            const next = [...prev];
            next[i] = { kind: 'error', message: msg };
            return next;
          });
        }
      }
      setAssetBusy(false);
      if (firstError) {
        setAssetError(`Note créée, mais une pièce jointe a échoué : ${firstError}`);
        return;
      }
    }
    setShowModal(false);
  };

  const handleAssetSelect = useCallback(
    (file: File | null) => {
      if (!file) return;
      setAssetError(null);
      if (editingNote) {
        void handleEditingUpload(file);
      } else {
        setDraftAssets(prev => [...prev, file]);
        setDraftStatuses(prev => [...prev, { kind: 'pending' }]);
      }
    },
    [editingNote, handleEditingUpload],
  );

  const removeDraft = useCallback((index: number) => {
    setDraftAssets(prev => prev.filter((_, i) => i !== index));
    setDraftStatuses(prev => prev.filter((_, i) => i !== index));
  }, []);

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
      {/* Une seule barre : titre + recherche + rappels + WhatsApp + nouvelle idée */}
      <div
        className={`flex min-h-[2.75rem] flex-shrink-0 items-center gap-2 border-b border-slate-700 ${padHeader}`}
      >
        <div className="shrink-0 leading-tight">
          <h2 className="text-sm font-bold text-white sm:text-base">Notes</h2>
          <p className="text-[10px] text-slate-500 sm:text-xs">
            {notes.length} idée{notes.length !== 1 ? 's' : ''}
            {filtered.length !== notes.length ? (
              <span className="text-indigo-400/90"> · {filtered.length} aff.</span>
            ) : null}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className={`relative shrink-0 ${
              upcomingReminders.length > 0 ? 'w-[min(100%,11rem)] sm:w-44' : 'min-w-0 flex-1'
            }`}
          >
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 sm:left-3 sm:h-4 sm:w-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 pl-8 pr-2 text-xs text-slate-200 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none sm:py-2 sm:pl-9 sm:pr-3 sm:text-sm"
            />
          </div>
          {upcomingReminders.length > 0 ? (
            <div
              className="flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Prochains rappels"
            >
              {upcomingReminders.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openEdit(n)}
                  className="flex max-w-[9rem] shrink-0 touch-manipulation flex-col rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-left transition-colors hover:bg-amber-500/15 sm:max-w-[11rem] sm:rounded-xl sm:px-2.5 sm:py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-amber-100 sm:text-xs">
                    <IconBell className="h-3 w-3 shrink-0 text-amber-300/90 sm:h-3.5 sm:w-3.5" />
                    <span className="truncate">{n.title}</span>
                  </span>
                  <span className="truncate text-[9px] text-amber-200/80 sm:text-[10px]">
                    {formatReminderRelative(n.remindAt!)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {showWhatsAppSection ? (
          <details className="group relative shrink-0">
            <summary className="cursor-pointer list-none rounded-xl border border-slate-600 bg-slate-800/90 px-2 py-1.5 text-[10px] font-medium text-slate-300 marker:content-none transition-colors hover:border-slate-500 hover:bg-slate-700/80 sm:px-2.5 sm:text-xs [&::-webkit-details-marker]:hidden">
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden" aria-hidden>
                WA
              </span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-[min(calc(100vw-1rem),22rem)] rounded-xl border border-slate-600 bg-slate-800 p-3 shadow-2xl sm:left-auto sm:right-0">
              <p className="mb-2 text-[11px] font-semibold text-slate-400">Rappels via WhatsApp (optionnel)</p>
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
                className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500/80 focus:outline-none"
              />
              {whatsappPhone && !normalizeWhatsAppPhone(whatsappPhone) ? (
                <p className="mt-1 text-[11px] text-amber-500/90">10 à 15 chiffres attendus (indicatif inclus).</p>
              ) : null}
              {whatsappPhone && normalizeWhatsAppPhone(whatsappPhone) ? (
                <p className="mt-1 text-[11px] text-emerald-500/90">
                  Numéro reconnu — au rappel, un message sera prêt dans WhatsApp.
                </p>
              ) : null}
              <label className="mt-2 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={whatsappAutoOpen}
                  onChange={e => onWhatsappAutoOpenChange(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600"
                />
                <span className="text-[11px] leading-snug text-slate-500">
                  Ouvrir WhatsApp automatiquement au rappel si les notifications sont désactivées (peut être bloqué par
                  le navigateur).
                </span>
              </label>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                Une conversation s’ouvre avec le texte du rappel. Les notifications du navigateur, si activées,
                ouvrent aussi WhatsApp.
              </p>
            </div>
          </details>
        ) : null}

        <button
          type="button"
          onClick={openAdd}
          className="flex shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <IconPlus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Nouvelle idée</span>
        </button>
      </div>

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
                      currentUserId={currentUser.id}
                      collaborators={collaborators}
                      expanded={expandedId === note.id}
                      onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                      onEdit={() => openEdit(note)}
                      onDelete={() => onDelete(note.id)}
                      onTogglePin={() => onUpdate(note.id, { pinned: !note.pinned })}
                      onOpenImage={url => setLightboxUrl(url)}
                      onOpenPdf={(url, name) => setPdfViewer({ url, name })}
                      onOpenAssets={() => setPreviewNote(note)}
                      onConvertToTask={onConvertToTask}
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
                      currentUserId={currentUser.id}
                      collaborators={collaborators}
                      expanded={expandedId === note.id}
                      onToggleExpand={() => setExpandedId(expandedId === note.id ? null : note.id)}
                      onEdit={() => openEdit(note)}
                      onDelete={() => onDelete(note.id)}
                      onTogglePin={() => onUpdate(note.id, { pinned: !note.pinned })}
                      onOpenImage={url => setLightboxUrl(url)}
                      onOpenPdf={(url, name) => setPdfViewer({ url, name })}
                      onOpenAssets={() => setPreviewNote(note)}
                      onConvertToTask={onConvertToTask}
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
          onClick={() => {
            if (assetBusy) return;
            if (recording) toggleMic();
            resetDrafts();
            setShowModal(false);
          }}
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
                onClick={() => {
                  if (assetBusy) return;
                  if (recording) toggleMic();
                  resetDrafts();
                  setShowModal(false);
                }}
                disabled={assetBusy}
                className="text-slate-500 hover:text-slate-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 disabled:opacity-40"
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

              {/* Photos & documents */}
              <div className="rounded-xl border border-slate-600/80 bg-slate-800/50 p-3">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Photos & documents
                </label>
                {uploadsSupported ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={assetBusy}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconCamera className="h-4 w-4 text-indigo-300" />
                        Prendre une photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={assetBusy}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconPaperclip className="h-4 w-4 text-indigo-300" />
                        Photo / document
                      </button>
                    </div>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        handleAssetSelect(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        handleAssetSelect(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    {assetError && (
                      <p className="mt-2 text-[11px] text-red-300">{assetError}</p>
                    )}

                    {/* Upload en cours (mode édition) */}
                    {editingNote && editingUpload ? (
                      <div className="mt-3 rounded-lg border border-indigo-500/40 bg-indigo-500/5 p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-indigo-500/40 bg-slate-900 text-indigo-300">
                            <IconPaperclip className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-100">
                              {editingUpload.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatBytes(editingUpload.size)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          {editingUpload.status.kind === 'uploading' ? (
                            <UploadProgressRow
                              percent={editingUpload.status.percent}
                              phase={editingUpload.status.phase}
                            />
                          ) : editingUpload.status.kind === 'done' ? (
                            <p className="text-[11px] font-medium text-emerald-300">
                              ✓ Téléversé
                            </p>
                          ) : editingUpload.status.kind === 'error' ? (
                            <p className="text-[11px] text-red-300">
                              ✕ {editingUpload.status.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {/* Liste des pièces déjà attachées (mode édition) */}
                    {editingNote && editingAssets.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {editingAssets.map(asset => (
                          <li
                            key={asset.id}
                            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1.5"
                          >
                            {isImageAsset(asset) ? (
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(asset.url)}
                                className="h-9 w-9 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800"
                                title="Aperçu"
                              >
                                <img
                                  src={asset.url}
                                  alt={asset.originalName}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-400">
                                <IconFile className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-slate-200">
                                {asset.originalName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {isImageAsset(asset) ? 'Image' : 'Document'} · {formatBytes(asset.bytes)}
                              </p>
                            </div>
                            {isPdfAsset(asset) ? (
                              <button
                                type="button"
                                onClick={() => setPdfViewer({ url: asset.url, name: asset.originalName })}
                                className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                              >
                                Ouvrir
                              </button>
                            ) : (
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                              >
                                Ouvrir
                              </a>
                            )}
                            {onDeleteAsset && isNoteOwner(editingNote, currentUser.id) ? (
                              <button
                                type="button"
                                onClick={() => void handleEditingDeleteAsset(asset.id)}
                                disabled={assetBusy}
                                className="rounded-md p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
                                title="Supprimer"
                              >
                                <IconTrash className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {/* Brouillons en attente d’upload (création) */}
                    {!editingNote && draftPreviews.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {draftPreviews.map((p, i) => {
                          const status: UploadStatus =
                            draftStatuses[i] ?? { kind: 'pending' };
                          const showRemove = status.kind === 'pending';
                          const borderCls =
                            status.kind === 'done'
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : status.kind === 'error'
                                ? 'border-red-500/40 bg-red-500/5'
                                : status.kind === 'uploading'
                                  ? 'border-indigo-500/40 bg-indigo-500/5'
                                  : 'border-dashed border-slate-600 bg-slate-900/40';
                          return (
                            <li
                              key={`${p.file.name}-${i}`}
                              className={`rounded-lg border px-2 py-1.5 ${borderCls}`}
                            >
                              <div className="flex items-center gap-2">
                                {p.isImage ? (
                                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800">
                                    <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                                  </span>
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-400">
                                    <IconFile className="h-4 w-4" />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-slate-200">{p.file.name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {p.isImage ? 'Image' : 'Document'} · {formatBytes(p.file.size)}
                                    {status.kind === 'pending' ? ' · en attente' : ''}
                                    {status.kind === 'done' ? ' · ✓ envoyé' : ''}
                                  </p>
                                </div>
                                {showRemove ? (
                                  <button
                                    type="button"
                                    onClick={() => removeDraft(i)}
                                    className="rounded-md p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-300"
                                    title="Retirer"
                                  >
                                    <IconX className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                              {status.kind === 'uploading' ? (
                                <div className="mt-2">
                                  <UploadProgressRow percent={status.percent} phase={status.phase} />
                                </div>
                              ) : null}
                              {status.kind === 'error' ? (
                                <p className="mt-1.5 text-[11px] text-red-300">✕ {status.message}</p>
                              ) : null}
                            </li>
                          );
                        })}
                        {draftStatuses.every(s => s.kind === 'pending') ? (
                          <p className="text-[10px] text-slate-500">
                            Les pièces seront envoyées automatiquement après création de la note.
                          </p>
                        ) : null}
                      </ul>
                    ) : null}

                    {!editingNote && draftPreviews.length === 0 ? (
                      <p className="mt-2 text-[11px] leading-snug text-slate-500">
                        Photographiez un tableau, un croquis ou joignez un PDF / document. Maximum 50 Mo par fichier.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[11px] leading-snug text-slate-500">
                    {isGuest
                      ? 'Connectez-vous pour ajouter des photos ou des documents à vos notes.'
                      : 'Téléversement non disponible.'}
                  </p>
                )}
              </div>

              {!isGuest && (editingNote ? isNoteOwner(editingNote, currentUser.id) : true) ? (
                <div className="rounded-xl border border-slate-600/80 bg-slate-800/50 p-3">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Partager en lecture
                  </label>
                  <p className="mb-2 text-[11px] leading-snug text-slate-500">
                    Les collaborateurs cochés voient cette idée dans leurs notes (sans pouvoir la modifier).
                  </p>
                  {collaborators.filter(c => c.id !== currentUser.id).length === 0 ? (
                    <p className="text-[11px] text-slate-600">
                      Ajoutez des collaborateurs (menu Collaborateurs) pour pouvoir partager.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                      {collaborators
                        .filter(c => c.id !== currentUser.id)
                        .map(c => (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:border-slate-600/60 hover:bg-slate-700/30"
                          >
                            <input
                              type="checkbox"
                              checked={form.sharedWith.includes(c.id)}
                              onChange={e => {
                                setForm(f => ({
                                  ...f,
                                  sharedWith: e.target.checked
                                    ? [...f.sharedWith, c.id]
                                    : f.sharedWith.filter(id => id !== c.id),
                                }));
                              }}
                              className="rounded border-slate-600"
                            />
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: c.color }}
                            >
                              {c.initials}
                            </span>
                            <span className="min-w-0 flex-1 text-xs text-slate-200">
                              <span className="block truncate font-medium">{c.name}</span>
                              <span className="block truncate text-[10px] text-slate-500">{c.email}</span>
                            </span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}

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
                onClick={() => { if (recording) toggleMic(); resetDrafts(); setShowModal(false); }}
                disabled={assetBusy}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!form.title.trim() || assetBusy}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                {assetBusy
                  ? 'Envoi…'
                  : editingNote
                    ? 'Enregistrer'
                    : draftAssets.length > 0
                      ? `Ajouter (+${draftAssets.length})`
                      : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox image */}
      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2 text-white shadow-lg hover:bg-slate-800"
            aria-label="Fermer l’aperçu"
          >
            <IconX className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      ) : null}

      {/* Visionneuse PDF */}
      {pdfViewer ? (
        <div className="fixed inset-0 z-[65] flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
            <p className="max-w-[60%] truncate text-sm font-medium text-slate-200" title={pdfViewer.name}>
              {pdfViewer.name}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={pdfViewer.url}
                download={pdfViewer.name}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                Télécharger
              </a>
              <a
                href={pdfViewer.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                Ouvrir onglet
              </a>
              <button
                type="button"
                onClick={() => setPdfViewer(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          </div>
          <iframe
            src={getPdfViewerUrl(pdfViewer.url)}
            className="min-h-0 flex-1 w-full border-0"
            title={pdfViewer.name}
          />
        </div>
      ) : null}

      {/* Aperçu pièces jointes (click depuis une carte note) */}
      {previewNote ? (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setPreviewNote(null)}
        >
          <div
            className="max-h-[min(90dvh,100%)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-700 border-b-0 bg-slate-800 p-5 shadow-2xl sm:rounded-2xl sm:border-b"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">{previewNote.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                className="text-slate-500 hover:text-slate-300 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-[11px] uppercase tracking-wider text-slate-500">
              Pièces jointes ({previewNote.assets?.length ?? 0})
            </p>
            <ul className="space-y-2">
              {(previewNote.assets ?? []).map(asset => (
                <li
                  key={asset.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2"
                >
                  {isImageAsset(asset) ? (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(asset.url)}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800"
                    >
                      <img src={asset.url} alt={asset.originalName} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-400">
                      <IconFile className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{asset.originalName}</p>
                    <p className="text-[11px] text-slate-500">
                      {isImageAsset(asset) ? 'Image' : 'Document'} · {formatBytes(asset.bytes)}
                    </p>
                  </div>
                  {isPdfAsset(asset) ? (
                    <button
                      type="button"
                      onClick={() => setPdfViewer({ url: asset.url, name: asset.originalName })}
                      className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                    >
                      Ouvrir
                    </button>
                  ) : (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                    >
                      Ouvrir
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Note Card ── */
interface NoteCardProps {
  note: Note;
  currentUserId: string;
  collaborators: User[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onOpenImage?: (url: string) => void;
  onOpenPdf?: (url: string, name: string) => void;
  onOpenAssets?: () => void;
  onConvertToTask?: (
    noteId: string,
    opts: { deleteOriginal: boolean },
  ) => Promise<unknown>;
}

function NoteCard({
  note,
  currentUserId,
  collaborators,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onTogglePin,
  onOpenImage,
  onOpenPdf,
  onOpenAssets,
  onConvertToTask,
}: NoteCardProps) {
  const [hover, setHover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const preview = note.content.length > 160 ? note.content.slice(0, 160) + '…' : note.content;
  const needsExpand = note.content.length > 160;
  const isOwner = isNoteOwner(note, currentUserId);
  const sharedNames = (note.sharedWith ?? [])
    .map(id => collaborators.find(u => u.id === id)?.name ?? id)
    .filter(Boolean);
  const assets = note.assets ?? [];
  const imageAssets = assets.filter(isImageAsset);
  const docAssets = assets.filter(a => !isImageAsset(a));

  const runConvert = async (deleteOriginal: boolean) => {
    if (!onConvertToTask || converting) return;
    setConvertError(null);
    setConverting(true);
    try {
      await onConvertToTask(note.id, { deleteOriginal });
      setConvertOpen(false);
    } catch (e: unknown) {
      setConvertError(e instanceof Error ? e.message : 'Conversion impossible');
    } finally {
      setConverting(false);
    }
  };

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
      {!isOwner && note.ownerName ? (
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-indigo-300/95">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: note.ownerColor ?? '#6366f1' }}
          >
            {note.ownerInitials ?? '?'}
          </span>
          Idée partagée par {note.ownerName}
        </p>
      ) : null}
      {isOwner && sharedNames.length > 0 ? (
        <p className="mb-2 text-[10px] leading-snug text-slate-500">
          <span className="font-semibold text-slate-400">Partagée avec</span> {sharedNames.join(', ')}
        </p>
      ) : null}
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-slate-100 text-sm leading-snug flex-1">{note.title}</h4>
        <div
          className={`flex flex-shrink-0 items-center gap-1 transition-opacity ${
            isOwner
              ? hover
                ? 'opacity-100'
                : 'opacity-100 md:opacity-0'
              : 'opacity-0 pointer-events-none'
          }`}
        >
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
          {onConvertToTask ? (
            <button
              onClick={() => {
                setConvertError(null);
                setConvertOpen(true);
              }}
              className="text-slate-500 hover:text-emerald-400 transition-colors p-0.5"
              title="Convertir en tâche"
              aria-label="Convertir en tâche"
            >
              <IconClipboardList className="h-4 w-4" />
            </button>
          ) : null}
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

      {/* Boîte de conversion en tâche */}
      {convertOpen ? (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
            <IconClipboardList className="h-3.5 w-3.5" />
            Convertir cette idée en tâche
          </p>
          <p className="mb-3 text-[11px] leading-snug text-slate-400">
            Une nouvelle tâche sera créée dans la colonne « À faire » avec le titre, le contenu et les pièces jointes.
            {note.remindAt ? ' Le rappel devient la date limite.' : ''}
          </p>
          {convertError ? (
            <p className="mb-2 text-[11px] text-red-300">{convertError}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConvertOpen(false)}
              disabled={converting}
              className="rounded-lg px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void runConvert(false)}
              disabled={converting}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {converting ? 'Conversion…' : 'Garder la note'}
            </button>
            <button
              type="button"
              onClick={() => void runConvert(true)}
              disabled={converting}
              className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-400 disabled:opacity-50"
            >
              {converting ? 'Conversion…' : 'Convertir et supprimer la note'}
            </button>
          </div>
        </div>
      ) : null}

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

      {/* Pièces jointes (vignettes images + documents) */}
      {assets.length > 0 ? (
        <div className="mb-3 space-y-2">
          {imageAssets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {imageAssets.slice(0, 4).map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onOpenImage?.(asset.url)}
                  className="group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                  title={asset.originalName}
                >
                  <img
                    src={asset.url}
                    alt={asset.originalName}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              ))}
              {imageAssets.length > 4 ? (
                <button
                  type="button"
                  onClick={onOpenAssets}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-300 hover:border-indigo-500/60 hover:text-white"
                >
                  +{imageAssets.length - 4}
                  <span className="text-[9px] font-normal text-slate-500">photos</span>
                </button>
              ) : null}
            </div>
          ) : null}
          {docAssets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {docAssets.slice(0, 3).map(asset =>
                isPdfAsset(asset) ? (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onOpenPdf?.(asset.url, asset.originalName)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 hover:border-indigo-500/60 hover:text-white"
                    title={asset.originalName}
                  >
                    <IconFile className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    <span className="max-w-[10rem] truncate">{asset.originalName}</span>
                  </button>
                ) : (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 hover:border-indigo-500/60 hover:text-white"
                    title={asset.originalName}
                  >
                    <IconFile className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="max-w-[10rem] truncate">{asset.originalName}</span>
                  </a>
                )
              )}
              {docAssets.length > 3 ? (
                <button
                  type="button"
                  onClick={onOpenAssets}
                  className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-indigo-500/60 hover:text-white"
                >
                  +{docAssets.length - 3} document{docAssets.length - 3 > 1 ? 's' : ''}
                </button>
              ) : null}
            </div>
          ) : null}
          {assets.length > 1 ? (
            <button
              type="button"
              onClick={onOpenAssets}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-300"
            >
              <IconImage className="h-3 w-3" />
              Voir toutes les pièces ({assets.length})
            </button>
          ) : null}
        </div>
      ) : null}

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
