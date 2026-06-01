'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMsg('Modpas ou chanje avèk siksè. Konekte kounye a.');
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;

        if (email.toLowerCase() === 'oli@ozama.com') {
          window.location.href = '/admin/users';
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F121E] text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] mt-6 active:scale-95 transition-all shadow-lg"
          >
            {loading ? 'VERIFYE...' : 'SE CONNECTER'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[10px] font-bold text-[#8E929B] uppercase">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={() => { window.location.href = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000') + '/auth/google'; }}
          style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginTop: '12px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Konekte ak Google
        </button>

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
