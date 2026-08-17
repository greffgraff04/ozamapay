"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from '../../contexts/ThemeContext';

const SupportChatWidget = dynamic(() => import('../../components/SupportChatWidget'), {
  ssr: false,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <SupportChatWidget />
    </ThemeProvider>
  );
}
