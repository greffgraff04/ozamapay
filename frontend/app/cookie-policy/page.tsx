'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiePolicyPage() {
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
              Cookie <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Policy</span>
            </h1>
            <p className="text-slate-400 text-lg">Last updated: May 23, 2026</p>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {/* 1. What Are Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">1. What Are Cookies?</h2>
              <p className="text-slate-300 leading-relaxed">
                Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you visit our website or use our application. They are widely used to make websites work more efficiently, as well as to provide information to the owners of the site. Cookies allow us to recognize you and remember information about your preferences and activities.
              </p>
            </motion.div>

            {/* 2. How We Use Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">2. How We Use Cookies</h2>
              <p className="text-slate-300 leading-relaxed">
                OZAMAPAY uses cookies for various purposes, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Authentication and user identification</li>
                <li>Remembering your login information and preferences</li>
                <li>Improving website and application functionality</li>
                <li>Analyzing user behavior and usage patterns</li>
                <li>Providing personalized content and recommendations</li>
                <li>Tracking advertising effectiveness</li>
                <li>Ensuring security and fraud prevention</li>
                <li>Complying with legal and regulatory requirements</li>
              </ul>
            </motion.div>

            {/* 3. Types of Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">3. Types of Cookies We Use</h2>
              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.1 Essential Cookies</h3>
                  <p className="text-slate-300 leading-relaxed">
                    These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility. Without these cookies, the website cannot function correctly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.2 Performance Cookies</h3>
                  <p className="text-slate-300 leading-relaxed">
                    These cookies collect information about how visitors use our website, including which pages are visited most often and whether users receive error messages. These cookies don't collect personal information and are used only to improve site functionality.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.3 Functional Cookies</h3>
                  <p className="text-slate-300 leading-relaxed">
                    These cookies remember your choices (such as language preference, region) and provide enhanced, more personalized features. They may be set by us or by third-party providers whose services we use.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3.4 Targeting/Advertising Cookies</h3>
                  <p className="text-slate-300 leading-relaxed">
                    These cookies are used to deliver advertisements relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 4. Third-Party Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">4. Third-Party Cookies</h2>
              <p className="text-slate-300 leading-relaxed">
                We may allow third-party service providers, such as analytics providers, advertising networks, and social media platforms, to place cookies on our website. These third parties may use cookies to track your activity across multiple websites and create profiles of your interests.
              </p>
              <p className="text-slate-300 leading-relaxed mt-4">
                Third-party providers may include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Google Analytics</li>
                <li>Facebook Pixel</li>
                <li>Advertising networks</li>
                <li>Social media platforms</li>
                <li>Analytics and tracking services</li>
              </ul>
            </motion.div>

            {/* 5. Cookie Duration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">5. Cookie Duration</h2>
              <p className="text-slate-300 leading-relaxed">
                Cookies may be classified by their duration:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li><strong>Session Cookies:</strong> These are temporary cookies that are deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> These cookies remain on your device for a set period (typically from a few days to several years) or until you manually delete them</li>
              </ul>
            </motion.div>

            {/* 6. Your Cookie Choices */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">6. Your Cookie Choices</h2>
              <p className="text-slate-300 leading-relaxed">
                You have choices regarding cookies. You can:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li>Accept or reject cookies through our cookie consent banner</li>
                <li>Disable cookies in your browser settings</li>
                <li>Delete cookies from your device at any time</li>
                <li>Use browser plugins to block cookies</li>
                <li>Opt out of targeted advertising</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mt-4">
                <strong>Note:</strong> Disabling essential cookies may affect the functionality and performance of our website and services. You may not be able to access certain features if you disable essential cookies.
              </p>
            </motion.div>

            {/* 7. Browser Cookie Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">7. How to Manage Cookies in Your Browser</h2>
              <p className="text-slate-300 leading-relaxed">
                Most browsers allow you to control cookies through their settings. Here's how to manage cookies in popular browsers:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and other site permissions</li>
                <li><strong>Mobile Browsers:</strong> Check your browser's settings or help documentation</li>
              </ul>
            </motion.div>

            {/* 8. Do Not Track */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">8. Do Not Track (DNT)</h2>
              <p className="text-slate-300 leading-relaxed">
                Some browsers include a Do Not Track (DNT) feature. Currently, there is no industry standard for DNT signals, and OZAMAPAY does not respond to DNT browser signals. However, you can use other methods to control cookies as described in this policy.
              </p>
            </motion.div>

            {/* 9. Contact Us About Cookies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">9. Data Security</h2>
              <p className="text-slate-300 leading-relaxed">
                Cookie information is stored securely and protected from unauthorized access. We use encryption and secure protocols to protect cookie data. However, remember that no method of transmission over the Internet is 100% secure.
              </p>
            </motion.div>

            {/* 10. Cookie Updates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-white">10. Changes to This Cookie Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any changes will be posted on this page with an updated "Last Updated" date. Your continued use of our website or services after any changes constitutes your acceptance of the updated Cookie Policy.
              </p>
            </motion.div>

            {/* 11. Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-4 bg-slate-800/50 rounded-2xl p-8 border border-slate-700"
            >
              <h2 className="text-2xl font-bold text-white">11. Contact Us</h2>
              <p className="text-slate-300 leading-relaxed">
                If you have questions about our Cookie Policy or wish to exercise your cookie choices:
              </p>
              <div className="space-y-2 text-slate-300 mt-4">
                <p><strong>Email:</strong> privacy@ozamapay.com</p>
                <p><strong>Phone:</strong> +509 36 40 1900</p>
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