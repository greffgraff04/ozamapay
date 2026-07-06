'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Check, Rocket, Zap, Building2, LayoutDashboard, History, Users, Webhook,
  Code2, Send,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { themeVars, eyebrow, sectionHeading, sectionIntro, sectionWrap, cardStyle } from '../components/sections/theme';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

type CtaState =
  | { kind: 'loading' }
  | { kind: 'guest' }
  | { kind: 'no-business' }
  | { kind: 'approved'; businessId: string }
  | { kind: 'pending' };

function useBusinessCta(): CtaState {
  const [state, setState] = useState<CtaState>({ kind: 'loading' });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setState({ kind: 'guest' });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API}/business/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setState({ kind: 'guest' });
          return;
        }
        const data = await res.json();
        const owned = data?.owned?.[0];
        if (!owned) {
          setState({ kind: 'no-business' });
        } else if (owned.status === 'APPROVED') {
          setState({ kind: 'approved', businessId: owned.id });
        } else {
          setState({ kind: 'pending' });
        }
      } catch {
        setState({ kind: 'guest' });
      }
    })();
  }, []);

  return state;
}

const PLANS = [
  {
    name: 'STARTER',
    price: 'Gratuit',
    priceNote: 'pour toujours',
    icon: Rocket,
    highlight: false,
    features: [
      { label: 'Frais de transaction', value: '2.5%' },
      { label: 'Frais de retrait', value: '1.5%' },
      { label: 'Paiement par QR code', value: true },
      { label: 'Tableau de bord business', value: true },
      { label: '1 membre d’équipe', value: true },
      { label: 'Accès API', value: false },
    ],
    cta: 'Commencer gratuitement',
  },
  {
    name: 'PRO',
    price: '$19',
    priceNote: '/ mois',
    icon: Zap,
    highlight: true,
    features: [
      { label: 'Frais de transaction', value: '2.0%' },
      { label: 'Frais de retrait', value: '1.5%' },
      { label: 'Tout ce qui est dans STARTER', value: true },
      { label: 'Accès API complet', value: true },
      { label: 'Webhooks', value: true },
      { label: '5 membres d’équipe', value: true },
      { label: 'Support prioritaire', value: true },
    ],
    cta: 'Choisir PRO',
  },
  {
    name: 'ENTERPRISE',
    price: 'Sur mesure',
    priceNote: 'contactez-nous',
    icon: Building2,
    highlight: false,
    features: [
      { label: 'Frais de transaction', value: '1.5%' },
      { label: 'Frais de retrait', value: '1.5%' },
      { label: 'Tout ce qui est dans PRO', value: true },
      { label: 'API illimitée', value: true },
      { label: 'Membres illimités', value: true },
      { label: 'SLA garanti', value: true },
      { label: 'Gestionnaire de compte dédié', value: true },
    ],
    cta: 'Nous contacter',
  },
];

const DETAILED_FEATURES = [
  { title: 'Tableau de bord complet', desc: 'Suivez vos revenus, vos retraits et votre activité en temps réel.', icon: LayoutDashboard },
  { title: 'Historique des transactions', desc: 'Chaque paiement reçu est enregistré et consultable à tout moment.', icon: History },
  { title: 'Gestion d’équipe', desc: 'Invitez des membres et attribuez-leur des rôles précis.', icon: Users },
  { title: 'Webhooks automatiques', desc: 'Recevez une notification instantanée à chaque paiement.', icon: Webhook },
  { title: 'API Développeur', desc: 'Intégrez OZAMAPAY directement dans votre site ou votre application.', icon: Code2 },
  { title: 'Retraits rapides', desc: 'Transférez vos fonds vers votre compte en quelques minutes.', icon: Send },
];

const FAQS = [
  {
    q: 'Quels documents faut-il pour ouvrir un compte Business ?',
    a: 'Votre KYC personnel doit d’abord être approuvé. Ensuite, il suffit de fournir le nom, la catégorie et l’adresse de votre activité pour soumettre votre demande.',
  },
  {
    q: 'Combien de temps prend l’approbation d’un compte Business ?',
    a: 'La majorité des demandes sont traitées en moins de 24 heures ouvrables.',
  },
  {
    q: 'Comment sont calculés les frais de transaction ?',
    a: 'Le pourcentage affiché s’applique uniquement au montant reçu par paiement. Aucun frais caché, aucun abonnement forcé sur le plan STARTER.',
  },
  {
    q: 'Puis-je changer de plan plus tard ?',
    a: 'Oui. Vous pouvez passer de STARTER à PRO, ou demander une offre ENTERPRISE, directement depuis votre tableau de bord.',
  },
  {
    q: 'L’accès API est-il disponible sur tous les plans ?',
    a: 'L’accès API complet et les webhooks sont inclus à partir du plan PRO. Le plan ENTERPRISE ajoute des limites illimitées et un support dédié.',
  },
  {
    q: 'Comment retirer les fonds de mon compte Business ?',
    a: 'Depuis votre tableau de bord, demandez un retrait vers MonCash ou votre compte bancaire ; les fonds arrivent généralement en quelques minutes.',
  },
];

function HeroCta() {
  const cta = useBusinessCta();

  if (cta.kind === 'loading') {
    return (
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: 220, height: 54, borderRadius: 100, background: 'var(--surface)', border: '1px solid var(--border)' }} />
      </div>
    );
  }

  if (cta.kind === 'approved') {
    return (
      <Link href={`/business/${cta.businessId}`} className="ozp-btn-glow" style={{
        background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
        textDecoration: 'none', display: 'inline-block',
      }}>
        Accéder à mon Dashboard
      </Link>
    );
  }

  if (cta.kind === 'pending') {
    return (
      <Link href="/dashboard" className="ozp-btn-glow" style={{
        background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
        textDecoration: 'none', display: 'inline-block',
      }}>
        Voir ma demande en cours
      </Link>
    );
  }

  if (cta.kind === 'no-business') {
    return (
      <Link href="/business/apply" className="ozp-btn-glow" style={{
        background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
        textDecoration: 'none', display: 'inline-block',
      }}>
        Créer mon Business
      </Link>
    );
  }

  return (
    <>
      <Link href="/register" className="ozp-btn-glow" style={{
        background: 'var(--orange)', color: 'white', padding: '16px 30px', borderRadius: 100, fontSize: 16, fontWeight: 600,
        textDecoration: 'none', display: 'inline-block',
      }}>
        Commencer gratuitement
      </Link>
      <Link href="/login" className="ozp-btn-glow" style={{
        background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', padding: '16px 30px', borderRadius: 100,
        fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
      }}>
        Se connecter à mon compte Business
      </Link>
    </>
  );
}

function PlanCta({ plan }: { plan: (typeof PLANS)[number] }) {
  const cta = useBusinessCta();

  if (plan.name === 'ENTERPRISE') {
    return (
      <Link href="/support" style={{
        background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)', padding: '13px 20px', borderRadius: 100,
        fontSize: 14.5, fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block',
      }}>
        {plan.cta}
      </Link>
    );
  }

  let href = '/register';
  if (cta.kind === 'approved') href = `/business/${cta.businessId}`;
  else if (cta.kind === 'pending') href = '/dashboard';
  else if (cta.kind === 'no-business') href = '/business/apply';

  return (
    <Link href={href} className="ozp-btn-glow" style={{
      background: plan.highlight ? 'var(--orange)' : 'var(--ink)', color: plan.highlight ? 'white' : 'var(--bg)',
      padding: '13px 20px', borderRadius: 100, fontSize: 14.5, fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block',
    }}>
      {plan.cta}
    </Link>
  );
}

export default function BusinessPage() {
  return (
    <main
      className="font-ibm-plex-sans"
      style={{ ...themeVars, width: '100%', background: 'var(--bg)', color: 'var(--ink)', overflowX: 'hidden', position: 'relative' }}
    >
      <Navbar />

      {/* Hero */}
      <section style={{
        position: 'relative', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 56px)', maxWidth: 900, margin: '0 auto', textAlign: 'center',
      }}>
        <style>{`
          @keyframes ozpBizFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .ozp-biz-ctas { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; align-items: center; }
          @media (max-width: 560px) {
            .ozp-biz-ctas { flex-direction: column; align-items: stretch; }
            .ozp-biz-ctas > a { text-align: center; }
          }
        `}</style>
        <div style={{ animation: 'ozpBizFadeUp 0.7s ease both' }}>
          <div style={eyebrow}>BUSINESS</div>
          <h1 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(32px, 5vw, 54px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 0 20px', fontWeight: 700 }}>
            Acceptez des paiements.<br />
            <span style={{ color: 'var(--orange)' }}>Développez votre activité.</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 1.6vw, 19px)', lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 620, margin: '0 auto 32px' }}>
            OZAMAPAY Business vous donne un tableau de bord complet, des cartes virtuelles, un accès API et des retraits rapides — pour vendre partout, sans friction.
          </p>
          <div className="ozp-biz-ctas">
            <HeroCta />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" style={sectionWrap}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
        >
          <div style={eyebrow}>TARIFICATION</div>
          <h2 style={{ ...sectionHeading, marginBottom: 14 }}>Un plan pour chaque étape de votre croissance</h2>
          <p style={sectionIntro}>Pas de frais cachés. Changez de plan à tout moment depuis votre tableau de bord.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ y: -4 }}
              style={{
                ...cardStyle,
                display: 'flex', flexDirection: 'column', gap: 20,
                border: plan.highlight ? '2px solid var(--orange)' : '1px solid var(--border)',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--orange)', color: 'white',
                  fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', padding: '5px 14px', borderRadius: 100,
                }}>
                  LE PLUS POPULAIRE
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: plan.highlight ? 'var(--orange)' : 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <plan.icon size={20} color="white" strokeWidth={2} />
                </div>
                <div style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>{plan.name}</div>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 32, fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginLeft: 6 }}>{plan.priceNote}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: f.value === false ? 0.4 : 1 }}>
                    <Check size={16} color={f.value === false ? 'var(--ink-soft)' : 'var(--orange)'} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                      {f.label}{typeof f.value === 'string' ? `: ${f.value}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto' }}>
                <PlanCta plan={plan} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Detailed features */}
      <section style={sectionWrap}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{ maxWidth: 620, margin: '0 auto 44px', textAlign: 'center' }}
        >
          <div style={eyebrow}>FONCTIONNALITÉS</div>
          <h2 style={sectionHeading}>Tout ce qu’il faut pour piloter votre activité</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {DETAILED_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ y: -4 }}
              style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--navy), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <f.icon size={22} color="white" strokeWidth={2} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 17.5, fontWeight: 600, margin: 0 }}>{f.title}</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...sectionWrap, maxWidth: 800 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{ textAlign: 'center', marginBottom: 36 }}
        >
          <div style={eyebrow}>FAQ BUSINESS</div>
          <h2 style={sectionHeading}>Questions fréquentes</h2>
        </motion.div>
        <style>{`
          .ozp-biz-faq summary { list-style: none; }
          .ozp-biz-faq summary::-webkit-details-marker { display: none; }
          .ozp-biz-faq details[open] summary span:last-child { transform: rotate(45deg); }
          .ozp-biz-faq summary span:last-child { display: inline-block; transition: transform 0.15s ease; }
        `}</style>
        <div className="ozp-biz-faq" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FAQS.map((f) => (
            <details key={f.q} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
              <summary style={{ fontSize: 15.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>{f.q}</span>
                <span style={{ color: 'var(--orange)', fontSize: 20, fontWeight: 400 }}>+</span>
              </summary>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, margin: '14px 0 0' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="ozp-gradient-anim" style={{
        background: 'linear-gradient(120deg, var(--navy), var(--navy-deep), var(--orange-dark), var(--navy))', color: 'white',
        padding: 'clamp(48px, 7vw, 80px) clamp(20px, 5vw, 56px)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
          style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}
        >
          <h2 style={{ fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif', fontSize: 'clamp(26px, 3.8vw, 42px)', letterSpacing: '-0.02em', margin: '0 0 16px', fontWeight: 700 }}>
            Prêt à développer votre activité ?
          </h2>
          <p style={{ color: 'oklch(0.85 0.02 260)', fontSize: 16, margin: '0 0 26px' }}>
            Rejoignez les entrepreneurs qui font confiance à OZAMAPAY Business.
          </p>
          <Link href="/register" className="ozp-btn-glow" style={{
            background: 'var(--orange)', color: 'white', padding: '16px 32px', borderRadius: 100, fontSize: 16, fontWeight: 700,
            textDecoration: 'none', display: 'inline-block',
          }}>
            Créer mon compte Business
          </Link>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
