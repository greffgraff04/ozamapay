'use client';

const STEPS = [
  { n: '01', title: 'Enskri epi Verifye', desc: 'Kreye kont ou an de minit epi konplete verifikasyon KYC rapid la.' },
  { n: '02', title: 'Chaje Kont Ou', desc: 'Rechaj ak MonCash, kat, oswa transfè dirèk.' },
  { n: '03', title: 'Kreye Kat Vityèl', desc: 'Jenere yon kat Visa/Mastercard vityèl an kèk segond.' },
  { n: '04', title: 'Voye, Resevwa, Peye', desc: 'Jere tout operasyon finansye w yo nan yon sèl app.' },
];

export default function HowItWorks() {
  return (
    <section data-screen-label="Kijan li mache" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <div style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>KIJAN LI MACHE</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Kat etap, epi w pare
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {STEPS.map((s) => (
          <div key={s.n}>
            <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--orange)', marginBottom: 12 }}>{s.n}</div>
            <h3 style={{ fontSize: 16.5, fontWeight: 600, margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
