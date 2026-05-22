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
    <section id="business" className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-slate-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold">
            Built for creators, entrepreneurs and{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              businesses.
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Whether you are a dropshipper, freelancer, agency owner, e-commerce seller
            or startup founder — OZAMAPAY gives you the financial tools to scale
            globally.
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        >
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10, borderColor: 'rgb(249, 115, 22)' }}
                className="p-6 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl transition-all hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {useCase.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {useCase.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}