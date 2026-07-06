'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  { quote: 'Ozamapay me donne la liberté de payer mes fournisseurs sans passer par une banque traditionnelle.', name: 'Jameson R.', role: 'Vendeur E-commerce', from: 'var(--navy)', to: 'var(--orange)' },
  { quote: 'Maintenant je peux recevoir l’argent de mes clients internationaux sans tracas.', name: 'Nadège P.', role: 'Designer Freelance', from: 'var(--orange)', to: 'var(--navy)' },
  { quote: 'Les cartes virtuelles ont changé ma façon de gérer ma publicité — tout est au même endroit.', name: 'Widelson C.', role: 'Agence Publicitaire', from: 'var(--navy)', to: 'var(--orange-dark)' },
];

export default function Testimonials() {
  return (
    <section data-screen-label="Temwayaj" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <style>{`
        .ozp-testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        @media (max-width: 640px) {
          .ozp-testimonials-grid {
            display: flex; overflow-x: auto; gap: 16px; scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch; padding-bottom: 8px; margin: 0 -20px; padding-left: 20px; padding-right: 20px;
          }
          .ozp-testimonials-grid > * { flex: 0 0 85%; scroll-snap-align: center; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>TÉMOIGNAGES</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Les entrepreneurs nous font confiance
        </h2>
      </motion.div>
      <div className="ozp-testimonials-grid">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -4 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <span style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 38, lineHeight: 1, color: 'var(--orange-soft)', fontWeight: 700 }}>"</span>
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>{t.quote}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${t.from}, ${t.to})`, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
