'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

// ── Inline SVGs ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="14" height="17" viewBox="0 0 814 1000" fill="white" aria-hidden>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-166-39.5c-79 0-102.7 40.1-165.7 40.1s-108.3-64.1-155.5-127.3C46.7 790.7 0 663 0 541.8c0-194.3 127.4-297.5 252.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LogoMark({ size = 84, radius = 26 }: { size?: number; radius?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: 'linear-gradient(140deg, #FF8a1a, #FF6B00)',
      boxShadow: '0 14px 36px -8px rgba(255,107,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      animation: 'splashBreath 2.8s ease-in-out infinite',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: '-10%', left: 0, width: '38%', height: '120%',
        background: 'linear-gradient(105deg, transparent, rgba(255,255,255,.22) 50%, transparent)',
        animation: 'splashShine 3s linear infinite', pointerEvents: 'none',
      }} />
      <svg width={Math.round(size * 0.45)} height={Math.round(size * 0.33)} viewBox="0 0 54 40" fill="none" aria-hidden>
        <rect x="2" y="2" width="50" height="36" rx="8" stroke="white" strokeWidth="2.5"/>
        <line x1="2" y1="14" x2="52" y2="14" stroke="white" strokeWidth="2.5"/>
        <rect x="8" y="21" width="14" height="8" rx="2.5" fill="white" fillOpacity="0.8"/>
      </svg>
    </div>
  );
}

function Orb({ color, style }: { color: 'orange' | 'purple'; style?: React.CSSProperties }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
      background: color === 'orange'
        ? 'radial-gradient(circle, rgba(255,122,0,.18), transparent 68%)'
        : 'radial-gradient(circle, rgba(120,60,255,.14), transparent 70%)',
      filter: 'blur(40px)',
      animation: color === 'orange' ? 'floatA 12s ease-in-out infinite' : 'floatB 15s ease-in-out infinite',
      ...style,
    }} />
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '0.15em', color: 'rgba(255,255,255,.38)',
  fontWeight: 600, marginBottom: 7,
};

const inputRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 14, padding: '0 14px', height: 52,
};

const plainInputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: 'white', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
};

// ── Main form ─────────────────────────────────────────────────────────────────

type Mode = 'login' | 'signup';

function AuthForm() {
  const searchParams = useSearchParams();

  const [mode, setMode]                     = useState<Mode>('login');
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [agentCode, setAgentCode]           = useState('');
  const [termsAccepted, setTermsAccepted]   = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [successMsg, setSuccessMsg]         = useState('');
  const [appleNotice, setAppleNotice]       = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup');
    const ref = searchParams.get('ref');
    if (ref) setAgentCode(ref);
    if (searchParams.get('reset') === 'success')
      setSuccessMsg('Modpas ou chanje avèk siksè. Konekte kounye a.');
    if (searchParams.get('setup') === 'success')
      setSuccessMsg('Kont ou kreye avèk siksè. Konekte ak kredansyèl ou yo.');
    if (searchParams.get('error') === 'no_token')
      setError('Koneksyon Google echwe. Eseye ankò.');
  }, [searchParams]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setAppleNotice(false);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
        const redirect = searchParams.get('redirect');
        const role = data.user?.role;
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT') {
          window.location.href = '/admin';
        } else {
          window.location.href = redirect || '/dashboard';
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('Ou dwe aksepte kondisyon yo pou kontinye.');
      return;
    }
    setLoading(true);
    setError('');
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
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        window.location.href = searchParams.get('redirect') || '/dashboard';
      } else {
        setError(data.message || 'Yon erè te fèt');
      }
    } catch {
      setError('Sèvè a pa reponn. Verifye si Backend lan lanse.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleApple = () => {
    setAppleNotice(true);
    setTimeout(() => setAppleNotice(false), 4000);
  };

  // ── Shared form JSX (rendered in both mobile and desktop right panel) ──────

  const isSignup = mode === 'signup';

  const form = (
    <div style={{ width: '100%', maxWidth: 380 }}>

      {/* Title + subtitle */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{
          fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, fontStyle: 'italic',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: 'white', lineHeight: 1.1, margin: '0 0 7px',
        }}>
          {isSignup ? 'Kreye Kont Ou' : 'Bon Retou'}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontWeight: 500, margin: 0 }}>
          {isSignup
            ? 'Kèk segond sèlman pou kòmanse'
            : 'Konekte pou kontinye sou OZAMAPAY'}
        </p>
      </div>

      {/* Segmented toggle */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.09)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16, padding: 4, marginBottom: 22, gap: 2,
      }}>
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
              background: mode === m ? '#FF7A00' : 'transparent',
              color: mode === m ? '#0a0c14' : 'rgba(255,255,255,.45)',
              fontWeight: 700, fontSize: 13, fontStyle: 'italic',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.22s ease, color 0.22s ease',
            }}
          >
            {m === 'login' ? 'Konekte' : 'Kreye Kont'}
          </button>
        ))}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.22)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
          fontSize: 11, color: 'rgba(34,197,94,.85)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,.09)', border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
          fontSize: 11, color: 'rgba(239,68,68,.85)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {error}
        </div>
      )}

      {/* Referral badge — signup only */}
      {isSignup && agentCode && (
        <div style={{
          background: 'rgba(255,122,0,.08)', border: '1px solid rgba(255,122,0,.2)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: '#FF7A00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#0a0c14',
          }}>✓</div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#FF7A00', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Referral Aktif</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase' }}>Kòd: {agentCode}</p>
          </div>
        </div>
      )}

      <form onSubmit={isSignup ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

        {/* Name — signup only, animated */}
        <div style={{
          overflow: 'hidden',
          maxHeight: isSignup ? '90px' : 0,
          opacity: isSignup ? 1 : 0,
          marginBottom: isSignup ? 0 : -13,
          transition: 'max-height 0.32s ease, opacity 0.28s ease, margin-bottom 0.32s ease',
        }}>
          <label style={fieldLabelStyle}>Non Konplè</label>
          <div style={inputRowStyle}>
            <User size={15} color="rgba(255,255,255,.28)" />
            <input
              type="text"
              placeholder="Jan Pòl Divendal"
              value={name}
              required={isSignup}
              tabIndex={isSignup ? 0 : -1}
              autoComplete="name"
              onChange={e => setName(e.target.value)}
              style={plainInputStyle}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={fieldLabelStyle}>Imèl</label>
          <div style={inputRowStyle}>
            <Mail size={15} color="rgba(255,255,255,.28)" />
            <input
              type="email"
              placeholder="ou@ozamapay.com"
              value={email}
              required
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              style={plainInputStyle}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={fieldLabelStyle}>Modpas</label>
          <div style={inputRowStyle}>
            <Lock size={15} color="rgba(255,255,255,.28)" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onChange={e => setPassword(e.target.value)}
              style={plainInputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'rgba(255,255,255,.28)' }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Forgot password — login only */}
        <div style={{
          overflow: 'hidden',
          maxHeight: !isSignup ? '26px' : 0,
          opacity: !isSignup ? 1 : 0,
          marginTop: !isSignup ? -5 : -13,
          transition: 'max-height 0.28s ease, opacity 0.24s ease, margin-top 0.28s ease',
        }}>
          <div style={{ textAlign: 'right' }}>
            <a href="/forgot-password" style={{ fontSize: 11, color: '#FF7A00', fontWeight: 600, textDecoration: 'none' }}>
              Bliye modpas?
            </a>
          </div>
        </div>

        {/* Terms — signup only */}
        <div style={{
          overflow: 'hidden',
          maxHeight: isSignup ? '64px' : 0,
          opacity: isSignup ? 1 : 0,
          marginBottom: isSignup ? 0 : -13,
          transition: 'max-height 0.32s ease, opacity 0.28s ease, margin-bottom 0.32s ease',
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <div
              role="checkbox"
              aria-checked={termsAccepted}
              tabIndex={isSignup ? 0 : -1}
              onClick={() => setTermsAccepted(v => !v)}
              onKeyDown={e => e.key === ' ' && setTermsAccepted(v => !v)}
              style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: 5, marginTop: 2,
                background: termsAccepted ? '#FF7A00' : 'transparent',
                border: `1.5px solid ${termsAccepted ? '#FF7A00' : 'rgba(255,255,255,.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s',
              }}
            >
              {termsAccepted && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                  <polyline points="1 4 4 7 9 1" stroke="#0a0c14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', lineHeight: 1.5, fontWeight: 500, userSelect: 'none' }}>
              Mwen aksepte{' '}
              <a href="/terms" style={{ color: '#FF7A00', textDecoration: 'none' }}>Kondisyon yo</a>
              {' '}ak{' '}
              <a href="/privacy" style={{ color: '#FF7A00', textDecoration: 'none' }}>Règleman konfidansyalite</a>
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', height: 54, marginTop: 2, border: 'none',
            borderRadius: 16, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(255,122,0,.55)' : '#FF7A00',
            color: '#0a0c14', fontWeight: 700, fontStyle: 'italic',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 14,
            fontFamily: 'inherit',
            animation: loading ? 'none' : 'glowPulse 2.8s ease-in-out infinite',
            transition: 'background 0.2s',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{
                width: 15, height: 15, border: '2px solid #0a0c14',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', display: 'inline-block',
              }} />
              Chajman...
            </span>
          ) : isSignup ? 'Kreye Kont Mwen' : 'Konekte'}
        </button>

      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,.26)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Oswa Kontinye Ak
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
      </div>

      {/* Apple coming-soon notice */}
      {appleNotice && (
        <div style={{
          background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 10, padding: '8px 14px', marginBottom: 10,
          fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600,
          textAlign: 'center', letterSpacing: '0.06em', animation: 'fadeUp 0.3s ease both',
        }}>
          Apple Sign-In ap vini talè
        </div>
      )}

      {/* Social buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            flex: 1, height: 50, border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.04)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <GoogleIcon /> Google
        </button>
        <button
          type="button"
          onClick={handleApple}
          style={{
            flex: 1, height: 50, border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.04)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <AppleIcon /> Apple
        </button>
      </div>

      {/* Security footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 }}>
        <ShieldCheckIcon />
        <span style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.26)', fontWeight: 600 }}>
          Done w yo chifre · lisansye BRH
        </span>
      </div>

    </div>
  );

  // ── Page layout ───────────────────────────────────────────────────────────

  return (
    <div className="font-space-grotesk" style={{ minHeight: '100vh' }}>

      {/* ══ MOBILE layout ══════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ minHeight: '100vh', position: 'relative' }}>

        {/* Fixed full-screen background + orbs (mobile only) */}
        <div style={{
          position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0,
          background: 'radial-gradient(130% 80% at 50% -8%, #1c1322 0%, #0a0c14 56%)',
        }}>
          <Orb color="orange" style={{ top: -60, left: '50%', transform: 'translateX(-50%)', width: 440, height: 350 }} />
          <Orb color="purple" style={{ bottom: 0, right: -80, width: 320, height: 320 }} />
        </div>

        {/* Scrollable content */}
        <div style={{
          position: 'relative', zIndex: 1, minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 20px 44px',
        }}>
          {/* Spacer pushes content to center when room is available */}
          <div style={{ flex: 1, maxHeight: 32, minHeight: 4 }} />

          {/* Logo mark */}
          <div style={{ marginBottom: 24 }}>
            <LogoMark size={84} radius={26} />
          </div>

          {form}

          <div style={{ flex: 1, maxHeight: 32, minHeight: 4 }} />
        </div>
      </div>

      {/* ══ DESKTOP layout (split screen) ═════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight: '100vh' }}>

        {/* Left panel */}
        <div style={{
          width: '48%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(120% 100% at 75% 15%, #321a26 0%, #1a0f1a 52%, #0a0c14 100%)',
          display: 'flex', flexDirection: 'column',
        }}>
          <Orb color="orange" style={{ top: -80, left: '30%', transform: 'translateX(-50%)', width: 460, height: 360 }} />
          <Orb color="purple" style={{ bottom: 40, right: -60, width: 300, height: 300 }} />

          {/* Wordmark — top left */}
          <div style={{ padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <LogoMark size={30} radius={9} />
            <span style={{ fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 15, letterSpacing: '0.06em', color: 'white' }}>
              OZAMAPAY
            </span>
          </div>

          {/* Card visual — centered */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: '0 40px' }}>
            <div style={{ transform: 'rotate(-4deg)', filter: 'drop-shadow(0 28px 56px rgba(255,107,0,.38))' }}>
              <img
                src="/card.png"
                alt="OZAMAPAY Virtual Card"
                style={{ width: 368, maxWidth: '90%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>

          {/* Bottom heading */}
          <div style={{ padding: '40px 48px', position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 32, fontWeight: 700, fontStyle: 'italic', color: 'white',
              lineHeight: 1.15, margin: '0 0 12px', textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}>
              Lajan w, san{' '}
              <span style={{ color: '#FF7A00' }}>fwontyè.</span>
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.42)', lineHeight: 1.65, margin: 0, maxWidth: 330 }}>
              Voye lajan, kreye kat vityèl Visa, rechaje MonCash — tout nan yon sèl app sekirize.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1, minHeight: '100vh', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(130% 80% at 50% -8%, #1c1322 0%, #0a0c14 56%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px',
        }}>
          <Orb color="purple" style={{ top: -60, right: -60, width: 300, height: 300, opacity: 0.7 }} />
          <Orb color="orange" style={{ bottom: 20, left: -40, width: 240, height: 240, opacity: 0.5 }} />
          {form}
        </div>

      </div>
    </div>
  );
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(130% 80% at 50% -8%, #1c1322 0%, #0a0c14 56%)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2.5px solid #FF7A00', borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthForm />
    </Suspense>
  );
}
