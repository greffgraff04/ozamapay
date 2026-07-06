'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export default function TeamJoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!authToken) {
      router.replace(`/login?redirect=/team/join/${token}`);
      return;
    }

    fetch(`${API}/team/join/${token}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.replace('/team'), 1500);
        } else {
          setStatus('error');
          setMessage(data.message || "Envitasyon pa valid oswa deja itilize.");
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Nou pa ka konekte ak sèvè a.');
      });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#0F121E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-black italic text-white tracking-tighter">
            OZAMA<span className="text-[#FF7A00]">PAY</span>
          </span>
          <p className="text-[10px] uppercase tracking-widest mt-1 text-[#FF7A00]">Team Hub</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
          {status === 'loading' && (
            <p className="text-white/40 font-black italic uppercase text-xs py-8">Vérification de l'invitation...</p>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h1 className="text-white font-black italic text-lg mb-2">Bienvenue dans l'équipe !</h1>
              <p className="text-white/40 text-xs">Redirection vers Team Hub...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-white/60 font-black italic uppercase text-xs mb-6">{message}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs"
              >
                Aller au Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
