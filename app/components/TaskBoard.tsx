'use client';

import { useState, useMemo, useRef, type ComponentType } from 'react';
import { Task, TaskAsset, User, TaskStatus, TaskPriority } from '../types';
import {
  IconAlertTriangle,
  IconBolt,
  IconCalendar,
  IconCheckCircle,
  IconClipboardList,
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
  onAdd: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void | Promise<void>;
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

type AssigneeFilter = 'all' | 'unassigned' | string;

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

function AssetList({
  title,
  emptyLabel,
  assets,
}: {
  title: string;
  emptyLabel: string;
  assets: TaskAsset[];
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
            return (
              <div key={asset.id} className="rounded-lg border border-slate-700 bg-slate-900/40 px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{asset.originalName}</p>
                    <p className="text-[11px] text-slate-500">
                      {isVideo ? 'Vidéo' : 'Fichier'} · {formatBytes(asset.bytes)} · {formatDate(asset.createdAt)}
                    </p>
                  </div>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
                  >
                    {isVideo ? 'Regarder' : 'Télécharger'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const [assetBusy, setAssetBusy] = useState<'input' | 'output' | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const inputVideoRef = useRef<HTMLInputElement | null>(null);
  const outputFileRef = useRef<HTMLInputElement | null>(null);
  const editInputFileRef = useRef<HTMLInputElement | null>(null);
  const editInputVideoRef = useRef<HTMLInputElement | null>(null);
  const editOutputFileRef = useRef<HTMLInputElement | null>(null);

  const filteredTasks = useMemo(() => {
    if (assigneeFilter === 'all') return tasks;
    if (assigneeFilter === 'unassigned') {
      return tasks.filter(t => !Array.isArray(t.assignedTo) || t.assignedTo.length === 0);
    }
    return tasks.filter(t => t.assignedTo.includes(assigneeFilter));
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
    if (!Array.isArray(ids)) return [];
    return ids.map(id => getUserById(id)).filter((u): u is User => Boolean(u));
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
        await onAdd({
          title: form.title,
          description: form.description,
          assignedTo: form.assignedTo,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || undefined,
        });
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
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await fetch(`/api/tasks/${taskId}/assets`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Upload impossible');
      }
      const updated = payload as Task;
      setSelectedTask(prev => (prev && prev.id === updated.id ? updated : prev));
      setEditingTask(prev => (prev && prev.id === updated.id ? updated : prev));
      await onUpdate(updated.id, {});
    } catch (e: unknown) {
      setAssetError(e instanceof Error ? e.message : 'Erreur upload');
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
          onClick={() => openAdd('todo')}
          className="flex shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <IconPlus className="h-4 w-4 shrink-0" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {/* Kanban */}
      <div className={`flex-1 overflow-x-auto overscroll-x-contain ${padMain}`}>
        <div className="flex h-full min-w-max gap-3 pb-1 sm:gap-5 sm:pb-2">
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.id];
            return (
              <div key={col.id} className="flex w-[min(17.5rem,calc(100vw-2rem))] shrink-0 flex-col gap-2.5 sm:w-72 sm:gap-3">
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
                    onClick={() => openAdd(col.id)}
                    className={`${col.dimColor} hover:${col.color} transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5`}
                    title={`Ajouter dans ${col.label}`}
                  >
                    +
                  </button>
                </div>

                {/* Task Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto sm:space-y-3">
                  {colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-slate-700/60 rounded-xl p-5 text-center">
                      <p className="text-slate-600 text-xs">Aucune tâche</p>
                    </div>
                  )}
                  {colTasks.map(task => {
                    const assignedUsers = getUsersByIds(task.assignedTo);
                    const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
                    const overdue = isOverdue(task.dueDate, task.status);
                    const isSelected = selectedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(isSelected ? null : task)}
                        className={`bg-slate-800 border rounded-xl p-3 cursor-pointer transition-all sm:p-3.5 ${
                          isSelected
                            ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600 hover:shadow-md'
                        }`}
                      >
                        {/* Priority dot */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${prio.dot}`} />
                          <p className="text-sm font-medium text-slate-100 leading-snug flex-1">{task.title}</p>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2 pl-4">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pl-4">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${prio.cls}`}>
                            {prio.label}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {task.dueDate && (
                              <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                                {overdue ? (
                                  <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <IconCalendar className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {assignedUsers.length > 0 && (
                              <div className="flex items-center -space-x-1.5">
                                {assignedUsers.slice(0, 2).map(user => (
                                  <div
                                    key={user.id}
                                    className="w-6 h-6 rounded-full ring-2 ring-slate-800 flex items-center justify-center text-white text-[10px] font-semibold shadow-sm"
                                    style={{ backgroundColor: user.color }}
                                    title={user.name}
                                  >
                                    {user.initials}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                {assetBusy && <p className="text-[11px] text-indigo-300">Upload en cours…</p>}
                {assetError && <p className="text-[11px] text-red-300">{assetError}</p>}

                <AssetList
                  title="Brief / pièces de référence"
                  emptyLabel="Aucun fichier de référence"
                  assets={inputAssets}
                />
                <AssetList
                  title="Travail livré (tâche terminée)"
                  emptyLabel="Aucun livrable pour le moment"
                  assets={outputAssets}
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowModal(false)}
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
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700"
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
                  <p className="text-xs text-slate-500">
                    Créez d’abord la tâche, puis cliquez dessus pour ajouter vidéo/pièce jointe/livrable.
                  </p>
                )}
                {assetBusy && <p className="text-[11px] text-indigo-300">Upload en cours…</p>}
                {assetError && <p className="text-[11px] text-red-300">{assetError}</p>}
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
                {submitting ? 'Enregistrement…' : editingTask ? 'Enregistrer' : 'Créer la tâche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
