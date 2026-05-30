'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  useEffect(() => {
    if (!token) setError('Token mankant. Mande yon nouvo lyen reset.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Modpas la dwe gen minimum 6 karaktè.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Modpas yo pa menm. Verifye epi eseye ankò.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login?reset=success';
        }, 2500);
      } else {
        const msg = data.message || 'Erè. Eseye ankò.';
        if (msg.toLowerCase().includes('ekspire') || msg.toLowerCase().includes('expir')) {
          setError('Lyen reset ou a ekspire. Retounen sou "Ou bliye modpas?" pou mande yon nouvo lyen.');
        } else if (msg.toLowerCase().includes('valid') || msg.toLowerCase().includes('token')) {
          setError('Lyen reset sa a pa valid oswa deja itilize.');
        } else {
          setError(msg);
        }
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
          <img src="/logo.png" alt="OzamaPay" style={{ height: '50px', objectFit: 'contain' }} className="mx-auto" />
        </div>

        <div className="bg-[#111318] border border-white/[0.06] rounded-3xl p-8">

          {success ? (
            /* ── Success state ── */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-white">Modpas chanje!</h2>
              <p className="text-sm text-white/50">
                Modpas ou chanje avèk siksè. N ap voye ou sou paj login an...
              </p>
              <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-7">
                <h1 className="text-xl font-bold text-white mb-1">Nouvo Modpas</h1>
                <p className="text-sm text-white/40">Antre yon nouvo modpas pou kont OZAMAPAY ou.</p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                  {error}
                  {(error.includes('ekspire') || error.includes('valid')) && (
                    <div className="mt-2">
                      <a href="/forgot-password" className="text-[#FF6B00] underline">
                        Mande yon nouvo lyen →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Nouvo modpas (min. 6 karaktè)"
                    value={newPassword}
                    required
                    minLength={6}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-[#0A0B0F] border border-white/[0.08] focus:border-[#FF6B00]/50 outline-none text-sm text-white placeholder:text-white/25 transition"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Konfime nouvo modpas"
                    value={confirmPassword}
                    required
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-4 rounded-2xl bg-[#0A0B0F] border outline-none text-sm text-white placeholder:text-white/25 transition ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-white/[0.08] focus:border-[#FF6B00]/50'
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1.5 text-[11px] text-red-400 ml-1">Modpas yo pa menm</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#ff7a1a] disabled:opacity-50 transition font-bold text-sm uppercase tracking-widest mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Chanje Modpas...
                    </span>
                  ) : (
                    'Chanje Modpas'
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
