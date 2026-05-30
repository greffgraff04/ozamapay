'use client';
import { useState, useEffect } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agentCode, setAgentCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setAgentCode(ref);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:10000';

    try {
      const res = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, agentCode: agentCode || undefined }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      } else {
        setError(data.message || 'Yon erè te fèt');
      }
    } catch (err) {
      setError('Sèvè a pa reponn. Verifye si Backend lan lanse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] p-6 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="OzamaPay" style={{ height: '60px', objectFit: 'contain' }} className="mx-auto mb-3" />
          <p className="text-[#8E929B] text-xs font-bold uppercase italic">Kreye yon kont gratis</p>
        </div>

        {/* BADGE REFERRAL */}
        {agentCode && (
          <div className="bg-[#FFF6F0] border border-[#FF7A00]/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF7A00] rounded-xl flex items-center justify-center text-white text-xs font-black">✓</div>
            <div>
              <p className="text-[10px] font-black uppercase text-[#FF7A00] tracking-widest">Referral Aktif</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Kòd: {agentCode}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] p-4 rounded-2xl text-center font-black uppercase italic border border-red-100">
              {error}
            </div>
          )}

          <input
            type="text" placeholder="NON KONPLÈ" value={name} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm text-gray-900"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email" placeholder="EMAIL" value={email} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm text-gray-900"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="MODPAS" value={password} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm text-gray-900"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#0F121E] text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] mt-6 active:scale-95 transition-all shadow-lg"
          >
            {loading ? 'CHAJMAN...' : 'KREYE KONT MWEN'}
          </button>
        </form>

        <p className="text-center text-[10px] font-bold uppercase italic text-[#8E929B] mt-8">
          Ou gen yon kont deja?{' '}
          <a href="/login" className="text-[#FF7A00] font-black">Konekte</a>
        </p>
      </div>
    </div>
  );
}