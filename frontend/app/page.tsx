'use client';

import  Header  from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/sections/Hero';
import Trust from './components/sections/Trust';
import Features from './components/sections/Features';
import OzamaCard from './components/sections/OzamaCard';
import Business from './components/sections/Business';
import SuperAppVision from './components/sections/SuperAppVision';
import Security from './components/sections/Security';
import HowItWorks from './components/sections/HowItWorks';
import Testimonials from './components/sections/Testimonials';
import WhyOzamapay from './components/sections/WhyOzamapay';
import FAQ from './components/sections/FAQ';
import FinalCTA from './components/sections/FinalCTA';

export default function HomePage() {
  return (
    <main className="w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header />
      <Hero />
      <Trust />
      <Features />
      <OzamaCard />
      <Business />
      <SuperAppVision />
      <Security />
      <HowItWorks />
      <Testimonials />
      <WhyOzamapay />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}