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
import { useTheme } from '../../../contexts/ThemeContext';

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

function TxIcon({ type, isDebit, isDark }: { type: string; isDebit: boolean; isDark: boolean }) {
  if (type === "TOPUP")
    return (
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#ECFDF5' }}
      >
        <ArrowDownCircle size={20} className="text-emerald-500" />
      </div>
    );
  if (type === "WITHDRAWAL")
    return (
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' }}
      >
        <ArrowUpCircle size={20} className="text-red-500" />
      </div>
    );
  if (type === "FINANCE")
    return (
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : '#FAF5FF' }}
      >
        <CreditCard size={20} className="text-purple-500" />
      </div>
    );
  // TRANSFER
  return (
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: isDebit
        ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
        : (isDark ? 'rgba(255,122,0,0.15)' : '#FFF7ED')
      }}
    >
      <ArrowLeftRight size={20} className={isDebit ? "text-red-500" : "text-[#FF6B00]"} />
    </div>
  );
}

function getStatusStyle(status: string, isDark: boolean): React.CSSProperties {
  if (status === 'COMPLETED') return isDark
    ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' }
    : { backgroundColor: '#ECFDF5', color: '#16A34A' };
  if (status === 'PENDING') return isDark
    ? { backgroundColor: 'rgba(255,122,0,0.15)', color: '#FF7A00' }
    : { backgroundColor: '#FFF7ED', color: '#FF7A00' };
  if (status === 'FAILED') return isDark
    ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }
    : { backgroundColor: '#FEF2F2', color: '#DC2626' };
  return isDark
    ? { backgroundColor: 'rgba(255,255,255,0.05)', color: '#9AA0B4' }
    : { backgroundColor: '#F3F4F6', color: '#8E929B' };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TxType>("Tout");
  const [visibleCount, setVisibleCount] = useState(20);
  const [userEmail, setUserEmail] = useState("");

  const { colors, isDark } = useTheme();

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const fetchTransactions = async (silent = false) => {
    if (!silent) setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const [txRes, meRes] = await Promise.all([
        fetch(`${backendUrl}/wallet/transactions?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${backendUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(Array.isArray(data?.data) ? data.data : []);
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

  useEffect(() => {
    const interval = setInterval(() => fetchTransactions(true), 20000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchTransactions(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const filtered = transactions.filter(t =>
    filter === "Tout" ? true : t.type === filter
  );

  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background }} className="flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-space-grotesk pb-24"
      style={{ backgroundColor: colors.background, color: colors.textPrimary }}
    >

      {/* HEADER */}
      <header
        className="sticky top-0 z-20 backdrop-blur-xl"
        style={{ backgroundColor: colors.background + 'E6', borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => { window.location.href = "/dashboard"; }}
            className="w-9 h-9 rounded-2xl transition flex items-center justify-center"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, color: colors.textPrimary }}
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#FF6B00]" />
            <span className="text-sm font-black tracking-widest uppercase" style={{ color: colors.textPrimary }}>Istorik Tranzaksyon</span>
          </div>
          <button
            onClick={() => fetchTransactions()}
            className="w-9 h-9 rounded-2xl transition flex items-center justify-center"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface, color: colors.textPrimary }}
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
              className="shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition"
              style={
                filter === f
                  ? { backgroundColor: '#FF6B00', color: '#FFFFFF' }
                  : {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
                      color: colors.textSecondary,
                    }
              }
            >
              {f}
            </button>
          ))}
        </div>

        {/* TRANSACTION LIST */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={36} style={{ color: isDark ? 'rgba(255,255,255,0.1)' : colors.border }} />
            <p className="text-xs font-bold" style={{ color: colors.textSecondary }}>Pa gen tranzaksyon</p>
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
                  className="rounded-[28px] p-4 flex items-center gap-4"
                  style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
                >
                  <TxIcon type={t.type} isDebit={isDebit} isDark={isDark} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black leading-snug truncate" style={{ color: colors.textPrimary }}>
                      {txTitle(t, isDebit)}
                    </p>
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: colors.textSecondary }}>
                      {t.createdAt ? formatDate(t.createdAt) : "—"}
                    </p>
                    {t.status && (
                      <span
                        className="inline-block mt-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide"
                        style={getStatusStyle(t.status, isDark)}
                      >
                        {t.status}
                      </span>
                    )}
                  </div>

                  <p className={`text-sm font-black shrink-0 ${isDebit ? "text-red-400" : "text-emerald-400"}`}>
                    {isDebit ? "−" : "+"}{Number(t.amount || 0).toLocaleString("fr-HT")}
                    <span className="text-[10px] font-medium" style={{ color: colors.textSecondary }}> HTG</span>
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
            className="w-full mt-5 py-4 rounded-2xl transition text-[11px] font-black uppercase tracking-widest"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
              color: colors.textSecondary,
            }}
          >
            Chaje plis ({filtered.length - visibleCount} rete)
          </button>
        )}

      </div>
    </div>
  );
}
