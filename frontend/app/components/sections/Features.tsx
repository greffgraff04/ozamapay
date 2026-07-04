'use client';

import { eyebrow, sectionHeading, sectionIntro, sectionWrap, cardStyle } from './theme';

const FEATURES = [
  { title: 'Kat Vityèl', desc: 'Kreye kat Visa/Mastercard vityèl an kèk segond.', from: 'var(--navy)', to: 'var(--orange)' },
  { title: 'Transfè', desc: 'Voye lajan bay fanmi ak zanmi ou nan yon kout je.', from: 'var(--orange)', to: 'var(--navy)' },
  { title: 'Mobile Money', desc: 'Rechaj ak MonCash ak lòt metòd lokal yo.', from: 'var(--orange)', to: 'var(--orange-dark)' },
  { title: 'Biznis', desc: 'Aksepte peman kliyan toupatou nan mond lan.', from: 'var(--navy)', to: 'var(--navy-deep)' },
  { title: 'Wallet', desc: 'Sere epi jere plizyè lajan nan yon sèl kont.', from: 'var(--navy)', to: 'var(--orange)' },
  { title: 'Sekirite', desc: 'Ankriptaj ak siveyans fwod 24/7.', from: 'var(--orange)', to: 'var(--navy)' },
];

export default function Features() {
  return (
    <section data-screen-label="Fonksyonalite" id="fonksyonalite" style={sectionWrap}>
      <div style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}>
        <div style={eyebrow}>FONKSYONALITE</div>
        <h2 style={{ ...sectionHeading, marginBottom: 14 }}>Tout zouti finansye w bezwen, nan yon sèl plas</h2>
        <p style={sectionIntro}>
          Kèlkeswa si w se yon antreprenè, yon vandè oswa yon freelancer, Ozamapay ba w kontwòl total sou lajan w.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${f.from}, ${f.to})`, position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: 'oklch(1 0 0 / 0.35)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 17.5, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{f.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
