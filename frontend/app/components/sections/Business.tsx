'use client';

import { motion } from 'framer-motion';
import {
  Briefcase,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export default function Business() {
  const useCases = [
    {
      icon: Briefcase,
      title: 'Dropshippers',
      description: 'Manage inventory and payments globally',
    },
    {
      icon: Users,
      title: 'Freelancers',
      description: 'Get paid instantly from clients worldwide',
    },
    {
      icon: TrendingUp,
      title: 'Agency Owners',
      description: 'Handle team payments and client billing',
    },
    {
      icon: Zap,
      title: 'E-commerce Sellers',
      description: 'Accept payments and manage multiple channels',
    },
  ];

  return (
    <section id="business" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Built for creators, entrepreneurs and{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              businesses.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Whether you are a dropshipper, freelancer, agency owner, e-commerce seller
            or startup founder — OZAMAPAY gives you the financial tools to scale
            globally.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          viewport={{ once: true }}
        >
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={index}
                className="p-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10"
                whileHover={{ y: -10 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Icon className="w-12 h-12 text-orange-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                <p className="text-slate-400 text-sm">{useCase.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
