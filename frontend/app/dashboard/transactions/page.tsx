"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CreditCard,
  Activity,
  RefreshCw,
} from "lucide-react";

type TxType = "Tout" | "TOPUP" | "WITHDRAWAL" | "TRANSFER" | "FINANCE";

const FILTERS: TxType[] = ["Tout", "TOPUP", "WITHDRAWAL", "TRANSFER", "FINANCE"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function txTitle(t: any, isDebit: boolean) {
  if (t.type === "TOPUP") return t.method || "Depot";
  if (t.type === "WITHDRAWAL") return t.description || t.method || "Retrè";
  if (t.type === "FINANCE") return t.description || "Sèvis Finansyè";
  return isDebit
    ? t.receiverWallet?.user?.name || t.receiverWallet?.user?.email || "Destinatè"
    : t.senderWallet?.user?.name || t.senderWallet?.user?.email || "Ozama User";
}

function TxIcon({ type, isDebit }: { type: string; isDebit: boolean }) {
  if (type === "TOPUP")
    return (
      <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
        <ArrowDownCircle size={20} className="text-emerald-500" />
      </div>
    );
  if (type === "WITHDRAWAL")
    return (
      <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
        <ArrowUpCircle size={20} className="text-red-500" />
      </div>
    );
  if (type === "FINANCE")
    return (
      <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
        <CreditCard size={20} className="text-purple-500" />
      </div>
    );
  // TRANSFER
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDebit ? "bg-red-50" : "bg-orange-50"}`}>
      <ArrowLeftRight size={20} className={isDebit ? "text-red-500" : "text-[#FF6B00]"} />
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-600",
  PENDING:   "bg-orange-50 text-[#FF6B00]",
  FAILED:    "bg-red-50 text-red-500",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TxType>("Tout");
  const [visibleCount, setVisibleCount] = useState(20);
  const [userEmail, setUserEmail] = useState("");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const fetchTransactions = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const [txRes, meRes] = await Promise.all([
        fetch(`${backendUrl}/wallet/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setUserEmail(me.email || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filtered = transactions.filter(t =>
    filter === "Tout" ? true : t.type === filter
  );

  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white font-space-grotesk pb-24">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[#0A0B0F]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => { window.location.href = "/dashboard"; }}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#FF6B00]" />
            <span className="text-sm font-black tracking-widest uppercase text-white">Istorik Tranzaksyon</span>
          </div>
          <button
            onClick={fetchTransactions}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setVisibleCount(20); }}
              className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                filter === f
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* TRANSACTION LIST */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={36} className="text-white/10" />
            <p className="text-white/30 text-xs font-bold">Pa gen tranzaksyon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((t: any, idx: number) => {
              const isDebit =
                t.type === "WITHDRAWAL" ||
                t.type === "DEBIT" ||
                (t.type === "TRANSFER" && t.senderWallet?.user?.email === userEmail);

              return (
                <div
                  key={t.id || idx}
                  className="bg-[#111318] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4"
                >
                  <TxIcon type={t.type} isDebit={isDebit} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white leading-snug truncate">
                      {txTitle(t, isDebit)}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5 font-medium">
                      {t.createdAt ? formatDate(t.createdAt) : "—"}
                    </p>
                    {t.status && (
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${STATUS_BADGE[t.status] || "bg-white/10 text-white/50"}`}>
                        {t.status}
                      </span>
                    )}
                  </div>

                  <p className={`text-sm font-black shrink-0 ${isDebit ? "text-red-400" : "text-emerald-400"}`}>
                    {isDebit ? "−" : "+"}{Number(t.amount || 0).toLocaleString("fr-HT")}
                    <span className="text-[10px] text-white/30 font-medium"> HTG</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* LOAD MORE */}
        {filtered.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(v => v + 20)}
            className="w-full mt-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition text-[11px] font-black uppercase tracking-widest text-white/60"
          >
            Chaje plis ({filtered.length - visibleCount} rete)
          </button>
        )}

      </div>
    </div>
  );
}
