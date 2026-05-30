'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Download, Mail, Phone, MapPin } from 'lucide-react';

export default function PressPage() {
  const pressReleases = [
    {
      date: 'May 2026',
      title: 'OZAMAPAY Launches Super App Vision: Integration of Payments, E-Commerce, and Financial Services',
      description: 'OZAMAPAY announced the launch of its comprehensive super app strategy, integrating payment services with e-commerce and educational platforms.'
    },
    {
      date: 'March 2026',
      title: 'OZAMAPAY Reaches 50,000+ Active Users Milestone',
      description: 'OZAMAPAY celebrated achieving 50,000 active users across Haiti and the diaspora, with over $50M in annual transaction volume.'
    },
    {
      date: 'January 2026',
      title: 'OZAMAPAY Achieves Full Regulatory Compliance in Haiti and United States',
      description: 'OZAMAPAY completed its compliance certification, becoming one of the first Haitian fintech companies with full AML/KYC compliance.'
    },
    {
      date: 'November 2025',
      title: 'OZAMAPAY Launches Virtual Card Service',
      description: 'OZAMAPAY introduced virtual Visa and Mastercard cards, enabling secure online payments and subscriptions worldwide.'
    },
    {
      date: 'August 2025',
      title: 'OZAMAPAY Expands Partnership Network',
      description: 'OZAMAPAY announced strategic partnerships with MonCash and other major payment providers in Haiti.'
    },
    {
      date: 'May 2025',
      title: 'OZAMAPAY Launches Mobile App',
      description: 'OZAMAPAY released its native iOS and Android mobile applications, bringing fintech services to millions of Haitian smartphones.'
    }
  ];

  const mediaKit = [
    { name: 'Company Logo (PNG)', size: '2.4 MB' },
    { name: 'Company Logo (SVG)', size: '156 KB' },
    { name: 'Brand Guidelines', size: '5.2 MB' },
    { name: 'Founding Team Photos', size: '18 MB' },
    { name: 'Product Screenshots', size: '45 MB' },
    { name: 'Infographics Pack', size: '32 MB' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-32 pb-20">
      {/* Navbar Placeholder */}
      <div className="fixed top-0 w-full z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-4 mb-12">
            <h1 className="text-5xl font-bold">
              Press <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Kit</span>
            </h1>
            <p className="text-slate-400 text-lg">News, resources, and media materials for journalists and media partners</p>
          </div>

          {/* About OZAMAPAY */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">About OZAMAPAY</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY is a fintech platform revolutionizing financial services for Haiti and the Haitian diaspora. Founded in 2023 by Ralph Olivier GREFFIN, OZAMAPAY provides fast, secure, and accessible payment solutions, virtual cards, and a comprehensive super app ecosystem integrating payments, e-commerce, and financial education.
            </p>
            <p className="text-slate-300 leading-relaxed">
              With over 50,000 active users and $50M+ in annual transaction volume, OZAMAPAY is the leading Haitian fintech company, fully compliant with international financial regulations and committed to financial inclusion.
            </p>
          </motion.div>

          {/* Key Facts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Key Facts</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Founded:</strong> 2023 by Ralph Olivier GREFFIN</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Headquarters:</strong> Jacmel, Haiti</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Active Users:</strong> 50,000+</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Annual Transaction Volume:</strong> $50M+</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Platform Uptime:</strong> 99.9%</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Regulatory Status:</strong> Fully Compliant (Haiti & US)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">•</span>
                <span><strong>Services:</strong> Payments, Virtual Cards, E-Commerce, Education</span>
              </li>
            </ul>
          </motion.div>

          {/* Latest Press Releases */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">Latest Press Releases</h2>
            <div className="space-y-4">
              {pressReleases.map((release, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-orange-500/50 transition-all"
                  whileHover={{ x: 5 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="space-y-2">
                    <p className="text-sm text-orange-400 font-semibold">{release.date}</p>
                    <h3 className="text-lg font-semibold text-white">{release.title}</h3>
                    <p className="text-slate-400 text-sm">{release.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Media Kit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">Media Kit Downloads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mediaKit.map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-orange-500/50 transition-all flex items-center justify-between"
                  whileHover={{ y: -3 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-grow">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.size}</p>
                  </div>
                  <button className="bg-orange-500 hover:bg-orange-600 p-2 rounded-lg transition-all">
                    <Download className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Company Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Company Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Active Users', value: '50,000+' },
                { label: 'Transaction Volume', value: '$50M+/year' },
                { label: 'Countries Served', value: '3+' },
                { label: 'Platform Uptime', value: '99.9%' },
                { label: 'Virtual Cards Issued', value: '15,000+' },
                { label: 'Avg Transaction Speed', value: '<2 seconds' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-orange-500">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Press Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Press Inquiries & Media Contact</h2>
            <p className="text-slate-300 leading-relaxed">
              For press inquiries, interview requests, or media partnerships, please contact our communications team:
            </p>
            <div className="space-y-4 mt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <a href="mailto:press@ozamapay.com" className="text-orange-400 hover:text-orange-500 transition">
                    press@ozamapay.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Phone</p>
                  <p className="text-slate-300">+509 36 40 1900</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Address</p>
                  <p className="text-slate-300">Jacmel, Haiti</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Media Guidelines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Media Guidelines</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>OZAMAPAY is a fintech platform, not a bank</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Founded in 2023 by Ralph Olivier GREFFIN</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Headquartered in Jacmel, Haiti</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Provides payments, virtual cards, e-commerce, and financial education</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Fully compliant with international financial regulations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">✓</span>
                <span>Mission: Financial inclusion for Haiti and the diaspora</span>
              </li>
            </ul>
          </motion.div>

          {/* Back to Home Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="pt-8"
          >
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/40 transition-all hover:scale-105"
            >
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
          <p>© 2026 OZAMAPAY. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}