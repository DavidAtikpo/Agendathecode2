'use client';

import { useState, useMemo, useRef, useEffect, useCallback, type ComponentType } from 'react';
import { Task, TaskAsset, User, TaskStatus, TaskPriority } from '../types';
import { uploadWithProgress } from '../lib/upload-with-progress';
import {
  IconAlertTriangle,
  IconBolt,
  IconCalendar,
  IconCheckCircle,
  IconClipboardList,
  IconFile,
  IconImage,
  IconPaperclip,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from './icons';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onAdd: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Task | void | Promise<Task | void>;
  onUpdate: (id: string, data: Partial<Task>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onMove: (id: string, status: TaskStatus) => void | Promise<void>;
  compactLayout?: boolean;
  /** Desktop : ouvre la modale collaborateurs (évite la barre dupliquée dans la page). */
  onOpenCollaborators?: () => void;
  /** Taille de l’équipe assignable (badge sur le bouton collaborateurs). */
  collaboratorTeamSize?: number;
}

const COLUMNS: {
  id: TaskStatus;
  label: string;
  /** Court texte sous le titre (colonne « urgence »). */
  subtitle?: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
  dimColor: string;
  bg: string;
  border: string;
}[] = [
  {
    id: 'todo',
    label: 'À faire',
    Icon: IconClipboardList,
    color: 'text-blue-300',
    dimColor: 'text-blue-400/60',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    id: 'urgent',
    label: 'Urgence / bug',
    subtitle: 'À traiter tout de suite',
    Icon: IconAlertTriangle,
    color: 'text-rose-300',
    dimColor: 'text-rose-400/60',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/35',
  },
  {
    id: 'doing',
    label: 'En cours',
    Icon: IconBolt,
    color: 'text-amber-300',
    dimColor: 'text-amber-400/60',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    id: 'testing',
    label: 'En cour de test',
    Icon: IconSearch,
    color: 'text-cyan-300',
    dimColor: 'text-cyan-400/60',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    id: 'review',
    label: 'Révision',
    Icon: IconSearch,
    color: 'text-purple-300',
    dimColor: 'text-purple-400/60',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    id: 'done',
    label: 'Terminé',
    Icon: IconCheckCircle,
    color: 'text-emerald-300',
    dimColor: 'text-emerald-400/60',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string; dot: string }> = {
  low: { label: 'Basse', cls: 'text-slate-400 bg-slate-700/80', dot: 'bg-slate-400' },
  medium: { label: 'Moyenne', cls: 'text-amber-400 bg-amber-500/20', dot: 'bg-amber-400' },
  high: { label: 'Haute', cls: 'text-red-400 bg-red-500/20', dot: 'bg-red-400' },
  urgent: {
    label: 'Urgent',
    cls: 'text-fuchsia-200 bg-fuchsia-600/30 ring-1 ring-fuchsia-400/40',
    dot: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.7)]',
  },
};

interface FormData {
  title: string;
  description: string;
  assignedTo: string[];
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isOverdue(dueDate: string | undefined, status: TaskStatus) {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date();
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const fixed = value >= 100 || idx === 0 ? 0 : 1;
  return `${value.toFixed(fixed)} ${units[idx]}`;
}

function isPdfAsset(asset: TaskAsset) {
  return asset.mediaType === 'application/pdf' || asset.originalName.toLowerCase().endsWith('.pdf');
}

function getPdfViewerUrl(url: string) {
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}

type AssigneeFilter = 'all' | 'unassigned' | string;

function normalizeAssigneeIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value];
  }
  return [];
}

function CollaboratorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function UploadProgressInline({
  name,
  percent,
  phase,
}: {
  name: string;
  percent: number | null;
  phase: 'uploading' | 'processing';
}) {
  const indeterminate = percent === null;
  const display = indeterminate ? null : Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/5 px-2.5 py-2">
      <p className="mb-1 truncate text-[11px] font-medium text-slate-100">{name}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/80">
        {indeterminate ? (
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
      <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
        {phase === 'processing'
          ? 'Traitement côté serveur…'
          : indeterminate
            ? 'Envoi en cours…'
            : `Envoi ${display}%`}
      </p>
    </div>
  );
}

function AssetList({
  title,
  emptyLabel,
  assets,
  onOpenPdf,
}: {
  title: string;
  emptyLabel: string;
  assets: TaskAsset[];
  onOpenPdf?: (url: string, name: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {assets.length === 0 ? (
        <p className="text-xs text-slate-600">{emptyLabel}</p>
      ) : (
        <div className="space-y-1.5">
          {assets.map(asset => {
            const isVideo = asset.mediaType.startsWith('video/');
            const isPdf = isPdfAsset(asset);
            return (
              <div key={asset.id} className="rounded-lg border border-slate-700 bg-slate-900/40 px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{asset.originalName}</p>
                    <p className="text-[11px] text-slate-500">
                      {isVideo ? 'Vidéo' : isPdf ? 'PDF' : 'Fichier'} · {formatBytes(asset.bytes)} · {formatDate(asset.createdAt)}
                    </p>
                  </div>
                  {isPdf ? (
                    <button
                      type="button"
                      onClick={() => onOpenPdf?.(asset.url, asset.originalName)}
                      className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:border-indigo-500/60 hover:text-indigo-200"
                    >
                      Voir PDF
                    </button>
                  ) : (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                    >
                      {isVideo ? 'Regarder' : 'Télécharger'}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KanbanTaskCard({
  task,
  selected,
  onToggle,
  getUsersByIds,
}: {
  task: Task;
  selected: boolean;
  onToggle: () => void;
  getUsersByIds: (ids: string[] | null | undefined) => User[];
}) {
  const assignedUsers = getUsersByIds(task.assignedTo);
  const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.dueDate, task.status);

  const assets = task.assets ?? [];
  const imageAssets = assets.filter(a => a.mediaType.startsWith('image/'));
  const videoAssets = assets.filter(a => a.mediaType.startsWith('video/'));
  const pdfAssets  = assets.filter(a => isPdfAsset(a));
  const otherCount = assets.length - imageAssets.length - videoAssets.length - pdfAssets.length;
  const hasOutput  = assets.some(a => a.kind === 'output');

  /* Vignettes visibles : 3 images + 2 vidéos max, le reste dans "+N" */
  const visibleImages = imageAssets.slice(0, 3);
  const hiddenImages  = imageAssets.length - visibleImages.length;
  const visibleVideos = videoAssets.slice(0, 2);
  const hiddenVideos  = videoAssets.length - visibleVideos.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`cursor-pointer rounded-xl border bg-slate-800 p-3 transition-all sm:p-3.5 ${
        selected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
          : 'border-slate-700 hover:border-slate-600 hover:shadow-md'
      }`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${prio.dot}`} />
        <p className="flex-1 text-sm font-medium leading-snug text-slate-100">{task.title}</p>
      </div>

      {task.description ? <p className="mb-3 line-clamp-2 pl-4 text-xs text-slate-500">{task.description}</p> : null}

      {/* Vignettes photos + vidéos */}
      {(visibleImages.length > 0 || visibleVideos.length > 0) ? (
        <div className="mb-2.5 flex flex-wrap gap-1.5 pl-4">
          {visibleImages.map(asset => (
            <div
              key={asset.id}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
              title={asset.originalName}
            >
              <img
                src={asset.url}
                alt={asset.originalName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
          {hiddenImages > 0 ? (
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-300">
              +{hiddenImages}
              <span className="text-[9px] font-normal text-slate-500">photos</span>
            </div>
          ) : null}
          {visibleVideos.map(asset => (
            <div
              key={asset.id}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
              title={asset.originalName}
            >
              <video
                src={asset.url}
                className="h-full w-full object-cover"
                preload="metadata"
                muted
                playsInline
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <svg className="h-6 w-6 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </div>
            </div>
          ))}
          {hiddenVideos > 0 ? (
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-300">
              +{hiddenVideos}
              <span className="text-[9px] font-normal text-slate-500">vidéos</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Badges PDF / autres fichiers / livré */}
      {(pdfAssets.length > 0 || otherCount > 0 || hasOutput) ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 pl-4">
          {pdfAssets.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
              <IconFile className="h-3 w-3 shrink-0" />
              {pdfAssets.length} PDF
            </span>
          ) : null}
          {otherCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/60 bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              <IconPaperclip className="h-3 w-3 shrink-0" />
              {otherCount} fichier{otherCount > 1 ? 's' : ''}
            </span>
          ) : null}
          {hasOutput ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              ✓ Livré
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pl-4">
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${prio.cls}`}>{prio.label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {task.dueDate ? (
            <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
              {overdue ? (
                <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <IconCalendar className="h-3.5 w-3.5 shrink-0" />
              )}
              {formatDate(task.dueDate)}
            </span>
          ) : null}
          {assignedUsers.length > 0 ? (
            <div className="-space-x-1.5 flex items-center">
              {assignedUsers.slice(0, 2).map(user => (
                <div
                  key={user.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm ring-2 ring-slate-800"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.initials}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TaskBoard({
  tasks,
  users,
  currentUser,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  compactLayout = false,
  onOpenCollaborators,
  collaboratorTeamSize = 0,
}: TaskBoardProps) {
  const padHeader = compactLayout ? 'px-3 py-2 sm:px-4' : 'px-3 py-2.5 sm:px-5';
  const padMain = compactLayout ? 'p-3 sm:p-4' : 'p-4 sm:p-6';
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    assignedTo: [currentUser.id],
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  /** Mobile (viewport < md) : une seule colonne à la fois, pas de scroll horizontal Kanban */
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskStatus>('todo');
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [assetBusy, setAssetBusy] = useState<'input' | 'output' | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetProgress, setAssetProgress] = useState<{
    name: string;
    percent: number | null;
    phase: 'uploading' | 'processing';
  } | null>(null);
  type DraftUploadStatus =
    | { kind: 'pending' }
    | { kind: 'uploading'; percent: number | null; phase: 'uploading' | 'processing' }
    | { kind: 'done' }
    | { kind: 'error'; message: string };
  interface DraftFile { file: File; assetKind: 'input' | 'output' }

  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<DraftUploadStatus[]>([]);

  const draftPreviews = useMemo(() => {
    return draftFiles.map(df => ({
      ...df,
      url: URL.createObjectURL(df.file),
      isImage: df.file.type.startsWith('image/'),
      isVideo: df.file.type.startsWith('video/'),
      isPdf: df.file.type === 'application/pdf' || df.file.name.toLowerCase().endsWith('.pdf'),
    }));
  }, [draftFiles]);

  useEffect(() => {
    return () => { draftPreviews.forEach(p => URL.revokeObjectURL(p.url)); };
  }, [draftPreviews]);

  const addDraft = useCallback((file: File | null, kind: 'input' | 'output') => {
    if (!file) return;
    setDraftFiles(prev => [...prev, { file, assetKind: kind }]);
    setDraftStatuses(prev => [...prev, { kind: 'pending' }]);
  }, []);

  const removeDraft = useCallback((index: number) => {
    setDraftFiles(prev => prev.filter((_, i) => i !== index));
    setDraftStatuses(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetDrafts = useCallback(() => {
    setDraftFiles([]);
    setDraftStatuses([]);
  }, []);

  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const inputVideoRef = useRef<HTMLInputElement | null>(null);
  const outputFileRef = useRef<HTMLInputElement | null>(null);
  const editInputFileRef = useRef<HTMLInputElement | null>(null);
  const editInputVideoRef = useRef<HTMLInputElement | null>(null);
  const editOutputFileRef = useRef<HTMLInputElement | null>(null);

  const filteredTasks = useMemo(() => {
    if (assigneeFilter === 'all') return tasks;
    if (assigneeFilter === 'unassigned') {
      return tasks.filter(t => normalizeAssigneeIds(t.assignedTo).length === 0);
    }
    return tasks.filter(t => normalizeAssigneeIds(t.assignedTo).includes(assigneeFilter));
  }, [tasks, assigneeFilter]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      urgent: [],
      doing: [],
      testing: [],
      done: [],
      review: [],
    };
    filteredTasks.forEach(t => {
      const s = t.status;
      if (s in map) map[s].push(t);
      else map.todo.push(t);
    });
    return map;
  }, [filteredTasks]);

  const getUserById = (id: string | null | undefined) => users.find(u => u.id === id);
  const getUsersByIds = (ids: string[] | null | undefined) => {
    return normalizeAssigneeIds(ids).map(id => getUserById(id)).filter((u): u is User => Boolean(u));
  };

  const openAdd = (status: TaskStatus = defaultStatus) => {
    setSubmitError(null);
    setDefaultStatus(status);
    setEditingTask(null);
    setForm({
      title: '',
      description: '',
      assignedTo: [currentUser.id],
      priority: 'medium',
      status,
      dueDate: '',
    });
    resetDrafts();
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setSubmitError(null);
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo.slice(0, 2) : [],
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || '',
    });
    setShowModal(true);
    setSelectedTask(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editingTask) {
        await onUpdate(editingTask.id, {
          title: form.title,
          description: form.description,
          assignedTo: form.assignedTo,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || undefined,
        });
      } else {
        const created = await onAdd({
          title: form.title,
          description: form.description,
          assignedTo: form.assignedTo,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || undefined,
        });
        if (created?.id && draftFiles.length > 0) {
          setDraftStatuses(draftFiles.map(() => ({ kind: 'pending' as const })));
          let firstError: string | null = null;
          for (let i = 0; i < draftFiles.length; i++) {
            const df = draftFiles[i];
            setDraftStatuses(prev => {
              const next = [...prev];
              next[i] = { kind: 'uploading', percent: 0, phase: 'uploading' };
              return next;
            });
            try {
              const result = await uploadWithProgress<Task>(
                `/api/tasks/${created.id}/assets`,
                df.file,
                {
                  fields: { kind: df.assetKind },
                  onProgress: p => {
                    setDraftStatuses(prev => {
                      const next = [...prev];
                      next[i] = { kind: 'uploading', percent: p.percent, phase: p.phase };
                      return next;
                    });
                  },
                },
              );
              if (!result.ok) throw new Error(result.error ?? 'Upload impossible');
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
          await onUpdate(created.id, {});
          if (firstError) {
            setSubmitError(`Tâche créée, mais une pièce jointe a échoué : ${firstError}`);
            setSubmitting(false);
            return;
          }
        }
      }
      setShowModal(false);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const moveSelected = (status: TaskStatus) => {
    if (!selectedTask) return;
    onMove(selectedTask.id, status);
    setSelectedTask(t => (t ? { ...t, status } : null));
  };
  const uploadAsset = async (taskId: string, kind: 'input' | 'output', file: File | null) => {
    if (!taskId || !file || assetBusy) return;
    setAssetError(null);
    setAssetBusy(kind);
    setAssetProgress({ name: file.name, percent: 0, phase: 'uploading' });
    try {
      const result = await uploadWithProgress<Task>(`/api/tasks/${taskId}/assets`, file, {
        fields: { kind },
        onProgress: p => {
          setAssetProgress({ name: file.name, percent: p.percent, phase: p.phase });
        },
      });
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Upload impossible (${result.status})`);
      }
      const updated = result.data;
      setSelectedTask(prev => (prev && prev.id === updated.id ? updated : prev));
      setEditingTask(prev => (prev && prev.id === updated.id ? updated : prev));
      await onUpdate(updated.id, {});
      setAssetProgress(null);
    } catch (e: unknown) {
      setAssetError(e instanceof Error ? e.message : 'Erreur upload');
      setAssetProgress(null);
    } finally {
      setAssetBusy(null);
    }
  };
  const toggleAssignee = (userId: string) => {
    setForm(prev => {
      const exists = prev.assignedTo.includes(userId);
      if (exists) {
        return { ...prev, assignedTo: prev.assignedTo.filter(id => id !== userId) };
      }
      if (prev.assignedTo.length >= 2) return prev;
      return { ...prev, assignedTo: [...prev.assignedTo, userId] };
    });
  };

  const teamBadge = collaboratorTeamSize > 1;
  const isGuestUser = currentUser.id === '__guest__';
  const selectedAssets = selectedTask?.assets ?? [];
  const inputAssets = selectedAssets.filter(a => a.kind === 'input');
  const outputAssets = selectedAssets.filter(a => a.kind === 'output');

  return (
    <div className="h-full flex flex-col">
      {/* Une seule barre : titre + filtres + collaborateurs (desktop) + nouvelle tâche */}
      <div
        className={`flex min-h-[2.75rem] flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-700 ${padHeader}`}
      >
        <div className="flex shrink-0 flex-col leading-tight">
          <h2 className="text-sm font-bold text-white sm:text-base">Tâches</h2>
          <p className="w-[4.25rem] truncate text-[10px] text-slate-500 sm:w-auto sm:max-w-[11rem] sm:text-xs">
            {filteredTasks.length}/{tasks.length}
            {assigneeFilter !== 'all' ? (
              <span className="text-indigo-400/90"> · filtré</span>
            ) : null}
          </p>
        </div>

        <div
          className="order-3 flex min-h-0 min-w-0 w-full flex-1 items-center overflow-hidden sm:order-none sm:w-auto"
        >
          <div
            className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="toolbar"
            aria-label="Filtrer les tâches par personne assignée"
          >
            <button
              type="button"
              onClick={() => setAssigneeFilter('all')}
              aria-pressed={assigneeFilter === 'all'}
              className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-3 sm:text-xs ${
                assigneeFilter === 'all'
                  ? 'border-indigo-400 bg-indigo-500/25 text-indigo-200'
                  : 'border-slate-600 bg-slate-800/90 text-slate-300 hover:border-slate-500'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setAssigneeFilter(currentUser.id)}
              aria-pressed={assigneeFilter === currentUser.id}
              title="Tâches qui vous sont assignées"
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-medium transition-colors touch-manipulation sm:gap-1.5 sm:py-1 sm:pl-1 sm:pr-2.5 sm:text-xs ${
                assigneeFilter === currentUser.id
                  ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
                  : 'border-slate-600 bg-slate-800/90 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm sm:h-6 sm:w-6 sm:text-[10px]"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.initials}
              </span>
              <span className="max-w-[2.75rem] truncate sm:max-w-[4rem]">À moi</span>
            </button>
            <button
              type="button"
              onClick={() => setAssigneeFilter('unassigned')}
              aria-pressed={assigneeFilter === 'unassigned'}
              className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-3 sm:text-xs ${
                assigneeFilter === 'unassigned'
                  ? 'border-indigo-400 bg-indigo-500/25 text-indigo-200'
                  : 'border-slate-600 bg-slate-800/90 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="sm:hidden">Sans ass.</span>
              <span className="hidden sm:inline">Sans assignation</span>
            </button>
            {users
              .filter(u => u.id !== currentUser.id)
              .map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setAssigneeFilter(u.id)}
                  aria-pressed={assigneeFilter === u.id}
                  className={`inline-flex max-w-[9rem] shrink-0 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-left text-[11px] font-medium transition-colors touch-manipulation sm:max-w-[11rem] sm:gap-2 sm:py-1 sm:pl-1 sm:pr-2.5 sm:text-xs ${
                    assigneeFilter === u.id
                      ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
                      : 'border-slate-600 bg-slate-800/90 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm sm:h-6 sm:w-6 sm:text-[10px]"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.initials}
                  </span>
                  <span className="min-w-0 truncate">{u.name}</span>
                </button>
              ))}
          </div>
        </div>

        {onOpenCollaborators ? (
          <button
            type="button"
            onClick={onOpenCollaborators}
            className="hidden shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 md:inline-flex"
          >
            <CollaboratorsIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="hidden lg:inline">Collaborateurs</span>
            {teamBadge ? (
              <span className="rounded-full bg-indigo-500/25 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200">
                {collaboratorTeamSize}
              </span>
            ) : null}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => openAdd(mobileStatusTab)}
          className="flex shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:gap-2 sm:px-4 sm:text-sm md:hidden"
        >
          <IconPlus className="h-4 w-4 shrink-0" />
          <span>Nouvelle tâche</span>
        </button>
        <button
          type="button"
          onClick={() => openAdd('todo')}
          className="hidden shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:gap-2 sm:px-4 sm:text-sm md:flex"
        >
          <IconPlus className="h-4 w-4 shrink-0" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {/* Mobile : onglets par statut + liste pleine largeur (scroll vertical uniquement) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
        <div
          role="tablist"
          aria-label="Statut des tâches"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-700 bg-slate-900/90 px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.id];
            const active = mobileStatusTab === col.id;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileStatusTab(col.id)}
                className={`flex min-w-[3.25rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1.5 touch-manipulation transition-colors ${
                  active
                    ? `${col.bg} ${col.border} shadow-sm ring-1 ring-white/10`
                    : 'border-transparent bg-slate-800/50 text-slate-500 hover:bg-slate-800'
                }`}
              >
                <col.Icon className={`h-4 w-4 shrink-0 ${active ? col.color : 'text-slate-500'}`} />
                <span
                  className={`max-w-[4.75rem] truncate text-center text-[9px] font-semibold leading-tight sm:max-w-[5.5rem] sm:text-[10px] ${
                    active ? col.color : 'text-slate-500'
                  }`}
                >
                  {col.label}
                </span>
                <span
                  className={`text-[10px] font-bold tabular-nums ${active ? col.dimColor : 'text-slate-600'}`}
                >
                  {colTasks.length}
                </span>
              </button>
            );
          })}
        </div>

        {(() => {
          const col = COLUMNS.find(c => c.id === mobileStatusTab)!;
          const colTasks = tasksByStatus[mobileStatusTab];
          const padMobile = compactLayout ? 'px-3 py-3' : 'px-3 py-4';
          return (
            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${padMobile}`}>
              <div
                className={`mb-2 flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${col.bg} ${col.border}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <col.Icon className={`h-5 w-5 shrink-0 ${col.color}`} />
                    <span className={`truncate text-sm font-semibold ${col.color}`}>{col.label}</span>
                    <span className={`shrink-0 rounded-full bg-slate-900/40 px-1.5 py-0.5 text-xs font-bold ${col.color}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  {col.subtitle ? (
                    <p className="mt-0.5 pl-7 text-[10px] leading-snug text-slate-500">{col.subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => openAdd(col.id)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5 ${col.dimColor} hover:text-white`}
                  title={`Ajouter dans ${col.label}`}
                >
                  +
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-y-contain pb-4">
                {colTasks.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-700/60 p-8 text-center">
                    <p className="text-xs text-slate-600">Aucune tâche dans cette colonne</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      selected={selectedTask?.id === task.id}
                      onToggle={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      getUsersByIds={getUsersByIds}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Desktop : Kanban horizontal */}
      <div className={`hidden min-h-0 flex-1 overflow-x-auto overscroll-x-contain md:block ${padMain}`}>
        <div className="flex h-full min-w-max gap-3 pb-1 sm:gap-5 sm:pb-2">
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.id];
            return (
              <div key={col.id} className="flex w-72 shrink-0 flex-col gap-2.5 sm:gap-3">
                {/* Column Header */}
                <div className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl ${col.bg} border ${col.border}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <col.Icon className={`h-5 w-5 shrink-0 ${col.color}`} />
                      <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-900/40 ${col.color}`}>
                        {colTasks.length}
                      </span>
                    </div>
                    {col.subtitle ? (
                      <p className="mt-0.5 pl-7 text-[10px] leading-snug text-slate-500">{col.subtitle}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openAdd(col.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/5 ${col.dimColor} hover:opacity-100`}
                    title={`Ajouter dans ${col.label}`}
                  >
                    +
                  </button>
                </div>

                {/* Task Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto sm:space-y-3">
                  {colTasks.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-700/60 p-5 text-center">
                      <p className="text-xs text-slate-600">Aucune tâche</p>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      selected={selectedTask?.id === task.id}
                      onToggle={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      getUsersByIds={getUsersByIds}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Overlay */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-700 border-b-0 bg-slate-800 shadow-2xl sm:rounded-2xl sm:border-b"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-700 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${(PRIORITY_CONFIG[selectedTask.priority] ?? PRIORITY_CONFIG.medium).dot}`}
                />
                <h3 className="font-semibold text-white leading-snug">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 flex-shrink-0"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 sm:p-5">
              {selectedTask.description && (
                <p className="text-slate-400 text-sm leading-relaxed">{selectedTask.description}</p>
              )}

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichiers et vidéos</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => inputVideoRef.current?.click()}
                    disabled={assetBusy !== null || isGuestUser}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 disabled:opacity-60"
                  >
                    Ajouter vidéo
                  </button>
                  <button
                    type="button"
                    onClick={() => inputFileRef.current?.click()}
                    disabled={assetBusy !== null || isGuestUser}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 disabled:opacity-60"
                  >
                    Ajouter pièce jointe
                  </button>
                  <button
                    type="button"
                    onClick={() => outputFileRef.current?.click()}
                    disabled={assetBusy !== null || isGuestUser}
                    className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-500/60 disabled:opacity-60"
                  >
                    Livrer travail (terminé)
                  </button>
                </div>
                {isGuestUser ? (
                  <p className="text-[11px] text-slate-500">Connectez-vous pour ajouter des vidéos et pièces jointes.</p>
                ) : null}
                {assetProgress ? (
                  <UploadProgressInline
                    name={assetProgress.name}
                    percent={assetProgress.percent}
                    phase={assetProgress.phase}
                  />
                ) : null}
                {assetError && <p className="text-[11px] text-red-300">{assetError}</p>}

                <AssetList
                  title="Brief / pièces de référence"
                  emptyLabel="Aucun fichier de référence"
                  assets={inputAssets}
                  onOpenPdf={(url, name) => setPdfViewer({ url, name })}
                />
                <AssetList
                  title="Travail livré (tâche terminée)"
                  emptyLabel="Aucun livrable pour le moment"
                  assets={outputAssets}
                  onOpenPdf={(url, name) => setPdfViewer({ url, name })}
                />

                <input
                  ref={inputVideoRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    void uploadAsset(selectedTask.id, 'input', file);
                    e.currentTarget.value = '';
                  }}
                />
                <input
                  ref={inputFileRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    void uploadAsset(selectedTask.id, 'input', file);
                    e.currentTarget.value = '';
                  }}
                />
                <input
                  ref={outputFileRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    void uploadAsset(selectedTask.id, 'output', file);
                    e.currentTarget.value = '';
                  }}
                />
              </div>

              {/* Move between columns */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Déplacer vers</p>
                <div className="flex flex-wrap gap-2">
                  {COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => moveSelected(col.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        selectedTask.status === col.id
                          ? `${col.bg} ${col.color} ${col.border}`
                          : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                      }`}
                    >
                      <col.Icon className={`h-3.5 w-3.5 shrink-0 ${col.color}`} />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignée à</p>
                  {getUsersByIds(selectedTask.assignedTo).length > 0 ? (
                    <div className="space-y-2">
                      {getUsersByIds(selectedTask.assignedTo).map(u => (
                        <div key={u.id} className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.initials}
                          </div>
                          <span className="text-sm text-slate-300">{u.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 italic">Non assignée</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Créée par</p>
                  <div className="flex items-center gap-2">
                    {getUserById(selectedTask.createdBy) ? (
                      <>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ backgroundColor: getUserById(selectedTask.createdBy)!.color }}
                        >
                          {getUserById(selectedTask.createdBy)!.initials}
                        </div>
                        <span className="text-sm text-slate-300">{getUserById(selectedTask.createdBy)!.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-500 italic">Inconnu</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedTask.dueDate && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date limite</p>
                  <p className={`flex items-center gap-2 text-sm ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-400' : 'text-slate-300'}`}>
                    {isOverdue(selectedTask.dueDate, selectedTask.status) ? (
                      <IconAlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <IconCalendar className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    {formatDate(selectedTask.dueDate)}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Créée le {formatDate(selectedTask.createdAt)} · Modifiée le {formatDate(selectedTask.updatedAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
              {currentUser.id === selectedTask.createdBy ? (
                <button
                  onClick={() => {
                    onDelete(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                >
                  <IconTrash className="h-4 w-4" />
                  Supprimer
                </button>
              ) : (
                <div className="flex-1 min-w-0" aria-hidden />
              )}
              <button
                onClick={() => openEdit(selectedTask)}
                className="inline-flex w-full items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all sm:w-auto"
              >
                <IconPencil className="h-4 w-4" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visionneuse PDF */}
      {pdfViewer ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm">
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => { if (!submitting) setShowModal(false); }}
        >
          <div
            className="max-h-[min(100dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 border-b-0 bg-slate-800 shadow-2xl sm:rounded-2xl sm:border-b"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                {editingTask ? (
                  <>
                    <IconPencil className="h-5 w-5 text-indigo-400" />
                    Modifier la tâche
                  </>
                ) : (
                  <>
                    <IconClipboardList className="h-5 w-5 text-indigo-400" />
                    Nouvelle tâche
                  </>
                )}
              </h3>
              <button
                onClick={() => { if (!submitting) setShowModal(false); }}
                disabled={submitting}
                className="text-slate-500 hover:text-slate-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 disabled:opacity-40"
                aria-label="Fermer"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 sm:p-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Titre de la tâche..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez la tâche en détail..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vidéo et pièces jointes
                </label>
                {editingTask ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => editInputVideoRef.current?.click()}
                        disabled={assetBusy !== null || isGuestUser}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 disabled:opacity-60"
                      >
                        Ajouter vidéo
                      </button>
                      <button
                        type="button"
                        onClick={() => editInputFileRef.current?.click()}
                        disabled={assetBusy !== null || isGuestUser}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 disabled:opacity-60"
                      >
                        Ajouter pièce jointe
                      </button>
                      <button
                        type="button"
                        onClick={() => editOutputFileRef.current?.click()}
                        disabled={assetBusy !== null || isGuestUser}
                        className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-500/60 disabled:opacity-60"
                      >
                        Livrer travail
                      </button>
                    </div>
                    <input
                      ref={editInputVideoRef}
                      type="file"
                      accept="video/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        void uploadAsset(editingTask.id, 'input', file);
                        e.currentTarget.value = '';
                      }}
                    />
                    <input
                      ref={editInputFileRef}
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        void uploadAsset(editingTask.id, 'input', file);
                        e.currentTarget.value = '';
                      }}
                    />
                    <input
                      ref={editOutputFileRef}
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0] ?? null;
                        void uploadAsset(editingTask.id, 'output', file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-center text-xs font-medium text-slate-200 hover:border-slate-600">
                        Ajouter vidéo
                        <input
                          type="file"
                          accept="video/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => { addDraft(e.target.files?.[0] ?? null, 'input'); e.currentTarget.value = ''; }}
                        />
                      </label>
                      <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-center text-xs font-medium text-slate-200 hover:border-slate-600">
                        Ajouter pièce jointe
                        <input
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                          className="hidden"
                          onChange={e => { addDraft(e.target.files?.[0] ?? null, 'input'); e.currentTarget.value = ''; }}
                        />
                      </label>
                      <label className="cursor-pointer rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-center text-xs font-medium text-emerald-200 hover:border-emerald-500/60">
                        Livrer travail
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => { addDraft(e.target.files?.[0] ?? null, 'output'); e.currentTarget.value = ''; }}
                        />
                      </label>
                    </div>

                    {/* Vignettes des brouillons en attente */}
                    {draftPreviews.length > 0 ? (
                      <ul className="space-y-1.5">
                        {draftPreviews.map((p, i) => {
                          const status: DraftUploadStatus = draftStatuses[i] ?? { kind: 'pending' };
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
                            <li key={`${p.file.name}-${i}`} className={`rounded-lg border px-2 py-1.5 ${borderCls}`}>
                              <div className="flex items-center gap-2">
                                {p.isImage ? (
                                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800">
                                    <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                                  </span>
                                ) : p.isVideo ? (
                                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800">
                                    <video src={p.url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>
                                    </span>
                                  </span>
                                ) : p.isPdf ? (
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-red-500/30 bg-red-500/10 text-red-400">
                                    <IconFile className="h-4 w-4" />
                                  </span>
                                ) : (
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-400">
                                    <IconPaperclip className="h-4 w-4" />
                                  </span>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-slate-200">{p.file.name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {p.isImage ? 'Image' : p.isVideo ? 'Vidéo' : p.isPdf ? 'PDF' : 'Fichier'} · {formatBytes(p.file.size)}
                                    {p.assetKind === 'output' ? ' · Livrable' : ''}
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
                                  <UploadProgressInline name={p.file.name} percent={status.percent} phase={status.phase} />
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
                            Les pièces seront téléversées automatiquement après création de la tâche.
                          </p>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="text-[11px] leading-snug text-slate-500">
                        Optionnel : ajoutez des photos, vidéos ou documents. Maximum 50 Mo par fichier.
                      </p>
                    )}
                  </div>
                )}
                {assetProgress ? (
                  <UploadProgressInline
                    name={assetProgress.name}
                    percent={assetProgress.percent}
                    phase={assetProgress.phase}
                  />
                ) : null}
                {assetError && <p className="text-[11px] text-red-300">{assetError}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Assignée à
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2 leading-snug">
                    Vous et les personnes ajoutées par email (barre latérale). Maximum 2 assignés.
                  </p>
                  <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-2.5">
                    {users.map(u => {
                      const selected = form.assignedTo.includes(u.id);
                      const disabled = !selected && form.assignedTo.length >= 2;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleAssignee(u.id)}
                          disabled={disabled}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                            selected
                              ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: u.color }}
                          >
                            {u.initials}
                          </span>
                          <span className="truncate">{u.name}</span>
                          <span className="ml-auto text-xs">{selected ? 'Sélectionné' : 'Choisir'}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{form.assignedTo.length}/2 sélectionné(s)</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, assignedTo: [] }))}
                      className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    >
                      Vider
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Priorité
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Colonne
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {COLUMNS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Date limite
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

            </div>

            {submitError && (
              <div className="border-t border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300">{submitError}</div>
            )}
            <div className="p-4 border-t border-slate-700 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 sm:p-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!form.title.trim() || submitting}
                className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 sm:w-auto"
              >
                {submitting
                  ? draftFiles.length > 0 && !editingTask
                    ? 'Téléversement…'
                    : 'Enregistrement…'
                  : editingTask
                    ? 'Enregistrer'
                    : draftFiles.length > 0
                      ? `Créer (+${draftFiles.length})`
                      : 'Créer la tâche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
