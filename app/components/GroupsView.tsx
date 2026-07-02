'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Task, TaskStatus, User } from '../types';
import TaskBoard, { TaskAssigneeFilters, type AssigneeFilter } from './TaskBoard';
import { IconPlus } from './icons';
import styles from './Sidebar.module.css';

interface GroupsViewProps {
  groups: Group[];
  tasks: Task[];
  users: User[];
  contacts: User[];
  currentUser: User;
  isGuest: boolean;
  compactLayout?: boolean;
  chatCredits?: number;
  onBuyCredits?: () => void;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<Group>;
  onUpdateGroupName: (groupId: string, name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onAddGroupMember: (groupId: string, userId: string) => Promise<void>;
  onRemoveGroupMember: (groupId: string, userId: string) => Promise<void>;
  onUploadGroupLogo: (groupId: string, file: File) => Promise<Group>;
  onAdd: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Task | void | Promise<Task | void>;
  onUpdate: (id: string, data: Partial<Task>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onMove: (id: string, status: TaskStatus) => void | Promise<void>;
  onOpenCollaborators?: () => void;
  collaboratorTeamSize?: number;
}

type GroupFilter = 'all' | 'owned' | 'member';

function CreditWidget({
  credits,
  onBuy,
}: {
  credits: number;
  onBuy: () => void;
}) {
  const low = credits <= 0;
  const warn = credits > 0 && credits < 100;
  return (
    <button
      type="button"
      onClick={onBuy}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all hover:opacity-80 touch-manipulation ${
        low
          ? 'border-red-500/40 bg-red-500/10 text-red-400'
          : warn
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
      }`}
      title="Crédits IA · Cliquez pour en acheter"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          low ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-violet-400'
        }`}
      />
      {credits.toLocaleString('fr-FR')} crédits
      <span className="opacity-60">+</span>
    </button>
  );
}

export default function GroupsView({
  groups,
  tasks,
  users,
  contacts,
  currentUser,
  isGuest,
  compactLayout,
  chatCredits = 0,
  onBuyCredits,
  onCreateGroup,
  onUpdateGroupName,
  onDeleteGroup,
  onAddGroupMember,
  onRemoveGroupMember,
  onUploadGroupLogo,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  onOpenCollaborators,
  collaboratorTeamSize = 0,
}: GroupsViewProps) {
  const [listFilter, setListFilter] = useState<GroupFilter>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const boardApiRef = useRef<{ openAdd: (status?: TaskStatus) => void } | null>(null);

  const handleBoardReady = useCallback((api: { openAdd: (status?: TaskStatus) => void }) => {
    boardApiRef.current = api;
  }, []);

  const canCreateGroups = !isGuest && currentUser.plan === 'pro';
  const pad = compactLayout ? 'px-3 py-2' : 'px-4 py-2.5 md:px-5';

  const filteredGroups = useMemo(() => {
    if (listFilter === 'owned') return groups.filter(g => g.createdBy === currentUser.id);
    if (listFilter === 'member') return groups.filter(g => g.createdBy !== currentUser.id);
    return groups;
  }, [groups, listFilter, currentUser.id]);

  const selectedGroup = useMemo(
    () => filteredGroups.find(g => g.id === selectedGroupId) ?? null,
    [filteredGroups, selectedGroupId],
  );

  const groupTasks = useMemo(
    () => (selectedGroup ? tasks.filter(t => t.groupId === selectedGroup.id) : []),
    [tasks, selectedGroup],
  );

  const assigneePickerUsers = useMemo(() => {
    if (!selectedGroup) return [];
    const seen = new Set<string>();
    const out: User[] = [];
    for (const m of selectedGroup.members) {
      if (m.id !== currentUser.id && !seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [selectedGroup, currentUser.id]);

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    if (!selectedGroupId || !filteredGroups.some(g => g.id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0].id);
    }
  }, [filteredGroups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroup) setRenameDraft(selectedGroup.name);
  }, [selectedGroup?.id, selectedGroup?.name]);

  useEffect(() => {
    setAssigneeFilter('all');
  }, [selectedGroupId]);

  const counts = useMemo(
    () => ({
      all: groups.length,
      owned: groups.filter(g => g.createdBy === currentUser.id).length,
      member: groups.filter(g => g.createdBy !== currentUser.id).length,
    }),
    [groups, currentUser.id],
  );

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setError(null);
    setBusy(true);
    try {
      const g = await onCreateGroup(name.trim(), Array.from(selectedMembers));
      setName('');
      setSelectedMembers(new Set());
      setShowCreate(false);
      setSelectedGroupId(g.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const avatarStyles = [
    ...contacts,
    ...groups.flatMap(g => g.members),
  ]
    .map(u => `.collab-avatar-${u.id}{--avatar-color:${u.color};}`)
    .join('\n');

  const isOwner = selectedGroup?.createdBy === currentUser.id;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1419]">
      <style>{avatarStyles}</style>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !selectedGroup) return;
          setBusy(true);
          try {
            await onUploadGroupLogo(selectedGroup.id, file);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload impossible');
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* Header unifié : groupes + filtres + crédits + actions */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/95">
        <div className={`flex flex-wrap items-center gap-2 ${pad}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!isGuest ? (
              <>
                {(
                  [
                    ['all', 'Tous'],
                    ['owned', 'Créés par moi'],
                    ['member', 'Membre'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setListFilter(key)}
                    className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                      listFilter === key ? 'bg-violet-500/25 text-violet-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {label} ({counts[key]})
                  </button>
                ))}
                <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-600" aria-hidden />
              </>
            ) : null}

            {filteredGroups.length > 0 ? (
              <div className="flex gap-1.5" role="tablist" aria-label="Groupes">
                {filteredGroups.map(g => {
                  const active = g.id === selectedGroupId;
                  const taskCount = tasks.filter(t => t.groupId === g.id).length;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setShowSettings(false);
                      }}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation ${
                        active
                          ? 'border-violet-400 bg-violet-500/25 text-violet-100 shadow-sm'
                          : 'border-slate-600 bg-slate-800/90 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {g.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-[10px] font-bold">
                          {g.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="max-w-[8rem] truncate">{g.name}</span>
                      {taskCount > 0 ? (
                        <span className="rounded-full bg-slate-900/50 px-1.5 py-0.5 text-[10px] tabular-nums opacity-80">
                          {taskCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-slate-500">Groupes</span>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {selectedGroup ? (
              <button
                type="button"
                onClick={() => setShowSettings(v => !v)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium touch-manipulation ${
                  showSettings
                    ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Paramètres
              </button>
            ) : null}
            {canCreateGroups ? (
              <button
                type="button"
                onClick={() => setShowCreate(v => !v)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 touch-manipulation"
              >
                {showCreate ? 'Fermer' : 'Nouveau groupe'}
              </button>
            ) : null}
            {!isGuest && onBuyCredits ? (
              <span className="hidden md:inline-flex">
                <CreditWidget credits={chatCredits} onBuy={onBuyCredits} />
              </span>
            ) : null}
            {onOpenCollaborators ? (
              <button
                type="button"
                onClick={onOpenCollaborators}
                className="hidden shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 md:inline-flex"
              >
                <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span className="hidden lg:inline">Collaborateurs</span>
                {collaboratorTeamSize > 1 ? (
                  <span className="rounded-full bg-indigo-500/25 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200">
                    {collaboratorTeamSize}
                  </span>
                ) : null}
              </button>
            ) : null}
            {selectedGroup ? (
              <button
                type="button"
                onClick={() => boardApiRef.current?.openAdd('todo')}
                className="inline-flex shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-400"
              >
                <IconPlus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Nouvelle tâche</span>
                <span className="sm:hidden">Tâche</span>
              </button>
            ) : null}
          </div>
        </div>

        {selectedGroup ? (
          <div className={`flex items-center gap-2 border-t border-slate-800/80 ${pad}`}>
            <div className="min-w-0 shrink-0">
              <p className="truncate text-sm font-semibold text-white">{selectedGroup.name}</p>
              <p className="text-[10px] text-slate-500 tabular-nums">
                {groupTasks.length} tâche{groupTasks.length !== 1 ? 's' : ''}
                {assigneeFilter !== 'all' ? (
                  <span className="text-indigo-400/90"> · filtré</span>
                ) : null}
              </p>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <TaskAssigneeFilters
                currentUser={currentUser}
                assigneeFilter={assigneeFilter}
                onAssigneeFilterChange={setAssigneeFilter}
                users={assigneePickerUsers}
              />
            </div>
          </div>
        ) : null}

        {showCreate && canCreateGroups ? (
          <form
            onSubmit={handleCreate}
            className={`space-y-2 border-t border-slate-800/80 bg-slate-800/30 ${pad}`}
          >
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom du groupe"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200"
            />
            {contacts.length > 0 ? (
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {contacts.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selectedMembers.has(u.id)
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={busy || name.trim().length < 2}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Créer
            </button>
          </form>
        ) : null}

        {showSettings && selectedGroup ? (
          <div className={`space-y-3 border-t border-slate-800/80 bg-slate-800/40 ${pad}`}>
            {isOwner ? (
              <>
                <div className="flex gap-2">
                  <input
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await onUpdateGroupName(selectedGroup.id, renameDraft.trim());
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'Erreur');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs text-white"
                  >
                    Renommer
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="text-indigo-400">
                    Changer le logo
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Supprimer ce groupe ?')) return;
                      await onDeleteGroup(selectedGroup.id);
                      setShowSettings(false);
                    }}
                    className="text-red-400"
                  >
                    Supprimer
                  </button>
                </div>
              </>
            ) : null}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Membres</p>
              <ul className="flex flex-wrap gap-2">
                {selectedGroup.members.map(m => (
                  <li key={m.id} className="flex items-center gap-1.5 rounded-lg bg-slate-900/50 px-2 py-1">
                    <div className={`${styles.userAvatar} collab-avatar-${m.id}`}>{m.initials}</div>
                    <span className="text-xs text-slate-300">{m.name}</span>
                    {isOwner && m.id !== currentUser.id ? (
                      <button
                        type="button"
                        onClick={() => void onRemoveGroupMember(selectedGroup.id, m.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {isOwner && contacts.some(c => !selectedGroup.members.some(m => m.id === c.id)) ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {contacts
                    .filter(c => !selectedGroup.members.some(m => m.id === c.id))
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => void onAddGroupMember(selectedGroup.id, c.id)}
                        className="rounded-full bg-slate-600 px-2 py-0.5 text-xs text-slate-200"
                      >
                        + {c.name}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className={`text-xs text-red-400 ${pad} pb-2`}>{error}</p> : null}
      </header>

      <div className="min-h-0 flex-1">
        {isGuest ? (
          <p className={`text-sm text-slate-400 ${pad} pt-3`}>Connectez-vous pour accéder aux groupes.</p>
        ) : filteredGroups.length === 0 ? (
          <p className={`text-sm text-slate-400 ${pad} pt-3`}>
            {canCreateGroups
              ? 'Aucun groupe — créez-en un pour commencer.'
              : 'Aucun groupe — attendez une invitation Pro.'}
          </p>
        ) : selectedGroup ? (
          <TaskBoard
            tasks={tasks}
            users={users}
            groups={groups}
            currentUser={currentUser}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMove={onMove}
            compactLayout={compactLayout}
            forcedGroupFilter={selectedGroup.id}
            groupEmbed
            hideToolbar
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            onBoardReady={handleBoardReady}
          />
        ) : null}
      </div>
    </div>
  );
}
