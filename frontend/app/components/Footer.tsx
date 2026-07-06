'use client';

import Link from 'next/link';
import Image from 'next/image';

const FOOTER_COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'PWODWI',
    links: [
      { label: 'Kat Vityèl', href: '#kat-vityel' },
      { label: 'Transfè', href: '#fonksyonalite' },
      { label: 'Mobile Money', href: '#fonksyonalite' },
      { label: 'Wallet', href: '#fonksyonalite' },
    ],
  },
  {
    title: 'BIZNIS',
    links: [
      { label: 'Dropshipping', href: '#biznis' },
      { label: 'Freelance', href: '#biznis' },
      { label: 'Ajans', href: '#biznis' },
      { label: 'E-commerce', href: '#biznis' },
    ],
  },
  {
    title: 'KONPAYI',
    links: [
      { label: 'Sou Nou', href: '/about' },
      { label: 'Vizyon', href: '#' },
      { label: 'Kontakte Nou', href: '/support' },
      { label: 'Blog', href: '/press' },
    ],
  },
  {
    title: 'SIPÒ',
    links: [
      { label: 'Sant Èd', href: '/support' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Sekirite', href: '#sekirite' },
      { label: 'Devlopè', href: '#' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Politique de Confidentialité', href: '/privacy' },
      { label: "Conditions d'Utilisation", href: '/terms' },
      { label: 'Politique AML', href: '/aml-policy' },
      { label: 'Politique Cookies', href: '/cookie-policy' },
      { label: 'Politique KYC', href: '/kyc-policy' },
      { label: 'Conformité', href: '/compliance' },
    ],
  },
];

const SOCIALS = ['IG', 'FB', 'X'];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-screen-label="Footer" className="ozp-gradient-anim" style={{
      background: 'linear-gradient(120deg, var(--navy), var(--navy-deep), var(--orange-dark), var(--navy))', color: 'white',
      padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px) 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 0', display: 'flex', flexWrap: 'wrap', gap: 36, justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontWeight: 700, fontSize: 19, marginBottom: 12 }}>
            <Image src="/logo.png" alt="Ozamapay" width={26} height={26} style={{ borderRadius: 6 }} />
            OZAMAPAY
          </div>
          <p style={{ color: 'oklch(0.75 0.02 260)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 240, margin: 0 }}>
            Sistèm finansye pou Ayiti ak dyaspora a.
          </p>
        </div>

        {FOOTER_COLS.map((col) => (
          <div key={col.title} style={{ flex: '1 1 130px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.9 0.01 260)', marginBottom: 16, letterSpacing: '0.04em' }}>{col.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {col.links.map((l) => (
                l.href.startsWith('#') ? (
                  <a key={l.label} href={l.href} style={{ color: 'oklch(0.75 0.02 260)', textDecoration: 'none', fontSize: 13.5 }}>{l.label}</a>
                ) : (
                  <Link key={l.label} href={l.href} style={{ color: 'oklch(0.75 0.02 260)', textDecoration: 'none', fontSize: 13.5 }}>{l.label}</Link>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '22px 0 30px', display: 'flex', flexWrap: 'wrap', gap: 16,
        alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid oklch(1 0 0 / 0.08)',
      }}>
        <span style={{ color: 'oklch(0.65 0.02 260)', fontSize: 13 }}>© {year} Ozamapay. Tout dwa rezève.</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {SOCIALS.map((s) => (
            <span key={s} style={{
              width: 34, height: 34, borderRadius: '50%', background: 'oklch(1 0 0 / 0.08)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600, color: 'oklch(0.85 0.02 260)',
            }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
