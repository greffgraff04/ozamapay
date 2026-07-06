'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Hash, Lock, Users, Plus, Send, Paperclip, Trash2, Reply, X, Loader2,
} from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface Channel {
  id: string;
  name: string;
  description?: string | null;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT';
  members: { id: string; displayName: string }[];
  _count: { messages: number };
}

interface Message {
  id: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  senderId: string;
  replyToId?: string | null;
  replyTo?: { id: string; content: string; senderId: string } | null;
  sender: { id: string; displayName: string; avatar?: string | null; role: string };
}

interface MemberOpt { id: string; displayName: string; role: string }

export default function TeamMessagesPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<MemberOpt[]>([]);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', type: 'PUBLIC' as Channel['type'], memberIds: [] as string[] });

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadChannels = useCallback(async () => {
    try {
      const list = await teamFetch<Channel[]>('/team/channels');
      setChannels(list);
      if (!activeChannelId && list.length > 0) setActiveChannelId(list[0].id);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [activeChannelId, showToast]);

  useEffect(() => { loadChannels(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const list = await teamFetch<Message[]>(`/team/channels/${channelId}/messages?limit=50`);
      setMessages(list);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!activeChannelId) return;
    loadMessages(activeChannelId);
    const interval = setInterval(() => loadMessages(activeChannelId), 5000);
    return () => clearInterval(interval);
  }, [activeChannelId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannelId) return;
    setSending(true);
    try {
      await teamFetch(`/team/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: input.trim(), replyToId: replyTo?.id }),
      });
      setInput('');
      setReplyTo(null);
      await loadMessages(activeChannelId);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async (file: File) => {
    if (!activeChannelId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', file.type.startsWith('image/') ? 'PHOTO' : file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT');
      const uploaded = await teamFetch<{ url: string; mimeType: string }>('/team/files/upload', { method: 'POST', body: fd });
      await teamFetch(`/team/channels/${activeChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: file.name, fileUrl: uploaded.url, fileType: uploaded.mimeType }),
      });
      await loadMessages(activeChannelId);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!activeChannelId) return;
    try {
      await teamFetch(`/team/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const openCreateModal = async () => {
    setCreateOpen(true);
    try {
      const list = await teamFetch<MemberOpt[]>('/team/members');
      setMembers(list.filter((m) => m.id !== teamMember?.id));
    } catch {}
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;
    try {
      const created = await teamFetch<Channel>('/team/channels', { method: 'POST', body: JSON.stringify(newChannel) });
      setCreateOpen(false);
      setNewChannel({ name: '', description: '', type: 'PUBLIC', memberIds: [] });
      showToast('Chanèl kreye.');
      await loadChannels();
      setActiveChannelId(created.id);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const publicChannels = channels.filter((c) => c.type === 'PUBLIC');
  const directChannels = channels.filter((c) => c.type !== 'PUBLIC');
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex h-screen lg:h-full" style={{ background: COLORS.bg }}>
      {/* Channel list */}
      <div className="w-full max-w-[280px] shrink-0 hidden md:flex flex-col" style={{ borderRight: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Messages</h2>
          {isPrivileged && (
            <button onClick={openCreateModal} className="p-1.5 rounded-lg" style={{ background: COLORS.accentMuted }}>
              <Plus size={14} color={COLORS.accent} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide" style={{ color: COLORS.textMuted }}>Canaux publics</p>
          {publicChannels.map((c) => (
            <ChannelRow key={c.id} channel={c} active={c.id === activeChannelId} onClick={() => setActiveChannelId(c.id)} icon={Hash} />
          ))}
          <p className="px-2 py-1 mt-3 text-[10px] uppercase tracking-wide" style={{ color: COLORS.textMuted }}>Messages directs</p>
          {directChannels.map((c) => (
            <ChannelRow key={c.id} channel={c} active={c.id === activeChannelId} onClick={() => setActiveChannelId(c.id)} icon={c.type === 'DIRECT' ? Users : Lock} />
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{activeChannel.name}</p>
              {activeChannel.description && <p className="text-[11px] mt-0.5" style={{ color: COLORS.textSecondary }}>{activeChannel.description}</p>}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m) => {
                const isOwn = m.senderId === teamMember?.id;
                const canDelete = isOwn || isPrivileged;
                return (
                  <div key={m.id} className="group flex gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: COLORS.accent, color: '#fff' }}>
                      {m.sender.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>{m.sender.displayName}</span>
                        <span className="text-[10px]" style={{ color: COLORS.textMuted }}>
                          {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {m.replyTo && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11px] truncate" style={{ background: 'rgba(255,255,255,0.04)', color: COLORS.textSecondary, borderLeft: `2px solid ${COLORS.accent}` }}>
                          {m.replyTo.content}
                        </div>
                      )}
                      {m.fileUrl && m.fileType?.startsWith('image/') ? (
                        <img src={m.fileUrl} alt={m.content} className="mt-1.5 rounded-lg max-w-xs max-h-56 object-cover" />
                      ) : m.fileUrl && m.fileType?.startsWith('video/') ? (
                        <video src={m.fileUrl} controls className="mt-1.5 rounded-lg max-w-xs max-h-56" />
                      ) : m.fileUrl ? (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs underline" style={{ color: COLORS.info }}>{m.content}</a>
                      ) : (
                        <p className="text-sm mt-0.5" style={{ color: COLORS.textPrimary }}>{m.content}</p>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 shrink-0 transition-opacity">
                      <button onClick={() => setReplyTo(m)} className="p-1"><Reply size={13} color={COLORS.textSecondary} /></button>
                      {canDelete && <button onClick={() => deleteMessage(m.id)} className="p-1"><Trash2 size={13} color={COLORS.error} /></button>}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {replyTo && (
              <div className="flex items-center justify-between px-4 py-2 mx-4 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <span className="text-[11px] truncate" style={{ color: COLORS.textSecondary }}>Répondre à: {replyTo.content}</span>
                <button onClick={() => setReplyTo(null)}><X size={13} color={COLORS.textSecondary} /></button>
              </div>
            )}

            <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAttach(e.target.files[0])}
              />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 shrink-0">
                {uploading ? <Loader2 size={16} className="animate-spin" color={COLORS.textSecondary} /> : <Paperclip size={16} color={COLORS.textSecondary} />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
              />
              <button onClick={sendMessage} disabled={sending || !input.trim()} className="p-2.5 rounded-xl shrink-0" style={{ background: COLORS.accent }}>
                <Send size={15} color="#fff" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs" style={{ color: COLORS.textMuted }}>Sélectionnez un canal</p>
          </div>
        )}
      </div>

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau canal">
        <div className="space-y-3">
          <input
            value={newChannel.name}
            onChange={(e) => setNewChannel((s) => ({ ...s, name: e.target.value }))}
            placeholder="Nom du canal"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <input
            value={newChannel.description}
            onChange={(e) => setNewChannel((s) => ({ ...s, description: e.target.value }))}
            placeholder="Description (optionnel)"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <select
            value={newChannel.type}
            onChange={(e) => setNewChannel((s) => ({ ...s, type: e.target.value as Channel['type'] }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Privé</option>
            <option value="DIRECT">Direct</option>
          </select>
          <div>
            <p className="text-[11px] mb-1.5" style={{ color: COLORS.textSecondary }}>Membres</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <input
                    type="checkbox"
                    checked={newChannel.memberIds.includes(m.id)}
                    onChange={(e) =>
                      setNewChannel((s) => ({
                        ...s,
                        memberIds: e.target.checked ? [...s.memberIds, m.id] : s.memberIds.filter((id) => id !== m.id),
                      }))
                    }
                  />
                  <span className="text-xs" style={{ color: COLORS.textPrimary }}>{m.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={createChannel} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Créer le canal
          </button>
        </div>
      </TeamModal>

      <TeamToast toast={toast} />
    </div>
  );
}

function ChannelRow({ channel, active, onClick, icon: Icon }: { channel: Channel; active: boolean; onClick: () => void; icon: any }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left"
      style={{ background: active ? COLORS.accentMuted : 'transparent' }}
    >
      <Icon size={13} color={active ? COLORS.accent : COLORS.textSecondary} />
      <span className="text-xs truncate flex-1" style={{ color: active ? COLORS.accent : COLORS.textPrimary }}>{channel.name}</span>
    </button>
  );
}
