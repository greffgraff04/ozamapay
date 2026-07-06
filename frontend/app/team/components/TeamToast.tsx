'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { COLORS } from '../lib/theme';

export type ToastState = { msg: string; type: 'success' | 'error' } | null;

export function useTeamToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, showToast };
}

export default function TeamToast({ toast }: { toast: ToastState }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg"
          style={{
            background: COLORS.bg,
            border: `1px solid ${toast.type === 'success' ? COLORS.success : COLORS.error}`,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} color={COLORS.success} />
          ) : (
            <XCircle size={16} color={COLORS.error} />
          )}
          <span className="text-xs font-medium" style={{ color: COLORS.textPrimary }}>{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
