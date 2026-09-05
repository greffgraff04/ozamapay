'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Mail, Clock, Database, Trash2 } from 'lucide-react';

export default function AccountDeletionPage() {
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
              Suppression de <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFAE66] bg-clip-text text-transparent">Compte</span>
            </h1>
            <p className="text-white/50 text-lg">Dènye mizajou: 5 septanm 2026</p>
          </div>

          <div className="space-y-12">
            {/* 1. Comment demander */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-[#FF7A00]" />
                <h2 className="text-2xl font-bold">Comment demander la suppression de votre compte</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Pour demander la suppression de votre compte OZAMAPAY et des données associées,
                envoyez un e-mail à{' '}
                <a href="mailto:contact@ozamapay.com" className="text-[#FF7A00] underline">
                  contact@ozamapay.com
                </a>{' '}
                depuis l'adresse e-mail associée à votre compte, avec pour objet
                «&nbsp;Demande de suppression de compte&nbsp;».
              </p>
              <p className="text-white/70 leading-relaxed">
                Vous pouvez également faire cette demande directement depuis l'application,
                dans <span className="text-white">Profil → Support → Nous contacter</span>.
              </p>
            </motion.div>

            {/* 2. Delai */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#FF7A00]" />
                <h2 className="text-2xl font-bold">Délai de traitement</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Votre demande sera traitée sous un délai maximum de 30 jours. Si votre compte
                présente un solde disponible ou une carte active, notre équipe vous contactera
                d'abord pour finaliser toute opération en cours (retrait de solde, clôture de
                carte) avant la suppression définitive.
              </p>
            </motion.div>

            {/* 3. Donnees supprimees */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-[#FF7A00]" />
                <h2 className="text-2xl font-bold">Données supprimées</h2>
              </div>
              <ul className="text-white/70 leading-relaxed list-disc list-inside space-y-2">
                <li>Informations de profil (nom, e-mail, numéro de téléphone)</li>
                <li>Documents de vérification d'identité (KYC)</li>
                <li>Préférences et paramètres de l'application</li>
                <li>Jetons d'authentification et sessions actives</li>
              </ul>
            </motion.div>

            {/* 4. Donnees conservees */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-[#FF7A00]" />
                <h2 className="text-2xl font-bold">Données conservées (obligation légale)</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                Conformément aux obligations de lutte contre le blanchiment d'argent (AML) et de
                connaissance du client (KYC) applicables aux services financiers, certaines
                données transactionnelles (historique des transactions, montants, dates) sont
                conservées pendant une durée de 5 ans après la clôture du compte, comme l'exige
                notre{' '}
                <Link href="/compliance" className="text-[#FF7A00] underline">
                  politique de conformité
                </Link>. Ces données ne sont pas accessibles depuis l'application une fois le
                compte supprimé.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
