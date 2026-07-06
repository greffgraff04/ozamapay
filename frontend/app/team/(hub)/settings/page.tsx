'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Hash, Lock, Users } from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, ROLE_LABELS, ALL_TEAM_ROLES, TeamRole, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface Member {
  id: string;
  displayName: string;
  role: TeamRole;
  isActive: boolean;
  createdAt: string;
  user?: { email: string };
}
interface Channel { id: string; name: string; type: string; _count: { messages: number } }

const TABS = ['MEMBERS', 'CHANNELS', 'GENERAL'] as const;

export default function TeamSettingsPage() {
  const { teamMember, loading } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const router = useRouter();

  const [tab, setTab] = useState<(typeof TABS)[number]>('MEMBERS');
  const [members, setMembers] = useState<Member[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', displayName: '', role: 'SUPPORT' as TeamRole });
  const [channelOpen, setChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', type: 'PUBLIC' });

  const isSuperAdmin = teamMember?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!loading && teamMember && !PRIVILEGED_ROLES.includes(teamMember.role)) {
      router.replace('/team');
    }
  }, [loading, teamMember, router]);

  const loadMembers = useCallback(async () => {
    try { setMembers(await teamFetch<Member[]>('/team/members')); } catch (e: any) { showToast(e.message, 'error'); }
  }, [showToast]);

  const loadChannels = useCallback(async () => {
    try { setChannels(await teamFetch<Channel[]>('/team/channels')); } catch (e: any) { showToast(e.message, 'error'); }
  }, [showToast]);

  useEffect(() => { loadMembers(); loadChannels(); }, [loadMembers, loadChannels]);

  const changeRole = async (id: string, role: TeamRole) => {
    try {
      await teamFetch(`/team/members/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
      showToast('Rôle mis à jour.');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const toggleActive = async (m: Member) => {
    try {
      await teamFetch(`/team/members/${m.id}/deactivate`, { method: 'PATCH', body: JSON.stringify({ isActive: !m.isActive }) });
      setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const sendInvite = async () => {
    if (!invite.email.trim() || !invite.displayName.trim()) return;
    try {
      await teamFetch('/team/members/invite', { method: 'POST', body: JSON.stringify(invite) });
      setInviteOpen(false);
      setInvite({ email: '', displayName: '', role: 'SUPPORT' });
      showToast('Invitation envoyée.');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;
    try {
      await teamFetch('/team/channels', { method: 'POST', body: JSON.stringify(newChannel) });
      setChannelOpen(false);
      setNewChannel({ name: '', description: '', type: 'PUBLIC' });
      showToast('Canal créé.');
      loadChannels();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const deleteChannel = async (id: string) => {
    try {
      await teamFetch(`/team/channels/${id}`, { method: 'DELETE' });
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading || !teamMember || !PRIVILEGED_ROLES.includes(teamMember.role)) return null;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-black italic mb-5" style={{ color: COLORS.textPrimary }}>Paramètres</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase"
            style={{
              background: tab === t ? COLORS.accent : COLORS.card,
              color: tab === t ? '#fff' : COLORS.textSecondary,
              border: `1px solid ${tab === t ? COLORS.accent : COLORS.border}`,
            }}
          >
            {t === 'MEMBERS' ? 'Membres' : t === 'CHANNELS' ? 'Canaux' : 'Général'}
          </button>
        ))}
      </div>

      {tab === 'MEMBERS' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
              <UserPlus size={14} /> Inviter un membre
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: COLORS.accent, color: '#fff' }}>
                  {m.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: COLORS.textPrimary }}>{m.displayName}</p>
                  <p className="text-[10px] truncate" style={{ color: COLORS.textSecondary }}>{m.user?.email}</p>
                </div>
                {isSuperAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as TeamRole)}
                    className="px-2 py-1.5 rounded-lg text-[10px] outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', color: COLORS.textPrimary }}
                  >
                    {ALL_TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: COLORS.textSecondary }}>{ROLE_LABELS[m.role]}</span>
                )}
                <button
                  onClick={() => toggleActive(m)}
                  className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                  style={{ background: m.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: m.isActive ? COLORS.success : COLORS.error }}
                >
                  {m.isActive ? 'Actif' : 'Désactivé'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'CHANNELS' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setChannelOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
              <Hash size={14} /> Nouveau canal
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
            {channels.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
                {c.type === 'PUBLIC' ? <Hash size={14} color={COLORS.textSecondary} /> : c.type === 'DIRECT' ? <Users size={14} color={COLORS.textSecondary} /> : <Lock size={14} color={COLORS.textSecondary} />}
                <span className="text-xs font-semibold flex-1" style={{ color: COLORS.textPrimary }}>{c.name}</span>
                <span className="text-[10px]" style={{ color: COLORS.textMuted }}>{c._count.messages} messages</span>
                <button onClick={() => deleteChannel(c.id)}><Trash2 size={13} color={COLORS.error} /></button>
              </div>
            ))}
            {channels.length === 0 && <p className="text-center text-xs py-8" style={{ color: COLORS.textMuted }}>Aucun canal</p>}
          </div>
        </div>
      )}

      {tab === 'GENERAL' && (
        <div className="rounded-2xl p-6 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Paramètres généraux de l'équipe — à venir.</p>
        </div>
      )}

      <TeamModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un membre">
        <div className="space-y-3">
          <input
            value={invite.email}
            onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
            placeholder="Email"
            type="email"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <input
            value={invite.displayName}
            onChange={(e) => setInvite((s) => ({ ...s, displayName: e.target.value }))}
            placeholder="Nom affiché"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={invite.role}
            onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value as TeamRole }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            {ALL_TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button onClick={sendInvite} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Envoyer l'invitation
          </button>
        </div>
      </TeamModal>

      <TeamModal open={channelOpen} onClose={() => setChannelOpen(false)} title="Nouveau canal">
        <div className="space-y-3">
          <input
            value={newChannel.name}
            onChange={(e) => setNewChannel((s) => ({ ...s, name: e.target.value }))}
            placeholder="Nom du canal"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={newChannel.type}
            onChange={(e) => setNewChannel((s) => ({ ...s, type: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Privé</option>
            <option value="DIRECT">Direct</option>
          </select>
          <button onClick={createChannel} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Créer
          </button>
        </div>
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}
