"use client";

import { Lock, PlusCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface ActivationGaugeProps {
  thresholdHtg: number;
  currentBalanceHtg: number;
  missingHtg: number;
  grossDepositEstimateHtg: number;
  onDepositClick: () => void;
}

export function ActivationGauge({
  thresholdHtg,
  currentBalanceHtg,
  missingHtg,
  grossDepositEstimateHtg,
  onDepositClick,
}: ActivationGaugeProps) {
  const { colors, glass } = useTheme();
  const progressPct = thresholdHtg > 0
    ? Math.min(100, Math.round((currentBalanceHtg / thresholdHtg) * 100))
    : 0;

  return (
    <div className="oz-glass-strong mb-4" style={{ borderRadius: 24, padding: 18 }}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,122,0,.12)' }}
        >
          <Lock size={18} color="#FF7A00" />
        </div>
        <div>
          <p className="font-bold italic uppercase text-[13px] tracking-[0.5px]" style={{ color: colors.textPrimary }}>
            Aktive Kont Ou
          </p>
          <p className="font-medium text-[11px]" style={{ color: glass.textDim }}>
            {currentBalanceHtg.toLocaleString('fr-FR')} / {thresholdHtg.toLocaleString('fr-FR')} HTG
          </p>
        </div>
      </div>

      <div
        className="w-full rounded-full overflow-hidden mb-3"
        style={{ height: 10, background: glass.inputBg }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg,#FF7A00,#FF6B00)',
            transition: 'width .3s ease',
          }}
        />
      </div>

      <p className="font-medium text-[12px] mb-4 leading-[18px]" style={{ color: '#FF7A00' }}>
        Ou bezwen {missingHtg.toLocaleString('fr-FR')} HTG anplis pou aktive kont ou — depoze
        omwen {grossDepositEstimateHtg.toLocaleString('fr-FR')} HTG (avan 6% frè depo a). Apre sa,
        w ap ka fè KYC, voye lajan, retire, ak kreye kat.
      </p>

      <button
        onClick={onDepositClick}
        className="w-full rounded-2xl font-black italic uppercase text-[12px] text-white tracking-[1.5px] py-4 flex items-center justify-center gap-2 active:scale-95 transition-all oz-glowPulse"
        style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
      >
        <PlusCircle size={16} color="#FFFFFF" />
        Depoze Kounye a
      </button>
    </div>
  );
}
