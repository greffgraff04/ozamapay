'use client';

import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

type ModalType = 'ios' | 'pending' | 'unsupported' | null;

export default function InstallButton({ className }: { className?: string }) {
  const { deferredPrompt, isIOS, isChromiumBased, isStandalone, trigger } = usePwaInstall();
  const [modal, setModal] = useState<ModalType>(null);

  if (isStandalone) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      // Best case: Chrome/Edge already fired beforeinstallprompt — use native dialog
      await trigger();
    } else if (isIOS) {
      setModal('ios');
    } else if (isChromiumBased) {
      // Event hasn't fired yet (engagement heuristic not met) — guide via browser menu
      setModal('pending');
    } else {
      // Firefox, in-app browsers, old browsers — genuinely no install support
      setModal('unsupported');
    }
  };

  // Match Watch Demo button exactly: same padding, font, height — only color differs
  const defaultClass =
    'group px-5 py-3 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 text-orange-400 whitespace-nowrap';

  return (
    <>
      <button onClick={handleClick} className={className ?? defaultClass}>
        <Download className="w-4 h-4" />
        <span>Telechaje App</span>
      </button>

      {modal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          style={{ zIndex: 10000 }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#161929] border border-white/10 p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="OZAMAPAY" className="w-10 h-10 rounded-xl" />
                <div>
                  <p className="text-white font-bold text-sm">OZAMAPAY</p>
                  <p className="text-white/40 text-xs">ozamapay.com</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* iOS instructions */}
            {modal === 'ios' && (
              <>
                <p className="text-white font-semibold">Enstale sou iPhone / iPad</p>
                <ol className="flex flex-col gap-3">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-white/70 text-sm leading-snug">
                      Tape <Share className="inline w-4 h-4 text-[#007AFF] mx-0.5 -mt-0.5" />{' '}
                      <span className="text-white font-medium">(Pataje)</span> anba ekran an
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                    <p className="text-white/70 text-sm leading-snug">
                      Chwazi <span className="text-white font-medium">&ldquo;Ajoute sur l&rsquo;écran d&rsquo;accueil&rdquo;</span>
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                    <p className="text-white/70 text-sm leading-snug">
                      Tape <span className="text-white font-medium">&ldquo;Ajouter&rdquo;</span> anwo adwat
                    </p>
                  </li>
                </ol>
              </>
            )}

            {/* Chrome/Edge — prompt not yet available, guide via browser menu */}
            {modal === 'pending' && (
              <>
                <p className="text-white font-semibold">Enstale via meni navigatè a</p>
                <p className="text-white/70 text-sm leading-snug">
                  Ou ka enstale app la nan meni navigatè a: klike sou{' '}
                  <span className="text-white font-medium">⋮ (3 pwen)</span> anwo adwat →{' '}
                  <span className="text-white font-medium">&ldquo;Installer l&rsquo;application&rdquo;</span>{' '}
                  oswa <span className="text-white font-medium">&ldquo;Add to Home screen&rdquo;</span>.
                </p>
                <p className="text-white/40 text-xs leading-snug">
                  Si ou pa wè opsyon sa a, eseye retounen sou paj la nan kèk minit epi klike ankò.
                </p>
              </>
            )}

            {/* Truly unsupported browser */}
            {modal === 'unsupported' && (
              <>
                <p className="text-white font-semibold">Navigatè pa sipòte enstale</p>
                <p className="text-white/70 text-sm leading-snug">
                  Ouvri sit la nan <span className="text-white font-medium">Chrome</span> oswa{' '}
                  <span className="text-white font-medium">Safari</span> pou enstale app la sou ekran ou a.
                </p>
              </>
            )}

            <button
              onClick={() => setModal(null)}
              className="mt-1 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
            >
              Fermé
            </button>
          </div>
        </div>
      )}
    </>
  );
}
