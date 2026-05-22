'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function Trust() {
  const problems = [
    'Limited banking access',
    'International payment barriers',
    'Slow card recharges',
    'No online business solutions',
    'Expensive transfers',
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold">
            Trusted financial infrastructure{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              for modern Haiti.
            </span>
          </h2>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Nou bati OZAMAPAY pou rezoud pwoblèm finans dijital Ayiti:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            {problems.map((problem, index) => (
              <motion.div
                key={index}
                className="flex items-center space-x-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <CheckCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <span className="text-slate-300">{problem}</span>
              </motion.div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-800">
            <p className="text-xl text-slate-300 font-semibold">
              OZAMAPAY retire tout friksyon sa yo. 🚀
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
