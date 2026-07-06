'use client';

import { motion } from 'framer-motion';

const PILLS = ['Carte', 'Transfert', 'Business', 'Épargne', 'Et Plus'];

export default function SuperAppVision() {
  return (
    <motion.section
      data-screen-label="Vizyon"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, margin: '-80px' }}
      style={{
        padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 800, margin: '0 auto', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>VISION</div>
      <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: '0 0 18px', fontWeight: 700 }}>
        Nous construisons la super app financière d’Haïti
      </h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.6, margin: '0 0 32px' }}>
        Notre objectif est de réunir carte, transfert, business et épargne dans une seule plateforme — pour que chaque Haïtien, où qu’il soit, ait accès aux mêmes outils financiers que n’importe quel autre pays.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {PILLS.map((p) => (
          <span key={p} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange-dark)', background: 'var(--orange-soft)', padding: '8px 16px', borderRadius: 100 }}>
            {p}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
