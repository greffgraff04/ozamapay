'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Zap, Shield, TrendingUp, Smartphone } from 'lucide-react';

export default function OzamaCard() {
  const cardFeatures = [
    { icon: Zap, label: 'Instant card creation' },
    { icon: Globe, label: 'Worldwide payments' },
    { icon: TrendingUp, label: 'Spending analytics' },
    { icon: Smartphone, label: 'Real-time balance' },
  ];

  return (
    <section id="cards" className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-slate-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Your{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              global payment card.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            OZAMAPAY virtual cards let you shop online, pay subscriptions, run ads,
            pay SaaS tools, and receive global services without traditional banking
            limitations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Card Image - CLEAN, NO BORDER */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          >
            <motion.div
              className="relative w-full max-w-sm"
              animate={{ 
                y: [0, -20, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/carte.png"
                alt="OZAMAPAY Virtual Card"
                width={1012}
                height={638}
                loading="lazy"
                className="w-full h-auto drop-shadow-2xl"
              />
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          >
            {cardFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4 group"
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:shadow-orange-500/50 transition-all">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {feature.label}
                    </h3>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Globe(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
    </svg>
  );
}