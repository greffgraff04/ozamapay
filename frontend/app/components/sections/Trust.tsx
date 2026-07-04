'use client';

export default function Trust() {
  return (
    <section data-screen-label="Enfrastrikti" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 760, margin: '0 auto', textAlign: 'center',
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>
        POUKISA OZAMAPAY
      </div>
      <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(26px, 3.4vw, 38px)', letterSpacing: '-0.02em', margin: '0 0 16px', fontWeight: 700 }}>
        Enfrastrikti finansye ou ka fè konfyans
      </h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.65, margin: 0 }}>
        Bank tradisyonèl yo limite pou antreprenè ayisyen ak dyaspora a. Ozamapay bati yon platfòm ki elimine friksyon sa yo — pou w ka resevwa, jere, epi voye lajan san restriksyon.
      </p>
    </section>
  );
}
