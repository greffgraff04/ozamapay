'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function FinalCTA() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/register');
  };

  return (
    <section className="ozp-gradient-anim" style={{
      background: 'linear-gradient(120deg, var(--navy), var(--navy-deep), var(--orange-dark), var(--navy))', color: 'white',
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px) 0',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-80px' }}
        style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', paddingBottom: 56, borderBottom: '1px solid oklch(1 0 0 / 0.1)' }}
      >
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(26px, 3.8vw, 42px)', letterSpacing: '-0.02em', margin: '0 0 16px', fontWeight: 700 }}>
          Pare pou kòmanse?
        </h2>
        <p style={{ color: 'oklch(0.85 0.02 260)', fontSize: 16, margin: '0 0 26px' }}>
          Kreye kont ou gratis epi jwenn premye kat vityèl ou an kèk minit.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="imèl ou"
            style={{
              padding: '15px 20px', borderRadius: 100, border: '1px solid oklch(1 0 0 / 0.2)', background: 'oklch(1 0 0 / 0.06)',
              color: 'white', fontFamily: 'inherit', fontSize: 15, minWidth: 240, outline: 'none',
            }}
          />
          <button type="submit" className="ozp-btn-glow" style={{
            background: 'var(--orange)', color: 'white', border: 'none', padding: '15px 28px', borderRadius: 100,
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>
            Kreye Kont
          </button>
        </form>
      </motion.div>
    </section>
  );
}
