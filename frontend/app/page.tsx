'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/sections/Hero';
import Trust from './components/sections/Trust';
import Features from './components/sections/Features';
import OzamaCard from './components/sections/OzamaCard';
import Business from './components/sections/Business';
import SuperAppVision from './components/sections/SuperAppVision';
import Security from './components/sections/Security';
import HowItWorks from './components/sections/HowItWorks';
import Testimonials from './components/sections/Testimonials';
import WhyOzamapay from './components/sections/WhyOzamapay';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';
import PWAInstallBanner from './components/PWAInstallBanner';
import { themeVars } from './components/sections/theme';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default function HomePage() {
  const [logoClicks, setLogoClicks] = useState(0);
  const [showGate, setShowGate] = useState(false);
  const [email, setEmail] = useState('master@ozamapay.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyCode, setDailyCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = useCallback(() => {
    setLogoClicks(c => {
      const next = c + 1;
      if (next >= 3) {
        setShowGate(true);
        return 0;
      }
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setLogoClicks(0), 2000);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showGate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGate(false);
        setError('');
        setPassword('');
        setDailyCode('');
        setRequires2FA(false);
        setTempToken('');
        setTotpCode('');
      }
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => passwordRef.current?.focus(), 80);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGate]);

  useEffect(() => {
    if (requires2FA) setTimeout(() => totpRef.current?.focus(), 80);
  }, [requires2FA]);

  const storeAndRedirect = (data: { token?: string; access_token?: string; user?: Record<string, unknown> }) => {
    const token = data.access_token || data.token;
    const user  = data.user || data;
    localStorage.setItem('token', token as string);
    localStorage.setItem('user', JSON.stringify(user));
    document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
    window.location.href = '/admin';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, dailyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Idantifyan envalid');
        return;
      }
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setRequires2FA(true);
        return;
      }
      const role = data.user?.role || data.role;
      if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'AGENT' || role === 'SUPPORT') {
        storeAndRedirect(data);
      } else {
        setError('Aksè refize');
      }
    } catch {
      setError('Erè koneksyon');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/2fa/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Kòd envalid');
        return;
      }
      storeAndRedirect(data);
    } catch {
      setError('Erè koneksyon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="font-ibm-plex-sans"
      style={{ ...themeVars, width: '100%', background: 'var(--bg)', color: 'var(--ink)', overflowX: 'hidden', position: 'relative' }}
    >
      <PWAInstallBanner />

      {/* Invisible Easter-egg trigger wrapping the header logo area */}
      <div onClick={handleLogoClick}>
        <Header />
      </div>

      <Hero />
      <Trust />
      <Features />
      <OzamaCard />
      <Business />
      <SuperAppVision />
      <Security />
      <HowItWorks />
      <Testimonials />
      <WhyOzamapay />
      <FAQ />
      <FinalCTA />
      <Footer />

      {/* ── GATE MODAL ── */}
      {showGate && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(18px)', background: 'rgba(5,7,15,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowGate(false); setError(''); setPassword(''); setDailyCode(''); } }}
        >
          <div className="w-full max-w-[340px] mx-4 bg-[#0D0E14] border border-white/[0.06] rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#E05E00] flex items-center justify-center shadow-lg shadow-[#FF6B00]/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3M4.5 10.5h15M4.5 10.5v9a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-9" />
                </svg>
              </div>
            </div>

            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">
              Accès Restreint
            </p>

            {!requires2FA ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-xs font-mono text-white/80 outline-none focus:border-[#FF6B00]/40 transition placeholder:text-white/20"
                  placeholder="Email"
                  autoComplete="username"
                />
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-xs font-mono text-white/80 outline-none focus:border-[#FF6B00]/40 transition placeholder:text-white/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1.5 block">
                    Code Journalier (6 caractères)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={dailyCode}
                    onChange={e => { setDailyCode(e.target.value.toUpperCase()); setError(''); }}
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-xs font-mono text-white/80 outline-none focus:border-[#FF6B00]/40 transition placeholder:text-white/20 uppercase tracking-widest"
                    placeholder="000000"
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider text-center animate-in fade-in duration-150">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full bg-[#FF6B00] disabled:bg-white/10 disabled:text-white/20 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition active:scale-[0.98] mt-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : '→'}
                </button>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit} className="space-y-3">
                <p className="text-center text-[10px] text-white/40 font-mono mb-1">
                  Antre kòd 6 chif nan aplikasyon otantifikatè ou
                </p>
                <input
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm font-mono text-white text-center tracking-[0.4em] outline-none focus:border-[#FF6B00]/40 transition placeholder:text-white/20"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />

                {error && (
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider text-center animate-in fade-in duration-150">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full bg-[#FF6B00] disabled:bg-white/10 disabled:text-white/20 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition active:scale-[0.98] mt-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : 'Verifye →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
                  className="w-full text-white/30 text-[9px] uppercase tracking-widest hover:text-white/50 transition mt-1"
                >
                  ← Retounen
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </main>
  );
}
