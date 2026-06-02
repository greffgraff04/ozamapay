'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Globe,
  MessageCircle,
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    q: 'Kijan mwen ka topup kont mwen?',
    a: 'Ou ka topup via MonCash, Zelle, CashApp, Wise ak lòt metòd. Ale nan tab TOPUP nan dashboard ou.',
  },
  {
    q: 'Konbyen tan KYC pran?',
    a: 'KYC pran mwens ke 24 èdtan. Ou pral resevwa yon email lè li apwouve.',
  },
  {
    q: 'Kijan mwen ka kreye kat VISA mwen?',
    a: "Apre KYC apwouve, ale nan tab CARDS epi klike 'Kreye Kat VISA'. Se GRATIS!",
  },
  {
    q: 'Ki frè OZAMAPAY mande?',
    a: 'Topup: 6%. Retrè: 2%. KYC: $25 yon fwa. Kreye kat: GRATIS.',
  },
  {
    q: 'Kijan mwen ka kontakte yon ajans?',
    a: 'Ale sou ozamapay.com/register?ref=CODE_AJAN pou enskri via yon ajans lokal.',
  },
  {
    q: 'Kisa pou m fè si mwen bliye PIN mwen?',
    a: 'Ale nan Profil → Sekirite → Chanje PIN pou kreye yon nouvo PIN.',
  },
];

type ContactCard = {
  icon: React.ElementType;
  label: string;
  desc: string;
  badge?: string;
  iconColor: string;
  bg: string;
  border: string;
  hoverBorder: string;
  action: () => void;
};

const contacts: ContactCard[] = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    desc: 'Reponn < 30 minit',
    badge: 'Live',
    iconColor: '#22C55E',
    bg: '#22C55E18',
    border: '#22C55E35',
    hoverBorder: 'hover:border-green-500/40',
    action: () => window.open('https://wa.me/50900000000', '_blank'),
  },
  {
    icon: Mail,
    label: 'Email',
    desc: 'contact@ozamapay.com',
    iconColor: '#FF6B00',
    bg: '#FF6B0018',
    border: '#FF6B0035',
    hoverBorder: 'hover:border-[#FF6B00]/40',
    action: () => window.open('mailto:contact@ozamapay.com', '_blank'),
  },
  {
    icon: Globe,
    label: 'Site Web',
    desc: 'ozamapay.com',
    iconColor: '#FF6B00',
    bg: '#FF6B0018',
    border: '#FF6B0035',
    hoverBorder: 'hover:border-[#FF6B00]/40',
    action: () => window.open('https://ozamapay.com', '_blank'),
  },
];

function SiteNav() {
  return (
    <nav className="sticky top-0 z-20 bg-[#0A0B0F]/90 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-black text-white tracking-tight">
          OZAMA<span className="text-[#FF6B00]">PAY</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-white/50 hover:text-white transition font-medium">
            Taux &amp; Frè
          </Link>
          <Link href="/support" className="text-sm text-white font-semibold transition">
            Sipò
          </Link>
          <Link href="/verify-agent" className="text-sm text-white/50 hover:text-white transition font-medium">
            Verifye Ajan
          </Link>
          <Link
            href="/login"
            className="text-sm bg-[#FF6B00] hover:bg-[#E05E00] text-white px-4 py-2 rounded-xl font-bold transition"
          >
            Konekte
          </Link>
        </div>
        <button
          onClick={() => window.history.back()}
          className="md:hidden w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
        >
          <ArrowLeft size={17} />
        </button>
      </div>
    </nav>
  );
}

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-space-grotesk">
      <SiteNav />

      {/* ── HERO ── */}
      <section className="py-20 md:py-28 text-center px-6 relative overflow-hidden">
        {/* decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF6B00]/[0.06] rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto relative">
          <div className="w-20 h-20 bg-[#FF6B00]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#FF6B00]/20">
            <HelpCircle size={36} className="text-[#FF6B00]" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Kijan nou ka
            <br />
            <span className="text-[#FF6B00]">ede ou?</span>
          </h1>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-10">
            Ekip sipò nou an disponib pou ede ou 7 jou sou 7, 24 èdtan sou 24.
          </p>
          {/* search bar style decoration */}
          <div className="max-w-md mx-auto flex items-center gap-3 bg-[#111318] border border-white/[0.08] rounded-2xl px-5 py-4 cursor-default">
            <HelpCircle size={16} className="text-white/20 shrink-0" />
            <span className="text-white/25 text-sm">Chèche nan kesyon yo...</span>
          </div>
        </div>
      </section>

      {/* orange accent divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/50 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20 space-y-20">

        {/* ── CONTACT CARDS ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 01
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Kontakte nou</h2>
            <p className="text-white/40 mt-3 text-sm md:text-base">
              Chwazi kanal kominikasyon ou prefere
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contacts.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={c.action}
                  className={`bg-[#111318] border border-white/[0.06] rounded-3xl p-8 text-center hover:scale-[1.04] transition-all duration-200 ${c.hoverBorder} group`}
                >
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}
                  >
                    <Icon size={28} style={{ color: c.iconColor }} />
                  </div>
                  <p className="font-black text-white text-base mb-1">{c.label}</p>
                  <p className="text-sm text-white/40">{c.desc}</p>
                  {c.badge && (
                    <span className="inline-block mt-3 text-[9px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
                      {c.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* orange accent divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/20 to-transparent" />

        {/* ── FAQ ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 02
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Kesyon Souvan</h2>
            <p className="text-white/40 mt-3 text-sm md:text-base">
              Repons pou kesyon yo poze pi souvan
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-[#111318] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.10] transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition"
                >
                  <span className="text-sm font-bold text-white/90 leading-snug pr-4">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-white/30 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <div className="pt-1 border-t border-white/[0.04]">
                      <p className="text-sm text-white/50 leading-relaxed pt-3">{item.a}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* orange accent divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/20 to-transparent" />

        {/* ── VERIFY AGENT BANNER ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 03
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Sekirite</h2>
          </div>
          <button
            onClick={() => { window.location.href = '/verify-agent'; }}
            className="w-full bg-[#111318] border border-white/[0.06] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 hover:border-green-500/30 hover:scale-[1.01] transition-all duration-200 text-left group"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center shrink-0 border border-green-500/20 group-hover:bg-green-500/15 transition">
              <ShieldCheck size={30} className="text-green-400" />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <p className="font-black text-white text-xl mb-2">Verifye yon Ajan OZAMAPAY</p>
              <p className="text-sm text-white/40 leading-relaxed max-w-lg">
                Konfirme si yon moun ki di li se ajan OZAMAPAY ofisyèl anvan ou fè yon tranzaksyon ak li.
              </p>
            </div>
            <ChevronRight size={22} className="text-white/20 shrink-0 hidden md:block group-hover:text-white/40 transition" />
          </button>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.05] bg-[#0A0B0F] py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-lg font-black text-white mb-1">
            OZAMA<span className="text-[#FF6B00]">PAY</span>
          </p>
          <p className="text-xs text-white/30 mb-6">Peye, resevwa, transfè — toupatou</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            <Link href="/pricing" className="text-xs text-white/40 hover:text-white transition">
              Taux &amp; Frè
            </Link>
            <Link href="/support" className="text-xs text-white/40 hover:text-white transition">
              Sipò
            </Link>
            <Link href="/verify-agent" className="text-xs text-white/40 hover:text-white transition">
              Verifye Ajan
            </Link>
            <Link href="/login" className="text-xs text-white/40 hover:text-white transition">
              Konekte
            </Link>
          </div>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
            OZAMAPAY © 2026 — Tout dwa rezève
          </p>
        </div>
      </footer>
    </div>
  );
}
