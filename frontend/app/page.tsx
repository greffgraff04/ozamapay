'use client';
import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    const user = localStorage.getItem('user');
    // Si li deja konekte, voye l sou dashboard. Sinon, voye l login.
    if (user) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <h1 className="font-black italic text-2xl animate-pulse">OZAMA PAY...</h1>
    </div>
  );
}