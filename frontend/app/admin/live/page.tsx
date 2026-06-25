'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Globe, Users, UserCheck, UserPlus, LogIn,
  ArrowLeft, ArrowRight, RefreshCw,
} from 'lucide-react';

// Three.js-based — must be client-only
const GlobeViz = dynamic(() => import('react-globe.gl').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

const STATUS_COLOR: Record<string, string> = {
  BROWSING:      '#9CA3AF',
  SIGNING_UP:    '#EAB308',
  LOGGING_IN:    '#3B82F6',
  AUTHENTICATED: '#22C55E',
};

const STATUS_LABEL: Record<string, string> = {
  BROWSING:      'Ap Navige',
  SIGNING_UP:    'Ap Enskri',
  LOGGING_IN:    'Ap Konekte',
  AUTHENTICATED: 'Konekte',
};

interface Visitor {
  sessionId: string;
  ip: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  page: string;
  status: keyof typeof STATUS_COLOR;
  userId?: string;
  userLabel?: string;
  lastSeenAt: number;
}

interface RecentTx {
  reference: string;
  amount: number;
  senderLabel: string;
  receiverLabel: string;
  createdAt: number;
}

function timeAgo(tsMs: number, now: number): string {
  const s = Math.floor((now - tsMs) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}

function fmtHTG(n: number): string {
  return n.toLocaleString('fr-FR') + ' HTG';
}

function decodeRole(token: string): string {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return '';
    const json = decodeURIComponent(
      atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json)?.role ?? '';
  } catch {
    return '';
  }
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SUPPORT'];

export default function LiveActivityPage() {
  const [mounted,      setMounted]     = useState(false);
  const [token,        setToken]       = useState('');
  const [authorized,   setAuthorized]  = useState(false);

  const [visitors,     setVisitors]    = useState<Visitor[]>([]);
  const [transactions, setTransactions]= useState<RecentTx[]>([]);
  const [newRefs,      setNewRefs]     = useState<Set<string>>(new Set());
  const [now,          setNow]         = useState(Date.now());
  const [globeW,       setGlobeW]      = useState(600);
  const [globeH,       setGlobeH]      = useState(500);
  const [lastPoll,     setLastPoll]    = useState<Date | null>(null);

  const globeRef    = useRef<any>(null);
  const containerRef= useRef<HTMLDivElement>(null);
  const prevRefsRef = useRef<Set<string>>(new Set());

  // ── auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem('token') ?? '';
    setToken(t);
    const role = decodeRole(t);
    setAuthorized(!!t && ADMIN_ROLES.includes(role));
  }, []);

  // ── globe size tracks its container ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGlobeW(Math.floor(width));
      setGlobeH(Math.max(380, Math.floor(height)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [mounted]);

  // ── globe auto-rotate after ready ──────────────────────────────────────
  const onGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableZoom      = false;
  }, []);

  // ── data polling — every 7 seconds ─────────────────────────────────────
  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/live-activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      const incoming: RecentTx[] = data.recentTransactions ?? [];
      const fresh = new Set(
        incoming.map((t: RecentTx) => t.reference).filter((r: string) => !prevRefsRef.current.has(r))
      );
      prevRefsRef.current = new Set(incoming.map((t: RecentTx) => t.reference));

      setVisitors(data.visitors ?? []);
      setTransactions(incoming);
      setNewRefs(fresh);
      setLastPoll(new Date());

      // clear flash after 1.2 s
      if (fresh.size > 0) setTimeout(() => setNewRefs(new Set()), 1200);
    } catch { /* never surface tracking errors */ }
  }, [token]);

  useEffect(() => {
    if (!mounted || !authorized) return;
    poll();
    const id = setInterval(poll, 7000);
    return () => clearInterval(id);
  }, [mounted, authorized, poll]);

  // ── 1-second ticker for time-ago labels ────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── derived stats ───────────────────────────────────────────────────────
  const total        = visitors.length;
  const browsing     = visitors.filter((v) => v.status === 'BROWSING').length;
  const signingUp    = visitors.filter((v) => v.status === 'SIGNING_UP').length;
  const authenticated= visitors.filter((v) => v.status === 'AUTHENTICATED').length;

  // ── globe data ──────────────────────────────────────────────────────────
  const geoVisitors = visitors.filter((v) => v.lat != null && v.lon != null);
  const pointsData  = geoVisitors.map((v) => ({
    lat:   v.lat!,
    lng:   v.lon!,
    color: STATUS_COLOR[v.status] ?? '#9CA3AF',
    label: `${v.city ?? 'Enkoni'} · ${STATUS_LABEL[v.status]} · ${v.page}`,
  }));
  const ringsData = geoVisitors.map((v) => ({
    lat:   v.lat!,
    lng:   v.lon!,
    color: STATUS_COLOR[v.status] ?? '#9CA3AF',
  }));

  // ── loading / unauth states ─────────────────────────────────────────────
  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!authorized) return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-white/40 text-sm uppercase tracking-widest font-mono">Aksè refize</p>
        <a href="/admin" className="mt-4 inline-block text-[#FF7A00] text-xs hover:underline">← Retounen nan Admin</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[#0A0B0F]/90 backdrop-blur-md border-b border-white/[0.04] px-6 py-3 flex items-center gap-4">
        <a href="/admin" className="p-2 rounded-lg hover:bg-white/5 transition text-white/40 hover:text-white">
          <ArrowLeft size={16} />
        </a>
        <div className="w-px h-5 bg-white/10" />
        <Globe size={15} className="text-[#FF7A00]" />
        <h1 className="text-sm font-black uppercase tracking-widest">Aktivite An Dirèk</h1>
        <span className="flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-green-400 uppercase tracking-widest">LIVE</span>
        </span>
        <div className="ml-auto flex items-center gap-3">
          {lastPoll && (
            <span className="text-[9px] font-mono text-white/20 hidden sm:block">
              Dènye: {lastPoll.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button onClick={poll} className="p-2 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-white">
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {/* ── STATS BAR ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-5 pb-3">
        {[
          { label: 'Vizitè Aktif', value: total,        icon: Users,     color: 'text-white',      border: 'border-white/[0.06]' },
          { label: 'Ap Navige',    value: browsing,      icon: Globe,     color: 'text-[#9CA3AF]',  border: 'border-[#9CA3AF]/10' },
          { label: 'Ap Enskri',   value: signingUp,     icon: UserPlus,  color: 'text-[#EAB308]',  border: 'border-[#EAB308]/15' },
          { label: 'Konekte',      value: authenticated, icon: UserCheck, color: 'text-[#22C55E]',  border: 'border-[#22C55E]/15' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-[#0D0E14] border ${border} rounded-xl p-4 flex items-center gap-3`}>
            <Icon size={16} className={`${color} shrink-0`} />
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono">{label}</p>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-6 pb-6 min-h-0">

        {/* LEFT — GLOBE */}
        <div
          ref={containerRef}
          className="lg:w-[60%] bg-[#0D0E14] border border-white/[0.04] rounded-2xl overflow-hidden flex flex-col min-h-[380px] lg:min-h-0"
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
            <Globe size={12} className="text-[#FF7A00]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
              {geoVisitors.length} vizitè lokalize
            </span>
          </div>
          <div className="flex-1 relative">
            {mounted && (
              <GlobeViz
                ref={globeRef}
                width={globeW}
                height={globeH}
                backgroundColor="#0D0E14"
                globeImageUrl="/globe/earth-dark.jpg"
                atmosphereColor="#FF7A00"
                atmosphereAltitude={0.15}
                showGraticules={false}
                pointsData={pointsData}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointAltitude={0.01}
                pointRadius={0.35}
                pointsMerge={false}
                pointLabel="label"
                ringsData={ringsData}
                ringLat="lat"
                ringLng="lng"
                ringColor={(d: any) => (t: number) => `${d.color}${Math.round((1 - t) * 255).toString(16).padStart(2, '0')}`}
                ringMaxRadius={4}
                ringPropagationSpeed={2}
                ringRepeatPeriod={900}
                onGlobeReady={onGlobeReady}
              />
            )}
          </div>

          {/* legend */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-white/[0.04]">
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[k] }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — VISITOR LIST + TX FEED */}
        <div className="lg:w-[40%] flex flex-col gap-4 min-h-0">

          {/* VISITOR LIST */}
          <div className="bg-[#0D0E14] border border-white/[0.04] rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users size={12} className="text-white/30" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                  Vizitè ({total})
                </span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {visitors.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-white/20 text-xs font-mono">
                  Pa gen vizitè aktif
                </div>
              ) : (
                visitors.map((v) => (
                  <div key={v.sessionId} className="flex items-start gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.01] transition">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: STATUS_COLOR[v.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-white/80 truncate">
                          {v.city && v.country ? `${v.city}, ${v.country}` : 'Lokasyon enkoni'}
                        </span>
                        <span
                          className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                          style={{ background: `${STATUS_COLOR[v.status]}22`, color: STATUS_COLOR[v.status] }}
                        >
                          {STATUS_LABEL[v.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-mono text-white/30 truncate">{v.page}</span>
                        {v.userLabel && (
                          <span className="text-[9px] font-bold text-[#22C55E] truncate">{v.userLabel}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-white/20 shrink-0 mt-0.5">
                      {timeAgo(v.lastSeenAt, now)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* P2P TRANSACTION FEED */}
          <div className="bg-[#0D0E14] border border-white/[0.04] rounded-2xl flex flex-col max-h-72 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04] shrink-0 flex items-center gap-2">
              <LogIn size={12} className="text-[#FF7A00]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                Dènye Tranzaksyon P2P
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {transactions.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-white/20 text-xs font-mono">
                  Pa gen tranzaksyon resan
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.reference}
                    className={`flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] transition-colors duration-1000 ${
                      newRefs.has(tx.reference) ? 'bg-[#FF7A00]/10' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-white/80 truncate">{tx.senderLabel}</span>
                        <ArrowRight size={10} className="text-[#FF7A00] shrink-0" />
                        <span className="text-[11px] font-bold text-white/80 truncate">{tx.receiverLabel}</span>
                      </div>
                      <p className="text-[9px] font-mono text-white/30 mt-0.5 truncate">
                        #{tx.reference}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-[#22C55E]">{fmtHTG(tx.amount)}</p>
                      <p className="text-[9px] font-mono text-white/20">{timeAgo(tx.createdAt, now)} pase</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
