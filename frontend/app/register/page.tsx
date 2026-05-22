'use client';
import { useState } from 'react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Li varyab Vercel la, si l pa jwenn li li pran localhost kòm sekirite
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      // Itilize dinamik URL avèk bèl ti backticks yo
      const res = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
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
          <h1 className="text-4xl font-black italic tracking-tighter text-black uppercase">OZAMA PAY</h1>
          <div className="h-1 w-12 bg-[#FF7A00] mx-auto mt-2 rounded-full"></div>
          <p className="text-[#8E929B] text-xs font-bold uppercase italic mt-4">Kreye yon kont gratis</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] p-4 rounded-2xl text-center font-black uppercase italic border border-red-100">
              {error}
            </div>
          )}

          <input
            type="text" placeholder="NON KONPLÈ" value={name} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email" placeholder="EMAIL" value={email} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password" placeholder="MODPAS" value={password} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm"
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