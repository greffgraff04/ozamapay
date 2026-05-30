"use client";
import React, { useState, useEffect } from "react";

export default function UserSecurityCard() {
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function checkPinStatus() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000"}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // 🎯 FIX: Done yo soti dirèkteman nan rasin nan (data.id, data.transactionPin)
          if (data && data.id) {
            if (data.transactionPin) {
              setHasPin(true);
            }
          }
        }
      } catch (err) {
        console.error("Erè PIN status:", err);
      }
    }
    checkPinStatus();
  }, []);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage("");

    if (!/^\d{4,6}$/.test(pin)) {
      setStatusMessage("❌ PIN nan dwe gen ant 4 a 6 chif sèlman.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000"}/user/change-pin`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`, // 🛡️ Voye token sekirite a
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPin: pin })
      });

      if (res.ok) {
        setStatusMessage("✅ PIN sekirite ou anrejistre avèk siksè!");
        setHasPin(true);
        setPin("");
      } else {
        const data = await res.json();
        setStatusMessage(`❌ ${data.message || "Operasyon an echwe."}`);
      }
    } catch (err) {
      setStatusMessage("❌ Erè rezo. Sèvè a offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2 text-white">
          🛡️ KÒD PIN SEKIRITE
        </h3>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${hasPin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
          {hasPin ? "PIN Aktif" : "San PIN"}
        </span>
      </div>

      <p className="text-gray-400 text-xs mb-6 leading-relaxed">
        Kreye yon PIN sekirite (4 a 6 chif). San kòd sa a, okenn ajan pap ka retire kòb sou kont ou. Li pwoteje balans ou 100%.
      </p>

      <form onSubmit={handleSavePin} className="space-y-4">
        <input
          type="password"
          maxLength={6}
          placeholder={hasPin ? "••••••" : "Antre 4 a 6 chif"}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full bg-[#1f2937] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 text-center tracking-widest font-mono text-white placeholder-gray-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all text-xs tracking-wide shadow-lg"
        >
          {loading ? "Sove kòd..." : hasPin ? "Mete PIN lan Ajou" : "Kreye PIN Sekirite Mwen"}
        </button>
      </form>
      {statusMessage && <p className="text-xs mt-3 text-center text-orange-400 font-medium">{statusMessage}</p>}
    </div>
  );
}