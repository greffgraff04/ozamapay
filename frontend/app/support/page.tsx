"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, Globe, MessageCircle, ChevronDown, HelpCircle } from "lucide-react";

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Kijan mwen ka topup kont mwen?",
    a: "Ou ka topup via MonCash, Zelle, CashApp, Wise ak lòt metòd. Ale nan tab TOPUP nan dashboard ou.",
  },
  {
    q: "Konbyen tan KYC pran?",
    a: "KYC pran mwens ke 24 èdtan. Ou pral resevwa yon email lè li apwouve.",
  },
  {
    q: "Kijan mwen ka kreye kat VISA mwen?",
    a: "Apre KYC apwouve, ale nan tab CARDS epi klike 'Kreye Kat VISA'. Se GRATIS!",
  },
  {
    q: "Ki frè OZAMAPAY mande?",
    a: "Topup: 6%. Retrè: 2%. KYC: $25 yon fwa. Kreye kat: GRATIS.",
  },
  {
    q: "Kijan mwen ka kontakte yon ajans?",
    a: "Ale sou ozamapay.com/register?ref=CODE_AJAN pou enskri via yon ajans lokal.",
  },
  {
    q: "Kisa pou m fè si mwen bliye PIN mwen?",
    a: "Ale nan Profil → Sekirite → Chanje PIN pou kreye yon nouvo PIN.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
          <span className="text-sm font-black tracking-widest uppercase">Sipò OZAMAPAY</span>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* HERO */}
        <div className="bg-[#111318] border border-white/[0.06] rounded-3xl p-7 text-center">
          <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#FF6B00]/20">
            <HelpCircle size={32} className="text-[#FF6B00]" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Kijan nou ka ede ou?</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Ekip sipò nou an disponib pou ede ou 7 jou sou 7.
          </p>
        </div>

        {/* CONTACT CARDS */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">
            Kontakte nou
          </p>
          <div className="space-y-3">

            {/* WhatsApp */}
            <button
              onClick={() => window.open("https://wa.me/50900000000", "_blank")}
              className="w-full bg-[#111318] border border-white/[0.06] rounded-3xl p-5 flex items-center gap-4 hover:border-green-500/30 hover:bg-[#0d1a13] transition text-left"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-green-500/20">
                <MessageCircle size={22} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">WhatsApp</p>
                <p className="text-[11px] text-white/40 mt-0.5">Reponn &lt; 30 minit</p>
              </div>
              <span className="text-[9px] font-black text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
                Live
              </span>
            </button>

            {/* Email */}
            <button
              onClick={() => window.open("mailto:contact@ozamapay.com", "_blank")}
              className="w-full bg-[#111318] border border-white/[0.06] rounded-3xl p-5 flex items-center gap-4 hover:border-[#FF6B00]/30 transition text-left"
            >
              <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center shrink-0 border border-[#FF6B00]/20">
                <Mail size={22} className="text-[#FF6B00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">Email</p>
                <p className="text-[11px] text-white/40 mt-0.5 truncate">contact@ozamapay.com</p>
              </div>
            </button>

            {/* Site Web */}
            <button
              onClick={() => window.open("https://ozamapay.com", "_blank")}
              className="w-full bg-[#111318] border border-white/[0.06] rounded-3xl p-5 flex items-center gap-4 hover:border-[#FF6B00]/30 transition text-left"
            >
              <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-2xl flex items-center justify-center shrink-0 border border-[#FF6B00]/20">
                <Globe size={22} className="text-[#FF6B00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">Site Web</p>
                <p className="text-[11px] text-white/40 mt-0.5">ozamapay.com</p>
              </div>
            </button>

          </div>
        </section>

        {/* FAQ */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">
            Kesyon Souvan (FAQ)
          </p>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-[#111318] border border-white/[0.06] rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition"
                >
                  <span className="text-sm font-bold text-white/90 leading-snug pr-4">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-white/30 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <div className="pt-1 border-t border-white/[0.04]">
                      <p className="text-sm text-white/50 leading-relaxed pt-3">{item.a}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 font-bold pb-4">
          OZAMAPAY © 2026 — Tout dwa rezève
        </p>

      </div>
    </div>
  );
}
