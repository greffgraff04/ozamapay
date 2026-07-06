'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { COLORS } from '../lib/theme';

export default function TeamModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ maxWidth, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: `1px solid ${COLORS.border}` }}
            >
              <h3 className="text-sm font-bold uppercase italic tracking-wide" style={{ color: COLORS.textPrimary }}>
                {title}
              </h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} color={COLORS.textSecondary} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
