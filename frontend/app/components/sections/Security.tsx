'use client';

import { motion } from 'framer-motion';
import { Lock, Shield, AlertCircle, Eye } from 'lucide-react';

export default function Security() {
  const securityFeatures = [
    { icon: Lock, label: 'Encrypted infrastructure' },
    { icon: Eye, label: 'Identity verification' },
    { icon: Shield, label: 'Secure authentication' },
    { icon: AlertCircle, label: 'Fraud monitoring' },
  ];

  return (
    <section id="security" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Security{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              first.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            We use modern security standards to protect users and transactions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ borderColor: 'rgb(249, 115, 22)' }}
              >
                <Icon className="w-12 h-12 text-orange-500 mb-4" />
                <h3 className="font-semibold text-white">{feature.label}</h3>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-16 p-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-lg text-slate-300">
            🔐 Your financial data is encrypted end-to-end and backed by enterprise-grade
            security standards.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
