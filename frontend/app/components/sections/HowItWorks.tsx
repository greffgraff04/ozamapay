'use client';

import { motion } from 'framer-motion';

const STEPS = [
  { n: '01', title: 'Inscrivez-vous et Vérifiez', desc: 'Créez votre compte en deux minutes et complétez la vérification KYC rapide.' },
  { n: '02', title: 'Alimentez Votre Compte', desc: 'Rechargez avec MonCash, une carte, ou un transfert direct.' },
  { n: '03', title: 'Créez une Carte Virtuelle', desc: 'Générez une carte Visa/Mastercard virtuelle en quelques secondes.' },
  { n: '04', title: 'Envoyez, Recevez, Payez', desc: 'Gérez toutes vos opérations financières dans une seule app.' },
];

export default function HowItWorks() {
  return (
    <section data-screen-label="Kijan li mache" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>COMMENT ÇA MARCHE</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Quatre étapes, et vous êtes prêt
        </h2>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            viewport={{ once: true, margin: '-60px' }}
          >
            <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--orange)', marginBottom: 12 }}>{s.n}</div>
            <h3 style={{ fontSize: 16.5, fontWeight: 600, margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
