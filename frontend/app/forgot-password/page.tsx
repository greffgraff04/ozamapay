'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.message || 'Erè. Eseye ankò.');
      }
    } catch {
      setError('Sèvè a pa reponn. Verifye koneksyon ou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6 font-space-grotesk">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/ozamapaylogo2.png" alt="OzamaPay" style={{ height: '120px', objectFit: 'contain', width: 'auto' }} className="mx-auto" />
        </div>

        <div className="bg-[#111318] border border-white/[0.06] rounded-3xl p-8">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-white">Verifye email ou</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Si adrès <span className="text-white/80 font-medium">{email}</span> egziste nan sistèm nan, nou voye yon lyen reset modpas. Tcheke bwat email ou (ak spam).
              </p>
              <p className="text-xs text-white/30">Lyen an valid pou 1 èdtan.</p>
              <a
                href="/login"
                className="inline-block mt-4 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition text-sm font-semibold text-white/70"
              >
                ← Retounen sou Login
              </a>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-7">
                <h1 className="text-xl font-bold text-white mb-1">Ou bliye modpas ou?</h1>
                <p className="text-sm text-white/40">
                  Antre email ou epi nou ap voye yon lyen pou reset modpas ou.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Adrès email ou"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm text-white placeholder:text-white/25 transition"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#ff7a1a] disabled:opacity-50 transition font-bold text-sm uppercase tracking-widest"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Voye...
                    </span>
                  ) : (
                    'Voye Lyen Reset'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a href="/login" className="text-xs text-white/30 hover:text-white/60 transition">
                  ← Retounen sou Login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
