'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dailyCode, setDailyCode] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMsg('Modpas ou chanje avèk siksè. Konekte kounye a.');
    }
    if (searchParams.get('setup') === 'success') {
      setSuccessMsg('Kont ou kreye avèk siksè. Konekte ak kredansyèl ou yo.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

    try {
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(isAdminLogin && dailyCode ? { dailyCode } : {}) }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;

        const role = data.user?.role;
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message || 'Email oswa modpas pa bon');
      }
    } catch {
      setError('Sèvè a pa reponn. Verifye si Backend lan lanse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] p-6 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <img src="/ozamapaylogo2.png" alt="OzamaPay" style={{ height: '120px', objectFit: 'contain', width: 'auto' }} className="mx-auto" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {successMsg && (
            <div className="bg-green-50 text-green-700 text-[10px] p-4 rounded-2xl text-center font-black uppercase italic border border-green-100">
              {successMsg}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] p-4 rounded-2xl text-center font-black uppercase italic border border-red-100">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm text-gray-900"
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              required
              className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm text-gray-900"
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="text-right mt-2">
              <a
                href="/forgot-password"
                className="text-[10px] text-[#FF7A00] font-bold hover:underline underline-offset-2"
              >
                Ou bliye modpas ou?
              </a>
            </div>
          </div>

          {/* Admin toggle */}
          <button
            type="button"
            onClick={() => { setIsAdminLogin(!isAdminLogin); setDailyCode(''); }}
            className={`w-full py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${isAdminLogin ? 'bg-[#0F121E] border-[#FF7A00]/40 text-[#FF7A00]' : 'bg-transparent border-gray-100 text-gray-400 hover:border-gray-200'}`}
          >
            {isAdminLogin ? '🔐 Mode Employé OZAMAPAY actif' : 'Je suis un employé OZAMAPAY'}
          </button>

          {/* Daily code field — admin only */}
          {isAdminLogin && (
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">
                Code d'accès journalier
              </label>
              <input
                type="text"
                placeholder="XXXXXX"
                value={dailyCode}
                maxLength={6}
                onChange={(e) => setDailyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="w-full p-5 rounded-2xl border border-[#FF7A00]/30 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-black text-xl text-center tracking-[0.4em] text-[#0F121E]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F121E] text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] mt-6 active:scale-95 transition-all shadow-lg"
          >
            {loading ? 'VERIFYE...' : 'SE CONNECTER'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#8E929B] text-[10px] font-bold uppercase italic">
            Ou pa gen kont?
            <a href="/register" className="text-[#FF7A00] ml-2 underline decoration-2 underline-offset-4">
              Kreye yon kont
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="w-8 h-8 border-[3px] border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
