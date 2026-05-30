'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Target, Lightbulb, Users, Zap } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Pioneering fintech solutions for the Haitian community and diaspora'
    },
    {
      icon: Users,
      title: 'Inclusivity',
      description: 'Financial services accessible to everyone, regardless of banking status'
    },
    {
      icon: Target,
      title: 'Reliability',
      description: '99.9% uptime and 24/7 support you can trust'
    },
    {
      icon: Zap,
      title: 'Speed',
      description: 'Instant transactions and real-time payments worldwide'
    }
  ];

  const milestones = [
    { year: '2023', title: 'Founded', description: 'OZAMAPAY launched with vision to revolutionize fintech in Haiti' },
    { year: '2024', title: 'Growth', description: 'Expanded to 50K+ active users and partnerships with major payment networks' },
    { year: '2025', title: 'Compliance', description: 'Achieved full regulatory compliance and launched virtual cards' },
    { year: '2026', title: 'Super App', description: 'Launched OZAMA super app integrating payments, e-commerce, and services' }
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
              About <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">OZAMAPAY</span>
            </h1>
            <p className="text-slate-400 text-lg">Revolutionizing Financial Access for Haiti and the Diaspora</p>
          </div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Our Mission</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY's mission is to provide a secure, fast, and accessible financial operating system for Haiti and the Haitian diaspora. We believe that everyone deserves access to modern financial services, regardless of their location or banking status. We're committed to empowering individuals and businesses with the tools they need to thrive in the global economy.
            </p>
          </motion.div>

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed">
              We envision a future where OZAMAPAY is the leading fintech platform for the Haitian community worldwide. Our long-term goal is to build a comprehensive super app ecosystem that integrates payments, e-commerce, education, and business services. We aim to create the first Haitian-led global fintech company and contribute to Haiti's economic development.
            </p>
          </motion.div>

          {/* Our Story */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Our Story</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY was founded on the belief that Haiti deserves world-class financial technology. The Haitian diaspora sends billions of dollars home each year, yet many Haitians lack access to basic banking services. We saw an opportunity to bridge this gap and create a platform that serves the unique needs of the Haitian community.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Starting from Jacmel, Haiti, our team of passionate engineers, designers, and financial experts built OZAMAPAY from the ground up. We've grown rapidly, achieving significant milestones while maintaining our commitment to security, compliance, and customer service.
            </p>
          </motion.div>

          {/* Core Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">Our Core Values</h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              viewport={{ once: true }}
            >
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={index}
                    className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-orange-500/50 transition-all"
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Icon className="w-8 h-8 text-orange-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                    <p className="text-slate-400">{value.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">Our Journey</h2>
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  className="flex gap-6 items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <span className="text-white font-bold text-sm">{milestone.year.slice(-2)}</span>
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-white">{milestone.title}</h3>
                    <p className="text-slate-400 mt-1">{milestone.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Leadership</h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Ralph Olivier GREFFIN</h3>
                <p className="text-orange-400 font-semibold mb-3">Directeur-Fondateur (Director-Founder)</p>
                <p className="text-slate-300 leading-relaxed">
                  Ralph is the visionary founder and director of OZAMAPAY. With a passion for entrepreneurship and financial innovation, Ralph established OZAMAPAY with the goal of transforming fintech in Haiti and serving the global Haitian community. His leadership drives OZAMAPAY's mission to create accessible, world-class financial services.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Key Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Key Achievements</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>50,000+ active users across Haiti and the diaspora</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>$50M+ in annual transaction volume</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>99.9% platform uptime and reliability</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Full regulatory compliance in Haiti and US</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Partnerships with major payment networks (MonCash, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold mt-1">✓</span>
                <span>Industry-leading security and data protection</span>
              </li>
            </ul>
          </motion.div>

          {/* Social Responsibility */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Social Responsibility</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY is committed to giving back to the Haitian community. We support financial literacy programs, provide free banking services to underserved populations, and invest in Haiti's economic development through partnerships with local businesses and educational institutions.
            </p>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Get In Touch</h2>
            <p className="text-slate-300 leading-relaxed">
              Want to learn more about OZAMAPAY or explore partnership opportunities? We'd love to hear from you!
            </p>
            <div className="space-y-2 text-slate-300 mt-4">
              <p><strong>Email:</strong> info@ozamapay.com</p>
              <p><strong>Phone:</strong> +509 36 40 1900</p>
              <p><strong>Address:</strong> Jacmel, Haiti</p>
              <p><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (Haiti Time)</p>
            </div>
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