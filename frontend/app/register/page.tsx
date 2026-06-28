'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    window.location.replace('/login?mode=signup' + (ref ? `&ref=${encodeURIComponent(ref)}` : ''));
  }, []);

  return null;
}
