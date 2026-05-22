'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center">
      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent opacity-30" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Badge */}
          <motion.div
            className="inline-block px-4 py-2 bg-slate-800/50 backdrop-blur border border-orange-500/30 rounded-full"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-sm text-slate-300">
              🌍 Haitian Fintech • Global Payments • Virtual Cards
            </span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                JUST PAY.
              </span>
            </h1>
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-200">
              LAJAN W SAN LIMIT.
            </h2>
          </div>

          {/* Subheadline */}
          <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
            OZAMAPAY se nouvo génération fintech ayisyen an ki pèmèt ou voye lajan, resevwa peman, itilize cartes virtuelles, ak peye entènasyonalman.
          </p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/register"
              className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-semibold text-lg hover:shadow-2xl hover:shadow-orange-500/40 transition-all hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-lg transition-all">
              Watch Demo
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-bold text-orange-400">50K+</p>
              <p className="text-sm text-slate-400">Transactions</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-bold text-orange-400">24/7</p>
              <p className="text-sm text-slate-400">Payments</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: App Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl blur-3xl opacity-20" />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 shadow-2xl aspect-[9/16] flex items-center justify-center">
            <p className="text-slate-500 italic">App Mockup Coming Soon</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}