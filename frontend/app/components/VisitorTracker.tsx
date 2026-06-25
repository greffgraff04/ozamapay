'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
const SESSION_KEY = 'ozamapay-session-id';
const HEARTBEAT_MS = 15_000;

type VisitorStatus = 'BROWSING' | 'SIGNING_UP' | 'LOGGING_IN' | 'AUTHENTICATED';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getStatus(pathname: string): VisitorStatus {
  if (localStorage.getItem('token')) return 'AUTHENTICATED';
  if (pathname.startsWith('/register')) return 'SIGNING_UP';
  if (pathname.startsWith('/login')) return 'LOGGING_IN';
  return 'BROWSING';
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = () => {
      try {
        const sessionId = getSessionId();
        const status = getStatus(pathname);
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        fetch(`${BACKEND_URL}/tracking/ping`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId, page: pathname, status }),
        }).catch(() => {});
      } catch {
        // never surface tracking errors
      }
    };

    ping();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(ping, HEARTBEAT_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  return null;
}
