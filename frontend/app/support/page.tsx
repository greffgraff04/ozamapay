'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Globe,
  MessageCircle,
  ChevronDown,
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
    a: 'Topup: 6%. Retrè: 2%. KYC: ~3,375 HTG yon fwa. Kreye kat: GRATIS.',
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
  action: () => void;
};

const contacts: ContactCard[] = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    desc: 'Reponn < 30 minit',
    badge: 'Live',
    action: () => window.open('https://wa.me/50900000000', '_blank'),
  },
  {
    icon: Mail,
    label: 'Email',
    desc: 'contact@ozamapay.com',
    action: () => window.open('mailto:contact@ozamapay.com', '_blank'),
  },
  {
    icon: Globe,
    label: 'Site Web',
    desc: 'ozamapay.com',
    action: () => window.open('https://ozamapay.com', '_blank'),
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-32 pb-20">

      {/* Navbar */}
      <div className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Retounen</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">

          {/* Hero */}
          <div className="space-y-4 mb-12">
            <h1 className="text-5xl font-bold">
              Sipò{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                OZAMAPAY
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Ekip sipò nou an disponib pou ede ou 7 jou sou 7, 24 èdtan sou 24.
            </p>
          </div>

          {/* Kontakte nou */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Kontakte nou</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contacts.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.label}
                    onClick={c.action}
                    className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all text-center w-full"
                  >
                    <Icon className="w-8 h-8 text-orange-500 mb-4 mx-auto" />
                    <h3 className="text-xl font-semibold text-white mb-2">{c.label}</h3>
                    <p className="text-slate-400">{c.desc}</p>
                    {c.badge && (
                      <span className="inline-block mt-3 text-[9px] font-black text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 uppercase tracking-wider">
                        {c.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kesyon Souvan */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Kesyon Souvan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-orange-500/50 transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.02] transition"
                  >
                    <span className="text-sm font-bold text-white leading-snug pr-4">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                        openFaq === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <div className="pt-1 border-t border-slate-700">
                        <p className="text-slate-300 leading-relaxed pt-3">{item.a}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sekirite — Verify Agent */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Sekirite</h2>
            <button
              onClick={() => { window.location.href = '/verify-agent'; }}
              className="w-full bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all flex items-center gap-6 text-left"
            >
              <ShieldCheck className="w-10 h-10 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white">Verifye yon Ajan OZAMAPAY</h3>
                <p className="text-slate-400 mt-1">
                  Konfirme si yon moun ki di li se ajan OZAMAPAY ofisyèl anvan ou fè yon tranzaksyon ak li.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 hidden md:block" />
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
          <p>© 2026 OZAMAPAY. Tout dwa rezève.</p>
        </div>
      </div>

    </div>
  );
}
