"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  CheckCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  Droplets,
  TrendingUp,
  BadgeCheck,
  Star,
  Shield,
  ChevronRight,
  X,
  Wallet,
  Zap,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const LEVEL_META: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  BRONZE: {
    color: "text-amber-600",
    bg: "bg-amber-600/10",
    border: "border-amber-600/30",
    glow: "shadow-amber-600/20",
  },
  SILVER: {
    color: "text-slate-300",
    bg: "bg-slate-300/10",
    border: "border-slate-300/30",
    glow: "shadow-slate-300/20",
  },
  GOLD: {
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    glow: "shadow-yellow-400/20",
  },
  BLACK: {
    color: "text-white",
    bg: "bg-white/10",
    border: "border-white/30",
    glow: "shadow-white/10",
  },
};

const COMM_TYPE_BADGE: Record<string, string> = {
  TOPUP: "bg-emerald-500/15 text-emerald-400",
  WITHDRAW: "bg-red-500/15 text-red-400",
  KYC: "bg-blue-500/15 text-blue-400",
  REFERRAL: "bg-purple-500/15 text-purple-400",
};

const LIQ_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-[#FF6B00]/10 text-[#FF6B00]",
  APPROVED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-red-500/10 text-red-500",
};

function fmt(n: number) {
  return n.toLocaleString("fr-HT");
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const [agentData, setAgentData] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [liquidityRequests, setLiquidityRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [activeAction, setActiveAction] = useState<"NONE" | "TOPUP" | "WITHDRAW" | "LIQUIDITY">("NONE");
  const [actionLoading, setActionLoading] = useState(false);

  // form fields
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [userPin, setUserPin] = useState("");
  const [liquidityAmount, setLiquidityAmount] = useState("");
  const [liquidityMethod, setLiquidityMethod] = useState<"MONCASH" | "ZELLE" | "CASH" | "BANK">("MONCASH");
  const [liquidityAccountInfo, setLiquidityAccountInfo] = useState("");

  const [usdRate, setUsdRate] = useState<number>(135);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // toast
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);
  const [toastFading, setToastFading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${agentData?.agentCode || ""}`
      : "";

  // ── toast helpers ────────────────────────────────────────────────────────

  const showToast = (message: string, type: "error" | "success" | "warning" = "error") => {
    setToastFading(false);
    setToast({ message, type });
    setTimeout(() => setToastFading(true), 3600);
    setTimeout(() => setToast(null), 4000);
  };

  const closeToast = () => {
    setToastFading(true);
    setTimeout(() => { setToast(null); setToastFading(false); }, 350);
  };

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

    try {
      const [agentRes, commRes, liqRes, ratesRes] = await Promise.all([
        fetch(`${backendUrl}/agents/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/agents/commissions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/agents/liquidity-requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/rates`),
      ]);

      if (!agentRes.ok) { window.location.href = "/dashboard"; return; }
      const agentJson = await agentRes.json();
      if (!agentJson?.agent && !agentJson?.agentCode) { window.location.href = "/dashboard"; return; }
      setAgentData(agentJson.agent || agentJson);

      if (commRes.ok) { const j = await commRes.json(); setCommissions(Array.isArray(j) ? j : []); }
      if (liqRes.ok) { const j = await liqRes.json(); setLiquidityRequests(Array.isArray(j) ? j : []); }
      if (ratesRes.ok) {
        const ratesJson = await ratesRes.json();
        const rate = Array.isArray(ratesJson)
          ? ratesJson.find((r: any) => r.key === "USD_HTG")?.value
          : undefined;
        if (rate) setUsdRate(Number(rate));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

    // Always verify role from the API — never trust the cached JWT role
    fetch(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("auth/me response:", JSON.stringify(data));
        console.log("role:", data.role);
        console.log("agent status:", data.agent?.status);
        console.log("condition result:", data.role === "AGENT" || data.role === "SUPER_ADMIN");
        if (
          data.role === "AGENT" ||
          data.role === "SUPER_ADMIN"
        ) {
          setUser(data);
          fetchAll();
        } else {
          window.location.href = "/dashboard";
        }
      })
      .catch(() => { window.location.href = "/login"; });
  }, []);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleAgentOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !amount) { showToast("Tanpri ranpli tout chan yo", "error"); return; }
    if (activeAction === "WITHDRAW" && !userPin) { showToast("PIN kliyan an obligatwa", "error"); return; }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    const endpoint = activeAction === "TOPUP" ? "/agents/topup" : "/agents/withdraw-user";
    const payload: any = { email: clientEmail.trim().toLowerCase(), amount: parseFloat(amount) };
    if (activeAction === "WITHDRAW") payload.userPin = userPin.trim();

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Operasyon an reyisi ✓", "success");
        setClientEmail(""); setAmount(""); setUserPin(""); setActiveAction("NONE");
        fetchAll();
      } else {
        showToast(data.message || "Erè pandan operasyon an", "error");
      }
    } catch { showToast("Erè rezo. Backend la pa reponn.", "error"); }
    finally { setActionLoading(false); }
  };

  const handleLiquidityRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) { showToast("Montan invalide", "error"); return; }
    if (!liquidityAccountInfo.trim()) { showToast("Enfòmasyon kont lan obligatwa", "error"); return; }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${backendUrl}/agents/liquidity-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(liquidityAmount), method: liquidityMethod, accountInfo: liquidityAccountInfo.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Demand likidite voye avèk siksè ✓", "success");
        setLiquidityAmount(""); setLiquidityAccountInfo(""); setActiveAction("NONE");
        fetchAll();
      } else {
        showToast(data.message || "Erè nan demand lan", "error");
      }
    } catch { showToast("Erè rezo", "error"); }
    finally { setActionLoading(false); }
  };

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const level: string = agentData?.level || "BRONZE";
  const lm = LEVEL_META[level] || LEVEL_META.BRONZE;
  const walletBalance = Number(agentData?.wallet?.balance || 0);
  const totalCommission = Number(agentData?.totalCommission || 0);
  const totalKyc = Number(agentData?.totalKyc || 0);
  const totalTopup = Number(agentData?.totalTopupVolume || 0);
  const trustScore = Number(agentData?.trustScore || 100);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-white text-[#0F121E] font-space-grotesk overflow-x-hidden relative pb-28">

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            backdropFilter: "blur(20px)",
            background: "rgba(15,18,30,0.95)",
            opacity: toastFading ? 0 : 1,
            transform: toastFading ? "translateY(-6px)" : "translateY(0)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
          className="fixed top-6 left-4 right-4 z-[999] border border-white/10 text-white px-4 py-4 rounded-2xl shadow-xl"
        >
          <div className="flex items-center gap-3">
            <Zap size={15} className={`flex-shrink-0 ${toast.type === "success" ? "text-green-400" : toast.type === "warning" ? "text-yellow-400" : "text-[#FF6B00]"}`} />
            <span className="flex-1 font-black italic uppercase text-[10px] tracking-widest leading-relaxed">{toast.message}</span>
            <button onClick={closeToast} className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all">
              <X size={13} className="text-white/50" />
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#F0F0F0] shadow-sm">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="w-9 h-9 rounded-xl border border-[#F0F0F0] flex items-center justify-center text-[#0F121E] hover:bg-[#F8F9FA] transition"
          >
            <ArrowLeft size={17} />
          </button>

          <span className="text-sm font-black tracking-[0.18em] uppercase text-[#FF6B00]">Agency Desk</span>

          <button
            onClick={fetchAll}
            className="w-9 h-9 rounded-xl border border-[#F0F0F0] flex items-center justify-center text-[#0F121E] hover:bg-[#F8F9FA] transition"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* ── HERO (sticky under header) ── */}
      <div className="sticky top-14 z-40 bg-white px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto bg-[#0F121E] rounded-3xl p-6 shadow-xl">

          {/* Level + Trust Score */}
          <div className="flex items-center justify-between mb-4">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${lm.bg} ${lm.color} border ${lm.border}`}>
              <Shield size={10} />
              {level}
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <Star size={10} className="text-yellow-400" />
              <span className="text-[10px] font-bold text-white/70">{trustScore.toFixed(0)}<span className="text-white/30"> / 100</span></span>
            </div>
          </div>

          {/* Business name + agent code */}
          <h2 className="text-xl font-black text-white leading-tight mb-1">
            {agentData?.businessName || "Ozama Point"}
          </h2>
          <button
            onClick={() => copyText(agentData?.agentCode || "", setCopiedCode)}
            className="flex items-center gap-2 group mb-5"
          >
            <span className="text-xs font-mono text-[#FF6B00] group-hover:text-[#ff8a33] transition">
              {agentData?.agentCode}
            </span>
            <span className="text-white/30 group-hover:text-[#FF6B00] transition">
              {copiedCode ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </span>
          </button>

          {/* Balance + referral */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Balans Ajan</p>
              <p className="text-3xl font-black text-[#FF6B00] leading-none">{fmt(walletBalance)}</p>
              <p className="text-xs text-white/30 mt-0.5 font-medium">HTG</p>
            </div>
            <button
              onClick={() => copyText(referralLink, setCopiedLink)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition ${
                copiedLink
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : "bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/20 hover:bg-[#FF6B00]/25"
              }`}
            >
              {copiedLink ? <><CheckCheck size={12} /> Copie</> : <><Copy size={12} /> Lyen Referral</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BadgeCheck size={18} className="text-emerald-500" />, label: "Total KYC", value: totalKyc.toString(), unit: "clients", iconBg: "bg-emerald-50" },
            { icon: <TrendingUp size={18} className="text-[#FF6B00]" />, label: "Commission", value: fmt(totalCommission), unit: "HTG", iconBg: "bg-orange-50" },
            { icon: <ArrowUpCircle size={18} className="text-blue-500" />, label: "Vol. Topup", value: fmt(totalTopup), unit: "HTG", iconBg: "bg-blue-50" },
            { icon: <Star size={18} className="text-purple-500" />, label: "Trust Score", value: trustScore.toFixed(0), unit: "/ 100", iconBg: "bg-purple-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#F0F0F0] rounded-2xl p-4">
              <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                {s.icon}
              </div>
              <p className="text-[10px] font-semibold text-[#0F121E]/40 uppercase tracking-wider mb-0.5">{s.label}</p>
              <p className="text-lg font-black text-[#0F121E] leading-none">{s.value}</p>
              <p className="text-[10px] text-[#0F121E]/30 mt-0.5 font-medium">{s.unit}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK ACTIONS or FORMS ── */}
        {activeAction === "NONE" && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F121E]/40 px-1">Aksyon</p>
            {[
              {
                action: "TOPUP" as const,
                icon: <ArrowUpCircle size={20} className="text-[#FF6B00]" />,
                iconBg: "bg-[#FF6B00]/10",
                title: "Topup Kliyan",
                sub: "Ajoute lajan nan kont yon kliyan",
              },
              {
                action: "WITHDRAW" as const,
                icon: <ArrowDownCircle size={20} className="text-red-500" />,
                iconBg: "bg-red-50",
                title: "Retrè Kliyan",
                sub: "Retire lajan nan kont yon kliyan",
              },
              {
                action: "LIQUIDITY" as const,
                icon: <Wallet size={20} className="text-blue-500" />,
                iconBg: "bg-blue-50",
                title: "Mande Likidite",
                sub: "Fè yon demann recharj pou kont ou",
              },
            ].map((btn) => (
              <button
                key={btn.action}
                onClick={() => setActiveAction(btn.action)}
                className="w-full bg-white border border-[#F0F0F0] rounded-2xl p-5 flex items-center gap-4 hover:border-[#FF6B00]/30 hover:shadow-sm transition text-left"
              >
                <div className={`w-11 h-11 ${btn.iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
                  {btn.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0F121E]">{btn.title}</p>
                  <p className="text-[11px] text-[#0F121E]/40 mt-0.5">{btn.sub}</p>
                </div>
                <ChevronRight size={16} className="text-[#0F121E]/30 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* ── TOPUP / WITHDRAW FORM ── */}
        {(activeAction === "TOPUP" || activeAction === "WITHDRAW") && (
          <div className="bg-white border border-[#F0F0F0] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setActiveAction("NONE")}
                className="w-8 h-8 rounded-xl border border-[#F0F0F0] flex items-center justify-center text-[#0F121E]/50 hover:bg-[#F8F9FA] transition"
              >
                <ArrowLeft size={14} />
              </button>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0F121E]">
                  {activeAction === "TOPUP" ? "Topup Kliyan" : "Retrè Kliyan"}
                </h3>
                <p className="text-[10px] text-[#0F121E]/40 mt-0.5">
                  {activeAction === "TOPUP" ? "Ajoute lajan nan kont kliyan" : "Retire lajan nan kont kliyan"}
                </p>
              </div>
            </div>

            <form onSubmit={handleAgentOperation} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">Email Kliyan</label>
                <input
                  type="email"
                  placeholder="kliyan@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm placeholder:text-[#0F121E]/25 transition"
                />
              </div>
              {activeAction === "WITHDRAW" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">PIN Kliyan (4 chif)</label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    maxLength={4}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-red-200 focus:border-red-400 focus:bg-white outline-none text-sm placeholder:text-[#0F121E]/25 text-center tracking-[0.5em] transition"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">Montan (HTG)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm placeholder:text-[#0F121E]/25 transition"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#e85f00] disabled:opacity-50 transition font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2 mt-1"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Egzekite <ChevronRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── LIQUIDITY FORM ── */}
        {activeAction === "LIQUIDITY" && (
          <div className="bg-white border border-[#F0F0F0] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setActiveAction("NONE")}
                className="w-8 h-8 rounded-xl border border-[#F0F0F0] flex items-center justify-center text-[#0F121E]/50 hover:bg-[#F8F9FA] transition"
              >
                <ArrowLeft size={14} />
              </button>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0F121E]">Mande Likidite</h3>
                <p className="text-[10px] text-[#0F121E]/40 mt-0.5">
                  Balans: <span className="text-[#FF6B00] font-bold">{fmt(walletBalance)} HTG</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleLiquidityRequest} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">Montan (HTG)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={liquidityAmount}
                  onChange={(e) => setLiquidityAmount(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm placeholder:text-[#0F121E]/25 transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">Metòd</label>
                <select
                  value={liquidityMethod}
                  onChange={(e) => setLiquidityMethod(e.target.value as any)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm text-[#0F121E] transition cursor-pointer"
                >
                  <option value="MONCASH">MonCash</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0F121E]/50 mb-1.5 block">Nimewo / Detay Kont</label>
                <input
                  type="text"
                  placeholder="Nimewo kont ou"
                  value={liquidityAccountInfo}
                  onChange={(e) => setLiquidityAccountInfo(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm placeholder:text-[#0F121E]/25 transition"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#e85f00] disabled:opacity-50 transition font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2 mt-1"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Voye Demand <ChevronRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── COMMISSION HISTORY ── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <TrendingUp size={13} className="text-[#FF6B00]" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0F121E]/40">
              Historique Commission
            </h4>
          </div>

          {commissions.length === 0 ? (
            <div className="bg-white border border-[#F0F0F0] rounded-2xl py-10 text-center">
              <Wallet size={24} className="mx-auto text-[#0F121E]/10 mb-2" />
              <p className="text-xs text-[#0F121E]/25">Pa gen komisyon pou kounye a</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((comm: any) => (
                <div key={comm.id} className="bg-white border border-[#F0F0F0] rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <BadgeCheck size={14} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wide ${COMM_TYPE_BADGE[comm.type] || "bg-[#F0F0F0] text-[#0F121E]/50"}`}>
                        {comm.type}
                      </span>
                      <p className="text-[10px] text-[#0F121E]/30 mt-0.5">
                        {new Date(comm.createdAt).toLocaleDateString("fr-HT", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+{fmt(Number(comm.amount))} HTG</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── LIQUIDITY REQUESTS HISTORY ── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Wallet size={13} className="text-[#FF6B00]" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0F121E]/40">
              Demand Likidite
            </h4>
          </div>

          {liquidityRequests.length === 0 ? (
            <div className="bg-white border border-[#F0F0F0] rounded-2xl py-10 text-center">
              <Droplets size={24} className="mx-auto text-[#0F121E]/10 mb-2" />
              <p className="text-xs text-[#0F121E]/25">Pa gen demand likidite pou kounye a</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liquidityRequests.map((req: any) => (
                <div key={req.id} className="bg-white border border-[#F0F0F0] rounded-2xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wide ${LIQ_STATUS_BADGE[req.status] || "bg-[#F0F0F0] text-[#0F121E]/50"}`}>
                          {req.status}
                        </span>
                        <span className="text-[9px] font-mono text-[#0F121E]/30 uppercase bg-[#F8F9FA] px-2 py-0.5 rounded-lg">{req.method}</span>
                      </div>
                      <p className="text-[11px] text-[#0F121E]/50 truncate">{req.accountInfo}</p>
                      {req.adminNote && (
                        <p className="text-[10px] text-[#0F121E]/30 italic mt-0.5">"{req.adminNote}"</p>
                      )}
                      <p className="text-[10px] text-[#0F121E]/20 mt-1">
                        {new Date(req.createdAt).toLocaleDateString("fr-HT", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-black text-[#0F121E] shrink-0">{fmt(Number(req.amount))} HTG</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
