'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

const CATEGORIES = [
  'Restoran / Manje',
  'Boutik / Detay',
  'Sèvis',
  'Teknoloji',
  'Byen Imobilye',
  'Transpò',
  'Lasante & Byotè',
  'Edikasyon',
  'Lòt',
];

const TIERS: { id: 'STARTER' | 'PRO' | 'ENTERPRISE'; label: string; fee: string; desc: string }[] = [
  { id: 'STARTER', label: 'Starter', fee: '2.5%', desc: 'Ideyal pou kòmanse' },
  { id: 'PRO', label: 'Pro', fee: '2.0%', desc: 'Pou biznis k ap grandi' },
  { id: 'ENTERPRISE', label: 'Enterprise', fee: '1.5%', desc: 'Pi bon to pou gwo volim' },
];

export default function BusinessApplyPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: '',
    category: '',
    tier: 'STARTER' as 'STARTER' | 'PRO' | 'ENTERPRISE',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login?redirect=/business/apply');
      return;
    }

    (async () => {
      try {
        const [meRes, businessRes] = await Promise.all([
          fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/business/me`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const me = meRes.ok ? await meRes.json() : null;
        const businesses = businessRes.ok ? await businessRes.json() : null;

        // Already owns a business — nothing to apply for, send them back.
        if (businesses?.owned?.length > 0) {
          router.replace('/dashboard');
          return;
        }

        if (me?.kyc?.status !== 'APPROVED') {
          setBlocked(
            me?.kyc?.status === 'PENDING'
              ? 'KYC ou an anba revizyon. W ap ka aplike pou yon Business yon fwa admin apwouve li.'
              : 'Ou dwe verifye KYC ou anvan ou ka aplike pou yon Business.'
          );
          return;
        }

        if (me?.phone) setForm((f) => ({ ...f, phone: me.phone }));
      } catch {
        setBlocked('Nou pa ka konekte ak sèvè a. Eseye ankò pita.');
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.category || !form.phone || !form.address) {
      setError('Tanpri ranpli tout chan obligatwa yo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/business/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data?.message || 'Yon erè fèt. Eseye ankò.');
      }
    } catch {
      setError('Erè rezo. Verifye koneksyon ou epi eseye ankò.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F121E] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-2xl font-black italic text-white tracking-tighter">
            OZAMA<span className="text-[#FF7A00]">PAY</span>
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 sm:p-8">
          {checking && (
            <div className="text-center text-white/40 font-black italic uppercase text-xs py-8">
              Chajman...
            </div>
          )}

          {!checking && blocked && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2">
                Aksè Bloke
              </p>
              <p className="text-white/70 text-sm leading-relaxed mb-6">{blocked}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
              >
                Ale nan Dashboard
              </button>
            </div>
          )}

          {!checking && !blocked && submitted && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2">
                Aplikasyon Soumèt
              </p>
              <h1 className="text-white font-black italic text-xl tracking-tight mb-3">
                Mèsi, {form.businessName}!
              </h1>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Aplikasyon Business ou a nan revizyon. Admin ap voye yon imel ba ou pou konfime desizyon an.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
              >
                Ale nan Dashboard
              </button>
            </div>
          )}

          {!checking && !blocked && !submitted && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2">
                  Aplikasyon Business
                </p>
                <h1 className="text-white font-black italic text-xl tracking-tight">
                  Kreye Biznis Ou sou OZAMAPAY
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">
                    Non Biznis *
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    placeholder="Boutik Greffin"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">
                    Kategori *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:border-[#FF7A00] outline-none transition"
                  >
                    <option value="" disabled className="bg-[#0F121E]">Chwazi yon kategori</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0F121E]">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">
                      Telefòn *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+509 3x xx xxxx"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2 block">
                      Adrès *
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Rue Faubert, Jakmel"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#FF7A00] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-3 block">
                    Plan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TIERS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tier: t.id }))}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          form.tier === t.id
                            ? 'bg-[#FF7A00]/10 border-[#FF7A00]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <p className={`font-black italic uppercase text-xs mb-1 ${form.tier === t.id ? 'text-[#FF7A00]' : 'text-white'}`}>
                          {t.label}
                        </p>
                        <p className="text-white font-black text-lg mb-1">{t.fee}</p>
                        <p className="text-white/40 text-[10px] leading-tight">{t.desc} · frè tranzaksyon</p>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 font-black italic uppercase text-[10px] text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Ap voye...
                    </span>
                  ) : 'Soumèt Aplikasyon'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
