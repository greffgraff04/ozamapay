'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AMLPolicyPage() {
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
              Anti-Money Laundering <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">(AML) Policy</span>
            </h1>
            <p className="text-slate-400 text-lg">Last updated: May 23, 2026</p>
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
              <p className="text-slate-300 leading-relaxed">
                OZAMAPAY is committed to maintaining the highest standards of Anti-Money Laundering (AML) compliance. Our AML Policy is designed to prevent the use of our platform for money laundering, terrorist financing, and other illegal financial activities. We comply with all applicable AML laws and regulations in Haiti, the United States, and international jurisdictions in which we operate.
              </p>
            </motion.div>

            {/* 2. AML Compliance Program */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">2. AML Compliance Program</h2>
              <p className="text-slate-300 leading-relaxed">
                Our AML Compliance Program includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Customer Due Diligence (CDD) and Know Your Customer (KYC) procedures</li>
                <li>Enhanced Due Diligence (EDD) for high-risk customers</li>
                <li>Ongoing transaction monitoring and reporting of suspicious activity</li>
                <li>Customer identification verification</li>
                <li>Source of funds verification</li>
                <li>Politically Exposed Person (PEP) screening</li>
                <li>Sanctions list screening against OFAC and international lists</li>
                <li>Regular staff training on AML regulations and procedures</li>
              </ul>
            </motion.div>

            {/* 3. Customer Due Diligence (CDD) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">3. Customer Due Diligence (CDD)</h2>
              <p className="text-slate-300 leading-relaxed">
                As part of our onboarding process, we collect and verify information about all customers, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Full legal name and date of birth</li>
                <li>Residential address and contact information</li>
                <li>Government-issued identification documents</li>
                <li>Source of funds and nature of business</li>
                <li>Expected transaction volume and patterns</li>
                <li>Purpose and nature of the customer relationship</li>
              </ul>
            </motion.div>

            {/* 4. Enhanced Due Diligence (EDD) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">4. Enhanced Due Diligence (EDD)</h2>
              <p className="text-slate-300 leading-relaxed">
                For customers identified as high-risk, we conduct Enhanced Due Diligence, which may include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Additional background verification</li>
                <li>Financial statement review</li>
                <li>Third-party reference checks</li>
                <li>Business structure and beneficial ownership analysis</li>
                <li>Enhanced ongoing transaction monitoring</li>
              </ul>
            </motion.div>

            {/* 5. Transaction Monitoring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">5. Transaction Monitoring</h2>
              <p className="text-slate-300 leading-relaxed">
                We maintain an ongoing transaction monitoring program to detect suspicious activity. Monitoring includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Real-time monitoring of all transactions</li>
                <li>Detection of unusual transaction patterns</li>
                <li>Threshold-based alert systems</li>
                <li>Behavioral anomaly detection</li>
                <li>Geographic risk assessment</li>
                <li>Currency exchange monitoring</li>
              </ul>
            </motion.div>

            {/* 6. Suspicious Activity Reporting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">6. Suspicious Activity Reporting</h2>
              <p className="text-slate-300 leading-relaxed">
                Any transactions or activities that appear suspicious are reported to relevant authorities, including the Financial Intelligence Unit (FIU) and law enforcement agencies. We maintain detailed records of all reported suspicious activities and cooperate fully with investigations.
              </p>
            </motion.div>

            {/* 7. Sanctions Screening */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">7. Sanctions Screening</h2>
              <p className="text-slate-300 leading-relaxed">
                We screen all customers and transactions against:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>OFAC (Office of Foreign Assets Control) Specially Designated Nationals (SDN) List</li>
                <li>UN Security Council Consolidated List</li>
                <li>EU Consolidated List</li>
                <li>Other international sanctions lists</li>
                <li>Politically Exposed Person (PEP) databases</li>
              </ul>
            </motion.div>

            {/* 8. Customer Restrictions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">8. Customer Restrictions</h2>
              <p className="text-slate-300 leading-relaxed">
                We may refuse service to or terminate relationships with customers who:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Are subject to sanctions or appear on restricted lists</li>
                <li>Engage in suspicious or illegal activities</li>
                <li>Refuse to provide required identification or documentation</li>
                <li>Appear to be structuring transactions to avoid reporting thresholds</li>
                <li>Are involved in high-risk jurisdictions or industries</li>
              </ul>
            </motion.div>

            {/* 9. Record Keeping */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">9. Record Keeping</h2>
              <p className="text-slate-300 leading-relaxed">
                We maintain detailed records of all customer information, verification documents, transaction history, and compliance decisions for a minimum of five (5) years, as required by law. All records are stored securely and made available to regulatory authorities upon request.
              </p>
            </motion.div>

            {/* 10. Staff Training */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">10. Staff Training</h2>
              <p className="text-slate-300 leading-relaxed">
                All OZAMAPAY staff involved in customer onboarding, transaction processing, or compliance receive regular training on AML regulations, sanctions compliance, and suspicious activity detection. Training is conducted annually and updated as regulations change.
              </p>
            </motion.div>

            {/* 11. Compliance Officer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
            >
              <h2 className="text-2xl font-bold text-white">11. Compliance Officer & Contact</h2>
              <p className="text-slate-300 leading-relaxed">
                OZAMAPAY designates a Compliance Officer responsible for oversight of the AML program and regulatory compliance. For questions or reporting suspicious activity:
              </p>
              <div className="space-y-2 text-slate-300 mt-4">
                <p><strong>Email:</strong> compliance@ozamapay.com</p>
                <p><strong>Phone:</strong> +509 36 40 1900</p>
                <p><strong>Address:</strong> Jacmel, Haiti</p>
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