'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const NAV_LINKS = [
  { label: 'Fonksyonalite', href: '#fonksyonalite' },
  { label: 'Kat', href: '#kat-vityel' },
  { label: 'Biznis', href: '#biznis' },
  { label: 'Pri', href: '#' },
  { label: 'Sekirite', href: '#sekirite' },
  { label: 'Devlopè', href: '#' },
  { label: 'Sipò', href: '#faq' },
];

export default function Navbar() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px clamp(20px, 5vw, 56px)', background: scrolled ? 'color-mix(in oklch, var(--bg) 94%, transparent)' : 'color-mix(in oklch, var(--bg) 82%, transparent)',
      backdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)', borderBottom: '1px solid var(--border)',
      boxShadow: scrolled ? '0 12px 30px -20px oklch(0.2 0.03 260 / 0.3)' : 'none',
      transition: 'background 0.25s ease, backdrop-filter 0.25s ease, box-shadow 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', flexShrink: 0 }}>
        <Image src="/logo.png" alt="Ozamapay" width={28} height={28} style={{ borderRadius: 7 }} priority />
        OZAMAPAY
      </div>

      {!isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {l.label}
            </a>
          ))}
          <Link href="/login" style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 6 }}>
            Konekte
          </Link>
          <Link href="/register" className="ozp-btn-glow" style={{
            background: 'var(--orange)', color: 'white', padding: '13px 20px', borderRadius: 100,
            fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
          }}>
            Kreye Kont
          </Link>
        </div>
      ) : (
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Meni"
          style={{
            width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer',
          }}>
          <span style={{ width: 18, height: 2, background: 'var(--ink)', borderRadius: 2 }} />
          <span style={{ width: 18, height: 2, background: 'var(--ink)', borderRadius: 2 }} />
          <span style={{ width: 18, height: 2, background: 'var(--ink)', borderRadius: 2 }} />
        </button>
      )}

      {isMobile && menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', padding: '12px clamp(20px, 5vw, 56px) 20px', gap: 4,
          boxShadow: '0 20px 40px -20px oklch(0.2 0.03 260 / 0.25)',
        }}>
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 15, fontWeight: 500, padding: '10px 4px' }}>
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: 'var(--ink-soft)', textDecoration: 'none', fontSize: 15, fontWeight: 500, padding: '10px 4px' }}>
            Konekte
          </Link>
          <Link href="/register" onClick={() => setMenuOpen(false)} className="ozp-btn-glow" style={{
            background: 'var(--orange)', color: 'white', padding: '14px 20px', borderRadius: 100,
            fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center', marginTop: 8,
          }}>
            Kreye Kont
          </Link>
        </div>
      )}
    </nav>
  );
}
