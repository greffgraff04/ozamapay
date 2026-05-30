'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Shield, FileText, Users } from 'lucide-react';

export default function CompliancePage() {
  const complianceAreas = [
    {
      icon: FileText,
      title: 'Regulatory Compliance',
      description: 'Full adherence to financial regulations in Haiti, US, and international jurisdictions'
    },
    {
      icon: Shield,
      title: 'Data Protection',
      description: 'Industry-leading security standards and data protection measures'
    },
    {
      icon: Users,
      title: 'Customer Verification',
      description: 'Comprehensive KYC and AML procedures for all customers'
    },
    {
      icon: CheckCircle,
      title: 'Audit & Testing',
      description: 'Regular internal and third-party compliance audits and testing'
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
              Compliance <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="text-slate-400 text-lg">Regulatory Standards & Commitments</p>
          </div>

          {/* Compliance Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Our Commitment to Compliance</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY is committed to maintaining the highest standards of regulatory compliance and ethical business practices. We operate transparently and adhere to all applicable financial regulations, data protection laws, and international best practices for fintech companies.
            </p>
          </motion.div>

          {/* Compliance Areas Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            viewport={{ once: true }}
          >
            {complianceAreas.map((area, index) => {
              const Icon = area.icon;
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
                  <h3 className="text-xl font-semibold text-white mb-2">{area.title}</h3>
                  <p className="text-slate-400">{area.description}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Regulatory Compliance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">1. Regulatory Compliance</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY complies with financial regulations in all jurisdictions where we operate:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li><strong>Haiti:</strong> Compliance with Central Bank of Haiti regulations and financial services laws</li>
              <li><strong>United States:</strong> Compliance with FinCEN, OFAC, and state money transmitter regulations</li>
              <li><strong>International:</strong> Compliance with FATF (Financial Action Task Force) recommendations</li>
              <li><strong>AML/CFT:</strong> Full Anti-Money Laundering and Countering Financing of Terrorism procedures</li>
              <li><strong>Data Protection:</strong> Compliance with GDPR and international data protection standards</li>
            </ul>
          </motion.div>

          {/* KYC/AML Programs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">2. KYC/AML Programs</h2>
            <p className="text-slate-300 leading-relaxed">
              Our comprehensive Know Your Customer (KYC) and Anti-Money Laundering (AML) programs include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Customer identification and verification at account opening</li>
              <li>Enhanced due diligence for high-risk customers</li>
              <li>Real-time transaction monitoring and suspicious activity detection</li>
              <li>Sanctions list screening (OFAC, UN, EU lists)</li>
              <li>Politically Exposed Person (PEP) screening</li>
              <li>Suspicious Activity Report (SAR) filing with authorities</li>
              <li>Annual compliance audits and testing</li>
            </ul>
          </motion.div>

          {/* Data Security & Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">3. Data Security & Privacy</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement industry-leading security measures to protect customer data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>End-to-end encryption for all data transmission</li>
              <li>AES-256 encryption for data at rest</li>
              <li>Multi-factor authentication (MFA) for account access</li>
              <li>Regular security audits and penetration testing</li>
              <li>PCI DSS compliance for payment card data</li>
              <li>GDPR and international data protection compliance</li>
              <li>Strict access controls and data minimization practices</li>
              <li>Incident response plan and breach notification procedures</li>
            </ul>
          </motion.div>

          {/* Transaction Monitoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">4. Transaction Monitoring</h2>
            <p className="text-slate-300 leading-relaxed">
              All transactions are monitored for compliance and suspicious activity:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Real-time monitoring of all transactions</li>
              <li>Behavioral anomaly detection algorithms</li>
              <li>Threshold-based alert systems</li>
              <li>Pattern matching for structuring detection</li>
              <li>Geographic and currency risk assessment</li>
              <li>Automated and manual review processes</li>
              <li>Daily suspicious activity investigation</li>
            </ul>
          </motion.div>

          {/* Internal Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">5. Internal Controls & Governance</h2>
            <p className="text-slate-300 leading-relaxed">
              We maintain robust internal controls and governance structures:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Designated Compliance Officer responsible for program oversight</li>
              <li>Independent Board Audit Committee</li>
              <li>Written compliance policies and procedures</li>
              <li>Regular staff training on compliance obligations</li>
              <li>Segregation of duties and conflict of interest policies</li>
              <li>Whistleblower protection program</li>
              <li>Regular policy review and updates</li>
              <li>Documentation and record retention procedures</li>
            </ul>
          </motion.div>

          {/* Third-Party Due Diligence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">6. Third-Party Due Diligence</h2>
            <p className="text-slate-300 leading-relaxed">
              We conduct thorough due diligence on all third-party service providers and partners:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Risk assessment of all service providers</li>
              <li>Background verification and financial stability checks</li>
              <li>Compliance certification and audit reviews</li>
              <li>Contractual compliance obligations</li>
              <li>Ongoing monitoring of third-party activities</li>
              <li>Service Level Agreement (SLA) enforcement</li>
            </ul>
          </motion.div>

          {/* Compliance Documentation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">7. Documentation & Recordkeeping</h2>
            <p className="text-slate-300 leading-relaxed">
              We maintain comprehensive documentation of all compliance activities:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Customer identification and verification documents (5+ years)</li>
              <li>Transaction records and monitoring activities (5+ years)</li>
              <li>Suspicious activity reports and investigations</li>
              <li>Compliance audit reports and remediation actions</li>
              <li>Staff training records and certifications</li>
              <li>Policy review and update documentation</li>
              <li>Regulatory correspondence and filings</li>
            </ul>
          </motion.div>

          {/* Audit & Testing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">8. Audit & Testing</h2>
            <p className="text-slate-300 leading-relaxed">
              OZAMAPAY undergoes regular compliance audits and testing:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>Annual internal compliance audits</li>
              <li>Regular independent third-party audits</li>
              <li>Penetration testing and security assessments</li>
              <li>Transaction monitoring system testing</li>
              <li>KYC/AML procedure effectiveness testing</li>
              <li>Regulatory examination readiness</li>
              <li>Remediation tracking and closure</li>
            </ul>
          </motion.div>

          {/* Compliance Officer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">9. Contact Our Compliance Team</h2>
            <p className="text-slate-300 leading-relaxed">
              For compliance-related inquiries, regulatory requests, or to report concerns:
            </p>
            <div className="space-y-3 text-slate-300 mt-4">
              <p><strong>Compliance Officer:</strong> Ralph Olivier GREFFIN</p>
              <p><strong>Email:</strong> compliance@ozamapay.com</p>
              <p><strong>Phone:</strong> +509 36 40 1900</p>
              <p><strong>Address:</strong> Jacmel, Haiti</p>
              <p><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (Haiti Time)</p>
            </div>
          </motion.div>

          {/* Related Policies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-900/50 rounded-2xl p-8 border border-slate-800"
          >
            <h2 className="text-2xl font-bold text-white">Related Compliance Policies</h2>
            <p className="text-slate-300 mb-4">
              For detailed information about our compliance procedures, please review:
            </p>
            <div className="space-y-2">
              <Link href="/aml-policy" className="text-orange-400 hover:text-orange-500 transition">
                → Anti-Money Laundering (AML) Policy
              </Link>
              <Link href="/kyc-policy" className="text-orange-400 hover:text-orange-500 transition block">
                → Know Your Customer (KYC) Policy
              </Link>
              <Link href="/privacy" className="text-orange-400 hover:text-orange-500 transition block">
                → Privacy Policy
              </Link>
              <Link href="/terms" className="text-orange-400 hover:text-orange-500 transition block">
                → Terms of Service
              </Link>
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