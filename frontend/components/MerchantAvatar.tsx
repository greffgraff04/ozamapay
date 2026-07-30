"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { parseMerchant } from "@/lib/merchant";

export function MerchantAvatar({
  merchant,
  narrative,
  isDark,
  size = 44,
}: {
  merchant?: string | null;
  narrative?: string | null;
  isDark: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const { domain } = parseMerchant(merchant, narrative);

  if (!domain || failed) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center shrink-0"
        style={{ width: size, height: size, backgroundColor: isDark ? 'rgba(255,122,0,0.15)' : '#FFF7ED' }}
      >
        <CreditCard size={Math.round(size * 0.45)} className="text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={merchant || 'Machann'}
      className="rounded-2xl object-cover shrink-0 bg-white"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
