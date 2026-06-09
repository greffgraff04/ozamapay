'use client';

import { motion, Variants } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

export default function Hero() {
  const stats = [
    { label: '50K+', value: 'Transactions' },
    { label: '24/7', value: 'Payments' },
    { label: '99.9%', value: 'Uptime' },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
      },
    },
  };

  return (
    <section className="relative w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center">
      
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent opacity-30" />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500 rounded-full blur-[120px] opacity-10 -z-10" />

      <div className="max-w-7xl mx-auto w-full">
        
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          {/* LEFT SIDE */}
          <motion.div
            variants={itemVariants}
            className="space-y-8"
          >

            {/* Badge */}
            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.05 }}
            >
              <div className="px-4 py-2 bg-slate-800/50 backdrop-blur border border-orange-500/30 rounded-full inline-flex items-center">
                <span className="text-sm text-slate-300 font-medium">
                  Haitian Fintech • Global Payments • Virtual Cards
                </span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <p className="text-orange-500 font-bold tracking-[0.2em] uppercase text-sm">
                JUST PAY.
              </p>

              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05]">
                <span className="block text-white">
                  LAJAN W
                </span>

                <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                  SAN LIMIT.
                </span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-xl text-slate-400 max-w-lg leading-relaxed font-medium"
            >
              OZAMAPAY se nouvo génération fintech ayisyen an ki pèmèt ou voye lajan,
              resevwa peman, ak itilize cartes virtuelles san pwoblèm.
            </motion.p>

            {/* Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-5 pt-4"
            >

              <Link
                href="/register"
                className="group px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all hover:scale-105 flex items-center justify-center space-x-3 text-white"
              >
                <span>Create Free Account</span>

                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button className="group px-10 py-5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xl transition-all flex items-center justify-center space-x-3 text-white">
                <Play className="w-6 h-6 fill-white" />

                <span>Watch Demo</span>
              </button>

            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-800/60"
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="space-y-1"
                >
                  <p className="text-3xl font-black text-orange-500">
                    {stat.label}
                  </p>

                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                    {stat.value}
                  </p>
                </div>
              ))}
            </motion.div>

          </motion.div>

          {/* RIGHT SIDE */}
          <motion.div
            variants={itemVariants}
            className="relative flex items-center justify-center lg:justify-end"
          >

            <motion.div
              className="relative w-[180%] sm:w-[220%] lg:w-[300%] max-w-none"
              animate={{ y: [0, -35, 0] }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.02 }}
            >

              {/* Glow */}
              <div className="absolute -inset-10 bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-transparent rounded-full blur-[140px] opacity-50 -z-10" />

              {/* Mockup */}
              <div className="relative w-full">
                <Image
                  src="/mockup.png"
                  alt="Ozamapay App interface"
                  width={6000}
                  height={4500}
                  priority
                  className="w-full h-auto drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                />
              </div>

              {/* Floating orb */}
              <motion.div
                className="absolute top-1/4 -right-10 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full"
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
              />

            </motion.div>

          </motion.div>

        </motion.div>

      </div>

    </section>
  );
}