'use client';

const TESTIMONIALS = [
  { quote: 'Ozamapay ban mwen libète pou m peye founisè m yo san m pa bezwen yon bank tradisyonèl.', name: 'Jameson R.', role: 'Vandè E-commerce', from: 'var(--navy)', to: 'var(--orange)' },
  { quote: 'Kounye a mwen ka resevwa lajan kliyan entènasyonal mwen yo san tèt chaje.', name: 'Nadège P.', role: 'Freelancer Design', from: 'var(--orange)', to: 'var(--navy)' },
  { quote: 'Kat vityèl yo chanje jan m jere piblisite mwen yo — tout bagay nan yon sèl plas.', name: 'Widelson C.', role: 'Ajans Piblisite', from: 'var(--navy)', to: 'var(--orange-dark)' },
];

export default function Testimonials() {
  return (
    <section data-screen-label="Temwayaj" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <div style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>TEMWAYAJ</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Antreprenè fè konfyans nan nou
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {TESTIMONIALS.map((t) => (
          <div key={t.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 38, lineHeight: 1, color: 'var(--orange-soft)', fontWeight: 700 }}>"</span>
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>{t.quote}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${t.from}, ${t.to})`, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
