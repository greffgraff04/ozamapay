'use client';

import { motion } from 'framer-motion';

const AUDIENCES = [
  { title: 'Freelance', desc: 'Recevez les paiements de vos clients internationaux sans tracas.' },
  { title: 'Vendeur E-commerce', desc: 'Acceptez les paiements de vos clients partout dans le monde.' },
  { title: 'Agence Publicitaire', desc: 'Payez vos publicités et outils de travail avec une carte virtuelle.' },
  { title: 'Dropshipper', desc: 'Gérez vos fournisseurs et outils SaaS depuis un seul compte.' },
  { title: 'Fondateur de Startup', desc: 'Développez votre activité sans les limites bancaires classiques.' },
];

export default function Business() {
  return (
    <section data-screen-label="Biznis" id="biznis" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 620, margin: '0 auto 40px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>BUSINESS</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Conçu pour ceux qui bâtissent
        </h2>
      </motion.div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {AUDIENCES.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -4 }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px',
              minWidth: 200, flex: '1 1 200px', maxWidth: 260,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>{a.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
