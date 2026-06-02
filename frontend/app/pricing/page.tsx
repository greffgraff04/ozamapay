'use client';

import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
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
    icon: '↑',
  },
  {
    label: 'Topup Entènasyonal',
    sub: 'Zelle · CashApp · Wise · Meru',
    value: '6%',
    note: 'konvèti + frè',
    icon: '↑',
  },
  {
    label: 'Retrè',
    sub: 'Nan kont ou',
    value: '2%',
    note: 'sou montan retrè',
    icon: '↓',
  },
  {
    label: 'Transfer P2P',
    sub: 'Ant itilizatè OZAMAPAY',
    value: 'GRATIS',
    note: '',
    icon: '↔',
  },
  {
    label: 'KYC Verifikasyon',
    sub: 'Yon sèl fwa',
    value: '$25 USD',
    note: 'peman yon sèl fwa',
    icon: '✓',
  },
  {
    label: 'Kreye Kat VISA',
    sub: 'Apre KYC apwouve',
    value: 'GRATIS',
    note: '',
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

export default function PricingPage() {
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
              Taux &amp; Frè{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                OZAMAPAY
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Tout frè nou yo klè, san sipriz. Konnen egzakteman sa ou peye anvan ou fè yon tranzaksyon.
            </p>
          </div>

          {/* Frè Tranzaksyon */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Frè Tranzaksyon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fees.map((fee) => (
                <div
                  key={fee.label}
                  className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all"
                >
                  <div className="text-2xl text-orange-500 mb-4">{fee.icon}</div>
                  <p className="text-3xl font-bold text-orange-500 mb-1">{fee.value}</p>
                  {fee.note
                    ? <p className="text-xs text-slate-400 mb-4">{fee.note}</p>
                    : <div className="mb-4 mt-1 h-4" />
                  }
                  <h3 className="text-xl font-semibold text-white mb-2">{fee.label}</h3>
                  <p className="text-slate-400">{fee.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Taux Aktyèl */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              Taux Aktyèl <TrendingUp className="w-6 h-6 text-orange-500" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {rates.map((r) => (
                <div
                  key={r.pair}
                  className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all text-center"
                >
                  <span className="text-4xl block mb-4">{r.icon}</span>
                  <p className="text-slate-400 text-sm mb-2">{r.pair}</p>
                  <p className="text-2xl font-bold text-orange-500">{r.result}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Egzanp Kalkil */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Egzanp Kalkil</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {examples.map((ex) => (
                <div
                  key={ex.title}
                  className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all"
                >
                  <p className="text-sm font-bold text-orange-500 uppercase tracking-wide mb-6 leading-relaxed">
                    {ex.title}
                  </p>
                  <div className="space-y-3">
                    {ex.steps.map((step, si) => (
                      <div key={step.label}>
                        {si === ex.steps.length - 1 && (
                          <div className="h-px bg-slate-700 mb-3" />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">{step.label}</span>
                          <span
                            className={`text-sm font-bold ${
                              step.accent
                                ? 'text-red-400'
                                : step.bold
                                ? 'text-orange-500 text-base'
                                : 'text-slate-300'
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
          </div>

          {/* Note */}
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-slate-300 leading-relaxed">
              Frè yo ka chanje san avi. Dènye mizajou :{' '}
              <span className="text-white font-semibold">Jen 2026</span>
            </p>
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
