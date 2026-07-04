'use client';

const AUDIENCES = [
  { title: 'Freelancer', desc: 'Resevwa peman kliyan entènasyonal san tèt chaje.' },
  { title: 'Vandè E-commerce', desc: 'Aksepte peman kliyan toupatou nan mond lan.' },
  { title: 'Ajans Piblisite', desc: 'Peye piblisite ak zouti travay ak kat vityèl.' },
  { title: 'Dropshipper', desc: 'Jere founisè ak zouti SaaS soti nan yon sèl kont.' },
  { title: 'Fondatè Startup', desc: 'Chèche pou grandi biznis ou san limit bankè.' },
];

export default function Business() {
  return (
    <section data-screen-label="Biznis" id="biznis" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 1280, margin: '0 auto',
    }}>
      <div style={{ maxWidth: 620, margin: '0 auto 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>BIZNIS</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Fèt pou moun k ap bati
        </h2>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {AUDIENCES.map((a) => (
          <div key={a.title} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px',
            minWidth: 200, flex: '1 1 200px', maxWidth: 260,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>{a.title}</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
