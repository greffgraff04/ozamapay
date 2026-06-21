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

interface ThemeContextValue {
  colors: ThemeColors;
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

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_COLORS,
  isDark: false,
  toggleTheme: () => {},
  mode: 'light',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const saved = localStorage.getItem('ozama-theme') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      setMode(saved);
    }
  }, []);

  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ozama-theme', next);
      return next;
    });
  };

  const isDark = mode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const cssVars: React.CSSProperties = {
    '--oz-bg':       colors.background,
    '--oz-surface':  colors.surface,
    '--oz-accent':   colors.accent,
    '--oz-text':     colors.textPrimary,
    '--oz-text-sec': colors.textSecondary,
    '--oz-border':   colors.border,
    '--oz-success':  colors.success,
    '--oz-error':    colors.error,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, mode }}>
      <div style={cssVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
