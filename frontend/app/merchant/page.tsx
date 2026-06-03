'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, QrCode, BarChart3, ShieldCheck, Zap, DollarSign } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

const benefits = [
  { icon: DollarSign, title: 'Gratis pou kòmanse', desc: 'Enskri gratis, pa gen frè inisyal. Kòmanse aksepte peman jodi a.' },
  { icon: Zap, title: 'Peman imedya', desc: 'Kliyan peye, lajan rive nan kont ou imedyatman. Pa gen atant.' },
  { icon: ShieldCheck, title: 'Sekirize & konfyab', desc: 'Chak tranzaksyon pwoteje ak teknoloji bankè modèn.' },
];

const steps = [
  { num: '01', title: 'Enskri', desc: 'Ranpli fòm anba a ak enfòmasyon biznis ou. Sa pran mwens pase 2 minit.' },
  { num: '02', title: 'Resevwa QR Ou', desc: 'Ekip OZAMAPAY ap kontakte ou nan 24h epi ba ou QR kòd pèsonalizé biznis ou.' },
  { num: '03', title: 'Aksepte Peman', desc: 'Montre QR a kliyan yo. Yo skan, yo peye — lajan rive lakay ou.' },
];

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    fee: '1%',
    features: ['QR kòd vityèl', 'Tableau bò debaz', 'Sipò pa email', 'Peman imedya'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '2 000 HTG/mwa',
    fee: '0.5%',
    features: ['Tout Starter +', 'Rapò vant detaye', 'Sipò prioritè', 'Plizyè kès'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '5 000 HTG/mwa',
    fee: '0.3%',
    features: ['Tout Pro +', 'Terminal fizik', 'Jesyon anplwaye', 'API pèsonalizé'],
    highlight: false,
  },
];

export default function MerchantPage() {
  const [form, setForm] = useState({ businessName: '', email: '', phone: '', address: '', plan: 'STARTER' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.email || !form.phone || !form.address) {
      setError('Tanpri ranpli tout chan yo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/merchant/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.message || 'Yon erè fèt. Eseye ankò.');
      }
    } catch {
      setError('Erè rezo. Verifye koneksyon ou epi eseye ankò.');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">

          {/* Hero */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-2">
              <QrCode className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Terminal QR Komèsan</span>
            </div>
            <h1 className="text-5xl font-bold">
              Aksepte Peman{' '}
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                OZAMAPAY
              </span>
              <br />nan Biznis Ou
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Gratis pou kòmanse. Imedya. Sekirize. Plis pase 50 000 kliyan aktif ki prè pou peye nan biznis ou.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all">
                  <Icon className="w-8 h-8 text-orange-500 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{b.title}</h3>
                  <p className="text-slate-400">{b.desc}</p>
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white text-center">Kijan sa travay</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div key={s.num} className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 mb-4">
                    <span className="text-white font-bold text-sm">{s.num}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white text-center">Pri & Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-2xl p-8 border transition-all ${
                    p.highlight
                      ? 'bg-gradient-to-b from-orange-500/10 to-slate-800/50 border-orange-500/50'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  {p.highlight && (
                    <span className="inline-block mb-3 text-[10px] font-bold bg-orange-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                      Pi Popilè
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                  <p className={`text-2xl font-black mb-1 ${p.highlight ? 'text-orange-400' : 'text-white'}`}>
                    {p.price}
                  </p>
                  <p className="text-slate-400 text-sm mb-6">{p.fee} pa tranzaksyon</p>
                  <ul className="space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Application Form */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Kòmanse Gratis Jodi a</h2>
              <p className="text-slate-400 mt-2">Ranpli fòm sa — nou ap kontakte ou nan 24 èdtan.</p>
            </div>

            {submitted ? (
              <div className="bg-slate-800/50 rounded-2xl p-12 border border-green-500/30 text-center">
                <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Demann resevwa!</h3>
                <p className="text-slate-400">
                  Mèsi {form.businessName}. Ekip OZAMAPAY ap kontakte ou sou{' '}
                  <strong className="text-white">{form.email}</strong> nan 24 a 48 èdtan.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Non Biznis *</label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder="Boutik Greffin"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="biznis@email.com"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Telefòn *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+509 3x xx xxxx"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adrès *</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Rue Faubert, Jakmel"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['STARTER', 'PRO', 'ENTERPRISE'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, plan: p }))}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                          form.plan === p
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-orange-500/50'
                        }`}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 font-semibold">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/40 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ap voye...
                    </span>
                  ) : 'Kòmanse Gratis →'}
                </button>
              </form>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '50K+', label: 'Kliyan aktif' },
              { value: '2%', label: 'Frè sèlman' },
              { value: '24/7', label: 'Sipò disponib' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
                <p className="text-3xl font-black text-orange-400 mb-2">{s.value}</p>
                <p className="text-slate-400 text-sm">{s.label}</p>
              </div>
            ))}
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
