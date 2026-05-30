"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
  Droplets,
  TrendingUp,
  Users,
  Shield,
  BarChart3,
  ChevronRight,
  X,
  Wallet,
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
  PENDING: "bg-[#FF6B00]/15 text-[#FF6B00]",
  APPROVED: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
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

  const [activeAction, setActiveAction] = useState<"NONE" | "TOPUP" | "WITHDRAW" | "LIQUIDITY">("NONE");
  const [actionLoading, setActionLoading] = useState(false);

  // form fields
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [userPin, setUserPin] = useState("");
  const [liquidityAmount, setLiquidityAmount] = useState("");
  const [liquidityMethod, setLiquidityMethod] = useState<"MONCASH" | "ZELLE" | "CASH" | "BANK">("MONCASH");
  const [liquidityAccountInfo, setLiquidityAccountInfo] = useState("");

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${agentData?.agentCode || ""}`
      : "";

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

    try {
      const [agentRes, commRes, liqRes] = await Promise.all([
        fetch(`${backendUrl}/agents/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/agents/commissions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/agents/liquidity-requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!agentRes.ok) { window.location.href = "/dashboard"; return; }
      const agentJson = await agentRes.json();
      if (!agentJson?.agent && !agentJson?.agentCode) { window.location.href = "/dashboard"; return; }
      setAgentData(agentJson.agent || agentJson);

      if (commRes.ok) { const j = await commRes.json(); setCommissions(Array.isArray(j) ? j : []); }
      if (liqRes.ok) { const j = await liqRes.json(); setLiquidityRequests(Array.isArray(j) ? j : []); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleAgentOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !amount) { alert("Tanpri ranpli tout chan yo"); return; }
    if (activeAction === "WITHDRAW" && !userPin) { alert("PIN kliyan an obligatwa"); return; }

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
        alert("Operasyon an reyisi ✅");
        setClientEmail(""); setAmount(""); setUserPin(""); setActiveAction("NONE");
        fetchAll();
      } else {
        alert(data.message || "Erè pandan operasyon an");
      }
    } catch { alert("Erè rezo. Backend la pa reponn."); }
    finally { setActionLoading(false); }
  };

  const handleLiquidityRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) { alert("Montan invalide"); return; }
    if (!liquidityAccountInfo.trim()) { alert("Enfòmasyon kont lan obligatwa"); return; }

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
        alert("Demand likidite voye avèk siksè ✅");
        setLiquidityAmount(""); setLiquidityAccountInfo(""); setActiveAction("NONE");
        fetchAll();
      } else {
        alert(data.message || "Erè nan demand lan");
      }
    } catch { alert("Erè rezo"); }
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
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#0A0B0F] text-white font-space-grotesk">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-[#0A0B0F]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-lg mx-auto px-5 h-16 flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#FF6B00] uppercase">OzamaPay</p>
            <h1 className="text-sm font-bold uppercase tracking-widest">Agency Desk</h1>
          </div>

          <button
            onClick={fetchAll}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-5">

        {/* ── HERO CARD ── */}
        <div className={`relative rounded-3xl border ${lm.border} bg-gradient-to-br from-[#111318] to-[#0A0B0F] p-7 shadow-xl ${lm.glow}`}>
          {/* Level badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${lm.bg} ${lm.color} border ${lm.border}`}>
            <Shield size={10} />
            {level}
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-white/40 font-medium mb-1">Biznis</p>
              <h2 className="text-xl font-bold leading-tight">{agentData?.businessName || "Ozama Point"}</h2>

              {/* Agent code copy */}
              <button
                onClick={() => copyText(agentData?.agentCode || "", setCopiedCode)}
                className="mt-3 flex items-center gap-2 group"
              >
                <span className="text-xs font-mono text-white/50 group-hover:text-white/80 transition">
                  {agentData?.agentCode}
                </span>
                <span className={`transition ${copiedCode ? "text-emerald-400" : "text-white/30 group-hover:text-[#FF6B00]"}`}>
                  {copiedCode ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </span>
              </button>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Balans</p>
              <p className="text-3xl font-bold text-[#FF6B00] leading-none">{fmt(walletBalance)}</p>
              <p className="text-xs text-white/40 mt-0.5 font-medium">HTG</p>
            </div>
          </div>

          {/* Referral link row */}
          <div className="mt-6 bg-white/[0.04] rounded-2xl p-4 flex items-center gap-3 border border-white/[0.06]">
            <p className="flex-1 text-[10px] text-white/50 font-mono break-all leading-relaxed">{referralLink}</p>
            <button
              onClick={() => copyText(referralLink, setCopiedLink)}
              className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                copiedLink
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/30"
              }`}
            >
              {copiedLink ? <><CheckCircle2 size={11} /> Copie</> : <><Copy size={11} /> Copier</>}
            </button>
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Users size={16} />, label: "Total KYC", value: totalKyc.toString(), unit: "clients" },
            { icon: <TrendingUp size={16} />, label: "Commission Total", value: fmt(totalCommission), unit: "HTG" },
            { icon: <BarChart3 size={16} />, label: "Volume Topup", value: fmt(totalTopup), unit: "HTG" },
            { icon: <Shield size={16} />, label: "Trust Score", value: trustScore.toFixed(0), unit: "/ 100" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111318] border border-white/[0.06] rounded-2xl p-5">
              <div className="text-[#FF6B00] mb-3">{s.icon}</div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5 font-medium">{s.unit}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK ACTIONS or FORMS ── */}
        {activeAction === "NONE" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Topup Kliyan", action: "TOPUP" as const, icon: <ArrowUpCircle size={22} />, color: "text-emerald-400", bg: "bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/20" },
              { label: "Retrè Kliyan", action: "WITHDRAW" as const, icon: <ArrowDownCircle size={22} />, color: "text-red-400", bg: "bg-red-400/10 hover:bg-red-400/20 border-red-400/20" },
              { label: "Mande Likidite", action: "LIQUIDITY" as const, icon: <Droplets size={22} />, color: "text-[#FF6B00]", bg: "bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 border-[#FF6B00]/20" },
            ].map((btn) => (
              <button
                key={btn.action}
                onClick={() => setActiveAction(btn.action)}
                className={`flex flex-col items-center gap-2.5 py-6 rounded-2xl border transition ${btn.bg} ${btn.color}`}
              >
                {btn.icon}
                <span className="text-[10px] font-bold uppercase tracking-wide text-center leading-tight text-white/80">
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── TOPUP / WITHDRAW FORM ── */}
        {(activeAction === "TOPUP" || activeAction === "WITHDRAW") && (
          <div className="bg-[#111318] border border-white/[0.06] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-widest text-sm">
                {activeAction === "TOPUP" ? "Topup Kliyan" : "Retrè Kliyan"}
              </h3>
              <button onClick={() => setActiveAction("NONE")} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-white/50">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAgentOperation} className="space-y-3">
              <input
                type="email"
                placeholder="Email kliyan an"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm placeholder:text-white/25 transition"
              />
              {activeAction === "WITHDRAW" && (
                <input
                  type="password"
                  placeholder="PIN kliyan an (4 chif)"
                  value={userPin}
                  onChange={(e) => setUserPin(e.target.value)}
                  maxLength={4}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-red-500/30 focus:border-red-500/60 outline-none text-sm placeholder:text-white/25 text-center tracking-[0.5em] transition"
                />
              )}
              <input
                type="number"
                placeholder="Montan (HTG)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm placeholder:text-white/25 transition"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#ff7a1a] disabled:opacity-50 transition font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2"
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
          <div className="bg-[#111318] border border-white/[0.06] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold uppercase tracking-widest text-sm">Mande Likidite</h3>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Balans: <span className="text-[#FF6B00] font-bold">{fmt(walletBalance)} HTG</span>
                </p>
              </div>
              <button onClick={() => setActiveAction("NONE")} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center text-white/50">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleLiquidityRequest} className="space-y-3">
              <input
                type="number"
                placeholder="Montan (HTG)"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm placeholder:text-white/25 transition"
              />
              <select
                value={liquidityMethod}
                onChange={(e) => setLiquidityMethod(e.target.value as any)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm text-white/80 transition cursor-pointer"
              >
                <option value="MONCASH">MonCash</option>
                <option value="ZELLE">Zelle</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
              </select>
              <input
                type="text"
                placeholder="Nimewo / Detay kont"
                value={liquidityAccountInfo}
                onChange={(e) => setLiquidityAccountInfo(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm placeholder:text-white/25 transition"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#ff7a1a] disabled:opacity-50 transition font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2"
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
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-[#FF6B00]" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Historique Commission
            </h4>
          </div>

          <div className="bg-[#111318] border border-white/[0.06] rounded-3xl overflow-hidden">
            {commissions.length === 0 ? (
              <div className="py-10 text-center">
                <Wallet size={24} className="mx-auto text-white/10 mb-2" />
                <p className="text-xs text-white/25">Pa gen komisyon pou kounye a</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {commissions.map((comm: any) => (
                  <div key={comm.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${COMM_TYPE_BADGE[comm.type] || "bg-white/10 text-white/50"}`}>
                        {comm.type}
                      </span>
                      <span className="text-[11px] text-white/30">
                        {new Date(comm.createdAt).toLocaleDateString("fr-HT", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">+{fmt(Number(comm.amount))} HTG</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── LIQUIDITY REQUESTS HISTORY ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Droplets size={13} className="text-[#FF6B00]" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Demand Likidite
            </h4>
          </div>

          <div className="bg-[#111318] border border-white/[0.06] rounded-3xl overflow-hidden">
            {liquidityRequests.length === 0 ? (
              <div className="py-10 text-center">
                <Droplets size={24} className="mx-auto text-white/10 mb-2" />
                <p className="text-xs text-white/25">Pa gen demand likidite pou kounye a</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {liquidityRequests.map((req: any) => (
                  <div key={req.id} className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wide ${LIQ_STATUS_BADGE[req.status] || "bg-white/10 text-white/50"}`}>
                          {req.status}
                        </span>
                        <span className="text-[9px] font-mono text-white/30 uppercase">{req.method}</span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate">{req.accountInfo}</p>
                      {req.adminNote && (
                        <p className="text-[10px] text-white/30 italic mt-0.5">"{req.adminNote}"</p>
                      )}
                      <p className="text-[10px] text-white/20 mt-1">
                        {new Date(req.createdAt).toLocaleDateString("fr-HT", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-white shrink-0">{fmt(Number(req.amount))} HTG</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
