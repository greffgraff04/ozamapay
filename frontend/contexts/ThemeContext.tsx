"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
  background: string;
  surface: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
}

export interface GlassTokens {
  bg: string;
  bgStrong: string;
  border: string;
  borderSubtle: string;
  inputBg: string;
  textDim: string;
  textDimmer: string;
  pageGradient: string;
  headerBg: string;
  sheetBg: string;
  sheetBgStrong: string;
  innerDark: string;
  shadowStrong: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  glass: GlassTokens;
  isDark: boolean;
  toggleTheme: () => void;
  mode: ThemeMode;
}

const DARK_COLORS: ThemeColors = {
  background:    '#0F121E',
  surface:       '#1A1E2E',
  accent:        '#FF7A00',
  textPrimary:   '#FFFFFF',
  textSecondary: '#9AA0B4',
  border:        '#262B3D',
  success:       '#22C55E',
  error:         '#EF4444',
};

const LIGHT_COLORS: ThemeColors = {
  background:    '#FFFFFF',
  surface:       '#F7F7F9',
  accent:        '#FF7A00',
  textPrimary:   '#0F121E',
  textSecondary: '#8E929B',
  border:        '#ECECEF',
  success:       '#16A34A',
  error:         '#DC2626',
};

const DARK_GLASS: GlassTokens = {
  bg:            'rgba(255,255,255,.05)',
  bgStrong:      'rgba(255,255,255,.07)',
  border:        'rgba(255,255,255,.1)',
  borderSubtle:  'rgba(255,255,255,.07)',
  inputBg:       'rgba(255,255,255,.05)',
  textDim:       'rgba(255,255,255,.5)',
  textDimmer:    'rgba(255,255,255,.45)',
  pageGradient:  'radial-gradient(130% 80% at 50% -10%, #1c1322 0%, #0a0c14 55%)',
  headerBg:      'rgba(10,12,20,.88)',
  sheetBg:       'rgba(14,16,26,.92)',
  sheetBgStrong: 'rgba(14,16,26,.94)',
  innerDark:     '#14161f',
  shadowStrong:  '0 24px 48px -24px rgba(0,0,0,.7)',
};

const LIGHT_GLASS: GlassTokens = {
  bg:            'rgba(15,18,30,.04)',
  bgStrong:      'rgba(15,18,30,.06)',
  border:        'rgba(15,18,30,.08)',
  borderSubtle:  'rgba(15,18,30,.06)',
  inputBg:       'rgba(15,18,30,.03)',
  textDim:       'rgba(15,18,30,.55)',
  textDimmer:    'rgba(15,18,30,.45)',
  pageGradient:  'radial-gradient(130% 80% at 50% -10%, #f3e9ff 0%, #f7f7fa 55%)',
  headerBg:      'rgba(255,255,255,.88)',
  sheetBg:       'rgba(255,255,255,.92)',
  sheetBgStrong: 'rgba(255,255,255,.94)',
  innerDark:     '#ffffff',
  shadowStrong:  '0 24px 48px -24px rgba(0,0,0,.12)',
};

const ThemeContext = createContext<ThemeContextValue>({
  colors:      DARK_COLORS,
  glass:       DARK_GLASS,
  isDark:      true,
  toggleTheme: () => {},
  mode:        'dark',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('ozamapay-dashboard-theme') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      setMode(saved);
    }
  }, []);

  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ozamapay-dashboard-theme', next);
      return next;
    });
  };

  const isDark = mode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const glass  = isDark ? DARK_GLASS  : LIGHT_GLASS;

  const cssVars: React.CSSProperties = {
    '--oz-bg':           colors.background,
    '--oz-surface':      colors.surface,
    '--oz-accent':       colors.accent,
    '--oz-text':         colors.textPrimary,
    '--oz-text-sec':     colors.textSecondary,
    '--oz-border':       colors.border,
    '--oz-success':      colors.success,
    '--oz-error':        colors.error,
    '--oz-glass-bg':     glass.bg,
    '--oz-glass-bg-str': glass.bgStrong,
    '--oz-glass-border': glass.border,
    '--oz-glass-shadow': glass.shadowStrong,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={{ colors, glass, isDark, toggleTheme, mode }}>
      <div style={{ ...cssVars, backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', transition: 'background-color 0.2s, color 0.2s' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
