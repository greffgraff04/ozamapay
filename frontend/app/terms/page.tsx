'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0F121E] text-white pt-32 pb-20">
      {/* Navbar Placeholder */}
      <div className="fixed top-0 w-full z-50 bg-[#0F121E]/95 backdrop-blur-md border-b border-white/10 py-6 px-4">
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
              Terms of <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFAE66] bg-clip-text text-transparent">Service</span>
            </h1>
            <p className="text-white/50 text-lg">Dènye mizajou: 5 jiyè 2026</p>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {/* 1. Agreement to Terms */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">1. Agreement to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                By accessing and using OZAMAPAY (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service. We reserve the right to make changes to these Terms of Service at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of these Terms of Service.
              </p>
            </motion.div>

            {/* 2. Use License */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">2. Use License</h2>
              <p className="text-white/70 leading-relaxed">
                Permission is granted to temporarily download one copy of the materials (information or software) on OZAMAPAY for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on OZAMAPAY</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </motion.div>

            {/* 3. Disclaimer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">3. Disclaimer</h2>
              <p className="text-white/70 leading-relaxed">
                The materials on OZAMAPAY are provided "as is". OZAMAPAY makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </motion.div>

            {/* 4. Limitations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">4. Limitations of Liability</h2>
              <p className="text-white/70 leading-relaxed">
                In no event shall OZAMAPAY or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on OZAMAPAY, even if OZAMAPAY or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </motion.div>

            {/* 5. Accuracy of Materials */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">5. Accuracy of Materials</h2>
              <p className="text-white/70 leading-relaxed">
                The materials appearing on OZAMAPAY could include technical, typographical, or photographic errors. OZAMAPAY does not warrant that any of the materials on OZAMAPAY are accurate, complete, or current. OZAMAPAY may make changes to the materials contained on OZAMAPAY at any time without notice.
              </p>
            </motion.div>

            {/* 6. Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">6. Links</h2>
              <p className="text-white/70 leading-relaxed">
                OZAMAPAY has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by OZAMAPAY of the site. Use of any such linked website is at the user's own risk.
              </p>
            </motion.div>

            {/* 7. Modifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">7. Modifications</h2>
              <p className="text-white/70 leading-relaxed">
                OZAMAPAY may revise these Terms of Service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms of Service.
              </p>
            </motion.div>

            {/* 8. Governing Law */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">8. Governing Law</h2>
              <p className="text-white/70 leading-relaxed">
                These Terms and Conditions are governed by and construed in accordance with the laws of Haiti and the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </motion.div>

            {/* 9. Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4 bg-white/5 rounded-2xl p-8 border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white">9. Contact Us</h2>
              <p className="text-white/70 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="space-y-2 text-white/70">
                <p><strong>Email:</strong> support@ozamapay.com</p>
                <p><strong>General:</strong> contact@ozamapay.com</p>
                <p><strong>Phone:</strong> +509 36 40 1900</p>
                <p><strong>Location:</strong> Jacmel, Haiti</p>
              </div>
            </motion.div>
          </div>

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
              className="inline-block px-8 py-4 bg-[#FF7A00] hover:bg-[#FF7A00]/90 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-[#FF7A00]/40 transition-all hover:scale-105"
            >
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/50 text-sm">
          <p>© 2026 OZAMAPAY. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}