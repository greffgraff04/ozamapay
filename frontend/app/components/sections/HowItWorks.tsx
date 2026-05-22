'use client';

import { motion } from 'framer-motion';
import { UserPlus, CheckCircle, Wallet, Zap } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create your free account',
      description: 'Sign up in less than 2 minutes',
    },
    {
      icon: CheckCircle,
      title: 'Verify your identity',
      description: 'Complete KYC verification',
    },
    {
      icon: Wallet,
      title: 'Fund your wallet',
      description: 'Add money via MonCash or bank transfer',
    },
    {
      icon: Zap,
      title: 'Start paying globally',
      description: 'Enjoy borderless payments instantly',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Start in{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              minutes.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                {/* Number badge */}
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg z-10">
                  {index + 1}
                </div>

                {/* Card */}
                <div className="p-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl h-full flex flex-col items-center text-center space-y-4">
                  <Icon className="w-12 h-12 text-orange-500" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-orange-500 to-transparent -translate-y-1/2" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
