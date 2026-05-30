'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Phone, Mail, Clock, HelpCircle, Zap } from 'lucide-react';

export default function SupportPage() {
  const faqs = [
    {
      question: 'How do I create an OZAMAPAY account?',
      answer: 'Visit www.ozamapay.com or download our mobile app. Click "Create Account," provide your email and personal information, complete KYC verification with a valid ID, and you\'re ready to start using OZAMAPAY!'
    },
    {
      question: 'What documents do I need for KYC verification?',
      answer: 'You\'ll need a valid government-issued photo ID (passport, national ID, or driver\'s license) and a proof of address (utility bill, bank statement, or government document dated within the last 3 months).'
    },
    {
      question: 'How long does KYC verification take?',
      answer: 'Most KYC verifications are completed within 24 hours. In some cases, it may take up to 48 hours. You\'ll receive an email notification once your account is verified.'
    },
    {
      question: 'What are the transaction fees?',
      answer: 'OZAMAPAY offers competitive fees: Account creation is FREE, transfers within OZAMAPAY are FREE, and recharges via MonCash are 6%. Virtual card activation has a one-time fee. Check our pricing page for details.'
    },
    {
      question: 'How do I add money to my OZAMAPAY wallet?',
      answer: 'You can top up your wallet via MonCash, Natcom mobile money, bank transfer, or through our partner payment networks. Visit the "Topup" section in your account and choose your preferred method.'
    },
    {
      question: 'Can I use OZAMAPAY outside Haiti?',
      answer: 'Yes! OZAMAPAY is available globally. Users in the diaspora can send money to Haiti, receive payments, and use virtual cards for international purchases. However, some features may be restricted based on local regulations.'
    },
    {
      question: 'Is OZAMAPAY safe and secure?',
      answer: 'Absolutely. OZAMAPAY uses bank-level encryption (AES-256), multi-factor authentication, and complies with international security standards (PCI DSS). Your funds and data are protected.'
    },
    {
      question: 'What should I do if I forget my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and follow the reset instructions sent to your inbox. If you still have issues, contact our support team.'
    },
    {
      question: 'How do I apply for a virtual card?',
      answer: 'Once your account is verified and funded, go to the "Cards" section and click "Request Virtual Card." You\'ll receive a card number, expiration date, and CVV instantly. Use it anywhere online!'
    },
    {
      question: 'What is the maximum transaction limit?',
      answer: 'Transaction limits vary based on your verification level and account age. New verified accounts typically have daily limits starting at $1,000. Enhanced limits available upon request.'
    }
  ];

  const contactChannels = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      contact: 'support@ozamapay.com',
      response: '24-hour response'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Call our support team directly',
      contact: '+509 36 40 1900',
      response: 'Mon-Fri, 9AM-6PM'
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      contact: 'Available in app',
      response: 'Instant support'
    },
    {
      icon: HelpCircle,
      title: 'Help Center',
      description: 'Browse our knowledge base and articles',
      contact: 'help.ozamapay.com',
      response: 'Available 24/7'
    }
  ];

  const commonIssues = [
    {
      title: 'Account Issues',
      items: ['Can\'t log in', 'Password reset', 'Account locked', 'Verification failed', 'Profile update']
    },
    {
      title: 'Payment Issues',
      items: ['Transaction failed', 'Money not received', 'Wrong amount sent', 'Pending transfer', 'Refund request']
    },
    {
      title: 'Card Issues',
      items: ['Card declined', 'Card blocked', 'Lost/stolen card', 'CVV not working', 'Card expiration']
    },
    {
      title: 'Technical Issues',
      items: ['App crashes', 'Login problems', 'Payment gateway error', 'Slow performance', 'Browser issues']
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
              Support <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="text-slate-400 text-lg">We're here to help! Find answers and get support</p>
          </div>

          {/* Quick Contact */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            viewport={{ once: true }}
          >
            {contactChannels.map((channel, index) => {
              const Icon = channel.icon;
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
                  <h3 className="text-xl font-semibold text-white mb-2">{channel.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{channel.description}</p>
                  <p className="text-orange-400 font-semibold text-sm mb-2">{channel.contact}</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {channel.response}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-white">Common Issues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {commonIssues.map((category, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">{category.title}</h3>
                  <ul className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-slate-300 text-sm flex items-start gap-2">
                        <span className="text-orange-500 font-bold mt-0.5">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-6 hover:bg-slate-700/50 transition-all">
                      <h3 className="text-lg font-semibold text-white pr-4">{faq.question}</h3>
                      <span className="flex-shrink-0">
                        <svg className="w-5 h-5 text-orange-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-6 pb-6 border-t border-slate-700 bg-slate-900/30">
                      <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                    </div>
                  </details>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Troubleshooting Guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-500" />
              Quick Troubleshooting
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">App Not Loading?</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm ml-2">
                  <li>Check your internet connection</li>
                  <li>Clear app cache: Settings → Apps → OZAMAPAY → Storage → Clear Cache</li>
                  <li>Restart your phone</li>
                  <li>Update the app to the latest version</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Can't Log In?</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm ml-2">
                  <li>Check that you're using the correct email/phone</li>
                  <li>Use "Forgot Password" to reset your password</li>
                  <li>Ensure caps lock is off</li>
                  <li>Try a different browser or clear browser cookies</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Transaction Failed?</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm ml-2">
                  <li>Check your account balance</li>
                  <li>Verify recipient details are correct</li>
                  <li>Check your internet connection</li>
                  <li>Wait a few minutes and try again</li>
                  <li>Contact support if issue persists</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Service Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Service Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Platform Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 text-sm font-semibold">Operational</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Payment Processing</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 text-sm font-semibold">Operational</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Mobile App</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 text-sm font-semibold">Operational</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Customer Support</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-400 text-sm font-semibold">Available</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              For real-time status updates, visit status.ozamapay.com
            </p>
          </motion.div>

          {/* Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
          >
            <h2 className="text-2xl font-bold text-white">Help Us Improve</h2>
            <p className="text-slate-300 leading-relaxed">
              We're constantly working to improve OZAMAPAY. If you have suggestions, feedback, or found a bug, please let us know! Your feedback helps us build a better product.
            </p>
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105">
              Send Feedback
            </button>
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