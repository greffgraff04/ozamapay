'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, []);

  return (
    <div style={{ background: '#0A0B0F', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B00', fontFamily: 'Arial' }}>
      Koneksyon Google ap trete...
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ background: '#0A0B0F', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B00', fontFamily: 'Arial' }}>
        Koneksyon Google ap trete...
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
