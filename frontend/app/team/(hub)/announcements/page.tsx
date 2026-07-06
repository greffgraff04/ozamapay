'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Megaphone } from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, ANNOUNCEMENT_PRIORITY_COLORS, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
  author: { id: string; displayName: string };
}

export default function TeamAnnouncementsPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'NORMAL' });

  const load = useCallback(async () => {
    try {
      setAnnouncements(await teamFetch<Announcement[]>('/team/announcements'));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      await teamFetch('/team/announcements', { method: 'POST', body: JSON.stringify(form) });
      setCreateOpen(false);
      setForm({ title: '', content: '', priority: 'NORMAL' });
      showToast('Annonce publiée.');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const remove = async (id: string) => {
    try {
      await teamFetch(`/team/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black italic" style={{ color: COLORS.textPrimary }}>Annonces</h1>
        {isPrivileged && (
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            <Plus size={14} /> Nouvelle annonce
          </button>
        )}
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${a.priority === 'URGENT' ? COLORS.error : COLORS.border}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone size={14} color={ANNOUNCEMENT_PRIORITY_COLORS[a.priority]} className="shrink-0" />
                <p className="text-sm font-bold truncate" style={{ color: COLORS.textPrimary }}>{a.title}</p>
              </div>
              {isPrivileged && (
                <button onClick={() => remove(a.id)} className="shrink-0"><Trash2 size={13} color={COLORS.error} /></button>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.textSecondary }}>{a.content}</p>
            <p className="text-[10px] mt-3" style={{ color: COLORS.textMuted }}>
              {a.author.displayName} · {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-center text-xs py-10" style={{ color: COLORS.textMuted }}>Aucune annonce</p>}
      </div>

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle annonce">
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Titre"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
            placeholder="Contenu"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={form.priority}
            onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </select>
          <button onClick={create} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Publier
          </button>
        </div>
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}
