'use client';

import { motion } from 'framer-motion';
import { Zap, DollarSign, Headphones, Globe2, BarChart3 } from 'lucide-react';

const WHY_POINTS = [
  { title: 'KYC Rapide', desc: 'Vérification d’identité en quelques minutes.', icon: Zap },
  { title: 'Sans Frais Cachés', desc: 'Des prix clairs, sans surprise.', icon: DollarSign },
  { title: 'Support 24/7', desc: 'Notre équipe est toujours disponible.', icon: Headphones },
  { title: 'Conçu pour Haïti', desc: 'Pensé pour la diaspora et MonCash.', icon: Globe2 },
  { title: 'Contrôle Total', desc: 'Suivez chaque dépense en temps réel.', icon: BarChart3 },
];

export default function WhyOzamapay() {
  return (
    <section data-screen-label="Poukisa Ozamapay" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>POURQUOI OZAMAPAY</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Ce qui nous rend différents
        </h2>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {WHY_POINTS.map((w, i) => (
          <motion.div
            key={w.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -4 }}
            style={{ textAlign: 'center', padding: 8 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--orange-soft)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <w.icon size={20} color="var(--orange)" strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: '0 0 6px' }}>{w.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{w.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
