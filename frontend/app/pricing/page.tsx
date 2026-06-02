'use client';

import { ArrowLeft, TrendingUp, Info } from 'lucide-react';

const fees = [
  {
    label: 'Topup Lokal',
    sub: 'MonCash · NatCash',
    value: '6%',
    note: 'sou montan topup',
    color: '#FF6B00',
  },
  {
    label: 'Topup Entènasyonal',
    sub: 'Zelle · CashApp · Wise · Meru',
    value: '6%',
    note: 'konvèti + frè',
    color: '#FF6B00',
  },
  {
    label: 'Retrè',
    sub: 'Nan kont ou',
    value: '2%',
    note: 'sou montan retrè',
    color: '#FACC15',
  },
  {
    label: 'Transfer P2P',
    sub: 'Ant itilizatè OZAMAPAY',
    value: 'GRATIS',
    note: '',
    color: '#22C55E',
  },
  {
    label: 'KYC Verifikasyon',
    sub: 'Yon sèl fwa',
    value: '$25 USD',
    note: 'peman yon sèl fwa',
    color: '#A78BFA',
  },
  {
    label: 'Kreye Kat VISA',
    sub: 'Apre KYC apwouve',
    value: 'GRATIS',
    note: '',
    color: '#22C55E',
  },
];

const rates = [
  { pair: '1 USD', arrow: '=', result: '135 HTG', icon: '🇺🇸' },
  { pair: '1 USDT (achte)', arrow: '=', result: '132 HTG', icon: '₮' },
  { pair: '1 USDT (vann)', arrow: '=', result: '138 HTG', icon: '₮' },
];

const examples = [
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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white font-space-grotesk pb-24">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[#0A0B0F]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
          >
            <ArrowLeft size={17} />
          </button>
          <span className="text-sm font-black tracking-widest uppercase">Taux &amp; Frè</span>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-8">

        {/* ── SECTION 1: FRÈ TRANZAKSYON ── */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">
            Frè Tranzaksyon
          </p>
          <div className="space-y-2">
            {fees.map((fee) => (
              <div
                key={fee.label}
                className="bg-[#111318] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{fee.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{fee.sub}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black" style={{ color: fee.color }}>
                    {fee.value}
                  </p>
                  {fee.note && (
                    <p className="text-[10px] text-white/30 mt-0.5">{fee.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 2: TAUX AKTYÈL ── */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Taux Aktyèl
            </p>
            <TrendingUp size={12} className="text-[#FF6B00]" />
          </div>
          <div className="bg-[#111318] border border-white/[0.06] rounded-2xl overflow-hidden">
            {rates.map((r, i) => (
              <div
                key={r.pair}
                className={`px-5 py-4 flex items-center justify-between gap-4 ${
                  i < rates.length - 1 ? 'border-b border-white/[0.05]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.icon}</span>
                  <span className="text-sm font-semibold text-white/80">{r.pair}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">{r.arrow}</span>
                  <span className="text-sm font-black text-[#FF6B00]">{r.result}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: EGZANP KALKIL ── */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-1">
            Egzanp Kalkil
          </p>
          <div className="space-y-3">
            {examples.map((ex) => (
              <div
                key={ex.title}
                className="bg-[#111318] border border-white/[0.06] rounded-2xl px-5 py-4"
              >
                <p className="text-xs font-black text-white/60 uppercase tracking-wide mb-3">
                  {ex.title}
                </p>
                <div className="space-y-2">
                  {ex.steps.map((step) => (
                    <div key={step.label} className="flex items-center justify-between">
                      <span className="text-[12px] text-white/50">{step.label}</span>
                      <span
                        className={`text-[12px] font-bold ${
                          step.accent
                            ? 'text-red-400'
                            : step.bold
                            ? 'text-[#FF6B00]'
                            : 'text-white/70'
                        }`}
                      >
                        {step.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: NOTE BAS ── */}
        <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-4">
          <Info size={15} className="text-white/30 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white/40 leading-relaxed">
            Frè yo ka chanje san avi. Dènye mizajou: <span className="text-white/60 font-semibold">Jen 2026</span>
          </p>
        </div>

      </div>
    </div>
  );
}
