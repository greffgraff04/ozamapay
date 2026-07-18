'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView, animate } from 'framer-motion';

const STATS = [
  { value: '50K+', label: 'Transactions' },
  { value: '24/7', label: 'Disponibilité' },
  { value: '99.9%', label: 'Fiabilité' },
];

function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)(.*)$/);
  const [display, setDisplay] = useState(match ? `0${match[2]}` : value);

  useEffect(() => {
    if (!inView || !match) return;
    const target = parseFloat(match[1]);
    const decimals = match[1].includes('.') ? 1 : 0;
    const suffix = match[2];
    const controls = animate(0, target, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(`${v.toFixed(decimals)}${suffix}`),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <div ref={ref}>
      <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{display}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Hero() {
  return (
    <section style={{
      position: 'relative', padding: 'clamp(44px, 7vw, 88px) clamp(20px, 5vw, 56px) clamp(56px, 8vw, 96px)',
      display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center', maxWidth: 1320, margin: '0 auto',
    }}>
      <style>{`
        @keyframes blobPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatCard { 0% { transform: rotate(-5deg) translateY(0px); } 50% { transform: rotate(-2deg) translateY(-14px); } 100% { transform: rotate(-5deg) translateY(0px); } }
        @keyframes floatCard2 { 0% { transform: rotate(9deg) translateY(0px); } 50% { transform: rotate(5deg) translateY(10px); } 100% { transform: rotate(9deg) translateY(0px); } }
        @media (max-width: 560px) {
          .ozp-hero-ctas { flex-direction: column; align-items: stretch; }
          .ozp-hero-ctas > a { text-align: center; justify-content: center; }
        }
      `}</style>

      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'var(--orange-soft)', filter: 'blur(70px)', opacity: 0.7, top: -80, left: -120, animation: 'blobPulse 8s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'oklch(0.9 0.02 260)', filter: 'blur(70px)', opacity: 0.6, bottom: -60, right: '10%', animation: 'blobPulse 9s ease-in-out 1s infinite', zIndex: 0 }} />

      <div style={{ flex: '1 1 480px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.7s ease both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: 'var(--orange-soft)', color: 'var(--orange-dark)', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          Fintech Haïtienne • Paiements Globaux • Carte Virtuelle
        </div>
        <h1 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(36px, 5.2vw, 62px)', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 22px', fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>JUST PAY.</span> VOTRE ARGENT, SANS LIMITES.
        </h1>
        <p style={{ fontSize: 'clamp(17px, 1.6vw, 19px)', lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 520, margin: '0 0 32px' }}>
          Une seule application pour créer des cartes virtuelles, envoyer de l’argent et développer votre activité — où que vous soyez.
        </p>
        <div className="ozp-hero-ctas" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 40, alignItems: 'center', justifyContent: 'flex-start' }}>
          <Link href="/register" className="ozp-btn-glow" style={{
            background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 12px 30px -12px color-mix(in srgb, var(--orange) 55%, transparent)', textDecoration: 'none', display: 'inline-block',
          }}>
            Créer un compte
          </Link>
          <a href="#fonksyonalite" className="ozp-btn-glow" style={{
            background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', padding: '16px 30px', borderRadius: 100,
            fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          }}>
            <span style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '9px solid var(--ink)' }} />
            Voir la démo
          </a>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          {STATS.map((s) => (
            <StatCounter key={s.label} value={s.value} label={s.label} />
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
              aperçu de l’app
            </span>
          </div>
        </div>

        <div style={{
          width: 'min(300px, 82%)', position: 'absolute', top: '54%', left: '46%', opacity: 0.55,
          filter: 'blur(2px) drop-shadow(0 20px 30px color-mix(in srgb, var(--navy) 40%, transparent))',
          animation: 'floatCard2 7s ease-in-out infinite',
        }}>
          <Image src="/carte_for_the_app.png" alt="" width={1012} height={638} aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
        <div style={{
          width: 'min(320px, 84%)', position: 'absolute', top: '8%', left: '30%',
          filter: 'drop-shadow(0 25px 40px color-mix(in srgb, var(--orange) 45%, transparent))',
          animation: 'floatCard 6s ease-in-out infinite',
        }}>
          <Image src="/carte_for_the_app.png" alt="Carte virtuelle Ozamapay" width={1012} height={638} style={{ width: '100%', height: 'auto', display: 'block' }} priority />
        </div>
      </div>
    </section>
  );
}
