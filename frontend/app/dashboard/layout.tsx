"use client";

import React from 'react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import SupportChatWidget from '../../components/SupportChatWidget';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <SupportChatWidget />
    </ThemeProvider>
  );
}
