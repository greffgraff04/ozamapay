'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

const ROLE_LABELS: Record<string, string> = {
  ACCOUNTANT: 'Kontab',
  CASHIER: 'Kasiyer',
  OWNER: 'Pwopriyetè',
};

type Preview = {
  businessName: string;
  role: string;
  invitedAt: string;
  alreadyAccepted: boolean;
};

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace(`/login?redirect=/business/accept/${memberId}`);
      return;
    }

    fetch(`${API}/business/members/${memberId}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.statusCode >= 400) {
          setError(data.message || 'Envitasyon pa valid');
        } else if (data.alreadyAccepted) {
          router.replace('/dashboard');
        } else {
          setPreview(data);
        }
      })
      .catch(() => setError('Nou pa ka konekte ak sèvè a'))
      .finally(() => setLoading(false));
  }, [memberId, router]);

  const handleAccept = async () => {
    setActing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/business/members/${memberId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.replace('/dashboard');
      } else {
        const data = await res.json();
        setError(data.message || 'Erè pandan akseptasyon an');
        setActing(false);
      }
    } catch {
      setError('Nou pa ka konekte ak sèvè a');
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F121E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-black italic text-white tracking-tighter">
            OZAMA<span className="text-[#FF7A00]">PAY</span>
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
          {loading && (
            <div className="text-center text-white/40 font-black italic uppercase text-xs py-8">
              Chajman...
            </div>
          )}

          {!loading && error && !preview && (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-white/60 font-black italic uppercase text-xs">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-6 w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase italic text-xs"
              >
                Ale nan Dashboard
              </button>
            </div>
          )}

          {!loading && preview && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <p className="text-white/40 font-black italic uppercase text-[10px] tracking-widest mb-2">
                  Envitasyon Biznis
                </p>
                <h1 className="text-white font-black italic text-xl tracking-tight">
                  {preview.businessName}
                </h1>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 font-black italic uppercase text-[10px] tracking-widest">
                    Wòl ou
                  </span>
                  <span className="text-[#FF7A00] font-black italic uppercase text-xs">
                    {ROLE_LABELS[preview.role] ?? preview.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 font-black italic uppercase text-[10px] tracking-widest">
                    Dat envitasyon
                  </span>
                  <span className="text-white font-black italic text-xs">
                    {new Date(preview.invitedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-red-400 font-black italic uppercase text-[10px] text-center mb-4">
                  {error}
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={acting}
                  className="w-full py-4 bg-[#FF7A00] text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {acting ? 'Ap trete...' : '✓ Aksepte Envitasyon'}
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  disabled={acting}
                  className="w-full py-4 bg-white/5 text-white/60 border border-white/10 rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  Refize
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
