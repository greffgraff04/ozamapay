'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-orange-500 font-bold tracking-widest uppercase text-sm">JUST PAY.</span>
          <h1 className="text-6xl md:text-8xl font-black mt-4 mb-6 leading-tight">
            LAJAN W <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">SAN LIMIT.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-lg">
            Financial operating system for Haiti and the diaspora. Fast, secure, and borderless.
          </p>
          <div className="flex gap-4">
            <Link href="/register" className="px-8 py-4 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold transition-all">
              Create Free Account
            </Link>
          </div>
        </motion.div>
        
        {/* Placeholder pou Mockup Aplikasyon an */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="bg-slate-800 h-[500px] rounded-3xl border border-slate-700 flex items-center justify-center"
        >
          <p className="text-slate-500 italic">App Mockup Coming Soon</p>
        </motion.div>
      </div>
    </section>
  );
}