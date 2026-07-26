'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Hash, Lock, Users } from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, ROLE_LABELS, ALL_TEAM_ROLES, TeamRole, PRIVILEGED_ROLES, avatarColorFor } from '../../lib/theme';
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
    if (!invite.email.trim() || !invite.displayName.trim()) {
      showToast('Antre yon email ak yon non afiche anvan ou voye envitasyon an.', 'error');
      return;
    }
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

  const tabLabel = { MEMBERS: 'Membres', CHANNELS: 'Canaux', GENERAL: 'Général' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820, animation: '0.4s ease 0s 1 normal none running fadeIn' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
              background: tab === t ? COLORS.accent : COLORS.card, color: tab === t ? '#fff' : COLORS.textSecondary,
              border: `1px solid ${tab === t ? COLORS.accent : COLORS.border}`,
            }}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === 'MEMBERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setInviteOpen(true)} className="team-btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', background: COLORS.accent, color: '#fff', border: 'none', cursor: 'pointer' }}>
              <UserPlus size={14} /> Inviter un membre
            </button>
          </div>
          {members.map((m) => {
            const color = avatarColorFor(m.displayName);
            return (
              <div key={m.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '14px 18px', boxShadow: COLORS.cardShadow }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                  {m.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{m.displayName}</p>
                  <p style={{ fontSize: 11, color: COLORS.textSecondary }}>{m.user?.email}</p>
                </div>
                {isSuperAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as TeamRole)}
                    style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none' }}
                  >
                    {ALL_TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: COLORS.textSecondary }}>{ROLE_LABELS[m.role]}</span>
                )}
                <button
                  onClick={() => toggleActive(m)}
                  style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: m.isActive ? `${COLORS.success}26` : `${COLORS.error}26`, color: m.isActive ? COLORS.success : COLORS.error }}
                >
                  {m.isActive ? 'Actif' : 'Désactivé'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'CHANNELS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setChannelOpen(true)} className="team-btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', background: COLORS.accent, color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Hash size={14} /> Nouveau canal
            </button>
          </div>
          {channels.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '14px 18px', boxShadow: COLORS.cardShadow }}>
              {c.type === 'PUBLIC' ? <Hash size={14} color={COLORS.textSecondary} /> : c.type === 'DIRECT' ? <Users size={14} color={COLORS.textSecondary} /> : <Lock size={14} color={COLORS.textSecondary} />}
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>{c._count.messages} messages</span>
              <button onClick={() => deleteChannel(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} color={COLORS.error} /></button>
            </div>
          ))}
          {channels.length === 0 && <p style={{ textAlign: 'center', fontSize: 12, padding: '32px 0', color: COLORS.textMuted }}>Aucun canal</p>}
        </div>
      )}

      {tab === 'GENERAL' && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: COLORS.cardShadow }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted }}>Paramètres généraux de l'équipe — à venir.</p>
        </div>
      )}

      <TeamModal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un membre">
        <div className="space-y-3">
          <input value={invite.email} onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} placeholder="Email" type="email" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <input value={invite.displayName} onChange={(e) => setInvite((s) => ({ ...s, displayName: e.target.value }))} placeholder="Nom affiché" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <select value={invite.role} onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value as TeamRole }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            {ALL_TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button onClick={sendInvite} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>Envoyer l'invitation</button>
        </div>
      </TeamModal>

      <TeamModal open={channelOpen} onClose={() => setChannelOpen(false)} title="Nouveau canal">
        <div className="space-y-3">
          <input value={newChannel.name} onChange={(e) => setNewChannel((s) => ({ ...s, name: e.target.value }))} placeholder="Nom du canal" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <select value={newChannel.type} onChange={(e) => setNewChannel((s) => ({ ...s, type: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Privé</option>
            <option value="DIRECT">Direct</option>
          </select>
          <button onClick={createChannel} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>Créer</button>
        </div>
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}
