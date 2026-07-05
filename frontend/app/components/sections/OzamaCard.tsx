'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const CAPABILITIES = [
  'Kreyasyon enstantane',
  'Jesyon limit depans',
  'Jele oswa dejele nenpòt lè',
  'Plizyè kat pou plizyè pwojè',
];

export default function OzamaCard() {
  return (
    <section data-screen-label="Kat Vityèl" id="kat-vityel" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
      display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center',
    }}>
      <style>{`
        @keyframes ozpCardFloat {
          0% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-16px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(-5deg); }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ flex: '1 1 420px' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>KAT VITYÈL</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: '0 0 18px', fontWeight: 700 }}>
          Yon kat pou chak bezwen
        </h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.6, margin: '0 0 28px' }}>
          Kreye kat Visa/Mastercard vityèl san limit pou peye abònman, piblisite, ak zouti travay ou. Kontwole yo an tan reyèl, dirèkteman nan app la.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CAPABILITIES.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
              <span style={{ fontSize: 15, color: 'var(--ink)' }}>{c}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center' }}
      >
        <div style={{
          width: 'min(340px, 90%)', animation: 'ozpCardFloat 6.5s ease-in-out infinite',
          filter: 'drop-shadow(0 30px 45px color-mix(in srgb, var(--orange) 45%, transparent))',
        }}>
          <Image
            src="/card.png"
            alt="Kat vityèl Ozamapay"
            width={1012}
            height={638}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
