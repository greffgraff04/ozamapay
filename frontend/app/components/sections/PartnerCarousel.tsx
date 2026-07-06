'use client';

import {
  ShoppingBag, Store, ShoppingCart, Music, Smartphone, PlayCircle, Car, Home,
  BedDouble, Wallet, Gamepad2, Tv, Clapperboard, Palette, Layers, Briefcase, Bot,
} from 'lucide-react';
import { eyebrow, sectionHeading, sectionIntro } from './theme';

// Category accents: Boutique #FF9900 · Streaming #E50914 · Transport #000000 · Tech #007AFF · Travail #1DBF73
const ROW_1 = [
  { name: 'Amazon', icon: ShoppingBag, color: '#FF9900' },
  { name: 'Netflix', icon: Tv, color: '#E50914' },
  { name: 'Uber', icon: Car, color: '#000000' },
  { name: 'Apple Store', icon: Smartphone, color: '#007AFF' },
  { name: 'Shopify', icon: Store, color: '#1DBF73' },
  { name: 'Spotify', icon: Music, color: '#E50914' },
  { name: 'Airbnb', icon: Home, color: '#000000' },
  { name: 'PayPal', icon: Wallet, color: '#007AFF' },
  { name: 'Canva', icon: Palette, color: '#007AFF' },
  { name: 'Steam', icon: Gamepad2, color: '#E50914' },
  { name: 'Shein', icon: ShoppingBag, color: '#FF9900' },
  { name: 'Fiverr', icon: Briefcase, color: '#1DBF73' },
  { name: 'Disney+', icon: Clapperboard, color: '#E50914' },
];

const ROW_2 = [
  { name: 'Alibaba', icon: Store, color: '#FF9900' },
  { name: 'PlayStation', icon: Gamepad2, color: '#E50914' },
  { name: 'Booking.com', icon: BedDouble, color: '#000000' },
  { name: 'Adobe', icon: Layers, color: '#007AFF' },
  { name: 'AliExpress', icon: ShoppingCart, color: '#FF9900' },
  { name: 'Hulu', icon: Tv, color: '#E50914' },
  { name: 'Xbox', icon: Gamepad2, color: '#E50914' },
  { name: 'Google Play', icon: PlayCircle, color: '#007AFF' },
  { name: 'Upwork', icon: Briefcase, color: '#1DBF73' },
  { name: 'eBay', icon: ShoppingBag, color: '#FF9900' },
  { name: 'ChatGPT Plus', icon: Bot, color: '#007AFF' },
  { name: 'Amazon Prime', icon: PlayCircle, color: '#E50914' },
];

function Card({ item }: { item: (typeof ROW_1)[number] }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 100, padding: '12px 22px 12px 12px', whiteSpace: 'nowrap',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', background: `${item.color}1A`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <item.icon size={17} color={item.color} strokeWidth={2} />
      </div>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
    </div>
  );
}

export default function PartnerCarousel() {
  return (
    <section data-screen-label="Partenaires" style={{ padding: 'clamp(48px, 7vw, 80px) 0', overflow: 'hidden' }}>
      <style>{`
        @keyframes ozpScrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ozpScrollRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .ozp-partner-track-left { animation: ozpScrollLeft 42s linear infinite; }
        .ozp-partner-track-right { animation: ozpScrollRight 48s linear infinite; }
        .ozp-partner-row:hover .ozp-partner-track-left,
        .ozp-partner-row:hover .ozp-partner-track-right { animation-play-state: paused; }
      `}</style>
      <div style={{ maxWidth: 620, margin: '0 auto 40px', textAlign: 'center', padding: '0 clamp(20px, 5vw, 56px)' }}>
        <div style={eyebrow}>CARTE VISA NFC</div>
        <h2 style={{ ...sectionHeading, marginBottom: 14 }}>Votre carte OZAMAPAY acceptée partout</h2>
        <p style={sectionIntro}>
          Shoppez sur vos sites préférés avec votre carte VISA virtuelle OZAMAPAY
        </p>
      </div>

      <div
        className="ozp-partner-row"
        style={{
          display: 'flex', gap: 16, marginBottom: 16,
          maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="ozp-partner-track-left" style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          {[...ROW_1, ...ROW_1].map((item, i) => <Card key={`${item.name}-${i}`} item={item} />)}
        </div>
      </div>

      <div
        className="ozp-partner-row"
        style={{
          display: 'flex', gap: 16,
          maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="ozp-partner-track-right" style={{ display: 'flex', gap: 16, flexShrink: 0, transform: 'translateX(-50%)' }}>
          {[...ROW_2, ...ROW_2].map((item, i) => <Card key={`${item.name}-${i}`} item={item} />)}
        </div>
      </div>
    </section>
  );
}
