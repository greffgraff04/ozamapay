'use client';

import { motion } from 'framer-motion';
import { CreditCard, ArrowLeftRight, Smartphone, Building2, Wallet, ShieldCheck } from 'lucide-react';
import { eyebrow, sectionHeading, sectionIntro, sectionWrap, cardStyle } from './theme';

const FEATURES = [
  { title: 'Carte Virtuelle', desc: 'Créez une carte Visa/Mastercard virtuelle en quelques secondes.', from: 'var(--navy)', to: 'var(--orange)', icon: CreditCard },
  { title: 'Transfert', desc: 'Envoyez de l’argent à votre famille et vos amis en un clin d’œil.', from: 'var(--orange)', to: 'var(--navy)', icon: ArrowLeftRight },
  { title: 'Mobile Money', desc: 'Rechargez avec MonCash et d’autres méthodes locales.', from: 'var(--orange)', to: 'var(--orange-dark)', icon: Smartphone },
  { title: 'Business', desc: 'Acceptez les paiements de vos clients partout dans le monde.', from: 'var(--navy)', to: 'var(--navy-deep)', icon: Building2 },
  { title: 'Portefeuille', desc: 'Conservez et gérez plusieurs devises dans un seul compte.', from: 'var(--navy)', to: 'var(--orange)', icon: Wallet },
  { title: 'Sécurité', desc: 'Chiffrement et surveillance anti-fraude 24/7.', from: 'var(--orange)', to: 'var(--navy)', icon: ShieldCheck },
];

export default function Features() {
  return (
    <section data-screen-label="Fonksyonalite" id="fonksyonalite" style={sectionWrap}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
      >
        <div style={eyebrow}>FONCTIONNALITÉS</div>
        <h2 style={{ ...sectionHeading, marginBottom: 14 }}>Tous les outils financiers dont vous avez besoin, au même endroit</h2>
        <p style={sectionIntro}>
          Que vous soyez entrepreneur, commerçant ou freelance, Ozamapay vous donne un contrôle total sur votre argent.
        </p>
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            viewport={{ once: true, margin: '-60px' }}
            whileHover={{ y: -4 }}
            style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, cursor: 'default' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${f.from}, ${f.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <f.icon size={22} color="white" strokeWidth={2} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 17.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{f.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
