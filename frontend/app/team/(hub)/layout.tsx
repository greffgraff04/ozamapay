'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MessageSquare, CheckSquare, Folder, FileBarChart, Megaphone,
  Calendar, Settings, LogOut, Bell, Menu, X, CheckCheck,
} from 'lucide-react';
import { useTeamSession } from '../lib/useTeamSession';
import { teamFetch } from '../lib/team-api';
import { COLORS, ROLE_LABELS, PRIVILEGED_ROLES } from '../lib/theme';

const NAV_ITEMS = [
  { href: '/team', label: 'Accueil', icon: Home },
  { href: '/team/messages', label: 'Messages', icon: MessageSquare },
  { href: '/team/tasks', label: 'Tâches', icon: CheckSquare },
  { href: '/team/files', label: 'Fichiers', icon: Folder },
  { href: '/team/reports', label: 'Rapports', icon: FileBarChart },
  { href: '/team/announcements', label: 'Annonces', icon: Megaphone },
  { href: '/team/calendar', label: 'Calendrier', icon: Calendar },
];
const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);

type Notif = { id: string; title: string; content: string; isRead: boolean; createdAt: string; link?: string | null };

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const { teamMember, loading } = useTeamSession();
  const router = useRouter();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const isPrivileged = teamMember ? PRIVILEGED_ROLES.includes(teamMember.role) : false;
  const navItems = isPrivileged ? [...NAV_ITEMS, { href: '/team/settings', label: 'Paramètres', icon: Settings }] : NAV_ITEMS;

  const refreshCount = useCallback(() => {
    teamFetch<{ count: number }>('/team/notifications/count').then((r) => setUnreadCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!teamMember) return;
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [teamMember, refreshCount]);

  const openBell = async () => {
    setBellOpen((v) => !v);
    if (!bellOpen) {
      try {
        const list = await teamFetch<Notif[]>('/team/notifications?limit=10');
        setNotifs(list);
      } catch {}
    }
  };

  const markAllRead = async () => {
    try {
      await teamFetch('/team/notifications/read-all', { method: 'PATCH' });
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading || !teamMember) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.border, borderTopColor: COLORS.accent }} />
      </div>
    );
  }

  const initial = teamMember.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.bg, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex flex-col shrink-0"
        style={{ width: 260, background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}` }}
      >
        <div className="px-5 py-6" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2">
            <span className="text-base font-black italic" style={{ color: COLORS.textPrimary }}>OZAMAPAY</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: COLORS.accent }}>Team Hub</p>
        </div>

        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate italic uppercase" style={{ color: COLORS.textPrimary }}>{teamMember.displayName}</p>
            <p className="text-[10px] mt-0.5" style={{ color: COLORS.accent }}>{ROLE_LABELS[teamMember.role]}</p>
          </div>
          <button onClick={openBell} className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <Bell size={16} color={COLORS.textSecondary} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] font-bold px-0.5"
                style={{ background: COLORS.error, color: '#fff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase italic transition-colors"
                style={{
                  background: active ? COLORS.accentMuted : 'transparent',
                  color: active ? COLORS.accent : COLORS.textSecondary,
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase italic transition-colors hover:bg-white/5"
            style={{ color: COLORS.error }}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </motion.aside>

      {/* Notification dropdown (desktop) */}
      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="hidden lg:block fixed top-4 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ left: 270, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <span className="text-xs font-bold uppercase" style={{ color: COLORS.textPrimary }}>Notifications</span>
              <button onClick={markAllRead} className="flex items-center gap-1 text-[10px]" style={{ color: COLORS.accent }}>
                <CheckCheck size={12} /> Tout lire
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: COLORS.textMuted }}>Aucune notification</p>
              ) : (
                notifs.map((n) => (
                  <div key={n.id} className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}`, opacity: n.isRead ? 0.5 : 1 }}>
                    <p className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>{n.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: COLORS.textSecondary }}>{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: COLORS.sidebar, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="text-sm font-black italic" style={{ color: COLORS.textPrimary }}>
          OZAMAPAY <span style={{ color: COLORS.accent }}>Team</span>
        </span>
        <div className="flex items-center gap-3">
          <button onClick={openBell} className="relative p-1.5">
            <Bell size={18} color={COLORS.textSecondary} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: COLORS.error, color: '#fff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setDrawerOpen(true)} className="p-1.5">
            <Menu size={20} color={COLORS.textPrimary} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
              style={{ background: COLORS.sidebar, borderRight: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <div>
                  <p className="text-xs font-bold italic" style={{ color: COLORS.textPrimary }}>{teamMember.displayName}</p>
                  <p className="text-[10px]" style={{ color: COLORS.accent }}>{ROLE_LABELS[teamMember.role]}</p>
                </div>
                <button onClick={() => setDrawerOpen(false)}>
                  <X size={18} color={COLORS.textSecondary} />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase italic"
                      style={{ background: active ? COLORS.accentMuted : 'transparent', color: active ? COLORS.accent : COLORS.textSecondary }}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-3 py-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase italic" style={{ color: COLORS.error }}>
                  <LogOut size={16} />
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 pb-20 lg:pb-0 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2"
        style={{ background: COLORS.sidebar, borderTop: `1px solid ${COLORS.border}` }}
      >
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <Icon size={20} color={active ? COLORS.accent : COLORS.textSecondary} />
              <span className="text-[9px] font-semibold" style={{ color: active ? COLORS.accent : COLORS.textSecondary }}>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1">
          <Menu size={20} color={COLORS.textSecondary} />
          <span className="text-[9px] font-semibold" style={{ color: COLORS.textSecondary }}>Plus</span>
        </button>
      </div>
    </div>
  );
}
