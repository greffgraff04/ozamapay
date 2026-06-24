'use client';

import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UsePwaInstall {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isIOS: boolean;
  /** Chrome, Edge, Samsung Internet, Opera — support beforeinstallprompt but it may fire late */
  isChromiumBased: boolean;
  isStandalone: boolean;
  trigger: () => Promise<void>;
}

export function usePwaInstall(): UsePwaInstall {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isChromiumBased, setIsChromiumBased] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const ua = navigator.userAgent;

    // iOS Safari (no beforeinstallprompt support — uses share sheet)
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua));

    // Chromium-based browsers that DO support beforeinstallprompt
    // Exclude CriOS (Chrome for iOS) which runs on iOS WebKit and doesn't fire the event
    const chromium =
      (/chrome\//i.test(ua) || /edg\//i.test(ua) || /samsungbrowser/i.test(ua) || /opr\//i.test(ua)) &&
      !/crios/i.test(ua);
    setIsChromiumBased(chromium);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const trigger = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return { deferredPrompt, isIOS, isChromiumBased, isStandalone, trigger };
}
