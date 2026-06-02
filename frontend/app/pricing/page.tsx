'use client';

import { ArrowLeft, TrendingUp, Info, Zap } from 'lucide-react';
import Link from 'next/link';

type FeeStep = {
  label: string;
  value: string;
  accent?: boolean;
  bold?: boolean;
};

type Example = {
  title: string;
  steps: FeeStep[];
};

const fees = [
  {
    label: 'Topup Lokal',
    sub: 'MonCash · NatCash',
    value: '6%',
    note: 'sou montan topup',
    color: '#FF6B00',
    icon: '↑',
  },
  {
    label: 'Topup Entènasyonal',
    sub: 'Zelle · CashApp · Wise · Meru',
    value: '6%',
    note: 'konvèti + frè',
    color: '#FF6B00',
    icon: '↑',
  },
  {
    label: 'Retrè',
    sub: 'Nan kont ou',
    value: '2%',
    note: 'sou montan retrè',
    color: '#FACC15',
    icon: '↓',
  },
  {
    label: 'Transfer P2P',
    sub: 'Ant itilizatè OZAMAPAY',
    value: 'GRATIS',
    note: '',
    color: '#22C55E',
    icon: '↔',
  },
  {
    label: 'KYC Verifikasyon',
    sub: 'Yon sèl fwa',
    value: '$25 USD',
    note: 'peman yon sèl fwa',
    color: '#A78BFA',
    icon: '✓',
  },
  {
    label: 'Kreye Kat VISA',
    sub: 'Apre KYC apwouve',
    value: 'GRATIS',
    note: '',
    color: '#22C55E',
    icon: '◆',
  },
];

const rates = [
  { pair: '1 USD', result: '135 HTG', icon: '🇺🇸', sub: 'Dola Ameriken' },
  { pair: '1 USDT (achte)', result: '132 HTG', icon: '₮', sub: 'Achte USDT' },
  { pair: '1 USDT (vann)', result: '138 HTG', icon: '₮', sub: 'Vann USDT' },
];

const examples: Example[] = [
  {
    title: 'Topup 5 000 HTG via MonCash',
    steps: [
      { label: 'Montan topup', value: '5 000 HTG' },
      { label: 'Frè (6%)', value: '− 300 HTG', accent: true },
      { label: 'Ou resevwa', value: '4 700 HTG', bold: true },
    ],
  },
  {
    title: 'Topup $50 via Zelle',
    steps: [
      { label: 'Konvèti ($50 × 135)', value: '6 750 HTG' },
      { label: 'Frè (6%)', value: '− 405 HTG', accent: true },
      { label: 'Ou resevwa', value: '6 345 HTG', bold: true },
    ],
  },
  {
    title: 'Retrè 10 000 HTG',
    steps: [
      { label: 'Montan retrè', value: '10 000 HTG' },
      { label: 'Frè (2%)', value: '− 200 HTG', accent: true },
      { label: 'Ou resevwa', value: '9 800 HTG', bold: true },
    ],
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
          <Link href="/pricing" className="text-sm text-white font-semibold transition">
            Taux &amp; Frè
          </Link>
          <Link href="/support" className="text-sm text-white/50 hover:text-white transition font-medium">
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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-space-grotesk">
      <SiteNav />

      {/* ── HERO BANNER ── */}
      <section className="py-20 md:py-28 text-center px-6 relative overflow-hidden">
        {/* decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF6B00]/[0.07] rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={11} className="text-[#FF6B00]" />
            <span className="text-[#FF6B00] text-[11px] font-bold uppercase tracking-widest">
              Transparan &amp; Jis
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Taux &amp; Frè
            <br />
            <span className="text-[#FF6B00]">OZAMAPAY</span>
          </h1>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Tout frè nou yo klè, san sipriz. Konnen egzakteman sa ou peye anvan ou fè yon tranzaksyon.
          </p>
        </div>
      </section>

      {/* orange accent divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/50 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20 space-y-20">

        {/* ── SECTION 1: FRÈ TRANZAKSYON ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 01
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Frè Tranzaksyon</h2>
            <p className="text-white/40 mt-3 text-sm md:text-base">
              Frè aplike pou chak tip tranzaksyon
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fees.map((fee) => (
              <div
                key={fee.label}
                className="bg-[#111318] border border-white/[0.06] rounded-3xl p-8 hover:border-white/[0.14] hover:scale-[1.02] transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-xl font-black"
                  style={{
                    background: `${fee.color}18`,
                    border: `1px solid ${fee.color}35`,
                    color: fee.color,
                  }}
                >
                  {fee.icon}
                </div>
                <p className="text-3xl font-black mb-1" style={{ color: fee.color }}>
                  {fee.value}
                </p>
                {fee.note && (
                  <p className="text-xs text-white/30 mb-4 font-medium">{fee.note}</p>
                )}
                {!fee.note && <div className="mb-4 mt-1 h-4" />}
                <p className="text-base font-bold text-white mb-1">{fee.label}</p>
                <p className="text-sm text-white/40">{fee.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* orange accent divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/20 to-transparent" />

        {/* ── SECTION 2: TAUX AKTYÈL ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 02
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white flex items-center justify-center gap-3">
              Taux Aktyèl
              <TrendingUp size={28} className="text-[#FF6B00]" />
            </h2>
            <p className="text-white/40 mt-3 text-sm md:text-base">
              Taux echanj aktyèl nou itilize
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {rates.map((r) => (
              <div
                key={r.pair}
                className="bg-[#111318] border border-white/[0.06] rounded-3xl p-8 hover:border-[#FF6B00]/25 hover:scale-[1.02] transition-all duration-200 text-center"
              >
                <span className="text-4xl block mb-4">{r.icon}</span>
                <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-2">
                  {r.sub}
                </p>
                <p className="text-sm font-semibold text-white/60 mb-3">{r.pair}</p>
                <div className="h-px bg-white/[0.06] mb-3" />
                <p className="text-2xl font-black text-[#FF6B00]">{r.result}</p>
              </div>
            ))}
          </div>
        </section>

        {/* orange accent divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B00]/20 to-transparent" />

        {/* ── SECTION 3: EGZANP KALKIL ── */}
        <section>
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF6B00] mb-3">
              Seksyon 03
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Egzanp Kalkil</h2>
            <p className="text-white/40 mt-3 text-sm md:text-base">
              Wè konkrètman kijan frè yo kalkile
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {examples.map((ex) => (
              <div
                key={ex.title}
                className="bg-[#111318] border border-white/[0.06] rounded-3xl p-8 hover:border-white/[0.12] transition-all duration-200"
              >
                <p className="text-xs font-black text-[#FF6B00] uppercase tracking-wide mb-6 leading-relaxed">
                  {ex.title}
                </p>
                <div className="space-y-3">
                  {ex.steps.map((step, si) => (
                    <div key={step.label}>
                      {si === ex.steps.length - 1 && (
                        <div className="h-px bg-white/[0.06] mb-3" />
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">{step.label}</span>
                        <span
                          className={`text-sm font-bold ${
                            step.accent
                              ? 'text-red-400'
                              : step.bold
                              ? 'text-[#FF6B00] text-base'
                              : 'text-white/70'
                          }`}
                        >
                          {step.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NOTE BAS ── */}
        <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-5">
          <Info size={16} className="text-white/30 mt-0.5 shrink-0" />
          <p className="text-sm text-white/40 leading-relaxed">
            Frè yo ka chanje san avi. Dènye mizajou:{' '}
            <span className="text-white/60 font-semibold">Jen 2026</span>
          </p>
        </div>

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
