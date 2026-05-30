'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Users, TrendingUp, Globe } from 'lucide-react';

export default function CareersPage() {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Growth Opportunities',
      description: 'Fast-growing fintech with clear career advancement paths'
    },
    {
      icon: Users,
      title: 'Great Team',
      description: 'Work with talented engineers, designers, and financial experts'
    },
    {
      icon: Globe,
      title: 'Global Impact',
      description: 'Make a difference in the lives of millions across Haiti and the diaspora'
    },
    {
      icon: Briefcase,
      title: 'Competitive Compensation',
      description: 'Competitive salary, benefits, and equity packages'
    }
  ];

  const openings = [
    {
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      location: 'Jacmel, Haiti / Remote',
      type: 'Full-time'
    },
    {
      title: 'Mobile App Developer (React Native)',
      department: 'Engineering',
      location: 'Jacmel, Haiti / Remote',
      type: 'Full-time'
    },
    {
      title: 'Compliance Officer',
      department: 'Compliance & Legal',
      location: 'Jacmel, Haiti',
      type: 'Full-time'
    },
    {
      title: 'Customer Support Specialist',
      department: 'Customer Success',
      location: 'Jacmel, Haiti / Remote',
      type: 'Full-time'
    },
    {
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Jacmel, Haiti / Remote',
      type: 'Full-time'
    },
    {
      title: 'Business Development Manager',
      department: 'Business Development',
      location: 'Jacmel, Haiti / Remote',
      type: 'Full-time'
    }
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
              Join Our <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Team</span>
            </h1>
            <p className="text-slate-400 text-lg">Help us revolutionize fintech in Haiti and the diaspora</p>
          </div>

          {/* About Working at OZAMAPAY */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Why Work at OZAMAPAY?</h2>
            <p className="text-slate-300 leading-relaxed">
              At OZAMAPAY, we're on a mission to transform financial services for Haiti and the Haitian diaspora. We're a fast-growing fintech company with ambitious goals and a talented team of engineers, designers, and financial experts. If you're passionate about building world-class financial technology and making a real impact, we'd love to have you on our team.
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">What We Offer</h2>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
              viewport={{ once: true }}
            >
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
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
                    <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-slate-400">{benefit.description}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Culture & Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Our Culture</h2>
            <p className="text-slate-300 leading-relaxed">
              We believe in building a culture of innovation, collaboration, and excellence. Our team members are encouraged to take ownership of their work, think creatively, and contribute ideas that move us forward. We value diversity, inclusivity, and a healthy work-life balance.
            </p>
            <div className="space-y-3 mt-4">
              <p className="text-slate-300"><strong>Core values:</strong> Innovation • Integrity • Inclusivity • Impact • Excellence</p>
            </div>
          </motion.div>

          {/* Open Positions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-2xl font-bold text-white">Open Positions</h2>
            <div className="space-y-4">
              {openings.map((position, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-orange-500/50 transition-all"
                  whileHover={{ x: 5 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold text-white mb-2">{position.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                        <span className="bg-slate-900/50 px-3 py-1 rounded-full">{position.department}</span>
                        <span className="bg-slate-900/50 px-3 py-1 rounded-full">{position.location}</span>
                        <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full">{position.type}</span>
                      </div>
                    </div>
                    <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105">
                      Apply Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Application Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Our Hiring Process</h2>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Application', description: 'Submit your resume and cover letter' },
                { step: '2', title: 'Phone Screen', description: 'Initial conversation with our recruiting team' },
                { step: '3', title: 'Technical/Assessment', description: 'Role-specific assessment or technical interview' },
                { step: '4', title: 'Team Interview', description: 'Meet with team members and hiring manager' },
                { step: '5', title: 'Offer', description: 'Receive offer and negotiate terms' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4 items-start"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <span className="text-white font-bold">{item.step}</span>
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Equal Opportunity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Equal Opportunity Employer</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY is committed to building a diverse and inclusive workforce. We welcome applications from all qualified candidates and provide equal opportunities regardless of race, color, gender, gender identity, sexual orientation, age, national origin, religion, disability, veteran status, or any other protected characteristic.
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
            <h2 className="text-2xl font-bold text-white">Interested in Joining Us?</h2>
            <p className="text-slate-300 leading-relaxed">
              Don't see a position that fits? We're always looking for talented individuals. Feel free to send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="space-y-2 text-slate-300 mt-4">
              <p><strong>Email:</strong> careers@ozamapay.com</p>
              <p><strong>Phone:</strong> +509 36 40 1900</p>
              <p><strong>Address:</strong> Jacmel, Haiti</p>
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