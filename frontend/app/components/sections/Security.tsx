'use client';

import { motion } from 'framer-motion';
import { Lock, ShieldAlert, UserCheck } from 'lucide-react';

const TRUST_POINTS = [
  { title: 'Chiffrement Total', desc: 'Chaque donnée et chaque transaction est protégée par un chiffrement de niveau industriel.', icon: Lock },
  { title: 'Surveillance Anti-Fraude 24/7', desc: 'Nos systèmes surveillent votre compte en permanence pour détecter toute activité suspecte.', icon: ShieldAlert },
  { title: 'Vérification KYC', desc: 'Chaque utilisateur suit un processus de vérification d’identité rigoureux.', icon: UserCheck },
];

export default function Security() {
  return (
    <section data-screen-label="Sekirite" id="sekirite" style={{
      position: 'relative', overflow: 'hidden', background: 'var(--navy)', color: 'white',
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)',
    }}>
      <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'var(--orange)', filter: 'blur(100px)', opacity: 0.22, top: -100, right: -60 }} />
      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{ maxWidth: 560, margin: '0 auto 44px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>SÉCURITÉ</div>
          <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: '0 0 14px', fontWeight: 700 }}>
            La confiance est notre fondation
          </h2>
          <p style={{ color: 'oklch(0.85 0.02 260)', fontSize: 16.5, lineHeight: 1.6, margin: 0 }}>
            Nous appliquons les standards de sécurité utilisés par l’industrie pour protéger chaque transaction et chaque compte.
          </p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {TRUST_POINTS.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ y: -4 }}
              style={{ background: 'oklch(1 0 0 / 0.05)', border: '1px solid oklch(1 0 0 / 0.12)', borderRadius: 18, padding: 26 }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'oklch(1 0 0 / 0.1)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <t.icon size={20} color="var(--orange)" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 600, margin: '0 0 8px' }}>{t.title}</h3>
              <p style={{ color: 'oklch(0.8 0.02 260)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
