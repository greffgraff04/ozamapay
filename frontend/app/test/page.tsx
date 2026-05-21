'use client';

import { useState } from 'react';
import { authService } from '../../lib/auth-service';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Imèl dinamik pou tès yo ka pase chak fwa san bloke nan baz de done a
  const testEmail = `agent.${Math.floor(Math.random() * 10000)}@ozamapay.com`;

  const runTest = async (testName: string, actionFn: () => Promise<any>) => {
    setLoading(true);
    setResult({ status: '⏳ Kouri tès...' });
    try {
      const data = await actionFn();
      setResult({ test: testName, success: true, response: data });
    } catch (err: any) {
      setResult({
        test: testName,
        success: false,
        error: err.response?.data || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#0A1128', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#FF6B35' }}>🛡️ OZAMA PAY - Bwat Tès API</h1>
      <p style={{ color: '#94A3B8' }}>Klike sou bouton yo nan lòd pou nou verifye si frontend la ap kominike byen ak Render:</p>
      
      <div style={{ display: 'flex', gap: '12px', margin: '24px 0', flexWrap: 'wrap' }}>
        <button 
          onClick={() => runTest('Health Check', () => authService.healthCheck())}
          style={{ padding: '12px 24px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          1. Health Check 🟢
        </button>

        <button 
          onClick={() => runTest('Register Agent', () => authService.register({
            email: testEmail,
            password: 'SecurePassword123!',
            firstName: 'Ralph',
            lastName: 'Greffin',
            phone: '+50933334444'
          }))}
          style={{ padding: '12px 24px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          2. Test Register 📝
        </button>

        <button 
          onClick={() => runTest('Login User', () => authService.login({
            email: testEmail,
            password: 'SecurePassword123!'
          }))}
          style={{ padding: '12px 24px', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          3. Test Login 🔑
        </button>

        <button 
          onClick={() => runTest('Get Profile (/me)', () => authService.getMe())}
          style={{ padding: '12px 24px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          4. Test Get Me 👤
        </button>
      </div>

      <hr style={{ border: '0.5px solid #1E293B', margin: '30px 0' }} />

      <h3>Rezilta Tès la: {loading && '⏳'}</h3>
      <pre style={{ background: '#111827', padding: '20px', borderRadius: '8px', overflowX: 'auto', border: '1px solid #1E293B', color: '#38BDF8', fontSize: '14px' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}