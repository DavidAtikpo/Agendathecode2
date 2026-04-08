'use client';

import { useState, useMemo, type ComponentType } from 'react';
import { Task, User, TaskStatus, TaskPriority } from '../types';
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
}

const COLUMNS: {
  id: TaskStatus;
  label: string;
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
    id: 'doing',
    label: 'En cours',
    Icon: IconBolt,
    color: 'text-amber-300',
    dimColor: 'text-amber-400/60',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
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
  {
    id: 'review',
    label: 'Révision',
    Icon: IconSearch,
    color: 'text-purple-300',
    dimColor: 'text-purple-400/60',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string; dot: string }> = {
  low: { label: 'Basse', cls: 'text-slate-400 bg-slate-700/80', dot: 'bg-slate-400' },
  medium: { label: 'Moyenne', cls: 'text-amber-400 bg-amber-500/20', dot: 'bg-amber-400' },
  high: { label: 'Haute', cls: 'text-red-400 bg-red-500/20', dot: 'bg-red-400' },
};

interface FormData {
  title: string;
  description: string;
  assignedTo: string;
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

export default function TaskBoard({ tasks, users, currentUser, onAdd, onUpdate, onDelete, onMove }: TaskBoardProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    assignedTo: currentUser.id,
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [], review: [] };
    tasks.forEach(t => {
      const s = t.status;
      if (s === 'todo' || s === 'doing' || s === 'done' || s === 'review') map[s].push(t);
      else map.todo.push(t);
    });
    return map;
  }, [tasks]);

  const getUserById = (id: string | null | undefined) => users.find(u => u.id === id);

  const openAdd = (status: TaskStatus = defaultStatus) => {
    setSubmitError(null);
    setDefaultStatus(status);
    setEditingTask(null);
    setForm({
      title: '',
      description: '',
      assignedTo: currentUser.id,
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
      assignedTo: task.assignedTo || '',
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
          assignedTo: form.assignedTo || null,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || undefined,
        });
      } else {
        await onAdd({
          title: form.title,
          description: form.description,
          assignedTo: form.assignedTo || null,
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-slate-700 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white sm:text-xl">Tableau des tâches</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} · Kanban collaboratif
          </p>
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-3 md:flex md:ml-4">
          {COLUMNS.map(col => (
            <div key={col.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${col.bg} border ${col.border}`}>
              <col.Icon className={`h-4 w-4 ${col.color}`} />
              <span className={`text-xs font-semibold ${col.color}`}>{tasksByStatus[col.id].length}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openAdd('todo')}
          className="flex w-full shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 sm:ml-auto sm:w-auto sm:py-2"
        >
          <IconPlus className="h-4 w-4" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overscroll-x-contain p-4 sm:p-6">
        <div className="flex h-full min-w-max gap-4 pb-2 sm:gap-5">
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.id];
            return (
              <div key={col.id} className="flex w-[min(17.5rem,calc(100vw-3rem))] shrink-0 flex-col gap-3 sm:w-72">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${col.bg} border ${col.border}`}>
                  <div className="flex items-center gap-2">
                    <col.Icon className={`h-5 w-5 shrink-0 ${col.color}`} />
                    <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-900/40 ${col.color}`}>
                      {colTasks.length}
                    </span>
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
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-slate-700/60 rounded-xl p-5 text-center">
                      <p className="text-slate-600 text-xs">Aucune tâche</p>
                    </div>
                  )}
                  {colTasks.map(task => {
                    const assignedUser = getUserById(task.assignedTo);
                    const prio = PRIORITY_CONFIG[task.priority];
                    const overdue = isOverdue(task.dueDate, task.status);
                    const isSelected = selectedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(isSelected ? null : task)}
                        className={`bg-slate-800 border rounded-xl p-3.5 cursor-pointer transition-all ${
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

                        <div className="flex items-center gap-2 pl-4">
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
                            {assignedUser && (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                                style={{ backgroundColor: assignedUser.color }}
                                title={assignedUser.name}
                              >
                                {assignedUser.initials}
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
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[selectedTask.priority].dot}`}
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

            <div className="p-5 space-y-4">
              {selectedTask.description && (
                <p className="text-slate-400 text-sm leading-relaxed">{selectedTask.description}</p>
              )}

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignée à</p>
                  {getUserById(selectedTask.assignedTo) ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: getUserById(selectedTask.assignedTo)!.color }}
                      >
                        {getUserById(selectedTask.assignedTo)!.initials}
                      </div>
                      <span className="text-sm text-slate-300">{getUserById(selectedTask.assignedTo)!.name}</span>
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

            <div className="flex items-center justify-between border-t border-slate-700 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
              <button
                onClick={() => { onDelete(selectedTask.id); setSelectedTask(null); }}
                className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <IconTrash className="h-4 w-4" />
                Supprimer
              </button>
              <button
                onClick={() => openEdit(selectedTask)}
                className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
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

            <div className="p-5 space-y-4">
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
                  <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
                    Vous et les personnes ajoutées par email (barre latérale). Sinon choisissez « Non assignée ».
                  </p>
                  <select
                    value={form.assignedTo}
                    onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Non assignée</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
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
            <div className="p-5 border-t border-slate-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!form.title.trim() || submitting}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
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
