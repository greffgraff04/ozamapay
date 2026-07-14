'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function KYCPolicyPage() {
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
              Know Your Customer <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFAE66] bg-clip-text text-transparent">(KYC) Policy</span>
            </h1>
            <p className="text-white/50 text-lg">Dènye mizajou: 5 jiyè 2026</p>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {/* 1. Policy Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">1. Policy Overview</h2>
              <p className="text-white/70 leading-relaxed">
                OZAMAPAY's Know Your Customer (KYC) Policy is designed to establish and maintain standards for identifying and verifying the identity of customers, beneficial owners, and other relevant parties. Our KYC procedures comply with international best practices, regulations in Haiti, the United States, and other jurisdictions where we operate. The objective is to prevent fraud, money laundering, terrorist financing, and other financial crimes while maintaining a secure platform for legitimate users.
              </p>
            </motion.div>

            {/* 2. Frais de vérification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">2. Frais de vérification</h2>
              <p className="text-white/70 leading-relaxed">
                La vérification d'identité (KYC) est requise pour accéder aux services OZAMAPAY. Des frais de ~3,375 HTG s'appliquent.
              </p>
            </motion.div>

            {/* 3. KYC Process Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">3. KYC Process Overview</h2>
              <p className="text-white/70 leading-relaxed">
                Our KYC process consists of three main phases:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li><strong>Customer Identification Program (CIP):</strong> Collecting and verifying customer identity</li>
                <li><strong>Customer Due Diligence (CDD):</strong> Understanding customer background and transaction patterns</li>
                <li><strong>Ongoing Monitoring:</strong> Continuous verification and monitoring of customer activities</li>
              </ul>
            </motion.div>

            {/* 3. Information Collection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">4. Information Collection</h2>
              <p className="text-white/70 leading-relaxed">
                During account opening, we collect the following information from all customers:
              </p>
              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.1 Personal Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Full legal name</li>
                    <li>Date of birth</li>
                    <li>Gender</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Current residential address</li>
                    <li>Country of residence</li>
                    <li>Nationality</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.2 Identification Documents</h3>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Valid government-issued photo ID</li>
                    <li>Passport or national ID card</li>
                    <li>Driver's license (where applicable)</li>
                    <li>Proof of address (utility bill, bank statement, etc.)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.3 Financial Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Source of funds</li>
                    <li>Employment status and occupation</li>
                    <li>Annual income range</li>
                    <li>Expected monthly transaction volume</li>
                    <li>Purpose of account use</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* 4. Identity Verification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">5. Identity Verification</h2>
              <p className="text-white/70 leading-relaxed">
                We verify customer identity through a combination of methods:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Document authentication using advanced image recognition technology</li>
                <li>Verification against national ID databases</li>
                <li>Biometric verification (facial recognition) where available</li>
                <li>Third-party verification services</li>
                <li>Manual review by compliance officers for high-risk cases</li>
              </ul>
            </motion.div>

            {/* 5. Beneficial Owner Identification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">6. Beneficial Owner Identification</h2>
              <p className="text-white/70 leading-relaxed">
                For business accounts, we identify and verify beneficial owners (individuals who directly or indirectly own 25% or more of the entity). This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Verification of company registration documents</li>
                <li>Identification of all beneficial owners</li>
                <li>Verification of beneficial owner identities</li>
                <li>Confirmation of beneficial ownership percentages</li>
                <li>Assessment of business legitimacy</li>
              </ul>
            </motion.div>

            {/* 6. Risk Assessment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">7. Risk Assessment</h2>
              <p className="text-white/70 leading-relaxed">
                We assign a risk level to each customer based on multiple factors:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Geographic location and country risk</li>
                <li>Customer occupation and industry</li>
                <li>Source of funds legitimacy</li>
                <li>Transaction patterns and expected activity</li>
                <li>Beneficial owner information and PEP status</li>
                <li>Historical compliance with KYC requirements</li>
              </ul>
            </motion.div>

            {/* 7. Enhanced Due Diligence (EDD) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">8. Enhanced Due Diligence (EDD)</h2>
              <p className="text-white/70 leading-relaxed">
                High-risk customers undergo Enhanced Due Diligence, which may include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Detailed source of wealth verification</li>
                <li>Business structure analysis</li>
                <li>Financial statement review</li>
                <li>Reference verification</li>
                <li>Enhanced ongoing transaction monitoring</li>
                <li>Politically Exposed Person (PEP) screening</li>
                <li>Adverse media screening</li>
              </ul>
            </motion.div>

            {/* 8. Ongoing Monitoring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">9. Ongoing Monitoring</h2>
              <p className="text-white/70 leading-relaxed">
                We continuously monitor all customer accounts for suspicious activity:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>Real-time transaction monitoring</li>
                <li>Anomaly detection algorithms</li>
                <li>Behavioral pattern analysis</li>
                <li>Periodic customer information updates</li>
                <li>Re-screening against watchlists</li>
                <li>Annual compliance review</li>
              </ul>
            </motion.div>

            {/* 9. Record Retention */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">10. Record Retention</h2>
              <p className="text-white/70 leading-relaxed">
                All KYC documents, verification records, and customer information are retained for a minimum of five (5) years after account closure or relationship termination, as required by law. Records are stored securely and protected from unauthorized access.
              </p>
            </motion.div>

            {/* 10. Account Activation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">11. Account Activation</h2>
              <p className="text-white/70 leading-relaxed">
                Accounts are only activated after successful completion of KYC verification. Customers may face account restrictions or suspension if:
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                <li>KYC verification cannot be completed</li>
                <li>Documents provided are fraudulent or invalid</li>
                <li>Customer is on sanctions or restricted lists</li>
                <li>Risk assessment indicates unacceptable risk level</li>
                <li>Customer refuses to provide required information</li>
              </ul>
            </motion.div>

            {/* 11. Privacy and Data Protection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">12. Privacy and Data Protection</h2>
              <p className="text-white/70 leading-relaxed">
                All personal information collected during the KYC process is handled with strict confidentiality. We comply with data protection regulations and only use information for KYC, AML, and fraud prevention purposes. Customer data is protected with advanced encryption and security measures.
              </p>
            </motion.div>

            {/* 12. Compliance Officer Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4 bg-white/5 rounded-2xl p-8 border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white">13. Contact Information</h2>
              <p className="text-white/70 leading-relaxed">
                For questions about our KYC procedures or to update your customer information:
              </p>
              <div className="space-y-2 text-white/70 mt-4">
                <p><strong>Email:</strong> contact@ozamapay.com</p>
                <p><strong>Phone:</strong> +509 31 91 99 91</p>
                <p><strong>Address:</strong> Jacmel, Haiti</p>
                <p><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (Haiti Time)</p>
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