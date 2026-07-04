'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

type Role = 'OWNER' | 'ACCOUNTANT' | 'CASHIER';
type Tab = 'overview' | 'transactions' | 'withdraw' | 'members';

const ROLE_LABELS: Record<Role, string> = { OWNER: 'Pwopriyetè', ACCOUNTANT: 'Kontab', CASHIER: 'Kasiyè' };
const TIER_FEE: Record<string, string> = { STARTER: '2.5%', PRO: '2.0%', ENTERPRISE: '1.5%' };
const TX_TYPE_LABELS: Record<string, string> = {
  PAYMENT_RECEIVED: 'Peman Resevwa',
  WITHDRAWAL: 'Retrè',
  TRANSFER_OUT: 'Transfè',
  TOPUP: 'Rechajman',
};
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  COMPLETED: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: 'Konplete' },
  PENDING: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', label: 'Annatant' },
  PROCESSING: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', label: 'An Tretman' },
  FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Echwe' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Rejte' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Anile' },
};

const TABS_BY_ROLE: Record<Role, Tab[]> = {
  OWNER: ['overview', 'transactions', 'withdraw', 'members'],
  ACCOUNTANT: ['overview', 'transactions'],
  CASHIER: ['transactions'],
};

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Apèsi',
  transactions: 'Tranzaksyon',
  withdraw: 'Retrè',
  members: 'Manm',
};

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const [walletStats, setWalletStats] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txHasMore, setTxHasMore] = useState(false);

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

  const [showQr, setShowQr] = useState(false);

  // ── Access check ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.replace(`/login?redirect=/business/${businessId}`);
      return;
    }
    setToken(t);

    (async () => {
      try {
        const res = await fetch(`${API}/business/me`, { headers: authHeaders(t) });
        if (!res.ok) {
          setAccessError('Nou pa ka konfime aksè ou. Eseye ankò.');
          return;
        }
        const data = await res.json();

        const owned = (data?.owned || []).find((b: any) => b.id === businessId);
        if (owned) {
          setBusiness(owned);
          setMyRole('OWNER');
          setTab('overview');
          return;
        }

        const membership = (data?.member || []).find((b: any) => b.id === businessId);
        if (membership) {
          setBusiness(membership);
          setMyRole(membership.memberRole as Role);
          setTab(TABS_BY_ROLE[membership.memberRole as Role][0]);
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

  // ── Data loaders (only once business is APPROVED and role known) ────────
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

  // ── Withdraw submit ──────────────────────────────────────────────────────
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWdError('');
    const amountNum = Number(wdAmount);
    if (!amountNum || amountNum <= 0) {
      setWdError('Antre yon montan valid.');
      return;
    }
    if (wdPin.length < 4) {
      setWdError('Antre kòd PIN ou.');
      return;
    }
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

  // ── Invite submit ────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail) {
      setInviteError('Antre yon email.');
      return;
    }
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
    } catch {
      // silent — list stays as-is, user can retry
    }
  };

  const wallet = business?.wallet;
  const fee = TIER_FEE[business?.tier] ?? '2.5%';
  const payLink = businessId ? `https://ozamapay.com/pay?business=${businessId}` : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F121E] text-white pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xl font-black italic text-white tracking-tighter">
            OZAMA<span className="text-[#FF7A00]">PAY</span>
          </span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/40 font-black italic uppercase text-[10px] tracking-widest active:opacity-60"
          >
            ← Dashboard
          </button>
        </div>

        {checking && (
          <div className="text-center text-white/40 font-black italic uppercase text-xs py-20">
            Chajman...
          </div>
        )}

        {!checking && accessError && (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/60 font-black italic uppercase text-xs mb-6">{accessError}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
            >
              Ale nan Dashboard
            </button>
          </div>
        )}

        {!checking && !accessError && business && (
          <>
            {/* ── Header card — always visible ── */}
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-white font-black italic text-xl tracking-tight">{business.businessName}</h1>
                  <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mt-1">
                    {business.category} · {business.tier}
                  </p>
                </div>
                <span
                  className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: business.status === 'APPROVED' ? 'rgba(34,197,94,0.15)' : business.status === 'PENDING' ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
                    color: business.status === 'APPROVED' ? '#4ade80' : business.status === 'PENDING' ? '#fb923c' : '#f87171',
                  }}
                >
                  {business.status}
                </span>
              </div>
              {myRole && (
                <span className="inline-block text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20">
                  Wòl ou: {ROLE_LABELS[myRole]}
                </span>
              )}
            </div>

            {/* ── PENDING state ── */}
            {business.status === 'PENDING' && (
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-white font-black italic uppercase text-sm mb-2">Aplikasyon ou an atant apwobasyon</p>
                <p className="text-white/50 text-sm">Admin ap revize demand ou a. W ap resevwa yon imel lè li apwouve.</p>
              </div>
            )}

            {/* ── REJECTED state ── */}
            {business.status === 'REJECTED' && (
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
                <div className="text-4xl mb-4">✕</div>
                <p className="text-white font-black italic uppercase text-sm mb-2">Aplikasyon ou an te refize</p>
                <p className="text-white/50 text-sm">
                  {business.application?.adminNote || 'Pa gen rezon espesifik bay. Kontakte sipò pou plis detay.'}
                </p>
              </div>
            )}

            {/* ── APPROVED — full dashboard ── */}
            {business.status === 'APPROVED' && myRole && (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                  {TABS_BY_ROLE[myRole].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2.5 rounded-xl font-black italic uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${
                        tab === t ? 'bg-[#FF7A00] text-white' : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      {TAB_LABELS[t]}
                    </button>
                  ))}
                </div>

                {/* ── OVERVIEW ── */}
                {tab === 'overview' && (
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                      <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2">Balans Wallet Biznis</p>
                      {walletLoading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <p className="text-white font-black text-3xl">
                          {Number(wallet?.balance ?? 0).toLocaleString('fr-HT')} <span className="text-lg text-white/40">HTG</span>
                        </p>
                      )}
                      {walletStats?.stats && (
                        <div className="flex gap-4 mt-4 text-[11px] text-white/50">
                          <span>Mwa sa a: <strong className="text-white">{Number(walletStats.stats.monthlyReceived).toLocaleString('fr-HT')} HTG</strong></span>
                          <span>Tranzaksyon: <strong className="text-white">{walletStats.stats.transactionCount}</strong></span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowQr(true)}
                      className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                    >
                      Resevwa Peman
                    </button>
                  </div>
                )}

                {/* ── TRANSACTIONS ── */}
                {tab === 'transactions' && (
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    {myRole === 'CASHIER' && (
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Tranzaksyon jodi a sèlman</p>
                    )}
                    {txLoading ? (
                      <div className="text-center text-white/40 font-black italic uppercase text-xs py-10">Chajman...</div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center text-white/30 font-black italic uppercase text-xs py-10">Pa gen tranzaksyon</div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((txItem) => {
                          const st = STATUS_STYLE[txItem.status] || STATUS_STYLE.PENDING;
                          return (
                            <div key={txItem.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div>
                                <p className="font-black italic text-xs text-white">{TX_TYPE_LABELS[txItem.type] || txItem.type}</p>
                                <p className="text-white/40 text-[10px] mt-0.5">
                                  {new Date(txItem.createdAt).toLocaleString('fr-FR')}
                                  {txItem.payer?.name ? ` · ${txItem.payer.name}` : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-sm text-white">{Number(txItem.amount).toLocaleString('fr-HT')} HTG</p>
                                <p className="text-white/30 text-[9px]">frè {Number(txItem.fee).toLocaleString('fr-HT')} HTG</p>
                                <span className="inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>
                                  {st.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(txPage > 1 || txHasMore) && (
                      <div className="flex items-center justify-between mt-5">
                        <button
                          disabled={txPage <= 1 || txLoading}
                          onClick={() => loadTransactions(txPage - 1)}
                          className="text-[10px] font-black uppercase text-white/40 disabled:opacity-30 active:opacity-60"
                        >
                          ← Anvan
                        </button>
                        <span className="text-[10px] text-white/30">Paj {txPage} · {txTotal} total</span>
                        <button
                          disabled={!txHasMore || txLoading}
                          onClick={() => loadTransactions(txPage + 1)}
                          className="text-[10px] font-black uppercase text-white/40 disabled:opacity-30 active:opacity-60"
                        >
                          Apre →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── WITHDRAW (OWNER only) ── */}
                {tab === 'withdraw' && myRole === 'OWNER' && (
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-1">Retrè → Wallet Pèsonèl</p>
                    <p className="text-white/30 text-[11px] mb-5">MonCash & Bank ap vini pita. Frè: <strong className="text-[#FF7A00]">1.5%</strong></p>

                    {wdSuccess ? (
                      <div className="text-center py-4">
                        <div className="text-3xl mb-3">✓</div>
                        <p className="text-white font-black italic uppercase text-xs mb-1">Retrè fèt avèk siksè</p>
                        <p className="text-white/40 text-[11px] mb-5">
                          {Number(wdSuccess.transaction?.netAmount ?? 0).toLocaleString('fr-HT')} HTG net kredite sou wallet pèsonèl ou
                        </p>
                        <button
                          onClick={() => setWdSuccess(null)}
                          className="w-full py-3 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                        >
                          Fè yon lòt retrè
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                          <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">Montan (HTG) *</label>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={wdAmount}
                            onChange={(e) => setWdAmount(e.target.value)}
                            placeholder="1000"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition"
                          />
                          {Number(wdAmount) > 0 && (
                            <p className="text-white/30 text-[10px] mt-2">
                              Frè (1.5%): {(Number(wdAmount) * 0.015).toFixed(2)} HTG · Net: {(Number(wdAmount) * 0.985).toFixed(2)} HTG
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">Kòd PIN *</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={wdPin}
                            onChange={(e) => setWdPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="••••"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition tracking-[6px]"
                          />
                        </div>
                        {wdError && <p className="text-red-400 font-black italic uppercase text-[10px] text-center">{wdError}</p>}
                        <button
                          type="submit"
                          disabled={wdLoading}
                          className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                        >
                          {wdLoading ? (
                            <span className="flex items-center justify-center gap-3">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Ap trete...
                            </span>
                          ) : 'Fè Retrè'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* ── MEMBERS (OWNER only) ── */}
                {tab === 'members' && myRole === 'OWNER' && (
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                      {membersLoading ? (
                        <div className="text-center text-white/40 font-black italic uppercase text-xs py-10">Chajman...</div>
                      ) : members.length === 0 ? (
                        <div className="text-center text-white/30 font-black italic uppercase text-xs py-10">Pa gen manm</div>
                      ) : (
                        <div className="space-y-3">
                          {members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div>
                                <p className="font-black italic text-xs text-white">{m.user?.name || m.user?.email}</p>
                                <p className="text-white/40 text-[10px] mt-0.5">{m.user?.email}</p>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF7A00]/10 text-[#FF7A00]">
                                    {ROLE_LABELS[m.role as Role] || m.role}
                                  </span>
                                  <p className="text-white/30 text-[9px] mt-1">
                                    {m.acceptedAt ? '✓ Aksepte' : '⏳ Annatant'}
                                  </p>
                                </div>
                                {m.role !== 'OWNER' && (
                                  <button
                                    onClick={() => handleRemoveMember(m.id)}
                                    className="text-red-400 text-[10px] font-black uppercase active:opacity-60"
                                  >
                                    Retire
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!showInvite ? (
                      <button
                        onClick={() => setShowInvite(true)}
                        className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                      >
                        Envite yon Manm
                      </button>
                    ) : (
                      <form onSubmit={handleInvite} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                        <div>
                          <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">Email *</label>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="manm@email.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">Wòl</label>
                          <div className="grid grid-cols-2 gap-3">
                            {(['CASHIER', 'ACCOUNTANT'] as const).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setInviteRole(r)}
                                className={`py-3 rounded-xl border text-xs font-black uppercase italic transition-all ${
                                  inviteRole === r ? 'bg-[#FF7A00] border-[#FF7A00] text-white' : 'bg-white/5 border-white/10 text-white/40'
                                }`}
                              >
                                {ROLE_LABELS[r]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {inviteError && <p className="text-red-400 font-black italic uppercase text-[10px] text-center">{inviteError}</p>}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => { setShowInvite(false); setInviteError(''); }}
                            className="flex-1 py-3.5 bg-white/5 text-white/60 border border-white/10 rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                          >
                            Anile
                          </button>
                          <button
                            type="submit"
                            disabled={inviteLoading}
                            className="flex-1 py-3.5 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                          >
                            {inviteLoading ? '...' : 'Voye Envitasyon'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── QR modal ── */}
      {showQr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowQr(false)}>
          <div className="bg-[#0F121E] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-4">Skane pou peye {business?.businessName}</p>
            <div className="p-4 rounded-2xl border border-white/10 bg-white inline-block mb-4">
              <QRCodeSVG value={payLink} size={200} fgColor="#0F121E" bgColor="#FFFFFF" level="M" />
            </div>
            <p className="text-white/30 text-[10px] mb-2">Frè tranzaksyon: <span className="text-[#FF7A00] font-bold">{fee}</span></p>
            <p className="text-white/20 text-[9px] break-all mb-6">{payLink}</p>
            <button
              onClick={() => setShowQr(false)}
              className="w-full py-3.5 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
            >
              Fèmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
