'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, MessageCircle, Trash2, Calendar as CalendarIcon,
} from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import {
  COLORS, TASK_STATUSES, TASK_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, PRIVILEGED_ROLES,
} from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface MemberOpt { id: string; displayName: string }
interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  deadline?: string | null;
  projectTag?: string | null;
  assignedTo: { id: string; displayName: string; avatar?: string | null };
  assignedBy: { id: string; displayName: string };
  _count: { comments: number };
}
interface Comment { id: string; content: string; createdAt: string; author: { id: string; displayName: string } }

const CREATE_ROLES = ['SUPER_ADMIN', 'COO', 'AGENT_MANAGER'];

export default function TeamTasksPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;
  const canCreate = teamMember ? CREATE_ROLES.includes(teamMember.role) : false;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberOpt[]>([]);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', priority: 'NORMAL', deadline: '', projectTag: '' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterAssignee) params.set('assignedTo', filterAssignee);
    if (filterPriority) params.set('priority', filterPriority);
    try {
      const list = await teamFetch<Task[]>(`/team/tasks?${params.toString()}`);
      setTasks(list);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [filterAssignee, filterPriority, showToast]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => {
    teamFetch<MemberOpt[]>('/team/members').then(setMembers).catch(() => {});
  }, []);

  const canChangeStatus = (task: Task) => isPrivileged || task.assignedTo.id === teamMember?.id;

  const changeStatus = async (task: Task, status: string) => {
    try {
      await teamFetch(`/team/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const createTask = async () => {
    if (!form.title.trim() || !form.assignedToId) return;
    try {
      await teamFetch('/team/tasks', {
        method: 'POST',
        body: JSON.stringify({ ...form, deadline: form.deadline || undefined }),
      });
      setCreateOpen(false);
      setForm({ title: '', description: '', assignedToId: '', priority: 'NORMAL', deadline: '', projectTag: '' });
      showToast('Tâche créée.');
      loadTasks();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await teamFetch(`/team/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedTask(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const openTask = async (task: Task) => {
    setSelectedTask(task);
    try {
      const list = await teamFetch<Comment[]>(`/team/tasks/${task.id}/comments`);
      setComments(list);
    } catch {}
  };

  const addComment = async () => {
    if (!selectedTask || !commentInput.trim()) return;
    try {
      const c = await teamFetch<Comment>(`/team/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      setComments((prev) => [...prev, c]);
      setCommentInput('');
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? { ...t, _count: { comments: t._count.comments + 1 } } : t)));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const isOverdue = (deadline?: string | null) => deadline && new Date(deadline) < new Date();

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black italic" style={{ color: COLORS.textPrimary }}>Tâches</h1>
        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            <Plus size={14} /> Nouvelle tâche
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: COLORS.card, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}
        >
          <option value="">Tous les membres</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: COLORS.card, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}
        >
          <option value="">Toutes priorités</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[11px] font-bold uppercase" style={{ color: COLORS.textSecondary }}>{TASK_STATUS_LABELS[status]}</h3>
              <span className="text-[10px]" style={{ color: COLORS.textMuted }}>{tasks.filter((t) => t.status === status).length}</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {tasks.filter((t) => t.status === status).map((task) => (
                <div
                  key={task.id}
                  onClick={() => openTask(task)}
                  className="rounded-xl p-3 cursor-pointer"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold flex-1" style={{ color: COLORS.textPrimary }}>{task.title}</p>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority] }}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  {task.projectTag && (
                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: COLORS.textSecondary }}>
                      {task.projectTag}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: COLORS.accent, color: '#fff' }}>
                        {task.assignedTo.displayName.charAt(0).toUpperCase()}
                      </div>
                      {task.deadline && (
                        <span className="flex items-center gap-0.5 text-[9px]" style={{ color: isOverdue(task.deadline) ? COLORS.error : COLORS.textMuted }}>
                          <CalendarIcon size={9} />
                          {new Date(task.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {task._count.comments > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px]" style={{ color: COLORS.textMuted }}>
                        <MessageCircle size={10} /> {task._count.comments}
                      </span>
                    )}
                  </div>
                  {canChangeStatus(task) && (
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changeStatus(task, e.target.value)}
                      className="mt-2.5 w-full px-2 py-1.5 rounded-lg text-[10px] outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', color: COLORS.textPrimary }}
                    >
                      {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle tâche">
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Titre"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={form.assignedToId}
            onChange={(e) => setForm((s) => ({ ...s, assignedToId: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="">Assigner à...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.priority}
              onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
            />
          </div>
          <input
            value={form.projectTag}
            onChange={(e) => setForm((s) => ({ ...s, projectTag: e.target.value }))}
            placeholder="Tag projet (optionnel)"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <button onClick={createTask} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Créer la tâche
          </button>
        </div>
      </TeamModal>

      <TeamModal open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || ''} maxWidth={520}>
        {selectedTask && (
          <div className="space-y-4">
            {selectedTask.description && <p className="text-sm" style={{ color: COLORS.textSecondary }}>{selectedTask.description}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${PRIORITY_COLORS[selectedTask.priority]}22`, color: PRIORITY_COLORS[selectedTask.priority] }}>
                {PRIORITY_LABELS[selectedTask.priority]}
              </span>
              <span className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: COLORS.textSecondary }}>
                Assigné à {selectedTask.assignedTo.displayName}
              </span>
              {isPrivileged && (
                <button onClick={() => deleteTask(selectedTask.id)} className="ml-auto p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <Trash2 size={13} color={COLORS.error} />
                </button>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase mb-2" style={{ color: COLORS.textSecondary }}>Commentaires</p>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                {comments.map((c) => (
                  <div key={c.id} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>{c.author.displayName}</span>
                      <span className="text-[9px]" style={{ color: COLORS.textMuted }}>{new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
                />
                <button onClick={addComment} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: COLORS.accent, color: '#fff' }}>OK</button>
              </div>
            </div>
          </div>
        )}
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}
