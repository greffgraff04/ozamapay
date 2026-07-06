'use client';

import { motion } from 'framer-motion';

const FAQS = [
  { question: 'Qu’est-ce qu’Ozamapay ?', answer: 'Ozamapay est un système financier qui permet aux utilisateurs en Haïti et dans la diaspora de gérer leur argent, créer des cartes virtuelles, et effectuer des paiements partout dans le monde.' },
  { question: 'Comment créer une carte virtuelle ?', answer: 'Une fois votre compte vérifié, vous pouvez créer une carte virtuelle Visa/Mastercard en quelques secondes directement depuis l’app.' },
  { question: 'Mon argent est-il en sécurité ?', answer: 'Oui. Nous utilisons un chiffrement de niveau industriel, une surveillance anti-fraude 24/7, et un processus de vérification KYC rigoureux.' },
  { question: 'Comment recharger mon compte ?', answer: 'Vous pouvez recharger votre compte avec MonCash, une carte bancaire, ou un transfert direct depuis un autre compte Ozamapay.' },
  { question: 'Combien de temps prend la vérification KYC ?', answer: 'La plupart des vérifications sont complétées en quelques minutes, mais certaines peuvent prendre jusqu’à 24 heures selon les documents fournis.' },
  { question: 'Dans quels pays Ozamapay est-il disponible ?', answer: 'Ozamapay est conçu pour Haïti et sa diaspora, avec un support pour les transactions internationales partout dans le monde.' },
];

export default function FAQ() {
  return (
    <section data-screen-label="FAQ" id="faq" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 800, margin: '0 auto',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>FAQ</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Questions fréquemment posées
        </h2>
      </motion.div>
      <style>{`
        .ozp-faq summary { list-style: none; }
        .ozp-faq summary::-webkit-details-marker { display: none; }
        .ozp-faq details[open] summary span:last-child { transform: rotate(45deg); }
        .ozp-faq summary span:last-child { display: inline-block; transition: transform 0.15s ease; }
      `}</style>
      <div className="ozp-faq" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FAQS.map((f) => (
          <details key={f.question} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
            <summary style={{ fontSize: 15.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span>{f.question}</span>
              <span style={{ color: 'var(--orange)', fontSize: 20, fontWeight: 400 }}>+</span>
            </summary>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, margin: '14px 0 0' }}>{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
