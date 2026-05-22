'use client';

import { motion } from 'framer-motion';
import {
  CreditCard,
  Zap,
  Smartphone,
  Store,
  Wallet,
  Shield,
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: CreditCard,
      title: 'Virtual Cards',
      description: 'Create Visa/Mastercard virtual cards instantly.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Zap,
      title: 'Instant Transfers',
      description: 'Transfer money between users in seconds.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Smartphone,
      title: 'Mobile Money',
      description: 'Recharge with MonCash and local methods.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Store,
      title: 'Business Payments',
      description: 'Accept payments for your business globally.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Wallet,
      title: 'Wallet System',
      description: 'Store and manage your money securely.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Shield,
      title: 'Advanced Security',
      description: 'KYC verification, fraud protection and encryption.',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section
      id="features"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Everything you need in one{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              financial ecosystem.
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Powerful tools designed to give you complete control over your finances
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="group"
              >
                <div className="relative h-full p-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-orange-500/50 transition-all overflow-hidden">
                  {/* Gradient background on hover */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${feature.color}`}
                  />

                  {/* Content */}
                  <div className="relative space-y-4">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-orange-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* Hover effect border */}
                  <div className="absolute inset-0 rounded-2xl border border-orange-500/0 group-hover:border-orange-500/50 transition-all pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
