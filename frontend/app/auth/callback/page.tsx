'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    console.log('Auth callback - token received:', token ? 'yes' : 'no');
    if (token) {
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=604800`;
      router.replace('/dashboard');
    } else {
      router.replace('/login?error=no_token');
    }
  }, [params, router]);

  return (
    <div style={{background:'#0A0B0F',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#FF6B00',fontFamily:'Arial',gap:'16px'}}>
      <div style={{fontSize:'32px'}}>⚡</div>
      <div style={{fontSize:'18px',fontWeight:'bold'}}>OZAMAPAY</div>
      <div style={{fontSize:'14px',color:'#666'}}>Koneksyon Google ap trete...</div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{background:'#0A0B0F',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#FF6B00',fontFamily:'Arial'}}>
        Chajman...
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
