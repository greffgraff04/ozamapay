'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
const ACC = '#FF7A00';

type Role = 'OWNER' | 'ACCOUNTANT' | 'CASHIER';
type Tab = 'home' | 'receive' | 'tx' | 'withdraw' | 'team' | 'profile' | 'support';

const ROLE_LABELS: Record<Role, string> = { OWNER: 'Pwopriyetè', ACCOUNTANT: 'Kontab', CASHIER: 'Kès' };
const TIER_FEE: Record<string, string> = { STARTER: '2.5%', PRO: '2.0%', ENTERPRISE: '1.5%' };
const TX_TYPE_LABELS: Record<string, string> = {
  PAYMENT_RECEIVED: 'Peman Resevwa',
  WITHDRAWAL: 'Retrè',
  TRANSFER_OUT: 'Transfè',
  TOPUP: 'Rechajman',
};
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  COMPLETED: { bg: 'rgba(34,197,94,.13)', fg: '#22C55E', label: 'Konplete' },
  PENDING: { bg: 'rgba(245,177,76,.14)', fg: '#f5b14c', label: 'Annatant' },
  PROCESSING: { bg: 'rgba(245,177,76,.14)', fg: '#f5b14c', label: 'An Tretman' },
  FAILED: { bg: 'rgba(239,68,68,.13)', fg: '#ff7a7a', label: 'Echwe' },
  REJECTED: { bg: 'rgba(239,68,68,.13)', fg: '#ff7a7a', label: 'Rejte' },
  CANCELLED: { bg: 'rgba(239,68,68,.13)', fg: '#ff7a7a', label: 'Anile' },
};

// Preserves the exact functional gating already in production: OWNER sees
// everything, ACCOUNTANT loses withdraw/team, CASHIER only sees transactions.
// 'receive'/'profile'/'support' are purely-informational additions with no
// backend guard, so they ride along with the tabs each role already had.
const TABS_BY_ROLE: Record<Role, Tab[]> = {
  OWNER: ['home', 'receive', 'tx', 'withdraw', 'team', 'profile', 'support'],
  ACCOUNTANT: ['home', 'receive', 'tx', 'profile', 'support'],
  CASHIER: ['tx', 'profile', 'support'],
};

const NAV_ICONS: Record<Tab, string[]> = {
  home: ['M4 11l8-7 8 7M6 9.5V20h12V9.5'],
  receive: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2M20 14v6M16 20h4'],
  tx: ['M4 7h16M4 12h16M4 17h10'],
  withdraw: ['M12 19V5M5 12l7 7 7-7'],
  team: ['M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8'],
  profile: ['M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5'],
  support: ['M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-3v-7h3a2 2 0 012 2zM3 19a2 2 0 002 2h3v-7H5a2 2 0 00-2 2z'],
};

const NAV_LABELS: Record<Tab, [string, string]> = {
  home: ['Akèy', 'Apèsi sou biznis ou jodi a'],
  receive: ['Resevwa peman', 'QR, lyen, ak peman rapid'],
  tx: ['Tranzaksyon', 'Istwa tranzaksyon biznis ou'],
  withdraw: ['Retrè', 'Transfere lajan biznis ou'],
  team: ['Ekip', 'Manm ak otorizasyon yo'],
  profile: ['Pwofil biznis', 'Enfòmasyon biznis ou'],
  support: ['Sipò Business', 'Asistans pou kont biznis ou'],
};

function Icon({ paths, size = 20, color = 'currentColor', strokeWidth = 1.9 }: { paths: string[]; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths.map((d, i) => (
        <path key={i} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

const h: React.CSSProperties = { fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff' };
const lbl: React.CSSProperties = { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: 'rgba(255,255,255,.45)' };
const card: React.CSSProperties = { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20 };

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function signOut() {
  localStorage.clear();
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.replace('/login');
}

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('home');
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [walletStats, setWalletStats] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txHasMore, setTxHasMore] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'in' | 'out'>('all');
  const [txSearch, setTxSearch] = useState('');

  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [wdAmount, setWdAmount] = useState('');
  const [wdPin, setWdPin] = useState('');
  const [wdLoading, setWdLoading] = useState(false);
  const [wdError, setWdError] = useState('');
  const [wdSuccess, setWdSuccess] = useState<any>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ACCOUNTANT' | 'CASHIER'>('CASHIER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [qCents, setQCents] = useState(0);
  const [copied, setCopied] = useState(false);

  // ── Access check ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.replace(`/login?redirect=/business/${businessId}`);
      return;
    }
    setToken(t);
    try {
      const cached = localStorage.getItem('user');
      if (cached) setMe(JSON.parse(cached));
    } catch { /* ignore malformed cache */ }

    (async () => {
      try {
        const res = await fetch(`${API}/business/me`, { headers: authHeaders(t) });
        if (!res.ok) {
          setAccessError('Nou pa ka konfime aksè ou. Eseye ankò.');
          return;
        }
        const data = await res.json();
        const owned = data?.owned || [];
        const member = data?.member || [];
        setAllBusinesses([...owned.map((b: any) => ({ ...b, memberRole: 'OWNER' })), ...member]);

        const asOwner = owned.find((b: any) => b.id === businessId);
        if (asOwner) {
          setBusiness(asOwner);
          setMyRole('OWNER');
          setTab('home');
          return;
        }
        const asMember = member.find((b: any) => b.id === businessId);
        if (asMember) {
          setBusiness(asMember);
          setMyRole(asMember.memberRole as Role);
          setTab(TABS_BY_ROLE[asMember.memberRole as Role][0]);
          return;
        }
        setAccessError('Ou pa gen aksè nan biznis sa a.');
      } catch {
        setAccessError('Nou pa ka konekte ak sèvè a.');
      } finally {
        setChecking(false);
      }
    })();
  }, [businessId, router]);

  // ── Data loaders ─────────────────────────────────────────────────────────
  const loadWallet = useCallback(async () => {
    if (!token) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`${API}/business/${businessId}/wallet`, { headers: authHeaders(token) });
      if (res.ok) setWalletStats(await res.json());
    } finally {
      setWalletLoading(false);
    }
  }, [businessId, token]);

  const loadTransactions = useCallback(async (page = 1) => {
    if (!token) return;
    setTxLoading(true);
    try {
      const res = await fetch(`${API}/business/${businessId}/transactions?page=${page}&limit=20`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
        setTxTotal(data.total || 0);
        setTxHasMore(!!data.hasMore);
        setTxPage(page);
      }
    } finally {
      setTxLoading(false);
    }
  }, [businessId, token]);

  const loadMembers = useCallback(async () => {
    if (!token) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`${API}/business/${businessId}/members`, { headers: authHeaders(token) });
      if (res.ok) setMembers(await res.json());
    } finally {
      setMembersLoading(false);
    }
  }, [businessId, token]);

  useEffect(() => {
    if (!token || !myRole || !business) return;
    if (business.status !== 'APPROVED') return;
    if (myRole === 'OWNER' || myRole === 'ACCOUNTANT') loadWallet();
    loadTransactions(1);
    if (myRole === 'OWNER') loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, myRole, business?.status]);

  // ── Withdraw ─────────────────────────────────────────────────────────────
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWdError('');
    const amountNum = Number(wdAmount);
    if (!amountNum || amountNum <= 0) { setWdError('Antre yon montan valid.'); return; }
    if (wdPin.length < 4) { setWdError('Antre kòd PIN ou.'); return; }
    setWdLoading(true);
    try {
      const res = await fetch(`${API}/business/${businessId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ amount: amountNum, destination: 'PERSONAL_WALLET', pin: wdPin }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setWdSuccess(data);
        setWdAmount('');
        setWdPin('');
        loadWallet();
        loadTransactions(1);
      } else {
        setWdError(data?.message || 'Erè pandan retrè a.');
      }
    } catch {
      setWdError('Erè rezo. Verifye koneksyon ou.');
    } finally {
      setWdLoading(false);
    }
  };

  // ── Invite / remove member ──────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail) { setInviteError('Antre yon email.'); return; }
    setInviteLoading(true);
    try {
      const res = await fetch(`${API}/business/${businessId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setInviteEmail('');
        setShowInvite(false);
        loadMembers();
      } else {
        setInviteError(data?.message || 'Erè pandan envitasyon an.');
      }
    } catch {
      setInviteError('Erè rezo. Verifye koneksyon ou.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/business/${businessId}/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (res.ok) loadMembers();
    } catch { /* list stays as-is, user can retry */ }
  };

  // ── Quick-amount keypad (Resevwa peman) ─────────────────────────────────
  const pushDigit = (d: number) => setQCents((c) => Math.min(c * 10 + d, 99999999));
  const pushZeros = () => setQCents((c) => Math.min(c * 100, 99999999));
  const backspace = () => setQCents((c) => Math.floor(c / 10));
  const fmtAmt = (cents: number) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const wallet = business?.wallet;
  const fee = TIER_FEE[business?.tier] ?? '2.5%';
  const payLink = businessId ? `https://ozamapay.com/pay?business=${businessId}` : '';
  const payLinkShort = businessId ? `pay.ozamapay.com/${businessId.slice(0, 8)}` : '';
  const quickPayLink = qCents > 0 ? `${payLink}&amount=${(qCents / 100).toFixed(2)}` : payLink;

  const copyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(payLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const filteredTx = useMemo(() => {
    let rows = transactions;
    if (txFilter === 'in') rows = rows.filter((r) => r.type === 'PAYMENT_RECEIVED' || r.type === 'TOPUP');
    if (txFilter === 'out') rows = rows.filter((r) => r.type === 'WITHDRAWAL' || r.type === 'TRANSFER_OUT');
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.payer?.name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (TX_TYPE_LABELS[r.type] || r.type).toLowerCase().includes(q)
      );
    }
    return rows;
  }, [transactions, txFilter, txSearch]);

  const exportCsv = () => {
    const header = 'Deskripsyon,Metòd,Dat,Estati,Montan,Frè\n';
    const rows = filteredTx.map((r) => {
      const name = r.payer?.name || TX_TYPE_LABELS[r.type] || r.type;
      const date = new Date(r.createdAt).toLocaleString('fr-FR');
      return `"${name}","${TX_TYPE_LABELS[r.type] || r.type}","${date}","${STATUS_STYLE[r.status]?.label || r.status}",${r.amount},${r.fee}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tranzaksyon-${business?.businessName || businessId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadQr = () => {
    const svg = document.getElementById('biz-qr-svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 20, 20, 360, 360);
      }
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `qr-${business?.businessName || 'biznis'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const navTabs = myRole ? TABS_BY_ROLE[myRole] : [];
  const otherBusinesses = allBusinesses.filter((b) => b.id !== businessId);

  return (
    <div className="font-space-grotesk" style={{
      width: '100%', minHeight: '100vh', display: 'flex',
      background: 'radial-gradient(110% 80% at 80% -10%, rgb(28,19,34) 0%, rgb(10,12,20) 50%)',
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        @keyframes ozUp { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:none; } }
        @keyframes ozShine { 0% { transform:translateX(-160%) skewX(-18deg);} 100% { transform:translateX(360%) skewX(-18deg);} }
        @keyframes glowPulse { 0%,100% { box-shadow:0 8px 24px -8px rgba(255,122,0,.55);} 50% { box-shadow:0 14px 38px -6px rgba(255,122,0,.9);} }
        @keyframes dotPulse { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,.6);} 70% { box-shadow:0 0 0 7px rgba(34,197,94,0);} }
        .nosb::-webkit-scrollbar{width:0;height:0} .nosb{scrollbar-width:none}
      `}</style>

      {checking && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...h, fontSize: 13 }}>
          Chajman...
        </div>
      )}

      {!checking && accessError && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...card, padding: 32, textAlign: 'center', maxWidth: 380 }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 20 }}>{accessError}</p>
            <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 16, ...h, fontSize: 12 }}>
              Ale nan Dashboard
            </button>
          </div>
        </div>
      )}

      {!checking && !accessError && business && myRole && (
        <>
          {/* ══════════════════ SIDEBAR ══════════════════ */}
          <div style={{
            width: 248, flexShrink: 0, background: 'rgba(12,14,21,.7)', backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', padding: '22px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 0' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(140deg,#FF8A1A,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)', animation: 'ozShine 3.4s linear infinite' }} />
                <svg width="22" height="22" viewBox="0 0 100 100" fill="none"><rect x="14" y="28" width="72" height="44" rx="22" stroke="#fff" strokeWidth={12} /></svg>
              </div>
              <div>
                <div style={{ ...h, fontSize: 15, lineHeight: 1 }}>OZAMAPAY</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.22em', color: ACC, marginTop: 2 }}>BUSINESS</div>
              </div>
            </div>

            <div style={{ position: 'relative', marginTop: 22 }}>
              <div onClick={() => otherBusinesses.length > 0 && setSwitcherOpen((s) => !s)}
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: otherBusinesses.length > 0 ? 'pointer' : 'default' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#3a2f5f,#241d33)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b39bff', fontWeight: 700, fontSize: 14 }}>
                  {(business.businessName || 'B')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{business.businessName}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>Biznis · {business.tier}</div>
                </div>
                {otherBusinesses.length > 0 && <Icon paths={['M8 9l4 4 4-4M8 15l4-4 4 4']} size={15} color="rgba(255,255,255,.4)" strokeWidth={1.8} />}
              </div>
              {switcherOpen && otherBusinesses.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#0c0e15', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden', zIndex: 20 }}>
                  {otherBusinesses.map((b) => (
                    <div key={b.id} onClick={() => { window.location.href = `/business/${b.id}`; }}
                      style={{ padding: '10px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      {b.businessName} <span style={{ color: 'rgba(255,255,255,.4)' }}>· {b.memberRole === 'OWNER' ? ROLE_LABELS.OWNER : ROLE_LABELS[b.memberRole as Role]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...lbl, margin: '24px 10px 10px', fontSize: 9 }}>Meni prensipal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {navTabs.map((t) => {
                const active = tab === t;
                return (
                  <div key={t} onClick={() => setTab(t)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
                    background: active ? 'rgba(255,122,0,.14)' : 'transparent', cursor: 'pointer',
                  }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0 }}>
                      <Icon paths={NAV_ICONS[t]} color={active ? ACC : 'rgba(255,255,255,.55)'} />
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#fff' : 'rgba(255,255,255,.6)' }}>
                      {NAV_LABELS[t][0]}
                    </span>
                    {t === 'tx' && txTotal > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#0A0C14', background: ACC, borderRadius: 20, padding: '2px 7px' }}>{txTotal}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ background: 'linear-gradient(140deg,rgba(255,122,0,.18),rgba(255,107,0,.06))', border: '1px solid rgba(255,122,0,.25)', borderRadius: 16, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon paths={['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z', 'M9 12l2 2 4-4']} size={15} color={ACC} strokeWidth={1.8} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{business.tier} · Biznis</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 6, lineHeight: 1.5 }}>
                Frè tranzaksyon: <strong style={{ color: ACC }}>{fee}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '6px 8px' }}>
              <div style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF7A00,#FF9D4D)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0C14', fontWeight: 700, fontSize: 13 }}>
                {initials(me?.name)}
                <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#22C55E', border: '2px solid #0c0e15', animation: 'dotPulse 2s ease infinite' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.name || 'Itilizatè'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{ROLE_LABELS[myRole]}</div>
              </div>
              <div onClick={signOut} style={{ cursor: 'pointer' }}>
                <Icon paths={['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9']} size={16} color="rgba(255,255,255,.4)" strokeWidth={1.8} />
              </div>
            </div>
          </div>

          {/* ══════════════════ MAIN ══════════════════ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ height: 72, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 18, padding: '0 28px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...h, fontSize: 20 }}>{NAV_LABELS[tab][0]}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{NAV_LABELS[tab][1]}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, padding: '9px 14px', width: 240 }}>
                <Icon paths={['M20 20l-3.5-3.5']} size={16} color="rgba(255,255,255,.4)" strokeWidth={1.8} />
                <input
                  placeholder="Chèche tranzaksyon…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13 }}
                />
              </div>
              <button onClick={() => router.push('/dashboard')} style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Dashboard pèsonèl">
                <Icon paths={['M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5']} size={17} color="#fff" strokeWidth={1.8} />
              </button>
              {navTabs.includes('receive') && (
                <div onClick={() => setTab('receive')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: ACC, borderRadius: 12, height: 42, padding: '0 18px', cursor: 'pointer', animation: 'glowPulse 3s ease-in-out infinite' }}>
                  <Icon paths={['M12 5v14M5 12h14']} size={18} color="#0A0C14" strokeWidth={2.4} />
                  <span style={{ fontSize: 13, fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '.03em', color: '#0A0C14' }}>Resevwa peman</span>
                </div>
              )}
            </div>

            <div className="nosb" style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
              {business.status === 'PENDING' && (
                <div style={{ ...card, padding: 32, textAlign: 'center', maxWidth: 480 }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
                  <p style={{ ...h, fontSize: 14, marginBottom: 8 }}>Aplikasyon ou an atant apwobasyon</p>
                  <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>Admin ap revize demand ou a. W ap resevwa yon imel lè li apwouve.</p>
                </div>
              )}

              {business.status === 'REJECTED' && (
                <div style={{ ...card, padding: 32, textAlign: 'center', maxWidth: 480 }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>✕</div>
                  <p style={{ ...h, fontSize: 14, marginBottom: 8 }}>Aplikasyon ou an te refize</p>
                  <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
                    {business.application?.adminNote || 'Pa gen rezon espesifik bay. Kontakte sipò pou plis detay.'}
                  </p>
                </div>
              )}

              {business.status === 'APPROVED' && (
                <div style={{ animation: 'ozUp .4s ease both' }}>

                  {/* ── HOME / OVERVIEW ── */}
                  {tab === 'home' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: walletStats?.stats ? '1.4fr 1fr 1fr' : '1fr', gap: 14 }}>
                        <div style={{ background: 'linear-gradient(140deg,#FF7A00,#FF6B00)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.22),transparent 70%)' }} />
                          <div style={{ ...lbl, color: 'rgba(0,0,0,.5)' }}>Balans Wallet Business</div>
                          <div style={{ ...h, fontSize: 32, color: '#fff', marginTop: 8, fontStyle: 'normal', letterSpacing: '-0.02em' }}>
                            {Number(wallet?.balance ?? 0).toLocaleString('fr-HT')} <span style={{ fontSize: 16, opacity: .8 }}>HTG</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                            {myRole === 'OWNER' && (
                              <div onClick={() => setTab('withdraw')} style={{ background: 'rgba(0,0,0,.22)', borderRadius: 11, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Retire lajan</div>
                            )}
                            <div onClick={() => setTab('tx')} style={{ background: 'rgba(255,255,255,.2)', borderRadius: 11, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Wè rapò</div>
                          </div>
                        </div>
                        {walletStats?.stats && (
                          <>
                            <div style={{ ...card, padding: 18 }}>
                              <span style={lbl}>Mwa Sa a</span>
                              <div style={{ ...h, fontSize: 22, marginTop: 12, fontStyle: 'normal' }}>{Number(walletStats.stats.monthlyReceived).toLocaleString('fr-HT')}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>HTG resevwa</div>
                            </div>
                            <div style={{ ...card, padding: 18 }}>
                              <span style={lbl}>Total Tranzaksyon</span>
                              <div style={{ ...h, fontSize: 22, marginTop: 12, fontStyle: 'normal' }}>{walletStats.stats.transactionCount}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>depi kreyasyon</div>
                            </div>
                          </>
                        )}
                        {walletLoading && !walletStats && <div style={{ ...card, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'ozShine 1s linear infinite' }} /></div>}
                      </div>

                      <div style={{ ...card, marginTop: 14, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ ...h, fontSize: 15 }}>Dènye Tranzaksyon</div>
                          <span onClick={() => setTab('tx')} style={{ fontSize: 12, fontWeight: 700, color: ACC, cursor: 'pointer' }}>Wè tout →</span>
                        </div>
                        {transactions.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,.3)', ...h, fontSize: 12 }}>Pa gen tranzaksyon</div>
                        ) : transactions.slice(0, 5).map((r) => {
                          const isOut = r.type === 'WITHDRAWAL' || r.type === 'TRANSFER_OUT';
                          const ini = isOut ? '↑' : (r.payer?.name?.[0]?.toUpperCase() || '•');
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: isOut ? 'rgba(239,68,68,.13)' : 'rgba(34,197,94,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOut ? '#ff7a7a' : '#22C55E', fontWeight: 700, fontSize: 14 }}>{ini}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{isOut ? TX_TYPE_LABELS[r.type] : (r.payer?.name || r.payer?.email || TX_TYPE_LABELS[r.type])}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)' }}>{new Date(r.createdAt).toLocaleString('fr-FR')}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: isOut ? '#fff' : '#22C55E' }}>{isOut ? '−' : '+'}{Number(r.amount).toLocaleString('fr-HT')} HTG</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{TX_TYPE_LABELS[r.type] || r.type}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* ── RECEIVE ── */}
                  {tab === 'receive' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 980 }}>
                      <div style={{ ...card, borderRadius: 22, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ ...h, fontSize: 16, alignSelf: 'flex-start' }}>Kòd QR Boutik la</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', alignSelf: 'flex-start', marginTop: 4 }}>Kliyan eskane, tape montan an, peye</div>
                        <div style={{ width: 230, height: 230, margin: '26px 0 18px', background: '#fff', borderRadius: 22, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
                          <QRCodeSVG id="biz-qr-svg" value={quickPayLink} size={190} fgColor="#0A0C14" bgColor="#FFFFFF" level="M" />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{business.businessName}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>@{businessId.slice(0, 8)}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 18, width: '100%' }}>
                          <div onClick={downloadQr} style={{ flex: 1, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}>Telechaje</div>
                          <div onClick={() => window.print()} style={{ flex: 1, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}>Enprime</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ ...card, borderRadius: 22, padding: 24 }}>
                          <div style={{ ...h, fontSize: 16 }}>Lyen Peman</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Pataje sou WhatsApp, rezo sosyal, oswa imèl</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: '13px 14px' }}>
                            <Icon paths={['M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1']} size={16} color={ACC} strokeWidth={1.8} />
                            <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.7)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payLinkShort}</span>
                          </div>
                          <div onClick={copyLink} style={{ marginTop: 12, height: 46, borderRadius: 13, background: 'rgba(255,122,0,.14)', border: '1px solid rgba(255,122,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: ACC }}>
                            {copied ? '✓ Lyen kopye!' : 'Kopye lyen an'}
                          </div>
                        </div>

                        <div style={{ ...card, borderRadius: 22, padding: 24 }}>
                          <div style={{ ...h, fontSize: 16 }}>Peman Rapid</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>Jenere yon kòd inik pou yon vant espesifik</div>
                          <div style={{ textAlign: 'center', margin: '18px 0 6px' }}>
                            <span style={{ ...h, fontSize: 38, fontStyle: 'normal', letterSpacing: '-0.02em' }}>{fmtAmt(qCents)}</span> <span style={{ fontSize: 16, color: 'rgba(255,255,255,.45)' }}>HTG</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                              <div key={n} onClick={() => pushDigit(n)} style={{ textAlign: 'center', fontSize: 20, fontWeight: 500, color: '#fff', padding: '11px 0', borderRadius: 11, cursor: 'pointer', userSelect: 'none' }}>{n}</div>
                            ))}
                            <div onClick={pushZeros} style={{ textAlign: 'center', fontSize: 20, fontWeight: 500, color: '#fff', padding: '11px 0', borderRadius: 11, cursor: 'pointer', userSelect: 'none' }}>00</div>
                            <div onClick={() => pushDigit(0)} style={{ textAlign: 'center', fontSize: 20, fontWeight: 500, color: '#fff', padding: '11px 0', borderRadius: 11, cursor: 'pointer', userSelect: 'none' }}>0</div>
                            <div onClick={backspace} style={{ textAlign: 'center', fontSize: 20, fontWeight: 500, color: '#fff', padding: '11px 0', borderRadius: 11, cursor: 'pointer', userSelect: 'none' }}>⌫</div>
                          </div>
                          <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,.35)', textAlign: 'center' }}>
                            {qCents > 0 ? 'QR pou vant espesifik la aktyalize anwo a' : 'Antre yon montan pou jenere yon QR espesifik'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TRANSACTIONS ── */}
                  {tab === 'tx' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 4 }}>
                          {(['all', 'in', 'out'] as const).map((f) => (
                            <span key={f} onClick={() => setTxFilter(f)} style={{
                              fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                              color: txFilter === f ? '#0A0C14' : 'rgba(255,255,255,.55)',
                              background: txFilter === f ? ACC : 'transparent',
                            }}>{f === 'all' ? 'Tout' : f === 'in' ? 'Antre' : 'Retrè'}</span>
                          ))}
                        </div>
                        <div style={{ flex: 1 }} />
                        {myRole === 'CASHIER' && <span style={{ ...lbl, fontSize: 10 }}>Jodi a sèlman</span>}
                        <div onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '9px 16px', cursor: 'pointer' }}>
                          <Icon paths={['M12 3v12M7 11l5 4 5-4M5 21h14']} size={15} color="#22C55E" strokeWidth={1.8} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>Egzòti CSV</span>
                        </div>
                      </div>

                      <div style={{ ...card, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr .9fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                          <span style={lbl}>Kliyan / Deskripsyon</span>
                          <span style={lbl}>Metòd</span>
                          <span style={lbl}>Dat</span>
                          <span style={lbl}>Estatu</span>
                          <span style={{ ...lbl, textAlign: 'right' }}>Montan</span>
                        </div>
                        {txLoading ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', ...h, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Chajman...</div>
                        ) : filteredTx.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', ...h, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Pa gen tranzaksyon</div>
                        ) : filteredTx.map((r) => {
                          const isOut = r.type === 'WITHDRAWAL' || r.type === 'TRANSFER_OUT';
                          const ini = isOut ? '↑' : (r.payer?.name?.[0]?.toUpperCase() || '•');
                          const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                          return (
                            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr .9fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: isOut ? 'rgba(239,68,68,.13)' : 'rgba(34,197,94,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOut ? '#ff7a7a' : '#22C55E', fontWeight: 700, fontSize: 13 }}>{ini}</div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{isOut ? TX_TYPE_LABELS[r.type] : (r.payer?.name || r.payer?.email || TX_TYPE_LABELS[r.type])}</span>
                              </div>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{TX_TYPE_LABELS[r.type] || r.type}</span>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                              <span><span style={{ fontSize: 11, fontWeight: 700, color: st.fg, background: st.bg, borderRadius: 20, padding: '4px 10px' }}>{st.label}</span></span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: isOut ? '#fff' : '#22C55E', textAlign: 'right' }}>{isOut ? '−' : '+'}{Number(r.amount).toLocaleString('fr-HT')}</span>
                            </div>
                          );
                        })}
                      </div>

                      {(txPage > 1 || txHasMore) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                          <span onClick={() => txPage > 1 && loadTransactions(txPage - 1)} style={{ fontSize: 11, fontWeight: 700, color: txPage <= 1 ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.6)', cursor: txPage <= 1 ? 'default' : 'pointer', textTransform: 'uppercase' }}>← Anvan</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Paj {txPage} · {txTotal} total</span>
                          <span onClick={() => txHasMore && loadTransactions(txPage + 1)} style={{ fontSize: 11, fontWeight: 700, color: !txHasMore ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.6)', cursor: !txHasMore ? 'default' : 'pointer', textTransform: 'uppercase' }}>Apre →</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── WITHDRAW ── */}
                  {tab === 'withdraw' && myRole === 'OWNER' && (
                    <div style={{ maxWidth: 560 }}>
                      <div style={{ background: 'linear-gradient(140deg,rgba(255,122,0,.16),rgba(255,107,0,.05))', border: '1px solid rgba(255,122,0,.22)', borderRadius: 20, padding: 22 }}>
                        <div style={lbl}>Disponib pou Retire</div>
                        <div style={{ ...h, fontSize: 30, marginTop: 8, fontStyle: 'normal', letterSpacing: '-0.02em' }}>
                          {Number(wallet?.balance ?? 0).toLocaleString('fr-HT')} <span style={{ fontSize: 15, color: 'rgba(255,255,255,.55)' }}>HTG</span>
                        </div>
                      </div>

                      {wdSuccess ? (
                        <div style={{ ...card, padding: 22, marginTop: 14, textAlign: 'center' }}>
                          <div style={{ fontSize: 30, marginBottom: 10 }}>✓</div>
                          <p style={{ ...h, fontSize: 13, marginBottom: 6 }}>Retrè fèt avèk siksè</p>
                          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, marginBottom: 18 }}>
                            {Number(wdSuccess.transaction?.netAmount ?? 0).toLocaleString('fr-HT')} HTG net kredite sou wallet pèsonèl ou
                          </p>
                          <button onClick={() => setWdSuccess(null)} style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 14, ...h, fontSize: 11 }}>Fè yon lòt retrè</button>
                        </div>
                      ) : (
                        <div style={{ ...card, padding: 22, marginTop: 14 }}>
                          <div style={{ ...lbl, marginBottom: 12 }}>Voye Lajan an Nan</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#0A0C14', border: '1px solid rgba(255,122,0,.5)', borderRadius: 14, padding: 14 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgb(19,36,27)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E', fontWeight: 700 }}>P</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Wallet pèsonèl</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{me?.name || 'Ou menm'} · OZAMAPAY</div>
                              </div>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${ACC}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: ACC }} />
                              </div>
                            </div>
                            {[['M', 'MonCash', 'rgb(58,47,95)', '#b39bff'], ['N', 'NatCash / Bank', 'rgb(63,42,22)', '#f5b14c']].map(([ini, label, bg, fg]) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 14, opacity: .45 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg, fontWeight: 700 }}>{ini}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{label}</div>
                                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Ap vini pita</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <form onSubmit={handleWithdraw}>
                            <div style={{ ...lbl, margin: '18px 0 8px' }}>Montan (HTG)</div>
                            <input
                              type="number" min="1" step="0.01" placeholder="0"
                              value={wdAmount} onChange={(e) => setWdAmount(e.target.value)}
                              style={{ width: '100%', background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 15, color: '#fff', fontSize: 18, fontWeight: 600, outline: 'none' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                              <span>Frè retrè (1,5%)</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{Number(wdAmount) > 0 ? `${(Number(wdAmount) * 0.015).toFixed(2)} HTG` : '−'}</span>
                            </div>
                            {Number(wdAmount) > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                                <span>Net w ap resevwa</span>
                                <span style={{ color: ACC, fontWeight: 700 }}>{(Number(wdAmount) * 0.985).toFixed(2)} HTG</span>
                              </div>
                            )}

                            <div style={{ ...lbl, margin: '18px 0 8px' }}>Kòd PIN</div>
                            <input
                              type="password" inputMode="numeric" maxLength={6} placeholder="••••"
                              value={wdPin} onChange={(e) => setWdPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              style={{ width: '100%', background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 15, color: '#fff', fontSize: 18, fontWeight: 600, outline: 'none', letterSpacing: 6 }}
                            />

                            {wdError && <p style={{ color: '#ff7a7a', fontSize: 11, fontWeight: 700, textAlign: 'center', marginTop: 12, textTransform: 'uppercase' }}>{wdError}</p>}

                            <button type="submit" disabled={wdLoading} style={{
                              width: '100%', marginTop: 18, background: ACC, border: 'none', borderRadius: 14, height: 52,
                              fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '.03em', fontSize: 14, color: '#0A0C14', cursor: 'pointer',
                              opacity: wdLoading ? .6 : 1,
                            }}>
                              {wdLoading ? 'Ap trete...' : 'Konfime Retrè'}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TEAM ── */}
                  {tab === 'team' && myRole === 'OWNER' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{members.length} manm · jere aksè ak wòl yo</div>
                        <div onClick={() => setShowInvite((s) => !s)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: ACC, borderRadius: 12, height: 42, padding: '0 18px', cursor: 'pointer' }}>
                          <Icon paths={['M12 5v14M5 12h14']} size={17} color="#0A0C14" strokeWidth={2.4} />
                          <span style={{ fontSize: 13, fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '.03em', color: '#0A0C14' }}>Envite Manm</span>
                        </div>
                      </div>

                      {showInvite && (
                        <form onSubmit={handleInvite} style={{ ...card, padding: 20, marginBottom: 16 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
                            <div>
                              <div style={{ ...lbl, marginBottom: 8 }}>Email</div>
                              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="manm@email.com"
                                style={{ width: '100%', background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
                            </div>
                            <div>
                              <div style={{ ...lbl, marginBottom: 8 }}>Wòl</div>
                              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
                                style={{ width: '100%', background: '#0A0C14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none' }}>
                                <option value="CASHIER">Kès</option>
                                <option value="ACCOUNTANT">Kontab</option>
                              </select>
                            </div>
                            <button type="submit" disabled={inviteLoading} style={{ height: 42, padding: '0 20px', background: ACC, border: 'none', borderRadius: 12, color: '#0A0C14', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase' }}>
                              {inviteLoading ? '...' : 'Voye'}
                            </button>
                          </div>
                          {inviteError && <p style={{ color: '#ff7a7a', fontSize: 11, fontWeight: 700, marginTop: 10 }}>{inviteError}</p>}
                        </form>
                      )}

                      <div style={{ ...card, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr .6fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                          <span style={lbl}>Manm</span>
                          <span style={lbl}>Wòl</span>
                          <span style={{ ...lbl, textAlign: 'center' }}>Wallet</span>
                          <span style={{ ...lbl, textAlign: 'center' }}>Tranzaksyon</span>
                          <span style={{ ...lbl, textAlign: 'center' }}>Retrè</span>
                          <span style={lbl}></span>
                        </div>
                        {membersLoading ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', ...h, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Chajman...</div>
                        ) : members.map((m) => {
                          const role: Role = m.role;
                          const roleColors: Record<Role, [string, string]> = {
                            OWNER: [ACC, 'rgba(255,122,0,.14)'],
                            ACCOUNTANT: ['#6cb2ff', 'rgba(108,178,255,.14)'],
                            CASHIER: ['#b39bff', 'rgba(179,155,255,.14)'],
                          };
                          const perms = {
                            wallet: role === 'OWNER' || role === 'ACCOUNTANT',
                            tx: true,
                            withdraw: role === 'OWNER',
                          };
                          const avatarBg = role === 'OWNER' ? 'linear-gradient(135deg,#FF7A00,#FF9D4D)' : role === 'ACCOUNTANT' ? 'rgb(29,39,51)' : 'rgb(36,29,51)';
                          const avatarFg = role === 'OWNER' ? '#0A0C14' : role === 'ACCOUNTANT' ? '#6cb2ff' : '#b39bff';
                          return (
                            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr .6fr', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 11, background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: avatarFg, fontWeight: 700, fontSize: 14 }}>{initials(m.user?.name || m.user?.email)}</div>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{m.user?.name || m.user?.email}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.42)' }}>{m.user?.email}{!m.acceptedAt ? ' · ⏳ annatant' : ''}</div>
                                </div>
                              </div>
                              <span><span style={{ fontSize: 11, fontWeight: 700, color: roleColors[role][0], background: roleColors[role][1], borderRadius: 20, padding: '4px 11px' }}>{ROLE_LABELS[role]}</span></span>
                              <span style={{ textAlign: 'center' }}>{perms.wallet ? <Icon paths={['M5 12l5 5L20 7']} size={18} color="#22C55E" strokeWidth={2.4} /> : <Icon paths={['M6 6l12 12M18 6L6 18']} size={16} color="rgba(255,255,255,.28)" strokeWidth={2.2} />}</span>
                              <span style={{ textAlign: 'center' }}>{role === 'CASHIER' ? <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Jodi a</span> : <Icon paths={['M5 12l5 5L20 7']} size={18} color="#22C55E" strokeWidth={2.4} />}</span>
                              <span style={{ textAlign: 'center' }}>{perms.withdraw ? <Icon paths={['M5 12l5 5L20 7']} size={18} color="#22C55E" strokeWidth={2.4} /> : <Icon paths={['M6 6l12 12M18 6L6 18']} size={16} color="rgba(255,255,255,.28)" strokeWidth={2.2} />}</span>
                              <span style={{ textAlign: 'right' }}>
                                {role !== 'OWNER' && (
                                  <span onClick={() => handleRemoveMember(m.id)} style={{ fontSize: 10, fontWeight: 700, color: '#ff7a7a', cursor: 'pointer', textTransform: 'uppercase' }}>Retire</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 14, lineHeight: 1.6, maxWidth: 680 }}>
                        Kès la wè tranzaksyon jodi a sèlman, e li pa ka wè wallet ni fè retrè. Kontab la wè wallet ak tout tranzaksyon, men li pa ka fè retrè ni jere ekip la. Sèl Pwopriyetè a gen kontwòl konplè.
                      </div>
                    </>
                  )}

                  {/* ── PROFILE ── */}
                  {tab === 'profile' && (
                    <div style={{ maxWidth: 760 }}>
                      <div style={{ ...card, padding: 24, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#3a2f5f,#241d33)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b39bff', fontWeight: 700, fontSize: 26 }}>
                          {(business.businessName || 'B')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{business.businessName}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,.14)', padding: '4px 10px', borderRadius: 20 }}>
                              <Icon paths={['M5 12l5 5L20 7']} size={12} color="#22C55E" strokeWidth={2.6} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>APWOUVE</span>
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 5 }}>{business.category} · Tyè {business.tier}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: 20 }}>
                          <div style={lbl}>Enfòmasyon Biznis</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Kategori</span><span style={{ fontSize: 13, color: '#fff' }}>{business.category}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Tyè</span><span style={{ fontSize: 13, color: '#fff' }}>{business.tier}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Estati</span><span style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>{business.status}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Kreye</span><span style={{ fontSize: 13, color: '#fff' }}>{business.createdAt ? new Date(business.createdAt).toLocaleDateString('fr-FR') : '—'}</span></div>
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: 20 }}>
                          <div style={lbl}>Frè & Wòl</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Frè peman antrant</span><span style={{ fontSize: 13, color: ACC, fontWeight: 600 }}>{fee}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Frè retrè</span><span style={{ fontSize: 13, color: ACC, fontWeight: 600 }}>1.5%</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Wòl ou</span><span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{ROLE_LABELS[myRole]}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── SUPPORT ── */}
                  {tab === 'support' && (
                    <div style={{ maxWidth: 760 }}>
                      <div style={{ background: 'linear-gradient(140deg,rgba(255,122,0,.16),rgba(255,107,0,.05))', border: '1px solid rgba(255,122,0,.22)', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon paths={NAV_ICONS.support} size={24} color="#0A0C14" strokeWidth={1.8} />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ ...h, fontSize: 17 }}>Sipò Priyorite Business</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>Liy dirèk dedye pou kont biznis</div>
                        </div>
                        <div onClick={() => router.push('/support')} style={{ height: 44, borderRadius: 12, background: '#0A0C14', display: 'flex', alignItems: 'center', padding: '0 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>Kontakte nou</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                        {[
                          'Kijan pou m jenere yon QR code pou boutik mwen?',
                          'Konbyen tan retrè a pran pou rive?',
                          'Kijan frè peman antrant yo kalkile?',
                          'Kijan pou m ajoute yon anplwaye nan ekip la?',
                        ].map((q) => (
                          <div key={q} onClick={() => router.push('/support')} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                            <Icon paths={['M9.5 9.5a2.5 2.5 0 014.5 1.5c0 1.5-2 2-2 3M12 16h.01']} size={20} color={ACC} strokeWidth={1.8} />
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff' }}>{q}</span>
                            <Icon paths={['M9 5l7 7-7 7']} size={18} color="rgba(255,255,255,.4)" strokeWidth={2} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
