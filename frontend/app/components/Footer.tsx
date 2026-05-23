'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerSections = [
    { title: 'Company', links: [{ label: 'About Us', href: '/about' }, { label: 'Careers', href: '/careers' }, { label: 'Press', href: '/press' }, { label: 'Contact', href: '/support' }] },
    { title: 'Product', links: [{ label: 'Wallet', href: '#' }, { label: 'Virtual Cards', href: '#cards' }, { label: 'Transfers', href: '#features' }, { label: 'Business Payments', href: '#business' }] },
    { title: 'Resources', links: [{ label: 'Help Center', href: '/support' }, { label: 'API Docs', href: '/developers' }, { label: 'Developers', href: '/developers' }, { label: 'Status', href: 'https://status.ozamapay.com' }] },
    { title: 'Legal', links: [{ label: 'Terms of Service', href: '/terms' }, { label: 'Privacy Policy', href: '/privacy' }, { label: 'AML Policy', href: '/aml-policy' }, { label: 'KYC Policy', href: '/kyc-policy' }, { label: 'Cookie Policy', href: '/cookie-policy' }, { label: 'Compliance', href: '/compliance' }] },
  ];

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Footer Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8 mb-12">
            {footerSections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold text-white mb-4 text-sm">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, lIndex) => (
                    <li key={lIndex}>
                      <Link href={link.href} className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Section - Logo LARGE */}
          <div className="pt-8 border-t border-slate-800 text-center space-y-6">
            <Link href="/" className="flex justify-center">
              <div className="w-40 h-40 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-orange-500/50 transition-all">
                <Image
                  src="/logo.png"
                  alt="OZAMAPAY"
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </Link>
            
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Financial operating system for Haiti and the diaspora. Fast, secure, and borderless payments.
            </p>

            <div className="text-slate-400 text-sm">
              © {currentYear} OZAMAPAY. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}