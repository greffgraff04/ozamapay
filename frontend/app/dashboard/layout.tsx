"use client";

import React from 'react';
import { ThemeProvider } from '../../contexts/ThemeContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
