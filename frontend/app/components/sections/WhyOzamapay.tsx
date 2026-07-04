'use client';

const WHY_POINTS = [
  { title: 'KYC Rapid', desc: 'Verifikasyon idantite an kèk minit.' },
  { title: 'San Frè Kache', desc: 'Pri klè, san sipriz.' },
  { title: 'Sipò 24/7', desc: 'Ekip nou toujou disponib.' },
  { title: 'Fèt pou Ayiti', desc: 'Konstwi pou dyaspora a ak MonCash.' },
  { title: 'Kontwòl Total', desc: 'Swiv chak depans an tan reyèl.' },
];

export default function WhyOzamapay() {
  return (
    <section data-screen-label="Poukisa Ozamapay" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <div style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>POUKISA OZAMAPAY</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Sa ki fè n diferan
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {WHY_POINTS.map((w) => (
          <div key={w.title} style={{ textAlign: 'center', padding: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--orange-soft)', margin: '0 auto 16px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--orange)' }} />
            </div>
            <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: '0 0 6px' }}>{w.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>{w.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
