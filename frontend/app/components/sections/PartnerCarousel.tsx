'use client';

import {
  ShoppingBag, Store, Cpu, Coffee, Shirt, Stethoscope, GraduationCap, Truck,
  UtensilsCrossed, Hammer, Sparkles, Car, Flower2, Pill, Plane, Home,
  Dumbbell, Music, Gem, BookOpen,
} from 'lucide-react';
import { eyebrow, sectionHeading } from './theme';

const ROW_1 = [
  { name: 'Santoli Store', icon: ShoppingBag, color: '#FF7A00' },
  { name: 'Marché Caraïbe', icon: Store, color: '#0EA5A0' },
  { name: 'TechHaïti', icon: Cpu, color: '#3B82F6' },
  { name: 'CaféPort', icon: Coffee, color: '#A0522D' },
  { name: 'LaMode HTI', icon: Shirt, color: '#EC4899' },
  { name: 'MonDoc Santé', icon: Stethoscope, color: '#EF4444' },
  { name: 'SkoolHaïti', icon: GraduationCap, color: '#6366F1' },
  { name: 'LivraPort', icon: Truck, color: '#22C55E' },
  { name: 'FoodExpress', icon: UtensilsCrossed, color: '#F97316' },
  { name: 'ArtisanHaïti', icon: Hammer, color: '#D97706' },
];

const ROW_2 = [
  { name: 'BeautéCaraïbe', icon: Sparkles, color: '#D946EF' },
  { name: 'AutoJacmel', icon: Car, color: '#64748B' },
  { name: 'FleurDézil', icon: Flower2, color: '#FB7185' },
  { name: 'PharmaRapid', icon: Pill, color: '#10B981' },
  { name: 'VoyagePap', icon: Plane, color: '#0EA5E9' },
  { name: 'ImmoHaïti', icon: Home, color: '#06B6D4' },
  { name: 'SportZone509', icon: Dumbbell, color: '#84CC16' },
  { name: 'MusicKreyòl', icon: Music, color: '#8B5CF6' },
  { name: 'BijouCap', icon: Gem, color: '#EAB308' },
  { name: 'EcoleTechno', icon: BookOpen, color: '#14B8A6' },
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
        <div style={eyebrow}>ILS NOUS FONT CONFIANCE</div>
        <h2 style={sectionHeading}>Ils acceptent déjà OZAMAPAY</h2>
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
