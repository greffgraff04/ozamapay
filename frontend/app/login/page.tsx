'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Nou pran localhost:3001 kòm sekirite si .env lan pa moute
    const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:10000';
  
    try {
      // 🔥 KORÈK: Nou kase adrès 192.168... la ki t ap bay timeout a!
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        
        if (email.toLowerCase() === "oli@ozama.com") {
          window.location.href = "/admin/users"; 
        } else {
          window.location.href = "/dashboard"; 
        }
      } else {
        setError(data.message || "Email oswa modpas pa bon");
      }
    } catch (err) {
      setError("Sèvè a pa reponn. Verifye si Backend lan lanse.");
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
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] p-4 rounded-2xl text-center font-black uppercase italic border border-red-100">
              {error}
            </div>
          )}
          <input 
            type="email" placeholder="EMAIL" value={email} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="PASSWORD" value={password} required
            className="w-full p-5 rounded-2xl border border-gray-100 outline-none focus:border-[#FF7A00] bg-[#F9FAFB] font-bold text-sm"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="submit" disabled={loading}
            className="w-full bg-[#0F121E] text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] mt-6 active:scale-95 transition-all shadow-lg"
          >
            {loading ? 'VERIFYE...' : 'SE CONNECTER'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#8E929B] text-[10px] font-bold uppercase italic">
            Ou pa gen kont? 
            <a href="/register" className="text-[#FF7A00] ml-2 underline decoration-2 underline-offset-4">Kreye yon kont</a>
          </p>
        </div>
      </div>
    </div>
  );
}