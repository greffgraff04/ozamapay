'use client';

import { useState, useEffect } from 'react';

export default function AdminKycPage() {
  const [kycList, setKycList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKyc = async () => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : '';

    try {
      const res = await fetch(
        'http://localhost:3001/users/all',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      setKycList(
        Array.isArray(data)
          ? data.filter((u: any) => u.kyc)
          : [],
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    userId: string,
    action: 'approve' | 'reject',
  ) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : '';

    try {
      const res = await fetch(
        `http://localhost:3001/kyc/${action}/${userId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        fetchKyc();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, []);

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') {
      return 'bg-green-50 text-green-600 border-green-100';
    }

    if (status === 'APPROVED') {
      return 'bg-green-50 text-green-600 border-green-100';
    }

    if (status === 'REJECTED') {
      return 'bg-red-50 text-red-500 border-red-100';
    }

    return 'bg-yellow-50 text-yellow-600 border-yellow-100';
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[#0F121E]">
              KYC Admin
            </h1>

            <p className="text-[#8E929B] text-xs font-bold uppercase italic mt-1">
              Jere verifikasyon idantite yo
            </p>
          </div>

          <button
            onClick={() =>
              (window.location.href = '/dashboard')
            }
            className="text-[#FF7A00] font-black italic uppercase text-xs"
          >
            ← Dashboard
          </button>
        </div>

        {loading && (
          <div className="text-center text-[#8E929B] font-black italic uppercase text-xs py-20">
            Chajman...
          </div>
        )}

        {!loading && kycList.length === 0 && (
          <div className="text-center text-[#8E929B] font-black italic uppercase text-xs py-20">
            Okenn KYC pou kounye a
          </div>
        )}

        <div className="space-y-4">
          {kycList.map((u: any) => (
            <div
              key={u.id}
              className="bg-white rounded-[2rem] border border-black/5 p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F121E] flex items-center justify-center text-[#FF7A00] font-black text-lg">
                    {u.email
                      ?.substring(0, 2)
                      .toUpperCase()}
                  </div>

                  <div>
                    <p className="font-black italic uppercase text-sm">
                      {u.email}
                    </p>

                    <p className="text-[#8E929B] text-[10px] font-bold uppercase mt-1">
                      {u.name || 'Sans non'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase italic px-4 py-2 rounded-full border ${statusColor(
                    u.kyc.status,
                  )}`}
                >
                  {u.kyc.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F9FAFB] rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">
                    Non Konplè
                  </p>

                  <p className="font-black italic text-sm">
                    {u.kyc.fullName}
                  </p>
                </div>

                <div className="bg-[#F9FAFB] rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">
                    Telefòn
                  </p>

                  <p className="font-black italic text-sm">
                    {u.kyc.phone}
                  </p>
                </div>

                <div className="bg-[#F9FAFB] rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">
                    Nimewo ID
                  </p>

                  <p className="font-black italic text-sm">
                    {u.kyc.idNumber}
                  </p>
                </div>
              </div>

              {u.kyc.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleAction(
                        u.id,
                        'approve',
                      )
                    }
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                  >
                    ✓ Approve
                  </button>

                  <button
                    onClick={() =>
                      handleAction(
                        u.id,
                        'reject',
                      )
                    }
                    className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase italic text-xs tracking-widest border border-red-100 active:scale-95 transition-all"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {(u.kyc.status === 'COMPLETED' ||
                u.kyc.status === 'APPROVED') && (
                <div className="text-center py-3 bg-green-50 rounded-2xl border border-green-100">
                  <span className="text-green-600 font-black italic uppercase text-xs">
                    ✓ Kont verifye
                  </span>
                </div>
              )}

              {u.kyc.status === 'REJECTED' && (
                <button
                  onClick={() =>
                    handleAction(
                      u.id,
                      'approve',
                    )
                  }
                  className="w-full py-4 bg-green-500 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest active:scale-95 transition-all"
                >
                  ✓ Approve Kanmenm
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}