'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function SuperAppVision() {
  const visions = [
    'Digital banking',
    'Virtual cards',
    'International payments',
    'Merchant tools',
    'Crypto integrations',
    'E-commerce ecosystem',
    'Financial services APIs',
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-orange-500/5 to-transparent">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl sm:text-5xl font-bold">
            More than a wallet.{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              A financial super app.
            </span>
          </h2>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            OZAMAPAY is building the future financial infrastructure of Haiti. Our
            vision includes:
          </p>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
            viewport={{ once: true }}
          >
            {visions.map((vision, index) => (
              <motion.div
                key={index}
                className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-orange-500/50 transition-all"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-300">{vision}</span>
              </motion.div>
            ))}
          </motion.div>

          <div className="pt-8 border-t border-slate-800">
            <p className="text-xl text-slate-300 font-semibold">
              One ecosystem. Infinite possibilities. 🚀
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
