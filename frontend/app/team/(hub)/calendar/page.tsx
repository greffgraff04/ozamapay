'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Trash2, X, Info } from 'lucide-react';
import { useTeamSession } from '../../lib/useTeamSession';
import { teamFetch } from '../../lib/team-api';
import { COLORS, CALENDAR_TYPE_COLORS, PRIVILEGED_ROLES } from '../../lib/theme';
import TeamModal from '../../components/TeamModal';
import TeamToast, { useTeamToast } from '../../components/TeamToast';

interface MemberOpt { id: string; displayName: string }
interface CalEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  type: string;
  isJitsiMeeting: boolean;
  meetingUrl?: string | null;
  createdBy: { id: string; displayName: string };
  attendees: { id: string; displayName: string }[];
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeamCalendarPage() {
  const { teamMember } = useTeamSession();
  const { toast, showToast } = useTeamToast();
  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;

  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [members, setMembers] = useState<MemberOpt[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startAt: '', endAt: '', type: 'MEETING', attendeeIds: [] as string[] });
  const [jitsiUrl, setJitsiUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await teamFetch<CalEvent[]>(`/team/calendar?month=${cursor.getMonth() + 1}&year=${cursor.getFullYear()}`);
      setEvents(list);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [cursor, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { teamFetch<MemberOpt[]>('/team/members').then(setMembers).catch(() => {}); }, []);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsForDay = (day: Date) => events.filter((e) => sameDay(new Date(e.startAt), day));
  const selectedEvents = eventsForDay(selectedDate);

  const openCreate = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setForm({ title: '', description: '', startAt: toDatetimeLocal(start), endAt: toDatetimeLocal(end), type: 'MEETING', attendeeIds: [] });
    setCreateOpen(true);
  };

  const createEvent = async () => {
    if (!form.title.trim() || !form.startAt || !form.endAt) return;
    try {
      await teamFetch('/team/calendar', {
        method: 'POST',
        body: JSON.stringify({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() }),
      });
      setCreateOpen(false);
      showToast('Événement créé.');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await teamFetch(`/team/calendar/${id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const joinMeeting = async (id: string) => {
    try {
      const res = await teamFetch<{ meetingUrl: string }>(`/team/calendar/${id}/join`);
      setJitsiUrl(res.meetingUrl);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black italic" style={{ color: COLORS.textPrimary }}>Calendrier</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-lg" style={{ background: COLORS.card }}>
          <ChevronLeft size={16} color={COLORS.textPrimary} />
        </button>
        <p className="text-sm font-bold capitalize" style={{ color: COLORS.textPrimary }}>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-lg" style={{ background: COLORS.card }}>
          <ChevronRight size={16} color={COLORS.textPrimary} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <p key={w} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: COLORS.textMuted }}>{w}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isSelected = sameDay(day, selectedDate);
          const isToday = sameDay(day, new Date());
          const dayEvents = eventsForDay(day);
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className="aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 gap-0.5 relative"
              style={{
                background: isSelected ? COLORS.accentMuted : COLORS.card,
                border: `1px solid ${isSelected ? COLORS.accent : isToday ? COLORS.info : COLORS.border}`,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <span className="text-[11px] font-semibold" style={{ color: isSelected ? COLORS.accent : COLORS.textPrimary }}>{day.getDate()}</span>
              <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: CALENDAR_TYPE_COLORS[e.type] }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      <div className="mt-6">
        <p className="text-xs font-bold uppercase mb-3" style={{ color: COLORS.textSecondary }}>
          {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="space-y-2">
          {selectedEvents.map((e) => {
            const canManage = isPrivileged || e.createdBy.id === teamMember?.id;
            return (
              <div key={e.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CALENDAR_TYPE_COLORS[e.type] }} />
                    <p className="text-sm font-semibold truncate" style={{ color: COLORS.textPrimary }}>{e.title}</p>
                  </div>
                  {canManage && (
                    <button onClick={() => deleteEvent(e.id)} className="shrink-0"><Trash2 size={13} color={COLORS.error} /></button>
                  )}
                </div>
                <p className="text-[11px] mt-1" style={{ color: COLORS.textSecondary }}>
                  {new Date(e.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(e.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {e.description && <p className="text-xs mt-2" style={{ color: COLORS.textSecondary }}>{e.description}</p>}
                {e.isJitsiMeeting && (
                  <button
                    onClick={() => joinMeeting(e.id)}
                    className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase"
                    style={{ background: CALENDAR_TYPE_COLORS.MEETING, color: '#fff' }}
                  >
                    <Video size={13} /> Rejoindre la réunion
                  </button>
                )}
              </div>
            );
          })}
          {selectedEvents.length === 0 && <p className="text-xs py-6 text-center" style={{ color: COLORS.textMuted }}>Aucun événement ce jour</p>}
        </div>
      </div>

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel événement">
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
            placeholder="Description (optionnel)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] mb-1" style={{ color: COLORS.textMuted }}>Début</p>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
              />
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: COLORS.textMuted }}>Fin</p>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
              />
            </div>
          </div>
          <select
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', color: COLORS.textPrimary }}
          >
            <option value="MEETING">Réunion</option>
            <option value="DEADLINE">Échéance</option>
            <option value="LAUNCH">Lancement</option>
            <option value="OTHER">Autre</option>
          </select>
          {form.type === 'MEETING' && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Info size={13} color={COLORS.info} className="mt-0.5 shrink-0" />
              <p className="text-[11px]" style={{ color: COLORS.info }}>Une salle Jitsi sera créée automatiquement pour cette réunion.</p>
            </div>
          )}
          <div>
            <p className="text-[11px] mb-1.5" style={{ color: COLORS.textSecondary }}>Inviter des membres</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {members.filter((m) => m.id !== teamMember?.id).map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <input
                    type="checkbox"
                    checked={form.attendeeIds.includes(m.id)}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        attendeeIds: e.target.checked ? [...s.attendeeIds, m.id] : s.attendeeIds.filter((id) => id !== m.id),
                      }))
                    }
                  />
                  <span className="text-xs" style={{ color: COLORS.textPrimary }}>{m.displayName}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={createEvent} className="w-full py-2.5 rounded-xl text-xs font-bold uppercase" style={{ background: COLORS.accent, color: '#fff' }}>
            Créer l'événement
          </button>
        </div>
      </TeamModal>

      {/* Jitsi fullscreen overlay */}
      {jitsiUrl && (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: '#000' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: COLORS.sidebar }}>
            <span className="text-xs font-bold" style={{ color: COLORS.textPrimary }}>Réunion en cours</span>
            <button onClick={() => setJitsiUrl(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase" style={{ background: COLORS.error, color: '#fff' }}>
              <X size={13} /> Quitter
            </button>
          </div>
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="flex-1 w-full border-0"
          />
        </div>
      )}

      <TeamToast toast={toast} />
    </div>
  );
}
