"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Zap, X, Store } from "lucide-react";

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({
  toast,
  fading,
  onClose,
}: {
  toast: { message: string; type: "error" | "success" | "warning" };
  fading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        backdropFilter: "blur(20px)",
        background: "rgba(15,18,30,0.95)",
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(-6px)" : "translateY(0)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
      className="fixed top-6 left-4 right-4 z-[999] border border-white/10 text-white px-4 py-4 rounded-2xl shadow-xl"
    >
      <div className="flex items-center gap-3">
        <Zap
          size={15}
          className={`flex-shrink-0 ${
            toast.type === "success"
              ? "text-green-400"
              : toast.type === "warning"
              ? "text-yellow-400"
              : "text-[#FF6B00]"
          }`}
        />
        <span className="flex-1 font-black italic uppercase text-[10px] tracking-widest leading-relaxed">
          {toast.message}
        </span>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition"
        >
          <X size={13} className="text-white/50" />
        </button>
      </div>
    </div>
  );
}

// ── Main pay UI ────────────────────────────────────────────────────────────

function PayContent() {
  const params = useSearchParams();

  // Personal payment params
  const recipientEmail = params.get("to") || "";
  const recipientName = params.get("name")
    ? decodeURIComponent(params.get("name")!)
    : "";

  // Business payment param — ?business={businessId}
  // QR shape: https://ozamapay.com/pay?business={id}
  const businessId = params.get("business") || "";
  const isBusinessMode = Boolean(businessId);

  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  // Business info fetched from GET /business/:id/public
  const [businessInfo, setBusinessInfo] = useState<{
    businessName: string;
    category: string;
    tier: string;
  } | null>(null);
  const [bizLoading, setBizLoading] = useState(isBusinessMode);

  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "warning";
  } | null>(null);
  const [toastFading, setToastFading] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

  const displayName = isBusinessMode
    ? (businessInfo?.businessName ?? "Biznis…")
    : recipientName || recipientEmail.split("@")[0] || "Destinatè";

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      const redirect = isBusinessMode
        ? encodeURIComponent(`/pay?business=${businessId}`)
        : encodeURIComponent(
            `/pay?to=${recipientEmail}&name=${encodeURIComponent(recipientName)}`
          );
      window.location.href = `/login?redirect=${redirect}`;
    }
  }, []);

  // Fetch public business info (no auth needed)
  useEffect(() => {
    if (!isBusinessMode) return;
    fetch(`${backendUrl}/business/${businessId}/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBusinessInfo(data); })
      .catch(() => {})
      .finally(() => setBizLoading(false));
  }, [businessId]);

  const showToast = (
    message: string,
    type: "error" | "success" | "warning" = "error"
  ) => {
    setToastFading(false);
    setToast({ message, type });
    setTimeout(() => setToastFading(true), 3600);
    setTimeout(() => setToast(null), 4000);
  };

  const closeToast = () => {
    setToastFading(true);
    setTimeout(() => { setToast(null); setToastFading(false); }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast("Tanpri antre yon montan valid", "error"); return; }
    if (!pin || pin.length < 4) { showToast("PIN ou obligatwa (omwen 4 chif)", "error"); return; }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      let res: Response;

      if (isBusinessMode) {
        res = await fetch(`${backendUrl}/business/${businessId}/pay`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt, pin }),
        });
      } else {
        if (!recipientEmail) { showToast("Adrès destinatè a manke", "error"); setLoading(false); return; }
        res = await fetch(`${backendUrl}/wallet/transfer-p2p`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ recipientEmail, amount: amt, pin }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setSentAmount(amt);
        setSuccess(true);
      } else {
        showToast(data.message || "Erè pandan transfè a", "error");
      }
    } catch {
      showToast("Erè rezo. Verifye koneksyon ou.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#0F121E] uppercase tracking-tight">Siksè!</h2>
          <p className="text-sm text-gray-500 mt-2">
            Ou voye{" "}
            <span className="font-black text-[#FF6B00]">{sentAmount.toLocaleString("fr-HT")} HTG</span>{" "}
            ba <span className="font-black text-[#0F121E]">{displayName}</span>
          </p>
        </div>
        <button
          onClick={() => { window.location.href = "/dashboard"; }}
          className="w-full max-w-xs py-4 rounded-2xl bg-[#FF6B00] text-white font-black text-sm uppercase tracking-widest hover:bg-[#e85f00] transition"
        >
          Retounen sou Dashboard
        </button>
      </div>
    );
  }

  // ── Payment form ──────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white text-[#0F121E] font-space-grotesk pb-24">
      {toast && <Toast toast={toast} fading={toastFading} onClose={closeToast} />}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#F0F0F0] shadow-sm">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => { window.location.href = "/dashboard"; }}
            className="w-9 h-9 rounded-xl border border-[#F0F0F0] flex items-center justify-center text-[#0F121E] hover:bg-[#F8F9FA] transition"
          >
            <ArrowLeft size={17} />
          </button>
          <span className="text-sm font-black tracking-[0.18em] uppercase text-[#0F121E]">
            {isBusinessMode ? "Peye Biznis" : "Voye Kòb"}
          </span>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">

        {/* Recipient card — personal or business */}
        {isBusinessMode ? (
          <div className="bg-[#0F121E] rounded-3xl p-6">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
              Biznis k ap resevwa
            </p>
            {bizLoading ? (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-amber-400 flex items-center justify-center shadow-lg shrink-0">
                  <Store size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-lg leading-tight">
                    {businessInfo?.businessName ?? "—"}
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">{businessInfo?.category}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      <CheckCircle2 size={9} /> Aktif
                    </span>
                    {businessInfo?.tier && (
                      <span className="text-[9px] font-black uppercase bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/10">
                        {businessInfo.tier}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#0F121E] rounded-3xl p-6">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">
              Destinatè
            </p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B00] to-amber-400 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white text-2xl font-black">
                  {displayName.substring(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-lg leading-tight">{displayName}</h3>
                <p className="text-white/50 text-xs mt-0.5 truncate">{recipientEmail}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                  <CheckCircle2 size={9} /> Verifye
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Amount input */}
        <div className="bg-white border border-[#F0F0F0] rounded-3xl p-6">
          <label className="text-[10px] font-bold text-[#0F121E]/40 uppercase tracking-widest block mb-3">
            Montan
          </label>
          <div className="flex items-end gap-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 text-4xl font-black text-[#0F121E] bg-transparent outline-none placeholder:text-[#0F121E]/15"
              autoFocus
            />
            <span className="text-sm font-black text-[#0F121E]/40 mb-1">HTG</span>
          </div>
          <div className="mt-3 h-px bg-[#F0F0F0]" />
          <div className="flex gap-2 mt-3 flex-wrap">
            {[500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#F0F0F0] text-[11px] font-black text-[#0F121E]/60 hover:border-[#FF6B00]/40 hover:text-[#FF6B00] transition"
              >
                {v.toLocaleString("fr-HT")}
              </button>
            ))}
          </div>
        </div>

        {/* PIN input */}
        <div className="bg-white border border-[#F0F0F0] rounded-3xl p-6">
          <label className="text-[10px] font-bold text-[#0F121E]/40 uppercase tracking-widest block mb-3">
            PIN Tranzaksyon ou
          </label>
          <input
            type="password"
            inputMode="numeric"
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={6}
            className="w-full px-4 py-3.5 rounded-2xl bg-[#F8F9FA] border border-[#F0F0F0] focus:border-[#FF6B00] focus:bg-white outline-none text-sm text-center tracking-[0.6em] placeholder:text-[#0F121E]/20 transition"
          />
        </div>

        {/* Fee notice for business payments */}
        {isBusinessMode && businessInfo && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] shrink-0" />
            <p className="text-[10px] text-[#0F121E]/40 font-bold">
              Frè{" "}
              {businessInfo.tier === "ENTERPRISE" ? "1.5%" : businessInfo.tier === "PRO" ? "2%" : "2.5%"}{" "}
              pou biznis <span className="text-[#FF6B00]">{businessInfo.tier}</span> dedwi sou montan an
            </p>
          </div>
        )}

        {/* Submit */}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={loading || !amount || !pin || (isBusinessMode && bizLoading)}
            className="w-full py-5 rounded-2xl bg-[#FF6B00] hover:bg-[#e85f00] disabled:opacity-40 transition font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isBusinessMode ? (
              <>Peye Biznis →</>
            ) : (
              <>Voye Kòb →</>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#0F121E]/30 font-bold">
          Tranzaksyon OzamaPay yo pwoteje ak PIN ou.
        </p>
      </div>
    </main>
  );
}

// ── Page wrapper (Suspense required for useSearchParams in Next.js) ─────────

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
