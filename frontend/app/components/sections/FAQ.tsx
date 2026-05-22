'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is OZAMAPAY secure?',
      a: 'Yes. Security and identity protection are core priorities. We use enterprise-grade encryption and fraud monitoring.',
    },
    {
      q: 'Can I create virtual cards?',
      a: 'Yes, you can create virtual Visa/Mastercard cards instantly after completing identity verification.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'Currently, we support MonCash and bank transfers. Additional methods are continuously being added.',
    },
    {
      q: 'Is OZAMAPAY available internationally?',
      a: 'Yes, our infrastructure is designed for global scalability. You can use OZAMAPAY from anywhere in the world.',
    },
    {
      q: 'Is KYC required?',
      a: 'Yes, KYC (Know Your Customer) verification is required for compliance and security reasons. The process takes just a few minutes.',
    },
    {
      q: 'What are the fees?',
      a: 'Visit our pricing page for detailed fee information. We offer competitive rates for transfers, card creation, and recharges.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Questions.
            </span>
          </h2>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          viewport={{ once: true }}
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="border border-slate-700 rounded-lg overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <button
                onClick={() => setOpen(open === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/80 transition-colors text-left"
              >
                <span className="font-semibold text-white">{faq.q}</span>
                <motion.div
                  animate={{ rotate: open === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-orange-500" />
                </motion.div>
              </button>

              <AnimatePresence>
                {open === index && (
                  <motion.div
                    className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 text-slate-300"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
