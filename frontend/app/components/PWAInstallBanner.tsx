'use client';

import { useEffect, useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallBanner() {
  const { deferredPrompt, isIOS, isStandalone, trigger } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  // Read localStorage only on client to avoid hydration mismatch
  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISSED_KEY));
    setReady(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    await trigger();
    setDismissed(true);
  };

  const visible = ready && !dismissed && !isStandalone && (isIOS || !!deferredPrompt);

  if (!visible) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 rounded-2xl border border-white/10 bg-[#161929] shadow-2xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="OZAMAPAY" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">OZAMAPAY</p>
            <p className="text-white/50 text-xs">ozamapay.com</p>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Ferme" className="text-white/40 hover:text-white/70 text-lg leading-none mt-0.5">✕</button>
      </div>

      {isIOS ? (
        <p className="text-white/70 text-sm leading-snug">
          Pou enstale: tape <span className="text-white font-medium">⬆️ (Pataje)</span> → <span className="text-white font-medium">&ldquo;Ajoute sou Ekran Akèy&rdquo;</span>
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-white/70 text-sm leading-snug">Enstale OZAMAPAY sou ekran ou a</p>
          <button
            onClick={install}
            className="shrink-0 bg-[#FF7A00] hover:bg-[#e56e00] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Enstale
          </button>
        </div>
      )}
    </div>
  );
}
