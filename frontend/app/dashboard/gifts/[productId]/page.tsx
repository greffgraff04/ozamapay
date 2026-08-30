"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Copy, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

const signOut = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

// Same rules as the gift card catalog on the dashboard — untouched.
const gcIsRange = (p: any) =>
  p.denominationType === 'RANGE' || (p.senderFaceValue == null && p.minSenderDenomination != null);

const gcFixedAmounts = (p: any): number[] =>
  Array.isArray(p?.fixedSenderDenominations) ? p.fixedSenderDenominations : [];

export default function GiftCardProductPage() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const productId = params?.productId;
  const { colors, glass } = useTheme();

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [buyAmount, setBuyAmount] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderResult, setOrderResult] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    if (!productId) return;
    fetch(`${backendUrl}/giftcards/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) { signOut(); return; }
        if (!res.ok) { setLoadError(true); return; }
        const data = await res.json();
        setProduct(data);
        setBuyAmount(gcIsRange(data) ? String(data.minSenderDenomination ?? '') : String(gcFixedAmounts(data)[0] ?? ''));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [productId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Same purchase flow (KYC guard / 401 / error handling) as the old modal — untouched.
  const handleBuyGift = async () => {
    if (!product) return;
    const unitPrice = parseFloat(buyAmount);
    if (isNaN(unitPrice) || unitPrice <= 0) { setOrderError('Tanpri antre yon montan valid.'); return; }
    setOrderError('');
    setOrderLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/giftcards/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId, unitPrice }),
      });
      if (res.status === 401) { signOut(); return; }
      const data = await res.json();
      if (!res.ok) { setOrderError(data.message || 'Erè pandan kòmand lan'); return; }
      setOrderResult(data);
    } catch {
      setOrderError('Erè rezo');
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background }} className="flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background }} className="flex flex-col items-center justify-center px-6 text-center">
        <p className="font-black italic uppercase text-white mb-4">Pwodwi a pa jwenn</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white"
          style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
        >
          Retounen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-space-grotesk px-5 pb-10" style={{ backgroundColor: colors.background, color: colors.textPrimary }}>
      <div className="flex items-center gap-2 pt-6 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 -ml-1 p-1">
          <ChevronLeft size={22} color={glass.textDim} />
          <span className="font-bold uppercase text-[12px] tracking-widest" style={{ color: glass.textDim }}>Retounen</span>
        </button>
      </div>

      {product.logoUrls?.[0] ? (
        <img src={product.logoUrls[0]} alt={product.brand?.brandName ?? product.productName} className="w-full h-40 object-contain rounded-2xl mb-5" style={{ background: glass.bgStrong }} />
      ) : (
        <div className="w-full h-40 rounded-2xl mb-5" style={{ background: glass.bgStrong }} />
      )}

      <h1 className="font-black italic uppercase text-[22px] leading-tight text-white mb-2" style={{ letterSpacing: 1 }}>
        {product.brand?.brandName ?? product.productName}
      </h1>
      {product.description && (
        <p className="text-[13px] mb-6" style={{ color: glass.textDimmer }}>{product.description}</p>
      )}

      {orderResult ? (
        <div className="oz-glass-strong rounded-3xl p-5 text-center mt-2">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255,122,0,.14)' }}>
            <CheckCircle2 size={28} color="#FF7A00" />
          </div>
          <p className="font-black italic uppercase text-base tracking-tight text-white">{orderResult.productName}</p>
          <p className="text-sm mt-1" style={{ color: glass.textDim }}>${orderResult.unitPrice} USD · {orderResult.htgPaid} HTG</p>
          {orderResult.redeemCode ? (
            <div className="mt-4 rounded-[12px] px-4 py-3" style={{ background: glass.bg, border: `1px solid ${glass.border}` }}>
              <p className="font-black text-[#FF7A00] text-xl tracking-[0.1em] break-all">{orderResult.redeemCode}</p>
              <button onClick={() => copyToClipboard(orderResult.redeemCode)} className="mt-3 flex items-center gap-2 mx-auto text-white px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest" style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                <Copy size={15} /> Kopye Kòd la
              </button>
            </div>
          ) : (
            <p className="font-bold text-sm mt-3" style={{ color: '#FF7A00' }}>Kòmand an pwosesis — w ap resevwa kòd la pa imel.</p>
          )}
          <button onClick={() => router.push('/dashboard')} className="mt-5 w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white" style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
            Retounen
          </button>
        </div>
      ) : (
        <>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6 }}>Montan ($USD)</span>
          {gcIsRange(product) ? (
            <>
              <input
                type="number"
                inputMode="decimal"
                className="w-full rounded-xl px-4 py-[13px] text-[15px] outline-none"
                style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary }}
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
              />
              <p className="text-[11px] mt-1" style={{ color: glass.textDimmer }}>
                Min ${product.minSenderDenomination} — Max ${product.maxSenderDenomination}
              </p>
            </>
          ) : gcFixedAmounts(product).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {gcFixedAmounts(product).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBuyAmount(String(amt))}
                  className="px-4 py-2.5 rounded-xl text-[14px] font-black transition-all"
                  style={buyAmount === String(amt)
                    ? { background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', color: '#fff' }
                    : { background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] italic" style={{ color: glass.textDimmer }}>
              Pa gen montan disponib pou pwodwi sa a kounye a.
            </p>
          )}

          {orderError && (
            <p className="text-[12px] font-bold mt-3" style={{ color: '#EF4444' }}>{orderError}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              disabled={orderLoading}
              className="flex-1 py-4 font-black uppercase rounded-2xl tracking-widest text-sm active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary }}
            >
              Retounen
            </button>
            <button
              onClick={handleBuyGift}
              disabled={orderLoading || !buyAmount}
              className="flex-1 py-4 text-white font-black uppercase rounded-2xl tracking-widest text-sm active:scale-[0.98] transition-all disabled:opacity-40 oz-glowPulse"
              style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
            >
              {orderLoading ? 'Pwosesis...' : 'Achte'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
