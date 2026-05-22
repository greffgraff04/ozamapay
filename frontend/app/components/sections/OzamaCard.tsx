'use client';

import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Smartphone } from 'lucide-react';

export default function OzamaCard() {
  const cardFeatures = [
    { icon: Zap, label: 'Instant card creation' },
    { icon: Globe, label: 'Worldwide payments' },
    { icon: TrendingUp, label: 'Spending analytics' },
    { icon: Smartphone, label: 'Real-time balance' },
  ];

  return (
    <section id="cards" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Your{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              global payment card.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            OZAMAPAY virtual cards let you shop online, pay subscriptions, run ads,
            pay SaaS tools, and receive global services without traditional banking
            limitations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Card Visual */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="relative"
              animate={{ rotateY: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl p-8 text-white shadow-2xl border border-orange-400/30">
                <div className="space-y-12">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm opacity-75 mb-2">Card Number</p>
                      <p className="text-2xl font-mono tracking-widest">
                        4532 •••• •••• 7890
                      </p>
                    </div>
                    <div className="w-12 h-8 bg-yellow-300 rounded" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm opacity-75 mb-2">Cardholder</p>
                      <p className="text-xl font-semibold">RALPH GREFFIN</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75 mb-2">Expires</p>
                      <p className="text-lg font-mono">12/26</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {cardFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4"
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
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
