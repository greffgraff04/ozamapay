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
      {/* Temporarily disabled: close-button reopen bug being fixed — re-enable once verified. */}
      {/* <SupportChatWidget /> */}
    </ThemeProvider>
  );
}
