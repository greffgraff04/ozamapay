'use client';
import { useState } from 'react';

export default function KycUploadPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    idType: 'PASSPORT',
    idNumber: '',
  });
  const [loading, setLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  const handleSubmit = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${backendUrl}/kyc/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idType: formData.idType,
          idNumber: formData.idNumber,
          additionalData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            address: formData.address
          }
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("KYC Soumèt ak siksè! 3,375 HTG debite. N ap verifye l rapid vit. 🚀");
        window.location.href = '/dashboard';
      } else {
        alert(result.message || "Erè pandan soumisyon an.");
      }
    } catch (err) {
      alert("Erè rezo! Verifye si sèvè a ap kouri byen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white text-black rounded-[2.5rem] my-6 shadow-xl">
      <h1 className="text-3xl font-black italic uppercase tracking-tight mb-2 text-[#0F121E]">Verifikasyon Idantite</h1>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-8">Egzije pa lalwa pou sekirite tranzaksyon ou yo.</p>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <input 
            className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold" 
            placeholder="Premye Non" 
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
          <input 
            className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold" 
            placeholder="Siyati" 
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
        </div>

        <input 
          className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold" 
          placeholder="Nimewo Telefòn / WhatsApp" 
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
        <input 
          className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold" 
          placeholder="Adrès Kay Konplè" 
          onChange={(e) => setFormData({...formData, address: e.target.value})}
        />

        <div className="grid grid-cols-2 gap-4">
          <select 
            className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold"
            onChange={(e) => setFormData({...formData, idType: e.target.value})}
          >
            <option value="NIF">NIF</option>
            <option value="CIN">CIN</option>
            <option value="PASSPORT">Paspò</option>
          </select>
          <input 
            className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl outline-none focus:border-[#FF7A00] text-xs font-bold" 
            placeholder="Nimewo Dokiman" 
            onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-gray-200 p-8 rounded-3xl text-center hover:bg-gray-50 cursor-pointer transition-all">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FOTO PYÈS (DEVAN)</p>
          </div>
          <div className="border-2 border-dashed border-gray-200 p-8 rounded-3xl text-center hover:bg-gray-50 cursor-pointer transition-all">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SELFIE AK PYÈS LA</p>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-5 bg-[#0F121E] text-white rounded-3xl font-black uppercase italic tracking-widest text-xs hover:bg-[#FF7A00] transition-all flex items-center justify-center shadow-lg"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : "Peye $25 & Soumèt"}
        </button>
      </div>
    </div>
  );
}