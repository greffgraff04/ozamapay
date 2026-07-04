'use client';

const FAQS = [
  { question: 'Kisa Ozamapay ye?', answer: 'Ozamapay se yon sistèm finansye ki pèmèt itilizatè Ayiti ak dyaspora a jere lajan yo, kreye kat vityèl, epi fè peman toupatou nan mond lan.' },
  { question: 'Kijan pou m kreye yon kat vityèl?', answer: 'Apre w fin verifye kont ou, ou ka kreye yon kat vityèl Visa/Mastercard an kèk segond dirèkteman nan app la.' },
  { question: 'Èske lajan m an sekirite?', answer: 'Wi. Nou itilize ankriptaj nivo endistri a, siveyans fwod 24/7, ak yon pwosesis verifikasyon KYC solid.' },
  { question: 'Ki jan pou m chaje kont mwen?', answer: 'Ou ka rechaj kont ou ak MonCash, kat bankè, oswa transfè dirèk soti nan yon lòt kont Ozamapay.' },
  { question: 'Konbyen tan verifikasyon KYC pran?', answer: 'Pifò verifikasyon konplete an kèk minit, men kèk ka ka pran jiska 24èdtan selon dokiman yo bay.' },
  { question: 'Ki peyi Ozamapay disponib ladan yo?', answer: 'Ozamapay fèt pou Ayiti ak dyaspora a, ak sipò pou tranzaksyon entènasyonal toupatou nan mond lan.' },
];

export default function FAQ() {
  return (
    <section data-screen-label="FAQ" id="faq" style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)', maxWidth: 800, margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 12 }}>FAQ</div>
        <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(28px, 3.6vw, 40px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 700 }}>
          Kesyon moun poze souvan
        </h2>
      </div>
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
