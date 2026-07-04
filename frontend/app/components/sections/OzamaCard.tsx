'use client';

const CAPABILITIES = [
  'Kreyasyon enstantane',
  'Jesyon limit depans',
  'Jele oswa dejele nenpòt lè',
  'Plizyè kat pou plizyè pwojè',
];

export default function OzamaCard() {
  return (
    <section data-screen-label="Kat Vityèl" id="kat-vityel" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
      display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center',
    }}>
      <div style={{ flex: '1 1 420px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>KAT VITYÈL</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: '0 0 18px', fontWeight: 700 }}>
          Yon kat pou chak bezwen
        </h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 16.5, lineHeight: 1.6, margin: '0 0 28px' }}>
          Kreye kat Visa/Mastercard vityèl san limit pou peye abònman, piblisite, ak zouti travay ou. Kontwole yo an tan reyèl, dirèkteman nan app la.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CAPABILITIES.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
              <span style={{ fontSize: 15, color: 'var(--ink)' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 'min(320px, 90%)', aspectRatio: '1.586 / 1', borderRadius: 22, background: 'linear-gradient(135deg, var(--navy), var(--orange))',
          padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: 'oklch(0.2 0.03 260 / 0.35) 0px 40px 70px -20px', transform: 'rotate(-4deg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ width: 36, height: 28, borderRadius: 6, background: 'oklch(0.85 0.03 90 / 0.85)' }} />
            <span style={{ fontSize: 12, letterSpacing: '0.12em', color: 'oklch(0.95 0.01 80 / 0.85)', fontWeight: 600 }}>VIRTUAL</span>
          </div>
          <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(16px, 2vw, 20px)', color: 'white', letterSpacing: '0.12em' }}>
            •••• •••• •••• 8823
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontWeight: 700, color: 'white', fontSize: 16, letterSpacing: '-0.01em' }}>OZAMAPAY</span>
            <span style={{ fontSize: 12, color: 'oklch(0.95 0.01 80 / 0.75)' }}>09/28</span>
          </div>
        </div>
      </div>
    </section>
  );
}
