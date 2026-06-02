"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowLeft, ShieldCheck, XCircle, Search, Shield } from "lucide-react";

const LEVEL_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  BRONZE: { color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
  SILVER: { color: "text-slate-500", bg: "bg-slate-50",  border: "border-slate-200" },
  GOLD:   { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  BLACK:  { color: "text-gray-800",  bg: "bg-gray-100",  border: "border-gray-300" },
};

type Result =
  | { verified: true; name: string; agentCode: string; level: string; status: string }
  | { verified: false; error?: "server_sleeping" | "network_error" }
  | null;

export default function VerifyAgentPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch(
        `${backendUrl}/agents/verify/${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);
      if (!res.ok) {
        setResult({ verified: false, error: "server_sleeping" });
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      clearTimeout(timeoutId);
      setResult({ verified: false, error: "network_error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0F121E] font-space-grotesk pb-24">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[#0F121E]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => { window.location.href = "/support"; }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
          >
            <ArrowLeft size={17} className="text-white" />
          </button>
          <span className="text-sm font-black tracking-widest uppercase text-white">Verifye Ajan</span>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-6">

        {/* HERO */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto border border-orange-100">
            <ShieldCheck size={40} className="text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-black text-[#0F121E] leading-tight">
            Verifye Otantikite yon Ajan OZAMAPAY
          </h1>
          <p className="text-sm text-gray-500">
            Antre kòd ajan an pou konfirme li ofisyèl
          </p>
        </div>

        {/* SEARCH FORM */}
        <form onSubmit={(e) => handleVerify(e)} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Antre Kòd Ajan (ex: OZA-001)"
              className="w-full px-5 py-4 pr-14 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm font-bold placeholder:text-gray-300 uppercase tracking-wider transition"
              autoComplete="off"
              spellCheck={false}
            />
            <Search size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#e85f00] disabled:opacity-40 transition font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><ShieldCheck size={16} /> Verifye</>
            )}
          </button>
        </form>

        {/* RESULT */}
        {result !== null && (
          result.verified ? (
            // ── FOUND ────────────────────────────────────────────────────────
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 space-y-4 animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <ShieldCheck size={36} className="text-green-500" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200">
                  <ShieldCheck size={10} /> Ajan Ofisyèl OZAMAPAY ✓
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 space-y-3 border border-green-100">
                <div className="text-center">
                  <p className="text-2xl font-black text-[#0F121E]">{result.name || "—"}</p>
                  <p className="text-sm font-mono text-[#FF6B00] font-bold mt-1">{result.agentCode}</p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  {/* Level badge */}
                  {(() => {
                    const lv = result.level as string;
                    const s = LEVEL_STYLE[lv] || LEVEL_STYLE.BRONZE;
                    return (
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${s.bg} ${s.color} ${s.border}`}>
                        <Shield size={9} /> {lv}
                      </span>
                    );
                  })()}
                  {/* Status */}
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 border border-green-200">
                    AKTIF ✓
                  </span>
                </div>
              </div>

              <p className="text-xs text-green-700 text-center leading-relaxed font-medium bg-green-100 rounded-2xl p-4 border border-green-200">
                Ajan sa verifye epi ofisyèl nan sistèm OZAMAPAY. Ou ka fè konfyans li pou fè tranzaksyon.
              </p>
            </div>
          ) : !result.verified && (result.error === "network_error" || result.error === "server_sleeping") ? (
            // ── SERVER SLEEPING / NETWORK ERROR ──────────────────────────────
            <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 space-y-4 animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle size={36} className="text-orange-500" />
                </div>
                <p className="text-xl font-black text-orange-600">Sistèm ap reveye...</p>
                <p className="text-sm text-orange-500">
                  Tann 30 segonn epi eseye ankò
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 transition font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><AlertCircle size={15} /> Eseye Ankò</>
                )}
              </button>
            </div>
          ) : (
            // ── NOT FOUND ─────────────────────────────────────────────────────
            <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 space-y-4 animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={36} className="text-red-500" />
                </div>
                <p className="text-xl font-black text-red-600">Ajan Pa Jwenn</p>
                <p className="text-sm text-red-500">
                  Kòd sa pa egziste nan sistèm OZAMAPAY.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-lg shrink-0">⚠️</span>
                <p className="text-xs text-orange-800 font-bold leading-relaxed">
                  Pa janm fè tranzaksyon ak yon moun ki pa verifye sou OZAMAPAY.
                </p>
              </div>
            </div>
          )
        )}

        {/* Info tip */}
        {result === null && (
          <p className="text-center text-xs text-gray-400 font-medium">
            Kòd ajan yo kòmanse ak <span className="font-black text-[#0F121E]">OZA-</span> oswa lòt préfiks ofisyèl OZAMAPAY.
          </p>
        )}

      </div>
    </div>
  );
}
