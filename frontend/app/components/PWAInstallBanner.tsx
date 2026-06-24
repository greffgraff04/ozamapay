'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallBanner() {
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Already installed (running in standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setAndroidPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!androidPrompt) return;
    await androidPrompt.prompt();
    const { outcome } = await androidPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

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

      {showIOS ? (
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
