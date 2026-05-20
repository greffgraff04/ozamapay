'use client';
import { useState } from 'react';

export default function KycUploadPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    idNumber: '',
    // Foto yo sipoze voye kòm base64 oswa via yon S3 link apre upload
  });

  const handleSubmit = async () => {
    const res = await fetch('http://localhost:3001/kyc/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const result = await res.json();
    if(res.ok) alert("KYC Soumèt! N ap verifye l nan mwens ke 24h.");
    else alert(result.message);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Verifikasyon Idantite</h1>
      <p className="text-gray-500 mb-8">Egzije pa lalwa pou sekirite tranzaksyon ou yo.</p>

      <div className="space-y-6">
        <input 
          className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-black" 
          placeholder="Non Konplè" 
          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
        />
        <input 
          className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-black" 
          placeholder="Nimewo WhatsApp" 
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
        <input 
          className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-black" 
          placeholder="Adrès Kay" 
          onChange={(e) => setFormData({...formData, address: e.target.value})}
        />
        
        <div className="grid grid-cols-2 gap-4">
           <div className="border-2 border-dashed p-8 rounded-3xl text-center hover:bg-gray-50 cursor-pointer">
             <p className="text-xs font-bold text-gray-400">FOTO PYÈS (DEVAN)</p>
           </div>
           <div className="border-2 border-dashed p-8 rounded-3xl text-center hover:bg-gray-50 cursor-pointer">
             <p className="text-xs font-bold text-gray-400">SELFIE AK PYÈS LA</p>
           </div>
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full py-5 bg-black text-white rounded-3xl font-bold text-lg hover:opacity-90"
        >
          Peye $25 & Soumèt
        </button>
      </div>
    </div>
  );
}