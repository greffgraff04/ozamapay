'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CheckSquare, FileBarChart, Calendar as CalendarIcon, Bell,
  AlertTriangle, Megaphone, Activity, Clock,
} from 'lucide-react';
import { useTeamSession } from '../lib/useTeamSession';
import { teamFetch } from '../lib/team-api';
import { COLORS, PRIORITY_COLORS, PRIORITY_LABELS, CALENDAR_TYPE_COLORS, ANNOUNCEMENT_PRIORITY_COLORS } from '../lib/theme';

interface DashboardData {
  pendingTasksCount: number;
  urgentTasks: any[];
  reportsThisWeekCount: number;
  weekEvents: any[];
  recentAnnouncements: any[];
  unreadNotificationsCount: number;
  recentActivity: { type: string; id: string; title: string; at: string }[];
}

const ACTIVITY_ICON: Record<string, any> = { TASK: CheckSquare, REPORT: FileBarChart, ANNOUNCEMENT: Megaphone };

export default function TeamDashboardPage() {
  const { teamMember } = useTeamSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamFetch<DashboardData>('/team/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const cards = [
    { label: 'Tâches en attente', value: data?.pendingTasksCount ?? 0, icon: CheckSquare, color: COLORS.accent, href: '/team/tasks' },
    { label: 'Rapports (semaine)', value: data?.reportsThisWeekCount ?? 0, icon: FileBarChart, color: COLORS.info, href: '/team/reports' },
    { label: 'Événements (semaine)', value: data?.weekEvents.length ?? 0, icon: CalendarIcon, color: COLORS.success, href: '/team/calendar' },
    { label: 'Notifications', value: data?.unreadNotificationsCount ?? 0, icon: Bell, color: COLORS.warning, href: '/team' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl lg:text-2xl font-black italic" style={{ color: COLORS.textPrimary }}>
          Bonjour {teamMember?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-xs mt-1 capitalize" style={{ color: COLORS.textSecondary }}>{today}</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={card.href}
                className="block rounded-2xl p-4"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${card.color}22` }}>
                  <Icon size={16} color={card.color} />
                </div>
                <p className="text-2xl font-black" style={{ color: COLORS.textPrimary }}>{loading ? '—' : card.value}</p>
                <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>{card.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Urgent tasks */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} color={COLORS.error} />
            <h2 className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Tâches urgentes</h2>
          </div>
          {(!data || data.urgentTasks.length === 0) ? (
            <p className="text-xs py-4 text-center" style={{ color: COLORS.textMuted }}>Aucune tâche urgente</p>
          ) : (
            <div className="space-y-2">
              {data.urgentTasks.map((t) => (
                <Link
                  key={t.id}
                  href="/team/tasks"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="text-xs font-medium truncate" style={{ color: COLORS.textPrimary }}>{t.title}</span>
                  {t.deadline && (
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: PRIORITY_COLORS.URGENT }}>
                      {new Date(t.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent announcements */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={14} color={COLORS.accent} />
            <h2 className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Dernières annonces</h2>
          </div>
          {(!data || data.recentAnnouncements.length === 0) ? (
            <p className="text-xs py-4 text-center" style={{ color: COLORS.textMuted }}>Aucune annonce</p>
          ) : (
            <div className="space-y-2">
              {data.recentAnnouncements.map((a) => (
                <Link key={a.id} href="/team/announcements" className="block px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ANNOUNCEMENT_PRIORITY_COLORS[a.priority] }} />
                    <span className="text-xs font-medium truncate" style={{ color: COLORS.textPrimary }}>{a.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Week agenda */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon size={14} color={COLORS.info} />
            <h2 className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Agenda de la semaine</h2>
          </div>
          {(!data || data.weekEvents.length === 0) ? (
            <p className="text-xs py-4 text-center" style={{ color: COLORS.textMuted }}>Aucun événement</p>
          ) : (
            <div className="space-y-2">
              {data.weekEvents.slice(0, 5).map((e) => (
                <Link key={e.id} href="/team/calendar" className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CALENDAR_TYPE_COLORS[e.type] }} />
                    <span className="text-xs font-medium truncate" style={{ color: COLORS.textPrimary }}>{e.title}</span>
                  </div>
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: COLORS.textSecondary }}>
                    {new Date(e.startAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} color={COLORS.success} />
            <h2 className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Activité récente</h2>
          </div>
          {(!data || data.recentActivity.length === 0) ? (
            <p className="text-xs py-4 text-center" style={{ color: COLORS.textMuted }}>Aucune activité</p>
          ) : (
            <div className="space-y-2">
              {data.recentActivity.map((item) => {
                const Icon = ACTIVITY_ICON[item.type] || Clock;
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Icon size={13} color={COLORS.textSecondary} />
                    <span className="text-xs truncate flex-1" style={{ color: COLORS.textPrimary }}>{item.title}</span>
                    <span className="text-[9px] shrink-0" style={{ color: COLORS.textMuted }}>
                      {new Date(item.at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
