'use client';

import Link from 'next/link';
import InstallButton from '../InstallButton';

const STATS = [
  { value: '50K+', label: 'Tranzaksyon' },
  { value: '24/7', label: 'Disponiblite' },
  { value: '99.9%', label: 'Uptime' },
];

export default function Hero() {
  return (
    <section style={{
      position: 'relative', padding: 'clamp(44px, 7vw, 88px) clamp(20px, 5vw, 56px) clamp(56px, 8vw, 96px)',
      display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center', maxWidth: 1320, margin: '0 auto',
    }}>
      <style>{`
        @keyframes blobPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatCard { 0% { transform: rotate(-6deg) translateY(0px); } 50% { transform: rotate(-6deg) translateY(-14px); } 100% { transform: rotate(-6deg) translateY(0px); } }
        @keyframes floatCard2 { 0% { transform: rotate(9deg) translateY(0px); } 50% { transform: rotate(9deg) translateY(10px); } 100% { transform: rotate(9deg) translateY(0px); } }
      `}</style>

      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'var(--orange-soft)', filter: 'blur(70px)', opacity: 0.7, top: -80, left: -120, animation: 'blobPulse 8s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'oklch(0.9 0.02 260)', filter: 'blur(70px)', opacity: 0.6, bottom: -60, right: '10%', animation: 'blobPulse 9s ease-in-out 1s infinite', zIndex: 0 }} />

      <div style={{ flex: '1 1 480px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.7s ease both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: 'var(--orange-soft)', color: 'var(--orange-dark)', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          Fintech Ayisyen • Peman Global • Kat Vityèl
        </div>
        <h1 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(36px, 5.2vw, 62px)', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 22px', fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>JUST PAY.</span> LAJAN W SAN LIMIT.
        </h1>
        <p style={{ fontSize: 'clamp(17px, 1.6vw, 19px)', lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 520, margin: '0 0 32px' }}>
          Yon sèl app pou kreye kat vityèl, voye lajan, epi grandi biznis ou — kèlkeswa kote w ye.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 40, alignItems: 'center' }}>
          <Link href="/register" style={{
            background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 12px 30px -12px color-mix(in srgb, var(--orange) 55%, transparent)', textDecoration: 'none', display: 'inline-block',
          }}>
            Kreye Kont
          </Link>
          <a href="#fonksyonalite" style={{
            background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', padding: '16px 30px', borderRadius: 100,
            fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          }}>
            <span style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '9px solid var(--ink)' }} />
            Gade Demo
          </a>
          <InstallButton className="inline-flex items-center gap-2.5 bg-transparent text-[var(--ink)] border-[1.5px] border-solid border-[var(--border)] px-[30px] py-4 rounded-full font-semibold text-base cursor-pointer whitespace-nowrap" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '1 1 340px', position: 'relative', zIndex: 1, minHeight: 420 }}>
        <div style={{
          width: 'min(230px, 60%)', aspectRatio: '9 / 18.5', margin: '0 auto', borderRadius: 34, border: '7px solid var(--navy)',
          background: 'repeating-linear-gradient(135deg, var(--orange-soft), var(--orange-soft) 10px, oklch(97% 0.008 80) 10px, oklch(97% 0.008 80) 20px)',
          position: 'absolute', top: '6%', left: '6%', overflow: 'hidden', boxShadow: 'oklch(0.2 0.03 260 / 0.3) 0px 30px 60px -24px',
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--navy)', background: 'oklch(0.99 0.005 80 / 0.9)', padding: '8px 10px', borderRadius: 8, border: '1px dashed var(--navy)' }}>
              app mockup
            </span>
          </div>
        </div>

        <div style={{
          width: 'min(320px, 84%)', aspectRatio: '1.586 / 1', margin: '0 auto', borderRadius: 22,
          background: 'linear-gradient(135deg, var(--orange), var(--navy))', position: 'absolute', top: '54%', left: '46%', opacity: 0.9,
          boxShadow: 'oklch(0.2 0.03 260 / 0.25) 0px 30px 60px -20px', animation: 'floatCard2 7s ease-in-out infinite',
        }} />
        <div style={{
          width: 'min(320px, 84%)', aspectRatio: '1.586 / 1', position: 'absolute', top: '8%', left: '30%', borderRadius: 22,
          background: 'linear-gradient(135deg, var(--navy), var(--orange))', padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: 'oklch(0.2 0.03 260 / 0.4) 0px 40px 70px -20px', animation: 'floatCard 6s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ width: 34, height: 26, borderRadius: 6, background: 'oklch(0.85 0.03 90 / 0.85)' }} />
            <span style={{ fontSize: 11.5, letterSpacing: '0.12em', color: 'oklch(0.95 0.01 80 / 0.85)', fontWeight: 600 }}>VIRTUAL</span>
          </div>
          <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(14px, 1.8vw, 18px)', color: 'white', letterSpacing: '0.12em' }}>
            •••• •••• •••• 4471
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontWeight: 700, color: 'white', fontSize: 15, letterSpacing: '-0.01em' }}>OZAMAPAY</span>
            <span style={{ fontSize: 11, color: 'oklch(0.95 0.01 80 / 0.75)' }}>12/29</span>
          </div>
        </div>
      </div>
    </section>
  );
}
