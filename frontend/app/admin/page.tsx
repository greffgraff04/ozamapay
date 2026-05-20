"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Activity, X, RefreshCw,
  UserX, UserCheck, CheckCircle2, XCircle, ChevronDown, LogOut,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [rateKey, setRateKey] = useState('USDT_BUY');
  const [rateValue, setRateValue] = useState('');
  const [token, setToken] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('token') || '');
    }
  }, []);

  let adminName = "Admin";
  let adminEmail = "admin@ozamapay.com";
  if (mounted && token) {
    try {
      const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      adminName = payload.name || payload.email?.split('@')[0] || "Admin";
      adminEmail = payload.email || "admin@ozamapay.com";
    } catch (e) {}
  }

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [statsRes, usersRes, kycRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard-stats`, { headers }),
        fetch(`${API_BASE}/admin/users`, { headers }),
        fetch(`${API_BASE}/user/pending-kyc`, { headers }),
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : {};
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const kycData = kycRes.ok ? await kycRes.json() : [];

      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPendingKyc(Array.isArray(kycData) ? kycData : []);

      const userList = Array.isArray(usersData) ? usersData : [];
      if (statsData.chartData && statsData.chartData.length > 0) {
        setChartData(statsData.chartData);
      } else {
        setChartData(userList.slice(0, 10).map((u: any) => ({
          name: u.name || u.email?.split('@')[0] || 'User',
          'Balans HTG': parseFloat(u.wallet?.balance || 0),
        })));
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (mounted && token) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted, token, fetchData]);

  const handleDirectTopup = async () => {
    if (!topupAmount || !selectedUser) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/topup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: parseFloat(topupAmount) })
      });
      if (res.ok) {
        showToast(`✅ ${topupAmount} HTG kredite ba ${selectedUser.name || selectedUser.email}`);
        setShowTopupModal(false);
        setTopupAmount('');
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.message || 'Erè topup', 'error');
      }
    } catch (e) {
      showToast('Koneksyon echwe', 'error');
    }
  };

  const handleKycReview = async (kycId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${API_BASE}/admin/kyc/${kycId}/review`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`KYC ${status === 'APPROVED' ? 'apwouve ✅' : 'rejte ❌'}`);
        setSelectedKyc(null);
        await fetchData();
      } else {
        showToast('Erè pandan review KYC', 'error');
      }
    } catch (e) {
      showToast('Koneksyon echwe', 'error');
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateValue) return;
    try {
      const res = await fetch(`${API_BASE}/rates/update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key: rateKey, value: parseFloat(rateValue) })
      });
      if (res.ok) {
        showToast(`✅ Rate ${rateKey} = ${rateValue} HTG mete ajou!`);
        setRateValue('');
      } else {
        showToast('Erè update rate', 'error');
      }
    } catch (e) {
      showToast('Koneksyon echwe', 'error');
    }
  };

  const handleToggleSuspend = async (userId: string, isSuspended: boolean) => {
    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: !isSuspended } : u));
      await fetch(`${API_BASE}/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isSuspended: !isSuspended })
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = 'token=; path=/; max-age=0';
    window.location.replace('/login');
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const approvedKyc = users.filter(u => u.kyc?.status === 'APPROVED').length;
  const totalBalance = users.reduce((sum, u) => sum + parseFloat(u.wallet?.balance || 0), 0);

  return (
    <div className="min-h-screen bg-[#F0F3FA] text-[#111] font-sans flex">

      {/* TOAST */}
      {toast && (
        <div style={{ backdropFilter: 'blur(20px)' }}
          className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl text-white text-xs font-black uppercase tracking-widest animate-in slide-in-from-top duration-300 ${toast.type === 'success' ? 'bg-[#111]/90' : 'bg-red-500/90'}`}>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col justify-between sticky top-0 h-screen z-20">
        <div>
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-8 h-8 bg-[#FF6B00] rounded-xl flex items-center justify-center text-white font-black italic text-base">O</div>
            <h1 className="text-xl font-extrabold tracking-tight">Ozama<span className="text-[#FF6B00]">Pay</span></h1>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
              { id: 'users', label: 'Itilizatè yo', icon: <Users size={18} /> },
              { id: 'kyc', label: 'KYC Review', count: pendingKyc.length, icon: <ShieldCheck size={18} /> },
              { id: 'rates', label: 'Taux & Frè', icon: <Activity size={18} /> },
            ].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3.5 w-full p-3.5 rounded-xl text-sm font-medium transition ${activeTab === item.id ? 'bg-[#FFF6F0] text-[#FF6B00]' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
                <div className={activeTab === item.id ? 'text-[#FF6B00]' : 'text-gray-400'}>{item.icon}</div>
                <span className="font-semibold">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`ml-auto font-bold text-[11px] px-2 py-0.5 rounded-full ${activeTab === item.id ? 'bg-[#FF6B00] text-white' : 'bg-red-100 text-red-600'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="relative">
          {showProfileMenu && (
            <div className="absolute bottom-16 left-0 w-full bg-white border border-gray-100 rounded-xl p-2 shadow-lg mb-2 z-30">
              <button onClick={handleLogout} className="flex items-center gap-2 w-full p-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
          <div onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="bg-[#111] text-white p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-black transition">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center font-bold text-sm uppercase">
                {adminName.slice(0, 2)}
              </div>
              <div className="truncate max-w-[110px]">
                <div className="font-bold text-xs truncate">{adminName}</div>
                <div className="text-[9px] text-gray-400 truncate">{adminEmail}</div>
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 space-y-10 overflow-y-auto">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold uppercase tracking-tight">{activeTab}</h2>
            <p className="text-xs text-gray-400 mt-1">OZAMAPAY Control Panel — Live</p>
          </div>
          <button onClick={fetchData} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-[#FF6B00] transition shadow-sm">
            <RefreshCw size={16} />
          </button>
        </header>

        {(!mounted || loading) ? (
          <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100">
            <RefreshCw className="w-8 h-8 text-[#FF6B00] animate-spin mb-3" />
            <span className="text-xs text-gray-400 tracking-wider uppercase font-bold">Ozama Sync...</span>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Itilizatè', value: totalUsers, suffix: '', color: 'text-[#111]' },
                    { label: 'KYC Approved', value: approvedKyc, suffix: '', color: 'text-green-600' },
                    { label: 'KYC Pending', value: pendingKyc.length, suffix: '', color: 'text-orange-500' },
                    { label: 'Total Balans Sistèm', value: totalBalance.toLocaleString('fr-FR'), suffix: ' HTG', color: 'text-[#FF6B00]' },
                  ].map((card, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-3xl p-6">
                      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">{card.label}</div>
                      <div className={`text-3xl font-extrabold ${card.color}`}>{card.value}{card.suffix}</div>
                    </div>
                  ))}
                </div>

                {stats.treasury && (
                  <div className="bg-[#111] text-white rounded-3xl p-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-4">MASTER WALLET — REVENUE OZAMAPAY</p>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-white/40 mb-1">Fees Akimile</p>
                        <p className="text-2xl font-black text-[#FF6B00]">{Number(stats.treasury.totalFeesGenerated || 0).toLocaleString()} HTG</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Total HTG Sistèm</p>
                        <p className="text-2xl font-black">{Number(stats.treasury.totalHTGInSystem || 0).toLocaleString()} HTG</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">USD Cards Balance</p>
                        <p className="text-2xl font-black text-green-400">${Number(stats.treasury.totalUSDCardsBalance || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-3xl p-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Aktivite 7 Dènye Jou yo</h3>
                  <div style={{ width: '100%', height: 280 }}>
                    {mounted && chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                          <XAxis dataKey="name" stroke="#A0A0B0" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#A0A0B0" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toLocaleString()} />
                          <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', color: 'white', borderRadius: '12px', fontSize: '11px' }} />
                          <Area type="monotone" dataKey="amount" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#grad)" isAnimationActive={false} />
                          <Area type="monotone" dataKey="Balans HTG" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#grad)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">5 Dènye Itilizatè yo</h3>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#FF6B00]/10 flex items-center justify-center font-bold text-[#FF6B00] text-sm uppercase">
                            {(u.name || u.email)?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-xs">{u.name || u.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-gray-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xs text-[#FF6B00]">{Number(u.wallet?.balance || 0).toLocaleString()} HTG</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.kyc?.status === 'APPROVED' ? 'bg-green-100 text-green-600' : u.kyc?.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                            {u.kyc?.status || 'NO KYC'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {filteredUsers.length} Itilizatè
                  </h3>
                  <input type="text" placeholder="Chache pa non oswa email..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-full py-2.5 px-5 text-sm w-72 outline-none focus:border-[#FF6B00] transition" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-gray-400 uppercase tracking-wider font-bold border-b border-gray-100 text-[10px]">
                        <th className="p-4">Itilizatè</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Balans</th>
                        <th className="p-4">KYC</th>
                        <th className="p-4">Wòl</th>
                        <th className="p-4 text-right">Aksyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#F0F3FA] flex items-center justify-center font-bold text-gray-600 uppercase text-sm">
                                {(u.name || u.email)?.[0]}
                              </div>
                              <span className="font-semibold text-black">{u.name || 'Anonim'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">{u.email}</td>
                          <td className="p-4 font-mono font-bold text-black">
                            {Number(u.wallet?.balance || 0).toLocaleString('fr-FR')} HTG
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${u.kyc?.status === 'APPROVED' ? 'bg-green-100 text-green-700' : u.kyc?.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : u.kyc?.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                              {u.kyc?.status || 'NO KYC'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase">
                              {u.role || 'USER'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setSelectedUser(u); setShowTopupModal(true); }}
                                className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-[#e05e00] transition">
                                Credit
                              </button>
                              <button onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                                className={`p-2 rounded-xl border transition ${u.isSuspended ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                                {u.isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* KYC */}
            {activeTab === 'kyc' && (
              <div className="space-y-6">
                {selectedKyc ? (
                  <div className="bg-white border border-gray-100 rounded-3xl p-8">
                    <button onClick={() => setSelectedKyc(null)} className="mb-6 text-[#FF6B00] text-xs font-bold uppercase flex items-center gap-2">
                      ← Retounen
                    </button>
                    <h3 className="text-lg font-extrabold mb-6">Revize KYC — {selectedKyc.firstName} {selectedKyc.lastName}</h3>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-3">
                        {[
                          { label: 'Non Konplè', value: `${selectedKyc.firstName} ${selectedKyc.lastName}` },
                          { label: 'Telefòn', value: selectedKyc.phoneNumber },
                          { label: 'Dat Nesans', value: selectedKyc.dateOfBirth ? new Date(selectedKyc.dateOfBirth).toLocaleDateString() : '—' },
                          { label: 'Tip Dokiman', value: selectedKyc.idType },
                          { label: 'Nimewo Dokiman', value: selectedKyc.idNumber },
                          { label: 'Adrès', value: `${selectedKyc.line1}, ${selectedKyc.city}, ${selectedKyc.state}` },
                          { label: 'Peyi', value: selectedKyc.country },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                            <span className="text-[10px] font-bold uppercase text-gray-400">{item.label}</span>
                            <span className="text-xs font-bold text-black">{item.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {selectedKyc.idImage && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Foto Pyès Idantite</p>
                            <img src={selectedKyc.idImage} alt="ID" className="w-full rounded-2xl border border-gray-100 object-cover max-h-48" />
                          </div>
                        )}
                        {selectedKyc.userPhoto && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Selfie / Foto Vizaj</p>
                            <img src={selectedKyc.userPhoto} alt="Selfie" className="w-full rounded-2xl border border-gray-100 object-cover max-h-48" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={() => handleKycReview(selectedKyc.id, 'APPROVED')}
                        className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Approve KYC
                      </button>
                      <button onClick={() => handleKycReview(selectedKyc.id, 'REJECTED')}
                        className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                        <XCircle size={16} /> Rejte KYC
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-3xl p-8">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">
                      {pendingKyc.length} KYC ap tann revizyon
                    </h3>
                    {pendingKyc.length === 0 ? (
                      <div className="text-center py-16">
                        <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-bold">Tout KYC yo revize — pa gen anyen ki an pant!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingKyc.map((kyc: any) => (
                          <div key={kyc.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#FF6B00]/30 transition cursor-pointer"
                            onClick={() => setSelectedKyc(kyc)}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 uppercase">
                                  {kyc.firstName?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{kyc.firstName} {kyc.lastName}</p>
                                  <p className="text-[10px] text-gray-400">{kyc.idType} — {kyc.idNumber}</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600">PENDING</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-4">{kyc.city}, {kyc.country} • {new Date(kyc.createdAt).toLocaleDateString()}</p>
                            <button className="w-full py-3 bg-[#FF6B00] text-white rounded-xl text-[10px] font-black uppercase">
                              Revize KYC →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RATES */}
            {activeTab === 'rates' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-3xl p-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Mete Taux yo Ajou Live</h3>
                  <form onSubmit={handleUpdateRate} className="space-y-4 max-w-md">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Chwazi Taux la</label>
                      <select value={rateKey} onChange={(e) => setRateKey(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold uppercase outline-none focus:border-[#FF6B00]">
                        <option value="USDT_BUY">USDT Buy Rate (HTG/USDT)</option>
                        <option value="USDT_SELL">USDT Sell Rate (HTG/USDT)</option>
                        <option value="USD_HTG">USD → HTG Rate</option>
                        <option value="CARD_RATE">Virtual Card Rate</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Nouvo Valè</label>
                      <input type="number" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)}
                        placeholder="Egz: 132.50"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:border-[#FF6B00]" />
                    </div>
                    <button type="submit" className="w-full bg-[#FF6B00] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider">
                      Mete Ajou Rate la
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6">Frè Sistèm yo (Fee Structure)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Depot (TopUp)', value: '6%' },
                      { label: 'Transfè P2P', value: '0.99%' },
                      { label: 'Retrè (Withdraw)', value: '2%' },
                    ].map((fee, i) => (
                      <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">{fee.label}</p>
                        <p className="text-2xl font-black text-[#FF6B00]">{fee.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL TOPUP */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 relative border border-gray-100 shadow-xl">
            <button onClick={() => setShowTopupModal(false)} className="absolute right-6 top-6 text-gray-400 hover:text-black">
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold mb-1">Direct Credit</h3>
            <p className="text-xs text-gray-400 mb-6">
              Kredite kont: <span className="text-[#FF6B00] font-bold">{selectedUser?.name || selectedUser?.email}</span>
            </p>
            <div className="space-y-4">
              <div className="relative">
                <input autoFocus type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-5 px-6 text-3xl font-extrabold outline-none border-2 border-transparent focus:border-[#FF6B00] transition"
                  placeholder="0" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-[#FF6B00] text-sm">HTG</span>
              </div>
              <button onClick={handleDirectTopup}
                className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-black text-xs uppercase tracking-wider">
                Konfime Depo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}