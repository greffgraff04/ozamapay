'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  SUPPORT: 'Agent Support',
  SUPER_ADMIN: 'Super Administrateur',
};

function SetupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [invitationInfo, setInvitationInfo] = useState<{ email: string; role: string; expiresAt: string } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dailyCode, setDailyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('Token manquant. Vérifiez le lien dans votre email.');
      setLoading(false);
      return;
    }
    fetch(`${API}/admin/setup/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) {
          setInvitationInfo(d);
        } else {
          setTokenError(d.message || 'Token invalide ou expiré');
        }
      })
      .catch(() => setTokenError('Impossible de contacter le serveur'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (dailyCode.length !== 6) {
      setError('Le code journalier doit contenir exactement 6 caractères');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/admin/setup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firstName, lastName, phone, password, dailyCode }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/login?setup=success');
      } else {
        setError(data.message || 'Erreur lors de la création du compte');
      }
    } catch {
      setError('Connexion au serveur impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0B0F]">
        <div className="w-8 h-8 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0B0F] p-6">
        <div className="w-full max-w-md bg-[#0D0E14] border border-white/[0.05] rounded-2xl p-10 text-center">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-red-500 text-xl">✕</span>
          </div>
          <h2 className="text-white font-black text-lg uppercase tracking-wide mb-3">Invitation invalide</h2>
          <p className="text-white/40 text-sm">{tokenError}</p>
          <a href="/login" className="mt-6 inline-block text-[#FF7A00] text-sm font-bold hover:underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0B0F] p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7A00]/10 border border-[#FF7A00]/20 rounded-full mb-4">
            <span className="text-[#FF7A00] text-[10px] font-black uppercase tracking-widest">OZAMAPAY</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Configuration du compte</h1>
          <p className="text-white/40 text-sm mt-2">
            Bienvenue — <span className="text-white/60 font-bold">{invitationInfo?.email}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#0D0E14] border border-white/[0.06] rounded-lg">
            <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest">Poste :</span>
            <span className="text-[10px] font-bold text-[#FF7A00]">{ROLE_LABELS[invitationInfo?.role || ''] || invitationInfo?.role}</span>
          </div>
        </div>

        <div className="bg-[#0D0E14] border border-white/[0.05] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-3 rounded-xl font-bold uppercase tracking-wide">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Prénom</label>
                <input
                  type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[#FF7A00]/40 text-white placeholder:text-white/10 transition"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Nom</label>
                <input
                  type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[#FF7A00]/40 text-white placeholder:text-white/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Téléphone</label>
              <input
                type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+509 3700 0000"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[#FF7A00]/40 text-white placeholder:text-white/10 transition"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Mot de passe</label>
              <input
                type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[#FF7A00]/40 text-white placeholder:text-white/10 transition"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Confirmer le mot de passe</label>
              <input
                type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-[#FF7A00]/40 text-white placeholder:text-white/10 transition"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">
                Code d'accès journalier
              </label>
              <input
                type="text" required maxLength={6} value={dailyCode}
                onChange={(e) => setDailyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="XXXXXX"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl py-3 px-4 text-sm font-black font-mono outline-none focus:border-[#FF7A00]/40 text-[#FF7A00] placeholder:text-white/10 transition tracking-widest text-center uppercase"
              />
              <p className="text-[9px] text-white/20 mt-1.5 font-mono">Demandez ce code à votre supérieur (groupe WhatsApp équipe)</p>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-[#FF7A00] hover:bg-[#e56e00] text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest mt-2 transition active:scale-[0.98] shadow-lg shadow-[#FF7A00]/10 disabled:opacity-50"
            >
              {submitting ? 'Création en cours...' : 'Créer mon compte →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0A0B0F]">
        <div className="w-8 h-8 border-2 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  );
}
