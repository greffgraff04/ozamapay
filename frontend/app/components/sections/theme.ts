import type { CSSProperties } from 'react';

// Shared design tokens for the "Ozamapay Home - standalone" landing page
// design. themeVars is applied once on the page wrapper in app/page.tsx —
// CSS custom properties cascade to every section below regardless of
// component boundaries, so nothing else needs to redeclare them.
export const themeVars: CSSProperties = {
  ['--bg' as any]: 'oklch(98% 0.01 80)',
  ['--surface' as any]: 'oklch(99% 0.006 80)',
  ['--ink' as any]: 'oklch(20% 0.03 260)',
  ['--ink-soft' as any]: 'oklch(46% 0.02 260)',
  ['--navy' as any]: 'oklch(24% 0.05 260)',
  ['--navy-deep' as any]: 'oklch(15% 0.035 260)',
  ['--orange' as any]: '#FF7A00',
  ['--orange-soft' as any]: 'color-mix(in srgb, #FF7A00 14%, white)',
  ['--orange-dark' as any]: 'color-mix(in srgb, #FF7A00 70%, black)',
  ['--border' as any]: 'oklch(91% 0.012 80)',
};

export const eyebrow: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: 'var(--orange)',
  letterSpacing: '0.08em',
  marginBottom: 12,
};

export const sectionHeading: CSSProperties = {
  fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
  fontSize: 'clamp(28px, 3.6vw, 40px)',
  letterSpacing: '-0.02em',
  margin: 0,
  fontWeight: 700,
};

export const sectionIntro: CSSProperties = {
  color: 'var(--ink-soft)',
  fontSize: 16.5,
  lineHeight: 1.6,
  margin: 0,
};

export const sectionWrap: CSSProperties = {
  padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)',
  maxWidth: 1280,
  margin: '0 auto',
};

export const cardStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 28,
};
