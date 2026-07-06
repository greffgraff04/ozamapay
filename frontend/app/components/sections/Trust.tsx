'use client';

import { motion } from 'framer-motion';

export default function Trust() {
  return (
    <motion.section
      data-screen-label="Enfrastrikti"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, margin: '-80px' }}
      style={{
        padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 760, margin: '0 auto', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>
        POURQUOI OZAMAPAY
      </div>
      <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(26px, 3.4vw, 38px)', letterSpacing: '-0.02em', margin: '0 0 16px', fontWeight: 700 }}>
        Une infrastructure financière en qui vous pouvez avoir confiance
      </h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.65, margin: 0 }}>
        Les banques traditionnelles limitent les entrepreneurs haïtiens et la diaspora. Ozamapay construit une plateforme qui élimine ces frictions — pour recevoir, gérer et envoyer de l’argent sans restriction.
      </p>
    </motion.section>
  );
}
