"use client";

import { X, Zap, Gift, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export interface CardCreationPricingInfo {
  renaissancePricingEnabled: boolean;
  cardCreationFeeHtg: number;
  cardInitialBalanceUsd: number | null;
  isFounderFreeCard: boolean;
}

interface CardCreationConfirmSheetProps {
  pricing: CardCreationPricingInfo;
  amountUsd: number;
  rateUsdHtg: number;
  walletBalanceHtg: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function Row({ label, value, dim }: { label: string; value: string; dim?: string }) {
  return (
    <div className="flex items-center justify-between py-[9px]">
      <span className="font-medium text-[12px]" style={{ color: dim }}>{label}</span>
      <span className="font-bold text-[13px]" style={{ color: dim ? undefined : 'inherit' }}>{value}</span>
    </div>
  );
}

export function CardCreationConfirmSheet({
  pricing,
  amountUsd,
  rateUsdHtg,
  walletBalanceHtg,
  loading,
  onConfirm,
  onCancel,
}: CardCreationConfirmSheetProps) {
  const { colors, glass } = useTheme();

  const baseUsd = pricing.cardInitialBalanceUsd ?? 3;
  const isFounder = pricing.renaissancePricingEnabled && pricing.isFounderFreeCard;

  // Menm kalkil ak backend (strowallet.service.ts) — pa gen okenn lojik
  // diferan isit la, sèlman yon aperçu anvan konfimasyon.
  const topUpUsd = Math.max(0, amountUsd - baseUsd);
  const topUpHtg = topUpUsd > 0 ? Math.ceil(topUpUsd * rateUsdHtg) : 0;

  const legacyTotalHtg = Math.ceil(amountUsd * rateUsdHtg);
  const totalHtg = !pricing.renaissancePricingEnabled
    ? legacyTotalHtg
    : isFounder
      ? 0
      : pricing.cardCreationFeeHtg + topUpHtg;

  const insufficient = walletBalanceHtg < totalHtg;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="relative w-full max-w-lg rounded-t-3xl oz-slideUp"
        style={{
          background: glass.sheetBgStrong,
          borderTop: `1px solid ${glass.border}`,
          backdropFilter: 'blur(28px)',
          paddingLeft: 22,
          paddingRight: 22,
          paddingTop: 14,
          paddingBottom: 32,
        }}
      >
        <div className="mx-auto mb-5" style={{ width: 40, height: 4, background: glass.bg, borderRadius: 2 }} />
        <div className="flex justify-between items-center mb-5">
          <p className="font-bold italic uppercase text-[18px] tracking-[1px]" style={{ color: colors.textPrimary }}>
            Konfime Kreyasyon Kat
          </p>
          <button onClick={onCancel} disabled={loading}>
            <X size={20} color={glass.textDim} />
          </button>
        </div>

        <div className="oz-glass-strong mb-5" style={{ borderRadius: 20, padding: 16, color: colors.textPrimary }}>
          {isFounder ? (
            <div
              className="flex items-center gap-3 mb-1"
              style={{ padding: '10px 2px' }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(184,232,50,.15)' }}
              >
                <Gift size={18} color="#B8E832" />
              </div>
              <div>
                <p className="font-bold text-[13px]" style={{ color: colors.textPrimary }}>Kado Manm Fondatè</p>
                <p className="font-medium text-[11px]" style={{ color: glass.textDim }}>Kat $3 USD, pa gen rechaj siplemantè</p>
              </div>
            </div>
          ) : !pricing.renaissancePricingEnabled ? (
            <Row label="Balans inisyal kat" value={`$${amountUsd} USD`} dim={glass.textDim} />
          ) : (
            <>
              <Row label="Frè kreyasyon kat" value={`${pricing.cardCreationFeeHtg} HTG`} dim={glass.textDim} />
              <Row label="Balans inisyal kat" value={`$${baseUsd} USD`} dim={glass.textDim} />
              {topUpUsd > 0 && (
                <Row label="Rechaj siplemantè" value={`$${topUpUsd} → ${topUpHtg} HTG`} dim={glass.textDim} />
              )}
            </>
          )}

          <div className="my-2" style={{ height: 1, background: glass.border }} />

          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-[13px]" style={{ color: colors.textPrimary }}>
              Total ki pral retire nan wallet ou
            </span>
            <span className="font-black italic text-[16px]" style={{ color: isFounder ? '#B8E832' : '#FF7A00' }}>
              {isFounder ? 'GRATIS (0 HTG)' : `${totalHtg} HTG`}
            </span>
          </div>
        </div>

        {insufficient && (
          <div
            className="flex items-start gap-2 mb-4"
            style={{ padding: 14, borderRadius: 16, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}
          >
            <AlertTriangle size={16} color={colors.error} className="mt-0.5 shrink-0" />
            <p className="font-medium text-[11px]" style={{ color: colors.error }}>
              Balans ou ({walletBalanceHtg.toLocaleString('fr-FR')} HTG) pa ase. Ou bezwen {totalHtg.toLocaleString('fr-FR')} HTG pou kreye kat sa a.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl font-black italic uppercase text-[12px] tracking-[1.5px] py-4 active:scale-95 transition-all"
            style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary, opacity: loading ? 0.6 : 1 }}
          >
            Anile
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || insufficient}
            className="flex-1 rounded-2xl font-black italic uppercase text-[12px] tracking-[1.5px] py-4 flex items-center justify-center gap-2 active:scale-95 transition-all oz-glowPulse"
            style={{
              background: 'linear-gradient(135deg,#FF7A00,#FF6B00)',
              color: '#FFFFFF',
              opacity: loading || insufficient ? 0.5 : 1,
            }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={16} color="#FFFFFF" />
                Konfime
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
