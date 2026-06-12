"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Activity, X, RefreshCw,
  UserX, UserCheck, CheckCircle2, XCircle, ChevronDown, LogOut,
  TrendingUp, DollarSign, Search, Filter, ArrowUpRight, Zap, Clock,
  Briefcase, Award, ShieldAlert, Sliders, ToggleLeft, ToggleRight, UserPlus, UserMinus, Banknote, FileText, Mail,
  Users2, KeyRound, RotateCcw, Send, AlertTriangle
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null); 
  const [topupAmount, setTopupAmount] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [rateKey, setRateKey] = useState('USDT_BUY');
  const [rateValue, setRateValue] = useState('');
  const [token, setToken] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAgentTopup, setIsAgentTopup] = useState(false);

  const [liquidityRequests, setLiquidityRequests] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [financeRequests, setFinanceRequests] = useState<any[]>([]);
  const [financeRejectNote, setFinanceRejectNote] = useState<Record<string, string>>({});
  const [kycReminderLoading, setKycReminderLoading] = useState(false);

  // Invitation & daily code state
  const [invitations, setInvitations] = useState<any[]>([]);
  const [dailyCode, setDailyCode] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPER_ADMIN');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [roleStats, setRoleStats] = useState<any>(null);

  // Jesyon Ajan ak Packages
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentPackage, setAgentPackage] = useState('STANDARD_AGENT');
  const [agentCommission, setAgentCommission] = useState('');
  const [agentMaxLimit, setAgentMaxLimit] = useState('');

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('token') || '';
      setToken(raw);
      // Parse isMaster here — never call setState during render
      if (raw && raw.includes('.')) {
        try {
          const b64 = raw.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
          if (b64) {
            const payload = JSON.parse(decodeURIComponent(
              window.atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            ));
            if (payload.isMaster) setIsMaster(true);
            if (payload.role) setUserRole(payload.role);
          }
        } catch {}
      }
    }
  }, []);

  let adminName = "Admin";
  let adminEmail = "admin@ozamapay.com";
  if (mounted && token && token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts[1]) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        adminName = payload.name || payload.email?.split('@')[0] || "Admin";
        adminEmail = payload.email || "admin@ozamapay.com";
      }
    } catch (e) {
      console.error("Token parsing failed safely:", e);
    }
  }

  const H = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statsRes, usersRes, agentsRes, liqRes, pendingTxRes, financeRes, invitationsRes, dailyCodeRes, sessionsRes, activityLogsRes] = await Promise.all([
        fetch(`${API}/admin/dashboard-stats`, { headers: H() }).catch(err => ({ ok: false, json: () => Promise.resolve({}) })),
        fetch(`${API}/admin/users`, { headers: H() }).catch(err => ({ ok: false, json: () => Promise.resolve([]) })),
        fetch(`${API}/admin/agents`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/liquidity-requests`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/transactions/pending`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/finance-requests`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/invitations`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/daily-code`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/sessions`, { headers: H() }).catch(() => null),
        fetch(`${API}/admin/activity-logs`, { headers: H() }).catch(() => null),
      ]);

      const statsData = statsRes && statsRes.ok ? await statsRes.json() : {};
      if (usersRes && !usersRes.ok) console.warn('GET /admin/users failed:', (usersRes as Response).status);
      const usersData = usersRes && usersRes.ok ? await usersRes.json() : [];
      const agentsBackendData = agentsRes && agentsRes.ok ? await agentsRes.json() : [];
      const liqData = liqRes && liqRes.ok ? await liqRes.json() : [];
      setLiquidityRequests(Array.isArray(liqData) ? liqData : []);
      const pendingTxData = pendingTxRes && pendingTxRes.ok ? await pendingTxRes.json() : [];
      setPendingTransactions(Array.isArray(pendingTxData) ? pendingTxData : []);
      const financeData = financeRes && financeRes.ok ? await financeRes.json() : [];
      setFinanceRequests(Array.isArray(financeData) ? financeData : []);

      if (invitationsRes && invitationsRes.ok) {
        const invData = await invitationsRes.json();
        setInvitations(Array.isArray(invData) ? invData : []);
      }
      if (dailyCodeRes && dailyCodeRes.ok) {
        const codeData = await dailyCodeRes.json();
        setDailyCode(codeData || null);
      }
      if (sessionsRes && sessionsRes.ok) {
        const sessData = await sessionsRes.json();
        setSessions(Array.isArray(sessData) ? sessData : []);
      }
      if (activityLogsRes && activityLogsRes.ok) {
        const logsData = await activityLogsRes.json();
        setActivityLogs(Array.isArray(logsData) ? logsData : []);
      }

      setStats(statsData || {});
      const userList = Array.isArray(usersData) ? usersData : [];
      setUsers(userList);

      const normalizedAgents = (Array.isArray(agentsBackendData) ? agentsBackendData : []).map((agent: any) => ({
        id: agent.id,
        userId: agent.userId,
        name: agent.user?.name || agent.businessName || 'Unnamed Agent',
        email: agent.user?.email || '',
        agentStatus: agent.status || 'PENDING',
        agentPackage: agent.level || 'BRONZE',
        customCommission: Number(agent.commissionRate || 0),
        maxLimit: Number(agent.dailyLimit || 0),
        trustScore: Number(agent.trustScore || 0),
        totalCommission: Number(agent.totalCommission || 0),
        totalTopupVolume: Number(agent.totalTopupVolume || 0),
        totalWithdrawalVolume: Number(agent.totalWithdrawalVolume || 0),
        totalKyc: Number(agent.totalKyc || 0),
        wallet: {
          balance: Number(agent.wallet?.balance || agent.user?.wallet?.balance || 0)
        },
        raw: agent
      }));
      setAgents(normalizedAgents);

      const pending = userList.filter((u: any) => u && u.kyc?.status === 'PENDING' && u.kyc?.id);
      setPendingKyc(pending.map((u: any) => ({ ...u.kyc, userEmail: u.email, userName: u.name, userId: u.id })));

      if (statsData && statsData.chartData?.length > 0) {
        setChartData(statsData.chartData);
      } else {
        const fallbacks = userList.slice(0, 8).map((u: any) => ({
          name: String(u?.name || u?.email?.split('@')[0] || 'User').substring(0, 8),
          amount: u?.wallet?.balance ? parseFloat(u.wallet.balance) : 0,
        }));
        setChartData(fallbacks);
      }
    } catch (e) {
      console.error("Fetch execution error caught safely:", e);
    } finally {
      setLoading(false);
    }
  }, [token, H]);

  useEffect(() => {
    if (mounted && token) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted, token, fetchData]);

  useEffect(() => {
    if (!mounted || !token || !userRole || isMaster) return;
    const endpointMap: Record<string, string> = {
      SUPER_ADMIN: `${API}/admin/stats/coo`,
      AGENT: `${API}/admin/stats/agent`,
      SUPPORT: `${API}/admin/stats/support`,
    };
    const url = endpointMap[userRole];
    if (!url) return;
    const load = () =>
      fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setRoleStats(data); })
        .catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [mounted, token, userRole, isMaster]);

  const handleDirectTopup = async () => {
    if (!topupAmount || !selectedUser) return;
    try {
      const endpoint = isAgentTopup
        ? `${API}/admin/agents/${selectedUser.id}/topup`
        : `${API}/admin/users/${selectedUser.id}/topup`;

      const res = await fetch(endpoint, {
        method: 'POST', headers: H(),
        body: JSON.stringify({ amount: parseFloat(topupAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${topupAmount} HTG kredite bay ${selectedUser.name || selectedUser.email}`);
        setShowTopupModal(false); setTopupAmount(''); setIsAgentTopup(false); await fetchData();
      } else { showToast(data.message || 'Erè topup', 'error'); }
    } catch (e) { showToast('Koneksyon echwe', 'error'); }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (!userId) {
      showToast('ID Itilizatè a envalid', 'error');
      return;
    }
    const newRole = currentRole === 'AGENT' ? 'USER' : 'AGENT';
    try {
      const res = await fetch(`${API}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: H(),
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast(`Wòl mete ajou sou ${newRole} avèk siksè !`);
        await fetchData();
      } else {
        showToast('Erè nan chanjman wòl la', 'error');
      }
    } catch (e) {
      showToast('Koneksyon ak backend lan echwe', 'error');
    }
  };

  // ================================================================
  // KORIJE: VALIDE KOCK / REVIEW POU CHANJE STATUT AN NAN PRISMA
  // ================================================================
  const handleApproveAgent = async (agentObj: any) => {
    try {
      // Nou rale KYC ID ki anndan objè ajan an depi nan relasyon NestJS la
      const kycId = agentObj.raw?.user?.kyc?.id;

      if (!kycId) {
        showToast('Ajan sa a pa gen okenn dokiman KYC ki an pant', 'error');
        return;
      }

      // Nou deklanche wout lejitim NestJS la ki se PATCH /admin/kyc/:id/review
      const res = await fetch(`${API}/admin/kyc/${kycId}/review`, {
        method: 'PATCH', 
        headers: H(),
        body: JSON.stringify({ status: 'APPROVED' })
      });

      if (res.ok) {
        showToast(`✅ Ajan ak KYC apwouve nèt nan Prisma Studio!`);
        await fetchData();
      } else { 
        showToast('Erè nan transmisyon estati a bay baz de done a', 'error'); 
      }
    } catch (e) { 
      showToast('Koneksyon echwe', 'error'); 
    }
  };

  const handleUpdateAgentPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    try {
      const res = await fetch(`${API}/admin/agents/${selectedAgent.id}/package`, {
        method: 'PATCH', headers: H(),
        body: JSON.stringify({
          packageType: agentPackage,
          customCommission: agentCommission ? parseFloat(agentCommission) : undefined,
          maxLimit: agentMaxLimit ? parseFloat(agentMaxLimit) : undefined
        })
      });
      if (res.ok) {
        showToast(`⚙️ Konfigirasyon Ajan ${selectedAgent.name || selectedAgent.email} mete ajou!`);
        setSelectedAgent(null);
        setAgentCommission('');
        setAgentMaxLimit('');
        await fetchData();
      } else { showToast('Erè nan aktyalizasyon ajan an', 'error'); }
    } catch (e) { showToast('Koneksyon ak backend lan echwe', 'error'); }
  };

  const handleKycReview = async (kycId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${API}/admin/kyc/${kycId}/review`, {
        method: 'PATCH', headers: H(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`KYC ${status === 'APPROVED' ? 'Apwouve ✅' : 'Rejte ❌'}`);
        setSelectedKyc(null); await fetchData();
      } else { showToast('Erè KYC review', 'error'); }
    } catch (e) { showToast('Koneksyon echwe', 'error'); }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateValue) return;
    try {
      const res = await fetch(`${API}/rates/update`, {
        method: 'POST', headers: H(),
        body: JSON.stringify({ key: rateKey, value: parseFloat(rateValue) })
      });
      if (res.ok) { showToast(`✅ ${rateKey} = ${rateValue} HTG`); setRateValue(''); }
      else { showToast('Erè update rate', 'error'); }
    } catch (e) { showToast('Koneksyon echwe', 'error'); }
  };

  const handleSendKycReminder = async () => {
    setKycReminderLoading(true);
    try {
      const res = await fetch(`${API}/admin/send-kyc-reminder`, { method: 'POST', headers: H() });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.sent} email rappèl KYC voye avèk siksè`);
      } else {
        showToast(data.message || 'Erè envwa rappèl', 'error');
      }
    } catch {
      showToast('Koneksyon echwe', 'error');
    } finally {
      setKycReminderLoading(false);
    }
  };

  const handleToggleSuspend = async (userId: string, isSuspended: boolean) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended: !isSuspended } : u));
    try {
      await fetch(`${API}/admin/users/${userId}/suspend`, {
        method: 'PATCH', headers: H(),
        body: JSON.stringify({ isSuspended: !isSuspended })
      });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const res = await fetch(`${API}/admin/invite`, {
        method: 'POST', headers: H(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Invitation envoyée à ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('SUPPORT');
        await fetchData();
      } else {
        showToast(data.message || 'Erreur lors de l\'invitation', 'error');
      }
    } catch {
      showToast('Connexion échouée', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await fetch(`${API}/admin/generate-code`, { method: 'POST', headers: H() });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Nouveau code généré: ${data.code}`);
        await fetchData();
      } else {
        showToast(data.message || 'Erreur', 'error');
      }
    } catch {
      showToast('Connexion échouée', 'error');
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `Expire dans ${h}h ${m}min`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/admin/logout`, { method: 'POST', headers: H() });
    } catch {}
    localStorage.clear();
    document.cookie = 'token=; path=/; max-age=0';
    window.location.replace('/');
  };

  const filteredUsers = users.filter(u =>
    u && (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAgents = agents.filter(a =>
    a && (a.name?.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
  );

  const totalUsers = users.length;
  const approvedKyc = users.filter(u => u?.kyc?.status === 'APPROVED').length;
  const totalBalance = users.reduce((sum, u) => sum + parseFloat(u?.wallet?.balance || 0), 0);
  const totalFeesGenerated = stats?.treasury?.totalFeesGenerated || 0;

  const pendingLiquidityCount = liquidityRequests.filter(r => r.status === 'PENDING').length;

  const pendingFinanceCount = financeRequests.filter(r => r.status === 'PENDING').length;

  const isReadOnly = userRole === 'SUPPORT' && !isMaster;

  const allNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['ADMIN', 'SUPER_ADMIN', 'AGENT', 'SUPPORT'] },
    { id: 'users', label: 'Itilizatè (Users)', icon: Users, roles: ['ADMIN', 'SUPPORT'] },
    { id: 'agents', label: 'Ajan & Packages', icon: Briefcase, badge: agents.length, roles: ['ADMIN', 'AGENT'] },
    { id: 'kyc', label: 'KYC Review', icon: ShieldCheck, badge: pendingKyc.length, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'liquidity', label: 'Retrè Likidite', icon: Banknote, badge: pendingLiquidityCount || undefined, roles: ['ADMIN', 'AGENT'] },
    { id: 'transactions', label: 'Topup & Retrè Manuel', icon: FileText, badge: pendingTransactions.length || undefined, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'finance', label: 'Finance / Exchange', icon: TrendingUp, badge: pendingFinanceCount || undefined, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'rates', label: 'Taux & Frè', icon: Activity, roles: ['ADMIN'] },
    { id: 'equipe', label: 'Équipe', icon: Users2, roles: [] },
  ];

  const navItems = isMaster
    ? allNavItems.map(({ roles: _r, ...item }) => item)
    : allNavItems
        .filter(item => item.id !== 'equipe' && (userRole ? item.roles.includes(userRole) : true))
        .map(({ roles: _r, ...item }) => item);

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white font-black italic uppercase tracking-widest text-xs">OZAMAPAY HQ</p>
        <p className="text-white/20 text-[10px] uppercase font-mono tracking-wider mt-1">Koneksyon sekirize...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white font-sans flex overflow-hidden selection:bg-[#FF6B00]/30">

      {/* TOAST PREMIUM */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-3 bg-[#0D0E14] border ${toast.type === 'success' ? 'border-[#FF6B00]/30' : 'border-red-500/20'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-[#FF6B00]' : 'bg-red-500'} animate-pulse`}></div>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#0D0E14] border-r border-white/[0.03] flex flex-col h-screen sticky top-0 z-20`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/[0.03]">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B00] to-[#E05E00] rounded-xl flex items-center justify-center font-black italic text-white text-base shrink-0 shadow-lg shadow-[#FF6B00]/10">O</div>
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase">Ozama<span className="text-[#FF6B00]">Pay</span></h1>
              <p className="text-[8px] text-white/30 uppercase tracking-widest font-mono font-bold">HQ Command</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-150 relative group ${activeTab === item.id ? 'bg-[#FF6B00]/5 text-[#FF6B00] font-bold' : 'text-white/40 hover:text-white/90 hover:bg-white/[0.02]'}`}>
              <item.icon size={16} className={`shrink-0 transition-transform duration-150 ${activeTab === item.id ? 'text-[#FF6B00]' : 'text-white/30 group-hover:text-white/60'}`} />
              {sidebarOpen && (
                <>
                  <span className="text-xs font-bold tracking-wide uppercase">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto bg-[#FF6B00] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {activeTab === item.id && <div className="absolute right-0 top-3 bottom-3 w-0.5 bg-[#FF6B00] rounded-l-full"></div>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 pb-4">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full animate-pulse"></div>
              <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider">Node: Online • Port 10000</span>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/[0.03] relative">
          {showProfileMenu && (
            <div className="absolute bottom-20 left-4 right-4 bg-[#0D0E14] border border-white/[0.05] rounded-xl p-1 shadow-2xl z-30">
              <button onClick={handleLogout} className="flex items-center gap-2 w-full p-2.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/5 rounded-lg transition">
                <LogOut size={12} /> {sidebarOpen && 'Dekonekte Session'}
              </button>
            </div>
          )}
          <div onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer transition">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#E05E00] flex items-center justify-center font-black text-xs uppercase shrink-0 shadow-md">
              {adminName.slice(0, 2)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 truncate">
                <p className="font-bold text-xs truncate text-white/80">{adminName}</p>
                <p className="text-[9px] font-mono text-white/30 truncate">{adminEmail}</p>
              </div>
            )}
            {sidebarOpen && <ChevronDown size={12} className="text-white/20 shrink-0" />}
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-[#0A0B0F]/80 backdrop-blur-md border-b border-white/[0.03] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-white">
              <Filter size={14} />
            </button>
            <div>
              <h2 className="font-black uppercase text-xs tracking-widest text-white/80">
                {navItems.find(n => n.id === activeTab)?.label || activeTab}
              </h2>
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">Sistèm Santral / Kontwòl</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition text-white/40 hover:text-[#FF6B00]">
              <RefreshCw size={13} />
            </button>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-1.5">
              <div className="w-1 h-1 bg-[#FF6B00] rounded-full animate-pulse"></div>
              <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider">Sync Live</span>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">

          {/* ==================== TAB: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {(() => {
                type StatCard = { label: string; value: string | number; suffix: string; icon: any; color: string; iconColor: string; badge?: string };
                const renderCards = (cards: StatCard[], cols = 'grid-cols-2 lg:grid-cols-4') => (
                  <div className={`grid ${cols} gap-4`}>
                    {cards.map((card, i) => (
                      <div key={i} className={`bg-gradient-to-br ${card.color} border border-white/[0.04] rounded-2xl p-6 relative overflow-hidden`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] ${card.iconColor}`}>
                            <card.icon size={16} />
                          </div>
                          {card.badge && (
                            <span className="text-[9px] font-mono font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <ArrowUpRight size={10} /> {card.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-xl font-black text-white tracking-tight italic">
                          {card.value}<span className="text-xs text-white/40 font-normal tracking-normal not-italic">{card.suffix}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                );

                if (isMaster) {
                  return renderCards([
                    { label: 'Total Itilizatè', value: totalUsers, suffix: '', icon: Users, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60', badge: '+12%' },
                    { label: 'Total Ajan (Nodes)', value: agents.length, suffix: '', icon: Briefcase, color: 'from-white/[0.02] to-transparent', iconColor: 'text-[#FF6B00]', badge: 'Active' },
                    { label: 'Revenue (Frè)', value: Number(totalFeesGenerated).toLocaleString('fr-FR'), suffix: ' HTG', icon: TrendingUp, color: 'from-[#FF6B00]/5 to-transparent border-[#FF6B00]/10', iconColor: 'text-[#FF6B00]', badge: '+23%' },
                    { label: 'KYC Pending', value: pendingKyc.length, suffix: '', icon: Clock, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                  ]);
                }

                if (userRole === 'SUPER_ADMIN') {
                  const s = roleStats;
                  return renderCards([
                    { label: 'Total Itilizatè', value: s?.totalUsers ?? '—', suffix: '', icon: Users, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'KYC Pending', value: s?.kycPending ?? '—', suffix: '', icon: Clock, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'Tranzaksyon Jodi a', value: s?.totalTransactionsToday ?? '—', suffix: '', icon: Activity, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'Revni Jodi a', value: s?.revenueToday != null ? Number(s.revenueToday).toLocaleString('fr-FR') : '—', suffix: s?.revenueToday != null ? ' HTG' : '', icon: TrendingUp, color: 'from-[#FF6B00]/5 to-transparent border-[#FF6B00]/10', iconColor: 'text-[#FF6B00]' },
                    { label: 'Topup an Atant', value: s?.pendingTopups ?? '—', suffix: '', icon: ArrowUpRight, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'Retrè an Atant', value: s?.pendingWithdrawals ?? '—', suffix: '', icon: DollarSign, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                  ], 'grid-cols-2 lg:grid-cols-3');
                }

                if (userRole === 'AGENT') {
                  const s = roleStats;
                  return renderCards([
                    { label: 'Total Ajans', value: s?.totalAgents ?? '—', suffix: '', icon: Briefcase, color: 'from-white/[0.02] to-transparent', iconColor: 'text-[#FF6B00]' },
                    { label: 'Ajans Aktif', value: s?.activeAgents ?? '—', suffix: '', icon: Zap, color: 'from-white/[0.02] to-transparent', iconColor: 'text-[#FF6B00]' },
                    { label: 'Total Komisyon', value: s?.totalCommissions != null ? Number(s.totalCommissions).toLocaleString('fr-FR') : '—', suffix: s?.totalCommissions != null ? ' HTG' : '', icon: TrendingUp, color: 'from-[#FF6B00]/5 to-transparent border-[#FF6B00]/10', iconColor: 'text-[#FF6B00]' },
                    { label: 'Demann Likidite', value: s?.pendingLiquidityRequests ?? '—', suffix: '', icon: Clock, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                  ]);
                }

                if (userRole === 'SUPPORT') {
                  const s = roleStats;
                  return renderCards([
                    { label: 'Total Itilizatè', value: s?.totalUsers ?? '—', suffix: '', icon: Users, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'Nouvo Jodi a', value: s?.newUsersToday ?? '—', suffix: '', icon: UserPlus, color: 'from-white/[0.02] to-transparent', iconColor: 'text-[#FF6B00]' },
                    { label: 'Suspann', value: s?.suspendedUsers ?? '—', suffix: '', icon: UserX, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                    { label: 'San KYC', value: s?.usersWithoutKyc ?? '—', suffix: '', icon: ShieldAlert, color: 'from-white/[0.02] to-transparent', iconColor: 'text-white/60' },
                  ]);
                }

                return null;
              })()}

              {/* Daily code card — CEO only */}
              {isMaster && (
                <div className="col-span-2 lg:col-span-4 bg-gradient-to-br from-[#0F121E] to-[#0D0E14] border border-[#FF6B00]/20 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl">
                        <KeyRound size={16} className="text-[#FF6B00]" />
                      </div>
                      <div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-white/80">Code d'accès journalier</h3>
                        <p className="text-[9px] font-mono text-white/30 mt-0.5">
                          {dailyCode ? formatExpiry(dailyCode.expiresAt) : 'Aucun code actif'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {dailyCode ? (
                        <span className="text-3xl font-black font-mono text-[#FF6B00] tracking-[0.3em]">{dailyCode.code}</span>
                      ) : (
                        <span className="text-sm text-white/30 italic font-mono">— — — — — —</span>
                      )}
                      <button onClick={handleRegenerateCode}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.06] hover:border-[#FF6B00]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF6B00] transition">
                        <RotateCcw size={12} /> Régénérer
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2 bg-[#FF6B00]/5 border border-[#FF6B00]/10 rounded-xl p-3">
                    <AlertTriangle size={12} className="text-[#FF6B00] shrink-0 mt-0.5" />
                    <p className="text-[9px] font-mono text-white/40">Partagez ce code uniquement sur le groupe WhatsApp de l'équipe</p>
                  </div>
                </div>
              )}

              {stats && stats.treasury && (
                <div className="bg-gradient-to-r from-[#FF6B00]/5 via-white/[0.01] to-transparent border border-white/[0.04] rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl">
                      <DollarSign size={16} className="text-[#FF6B00]" />
                    </div>
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-white/80">Master Treasury Protocol</h3>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Likidite jeneral e revni nèt</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'Frè Akimile (HQ)', value: `${Number(stats.treasury.totalFeesGenerated || 0).toLocaleString('fr-FR')} HTG`, color: 'text-[#FF6B00] italic' },
                      { label: 'Total HTG Nan Sistèm', value: `${Number(stats.treasury.totalHTGInSystem || 0).toLocaleString('fr-FR')} HTG`, color: 'text-white/90 font-mono' },
                      { label: 'USD Cards Treasury', value: `$${Number(stats.treasury.totalUSDCardsBalance || 0).toLocaleString()}`, color: 'text-white/90 font-mono' },
                    ].map((item, i) => (
                      <div key={i} className="border-l border-white/[0.04] pl-4">
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mb-1.5">{item.label}</p>
                        <p className={`text-base font-black tracking-tight ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Welcome message for SUPPORT and AGENT — no financial charts needed */}
              {!isMaster && (userRole === 'SUPPORT' || userRole === 'AGENT') && (
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
                    {userRole === 'SUPPORT' ? <Users size={20} className="text-[#FF6B00]" /> : <Briefcase size={20} className="text-[#FF6B00]" />}
                  </div>
                  <p className="text-white/70 text-sm font-black uppercase tracking-widest mb-2">Bienvenue.</p>
                  <p className="text-white/30 text-xs font-mono">
                    {userRole === 'SUPPORT'
                      ? "Consultez l'onglet Itilizatè pour gérer les utilisateurs."
                      : "Consultez l'onglet Ajan pour gérer votre réseau."}
                  </p>
                </div>
              )}

              {/* CHARTS LAYER — hidden for SUPPORT and AGENT */}
              {(isMaster || (userRole !== 'SUPPORT' && userRole !== 'AGENT')) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-6">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-6">Aktivite Dènye Tranzaksyon yo (HTG)</h3>
                  <div style={{ height: 200 }}>
                    {mounted && chartData && chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="ozamaGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff15" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff15" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip contentStyle={{ backgroundColor: '#0D0E14', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', fontSize: '10px', color: 'white' }} />
                          <Area type="monotone" dataKey="amount" stroke="#FF6B00" strokeWidth={1.5} fillOpacity={1} fill="url(#ozamaGlow)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-6">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-6">Distribisyon Balans Top Kliyan (HTG)</h3>
                  <div style={{ height: 200 }}>
                    {mounted && chartData && chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.slice(0, 6)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff15" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff15" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip contentStyle={{ backgroundColor: '#0D0E14', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', fontSize: '10px', color: 'white' }} />
                          <Bar dataKey="amount" fill="#FF6B00" radius={[4, 4, 0, 0]} opacity={0.65} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ==================== TAB: USERS ==================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-white/80">{filteredUsers.length} Kliyan Regilye</h3>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">Kontwòl ak modifikasyon balans, sispansyon, ak pwomosyon itilizatè</p>
                  </div>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="text" placeholder="Chache kliyan..."
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs w-56 outline-none focus:border-[#FF6B00]/30 transition text-white placeholder:text-white/20" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.03]">
                        {['Itilizatè', 'Email', 'Balans', 'KYC', 'Estati', 'Aksyon'].map(h => (
                          <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => (
                        <tr key={u?.id} className="border-b border-white/[0.01] hover:bg-white/[0.01] transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center font-black text-[#FF6B00] text-xs uppercase">
                                {(u?.name || u?.email)?.[0]}
                              </div>
                              <span className="font-bold text-xs text-white/90">{u?.name || 'Anonim'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white/40 text-xs font-mono">{u?.email}</td>
                          <td className="px-6 py-4 font-mono font-black text-xs text-[#FF6B00] italic">
                            {Number(u?.wallet?.balance || 0).toLocaleString('fr-FR')} HTG
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-md border ${u?.kyc?.status === 'APPROVED' ? 'bg-white/[0.02] border-white/[0.05] text-white/40' : u?.kyc?.status === 'PENDING' ? 'bg-[#FF6B00]/5 border-[#FF6B00]/20 text-[#FF6B00]' : 'bg-white/[0.01] border-white/[0.05] text-white/20'}`}>
                              {u?.kyc?.status || 'NO KYC'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${u?.isSuspended ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.02] text-white/50 border border-white/[0.05]'}`}>
                              {u?.isSuspended ? 'Suspann' : 'Aktif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isReadOnly ? (
                              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Lekti sèlman</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => { setSelectedUser(u); setIsAgentTopup(false); setShowTopupModal(true); }}
                                  className="bg-[#FF6B00] text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#e05e00] transition">
                                  Credit
                                </button>

                                <button onClick={() => handleToggleRole(u?.id, u?.role)} title="Moute li Ajan"
                                  className="bg-white/[0.02] border border-white/[0.05] text-white/60 hover:text-[#FF6B00] hover:border-[#FF6B00]/20 p-1.5 rounded-lg transition">
                                  <UserPlus size={12} />
                                </button>

                                <button onClick={() => handleToggleSuspend(u?.id, u?.isSuspended)}
                                  className={`p-1.5 rounded-lg border transition ${u?.isSuspended ? 'bg-white/[0.02] border-white/[0.05] text-[#FF6B00]' : 'bg-red-500/5 border-red-500/10 text-red-400'}`}>
                                  {u?.isSuspended ? <UserCheck size={12} /> : <UserX size={12} />}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: AGENTS & PACKAGES ==================== */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              {selectedAgent && (
                <div className="bg-[#0D0E14] border border-white/[0.04] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-[9px] font-black text-[#FF6B00] uppercase tracking-widest block mb-1">Konfigirasyon avanse</span>
                      <h3 className="font-black text-sm uppercase text-white/90">Pouvwa sou: {selectedAgent.name}</h3>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateAgentPackage} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-white/30 mb-2 block tracking-widest">Nivo Package / Tier</label>
                      <select value={agentPackage} onChange={(e) => setAgentPackage(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#FF6B00]/30 text-white cursor-pointer">
                        <option value="STANDARD_AGENT">Standard Agent (6% Deposit Base)</option>
                        <option value="VIP_AGENCE">VIP Agence (Frè Redui)</option>
                        <option value="MASTER_NODE">Master Node (Komisyon maksimòm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-white/30 mb-2 block tracking-widest">Komisyon Customized (%)</label>
                      <input type="number" step="0.1" placeholder="Egz: 2.5" value={agentCommission} onChange={(e) => setAgentCommission(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-mono outline-none focus:border-[#FF6B00]/30 text-white" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-white/30 mb-2 block tracking-widest">Limit Maksimòm Kach (HTG)</label>
                      <input type="number" placeholder="Egz: 500000" value={agentMaxLimit} onChange={(e) => setAgentMaxLimit(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-mono outline-none focus:border-[#FF6B00]/30 text-white" />
                    </div>
                    <div className="md:col-span-3 pt-2">
                      <button type="submit" className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition">
                        Mete sekirite ak paramèt Package la ajou →
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-white/80">Rezo Ajan ak Agans</h3>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">Kontwole pakè, komisyon ak likidite pwen kach yo</p>
                  </div>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="text" placeholder="Chache yon ajan..."
                      value={agentSearchQuery} onChange={(e) => setAgentSearchQuery(e.target.value)}
                      className="bg-white/[0.02] border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs w-56 outline-none focus:border-[#FF6B00]/30 transition text-white placeholder:text-white/20" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.03]">
                        {['Ajan / Agans', 'Email / Node ID', 'Balans Kach', 'Package Nivo', 'Komisyon', 'Estati', 'Aksyon'].map(h => (
                          <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-white/20 text-xs font-mono uppercase tracking-widest">
                            Pa gen okenn ajan ki anrejistre pou kounye a
                          </td>
                        </tr>
                      ) : (
                        filteredAgents.map((a: any) => (
                          <tr key={a?.id} className="border-b border-white/[0.01] hover:bg-white/[0.01] transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center font-black text-[#FF6B00] text-xs uppercase">
                                  {a.name?.[0]}
                                </div>
                                <span className="font-bold text-xs text-white/90">
                                  {a.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-white/40 text-xs font-mono">
                              {a.email}
                            </td>
                            <td className="px-6 py-4 font-mono font-black text-xs text-[#FF6B00] italic">
                              {Number(a.wallet?.balance || 0).toLocaleString('fr-FR')} HTG
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[8px] font-mono font-black px-2 py-0.5 rounded-md bg-[#FF6B00]/5 text-[#FF6B00] border border-[#FF6B00]/20 uppercase">
                                {a.agentPackage}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-white/70">
                              {a.customCommission}%
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded ${a.agentStatus === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : a.agentStatus === 'SUSPENDED' ? 'bg-red-500/10 text-red-400' : 'bg-[#FF6B00]/10 text-[#FF6B00]'}`}>
                                {a.agentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                {/* KORIJE: BOUTON VALIDE KI VOYE TOUT OBJE A */}
                                {a.agentStatus !== 'ACTIVE' && (
                                  <button onClick={() => handleApproveAgent(a)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition">
                                    Valide
                                  </button>
                                )}
                                <button onClick={() => { setSelectedAgent(a); setAgentPackage(a.agentPackage); }}
                                  className="bg-white/[0.02] border border-white/[0.05] text-white/80 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:border-[#FF6B00]/30 hover:text-white transition flex items-center gap-1">
                                  <Sliders size={10} /> Config
                                </button>
                                <button onClick={() => handleToggleRole(a.userId, 'AGENT')} title="Retire li kòm Ajan"
                                  className="bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition">
                                  <UserMinus size={12} />
                                </button>
                                <button onClick={() => { setSelectedUser(a); setIsAgentTopup(true); setShowTopupModal(true); }}
                                  className="bg-[#FF6B00] text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#e05e00] transition">
                                  Kredi
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: KYC ==================== */}
          {activeTab === 'kyc' && (
            <div className="space-y-6">
              {selectedKyc ? (
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-8">
                  <button onClick={() => setSelectedKyc(null)} className="mb-6 text-[#FF6B00] text-[10px] font-black uppercase flex items-center gap-2 tracking-widest hover:opacity-85 transition-all">
                    ← Retounen nan lis la
                  </button>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10 flex items-center justify-center font-black text-[#FF6B00] text-lg uppercase">
                      {selectedKyc.firstName?.[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-white/90">{selectedKyc.firstName} {selectedKyc.lastName}</h3>
                      <p className="text-white/30 text-[11px] font-mono mt-0.5">{selectedKyc.userEmail}</p>
                    </div>
                    <span className="ml-auto text-[8px] font-mono font-black px-2.5 py-1 rounded-md bg-[#FF6B00]/5 text-[#FF6B00] border border-[#FF6B00]/10 tracking-widest">
                      PENDING REVIEW
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-1.5">
                      {[
                        { label: 'Non Konplè', value: `${selectedKyc.firstName} ${selectedKyc.lastName}` },
                        { label: 'Telefòn', value: selectedKyc.phoneNumber },
                        { label: 'Dat Nesans', value: selectedKyc.dateOfBirth ? new Date(selectedKyc.dateOfBirth).toLocaleDateString() : '—' },
                        { label: 'Tip Dokiman', value: selectedKyc.idType },
                        { label: 'Nimewo Dokiman', value: selectedKyc.idNumber },
                        { label: 'Adrès', value: `${selectedKyc.line1}, ${selectedKyc.city}` },
                        { label: 'Depatman / Peyi', value: `${selectedKyc.state}, ${selectedKyc.country}` },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                          <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-white/80">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {selectedKyc.idImage && (
                        <div>
                          <p className="text-[9px] font-bold uppercase text-white/30 mb-2 tracking-wider">Foto Pyès Idantite</p>
                          <img src={selectedKyc.idImage} alt="ID" className="w-full rounded-xl border border-white/[0.05] object-cover max-h-40 grayscale contrast-125 brightness-90" />
                        </div>
                      )}
                      {selectedKyc.userPhoto && (
                        <div>
                          <p className="text-[9px] font-bold uppercase text-white/30 mb-2 tracking-wider">Selfie / Foto Vizaj</p>
                          <img src={selectedKyc.userPhoto} alt="Selfie" className="w-full rounded-xl border border-white/[0.05] object-cover max-h-40 grayscale contrast-125 brightness-90" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleKycReview(selectedKyc.id, 'APPROVED')}
                      className="flex-1 bg-[#FF6B00] hover:bg-[#E05E00] text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition">
                      <CheckCircle2 size={14} /> Approve KYC — Debite $25
                    </button>
                    <button onClick={() => handleKycReview(selectedKyc.id, 'REJECTED')}
                      className="flex-1 bg-white/[0.02] hover:bg-white/[0.04] text-white/60 border border-white/[0.05] py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition">
                      <XCircle size={14} /> Rejte KYC
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-white/80">{pendingKyc.length} KYC nan datatree a</h3>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">Revizyon idantite ak dokiman an tan reyèl</p>
                    </div>
                    <button
                      onClick={handleSendKycReminder}
                      disabled={kycReminderLoading}
                      className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition active:scale-[0.98]"
                    >
                      {kycReminderLoading
                        ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Voye...</>
                        : <><Mail size={12} /> Voye Rappèl KYC</>
                      }
                    </button>
                  </div>
                  {pendingKyc.length === 0 ? (
                    <div className="text-center py-20">
                      <CheckCircle2 size={36} className="text-white/20 mx-auto mb-4 stroke-[1.5]" />
                      <p className="text-white/40 font-bold text-xs uppercase tracking-widest">Sistèm nan pwòp — 0 KYC an pant</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.02]">
                      {pendingKyc.map((kyc: any) => (
                        <div key={kyc?.id} className="p-6 hover:bg-white/[0.01] border-b border-white/[0.01] transition cursor-pointer flex items-center justify-between group"
                          onClick={() => setSelectedKyc(kyc)}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/5 border border-[#FF6B00]/10 flex items-center justify-center font-black text-[#FF6B00] text-sm uppercase">
                              {kyc?.firstName?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-white/90 group-hover:text-[#FF6B00] transition">{kyc?.firstName} {kyc?.lastName}</p>
                              <p className="text-[9px] font-mono text-white/30 mt-0.5">{kyc?.userEmail} • <span className="text-white/50">{kyc?.idType}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-white/40 uppercase tracking-wide">{kyc?.city}, {kyc?.country}</p>
                              <p className="text-[9px] font-mono text-white/20 mt-0.5">{kyc?.createdAt ? new Date(kyc.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <span className="text-[8px] font-mono font-black px-2.5 py-1 rounded-md bg-[#FF6B00]/5 text-[#FF6B00] border border-[#FF6B00]/10 tracking-widest">
                              PENDING
                            </span>
                            <ArrowUpRight size={14} className="text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: LIQUIDITY ==================== */}
          {activeTab === 'liquidity' && (
            <div className="space-y-6">
              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest text-white/80">
                      {liquidityRequests.length} Demand Likidite
                    </h3>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">
                      Jere demand retrè kash ajan yo
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingLiquidityCount > 0 && (
                      <span className="bg-[#FF6B00] text-white text-[9px] font-black px-2.5 py-1 rounded-lg">
                        {pendingLiquidityCount} an pant
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.03]">
                        {['Ajan', 'Email', 'Montan', 'Metòd', 'Enfòmasyon Kont', 'Estati', 'Dat', 'Aksyon'].map(h => (
                          <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {liquidityRequests.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-16 text-white/20 text-xs font-mono uppercase tracking-widest">
                            Pa gen demand likidite pou kounye a
                          </td>
                        </tr>
                      ) : (
                        liquidityRequests.map((req: any) => (
                          <tr key={req.id} className="border-b border-white/[0.01] hover:bg-white/[0.01] transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center font-black text-[#FF6B00] text-xs uppercase">
                                  {(req.agent?.user?.name || req.agent?.user?.email)?.[0]}
                                </div>
                                <span className="font-bold text-xs text-white/90">
                                  {req.agent?.user?.name || 'Anonim'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-white/40 text-xs font-mono">
                              {req.agent?.user?.email}
                            </td>
                            <td className="px-6 py-4 font-mono font-black text-xs text-[#FF6B00] italic">
                              {Number(req.amount).toLocaleString('fr-FR')} HTG
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[8px] font-mono font-black px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-white/60 uppercase">
                                {req.method}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/50 text-xs font-mono max-w-[160px] truncate">
                              {req.accountInfo}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                req.status === 'APPROVED'
                                  ? 'bg-green-500/10 text-green-400'
                                  : req.status === 'REJECTED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-[#FF6B00]/10 text-[#FF6B00]'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/30 text-[9px] font-mono">
                              {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-6 py-4">
                              {req.status === 'PENDING' && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={async () => {
                                      const res = await fetch(`${API}/admin/liquidity-requests/${req.id}/approve`, {
                                        method: 'PATCH', headers: H(),
                                        body: JSON.stringify({}),
                                      });
                                      const data = await res.json();
                                      if (res.ok) { showToast('✅ Demand apwouve — AgentWallet debite'); await fetchData(); }
                                      else { showToast(data.message || 'Erè apwobasyon', 'error'); }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                                  >
                                    Apwouve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const res = await fetch(`${API}/admin/liquidity-requests/${req.id}/reject`, {
                                        method: 'PATCH', headers: H(),
                                        body: JSON.stringify({}),
                                      });
                                      const data = await res.json();
                                      if (res.ok) { showToast('Demand rejte ❌'); await fetchData(); }
                                      else { showToast(data.message || 'Erè rejet', 'error'); }
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                                  >
                                    Rejte
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: TRANSACTIONS MANUEL ==================== */}
          {activeTab === 'transactions' && (() => {
            const topups = pendingTransactions.filter(t => t.type === 'TOPUP');
            const withdrawals = pendingTransactions.filter(t => t.type === 'WITHDRAWAL');

            const TxTable = ({ rows, emptyLabel }: { rows: any[]; emptyLabel: string }) => (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.03]">
                      {['Itilizatè', 'Email', 'Montan', 'Metòd', 'Kont / Detay', 'Prèv', 'Dat', 'Aksyon'].map(h => (
                        <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-white/20 text-xs font-mono uppercase tracking-widest">
                          {emptyLabel}
                        </td>
                      </tr>
                    ) : (
                      rows.map((tx: any) => {
                        const user = tx.type === 'TOPUP' ? tx.receiverWallet?.user : tx.senderWallet?.user;
                        return (
                          <tr key={tx.id} className="border-b border-white/[0.01] hover:bg-white/[0.01] transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center font-black text-[#FF6B00] text-xs uppercase">
                                  {(user?.name || user?.email)?.[0]}
                                </div>
                                <span className="font-bold text-xs text-white/90">{user?.name || 'Anonim'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-white/40 text-xs font-mono">{user?.email}</td>
                            <td className="px-6 py-4 font-mono font-black text-xs text-[#FF6B00] italic">
                              {Number(tx.amount).toLocaleString('fr-FR')} HTG
                              {tx.type === 'TOPUP' && Number(tx.fee) > 0 && (
                                <span className="block text-[8px] text-white/30 font-normal not-italic">
                                  Net: {Number(tx.netAmount).toLocaleString('fr-FR')} HTG
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[8px] font-mono font-black px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-white/60 uppercase">
                                {tx.method || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/40 text-xs font-mono max-w-[160px] truncate">
                              {tx.description || '—'}
                            </td>
                            <td className="px-6 py-4">
                              {tx.proofImage ? (
                                <a href={tx.proofImage} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-white/[0.03] hover:bg-[#FF6B00]/10 border border-white/[0.06] hover:border-[#FF6B00]/30 text-white/60 hover:text-[#FF6B00] px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition">
                                  <FileText size={10} /> Wè Fichye
                                </a>
                              ) : (
                                <span className="text-white/20 text-[9px] font-mono">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-white/30 text-[9px] font-mono">
                              {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                {tx.type === 'TOPUP' && tx.method === 'MonCash' ? (
                                  <span
                                    title="Moncash otomatik - pa bezwen apwouve"
                                    className="bg-white/[0.03] border border-white/[0.06] text-white/20 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-not-allowed select-none"
                                  >
                                    Apwouve
                                  </span>
                                ) : (
                                <button
                                  onClick={async () => {
                                    const res = await fetch(`${API}/admin/transactions/${tx.id}/process`, {
                                      method: 'PATCH', headers: H(),
                                      body: JSON.stringify({ status: 'COMPLETED' }),
                                    });
                                    const data = await res.json();
                                    if (res.ok) { showToast('✅ Tranzaksyon apwouve'); await fetchData(); }
                                    else { showToast(data.message || 'Erè apwobasyon', 'error'); }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                                >
                                  Apwouve
                                </button>
                                )}
                                <button
                                  onClick={async () => {
                                    const res = await fetch(`${API}/admin/transactions/${tx.id}/process`, {
                                      method: 'PATCH', headers: H(),
                                      body: JSON.stringify({ status: 'REJECTED' }),
                                    });
                                    const data = await res.json();
                                    if (res.ok) { showToast('Tranzaksyon rejte ❌'); await fetchData(); }
                                    else { showToast(data.message || 'Erè rejet', 'error'); }
                                  }}
                                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                                >
                                  Rejte
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );

            return (
              <div className="space-y-6">
                {/* SECTION 1: TOPUP */}
                <div className="bg-[#0D0E14] border border-green-500/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-green-500/10 flex items-center justify-between bg-green-500/[0.03]">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-green-400">
                        Demann Depot (TOPUP)
                      </h3>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">
                        Konfime depo kliyan yo fè manuèlman
                      </p>
                    </div>
                    {topups.length > 0 && (
                      <span className="bg-green-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg">
                        {topups.length} an pant
                      </span>
                    )}
                  </div>
                  <TxTable rows={topups} emptyLabel="Pa gen demann depot an pant" />
                </div>

                {/* SECTION 2: WITHDRAWAL */}
                <div className="bg-[#0D0E14] border border-red-500/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-red-500/10 flex items-center justify-between bg-red-500/[0.03]">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-red-400">
                        Demann Retrè (WITHDRAWAL)
                      </h3>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">
                        Konfime retrè kliyan yo epi voye lajan an manuèlman
                      </p>
                    </div>
                    {withdrawals.length > 0 && (
                      <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg">
                        {withdrawals.length} an pant
                      </span>
                    )}
                  </div>
                  <TxTable rows={withdrawals} emptyLabel="Pa gen demann retrè an pant" />
                </div>
              </div>
            );
          })()}

          {/* ==================== TAB: FINANCE / EXCHANGE ==================== */}
          {activeTab === 'finance' && (() => {
            const SVC_BADGE: Record<string, string> = {
              WISE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              MERU: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              ZELLE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
              CASHAPP: 'bg-green-500/10 text-green-400 border-green-500/20',
              NATCASH: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
              USDT: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
              GAMING: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            };

            return (
              <div className="space-y-6">
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/[0.03] flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest text-white/80">
                        {financeRequests.length} Demann Finance / Exchange
                      </h3>
                      <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">
                        Revize ak trete demann Wise, Zelle, USDT, Gaming ak lòt sèvis
                      </p>
                    </div>
                    {pendingFinanceCount > 0 && (
                      <span className="bg-[#FF6B00] text-white text-[9px] font-black px-2.5 py-1 rounded-lg">
                        {pendingFinanceCount} an pant
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.03]">
                          {['Kliyan', 'Email', 'Sèvis', 'Montan', 'Frè', 'Mode', 'Detay', 'Prèv', 'Estati', 'Dat', 'Aksyon'].map(h => (
                            <th key={h} className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {financeRequests.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-16 text-white/20 text-xs font-mono uppercase tracking-widest">
                              Pa gen demann finance pou kounye a
                            </td>
                          </tr>
                        ) : (
                          financeRequests.map((req: any) => {
                            let parsedDetails: any = {};
                            try { parsedDetails = req.details ? JSON.parse(req.details) : {}; } catch {}
                            return (
                              <tr key={req.id} className="border-b border-white/[0.01] hover:bg-white/[0.01] transition">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center font-black text-[#FF6B00] text-xs uppercase">
                                      {(req.user?.name || req.user?.email)?.[0]}
                                    </div>
                                    <span className="font-bold text-xs text-white/90">{req.user?.name || 'Anonim'}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-white/40 text-xs font-mono">{req.user?.email}</td>
                                <td className="px-5 py-4">
                                  <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-md border uppercase ${SVC_BADGE[req.serviceType] || 'bg-white/[0.03] text-white/60 border-white/[0.05]'}`}>
                                    {req.serviceType}
                                  </span>
                                </td>
                                <td className="px-5 py-4 font-mono font-black text-xs text-[#FF6B00] italic">
                                  {Number(req.amount).toLocaleString('fr-FR')}
                                  <span className="block text-[8px] text-white/30 font-normal not-italic">
                                    Frè: {Number(req.fee).toLocaleString('fr-FR')}
                                  </span>
                                </td>
                                <td className="px-5 py-4 font-mono text-xs text-white/50">
                                  {Number(req.fee).toLocaleString('fr-FR')}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${parsedDetails.mode === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {parsedDetails.mode || '—'}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-white/40 text-[10px] font-mono max-w-[140px]">
                                  {parsedDetails.email && <div className="truncate">{parsedDetails.email}</div>}
                                  {parsedDetails.gameId && <div className="truncate text-white/30">ID: {parsedDetails.gameId}</div>}
                                </td>
                                <td className="px-5 py-4">
                                  {req.proofImage ? (
                                    <a href={req.proofImage} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 bg-white/[0.03] hover:bg-[#FF6B00]/10 border border-white/[0.06] hover:border-[#FF6B00]/30 text-white/60 hover:text-[#FF6B00] px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition">
                                      <FileText size={10} /> Wè
                                    </a>
                                  ) : (
                                    <span className="text-white/20 text-[9px] font-mono">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    req.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400'
                                    : req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400'
                                    : 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-white/30 text-[9px] font-mono whitespace-nowrap">
                                  {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-5 py-4">
                                  {req.status === 'PENDING' && (
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                      <button
                                        onClick={async () => {
                                          const res = await fetch(`${API}/admin/finance-requests/${req.id}/process`, {
                                            method: 'PATCH', headers: H(),
                                            body: JSON.stringify({ status: 'COMPLETED' }),
                                          });
                                          const data = await res.json();
                                          if (res.ok) { showToast('✅ Demann finans apwouve'); await fetchData(); }
                                          else { showToast(data.message || 'Erè apwobasyon', 'error'); }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                                      >
                                        Apwouve
                                      </button>
                                      <div className="flex gap-1">
                                        <input
                                          type="text"
                                          placeholder="Rezon rejet..."
                                          value={financeRejectNote[req.id] || ''}
                                          onChange={(e) => setFinanceRejectNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                                          className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-1 text-[9px] text-white/70 outline-none focus:border-red-500/30 placeholder:text-white/20 min-w-0"
                                        />
                                        <button
                                          onClick={async () => {
                                            const res = await fetch(`${API}/admin/finance-requests/${req.id}/process`, {
                                              method: 'PATCH', headers: H(),
                                              body: JSON.stringify({ status: 'REJECTED', adminNote: financeRejectNote[req.id] || '' }),
                                            });
                                            const data = await res.json();
                                            if (res.ok) {
                                              showToast('Demann rejte ❌');
                                              setFinanceRejectNote(prev => { const n = { ...prev }; delete n[req.id]; return n; });
                                              await fetchData();
                                            } else { showToast(data.message || 'Erè rejet', 'error'); }
                                          }}
                                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition shrink-0"
                                        >
                                          Rejte
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ==================== TAB: RATES ==================== */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-6">
                  <h3 className="font-black text-xs uppercase tracking-widest text-white/80 mb-6">Mete Taux yo Ajou</h3>
                  <form onSubmit={handleUpdateRate} className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-white/30 mb-2 block tracking-widest">Chwazi Paramèt la</label>
                      <select value={rateKey} onChange={(e) => setRateKey(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#FF6B00]/30 text-white/80 cursor-pointer">
                        <option value="USDT_BUY">USDT Buy Rate (HTG → USDT)</option>
                        <option value="USDT_SELL">USDT Sell Rate (USDT → HTG)</option>
                        <option value="USD_HTG">USD → HTG Rate</option>
                        <option value="CARD_RATE">Virtual Card Rate</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-white/30 mb-2 block tracking-widest">Nouvo Valè Enstriman (HTG)</label>
                      <input type="number" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)}
                        placeholder="Egz: 132.50"
                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-mono outline-none focus:border-[#FF6B00]/30 text-white placeholder:text-white/10" />
                    </div>
                    <button type="submit" className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-[#FF6B00]/5">
                      Mete Ajou Nodes →
                    </button>
                  </form>
                </div>

                <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-6">
                  <h3 className="font-black text-xs uppercase tracking-widest text-white/80 mb-6">Frè Sistèm OZAMAPAY</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Depot / TopUp', value: '6%', desc: 'Sou chak rechajman' },
                      { label: 'Transfè P2P', value: '0.99%', desc: 'Sou chak voye' },
                      { label: 'Retrè / Withdraw', value: '2%', desc: 'Sou chak retrè' },
                      { label: 'KYC Verification', value: '$25', desc: '405 HTG → Ajans, Rès → OZAMA' },
                      { label: 'Virtual Card', value: 'Variable', desc: 'Selon taux USD/HTG' },
                    ].map((fee, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl transition">
                        <div>
                          <p className="font-bold text-xs text-white/90">{fee.label}</p>
                          <p className="text-[9px] text-white/30 font-mono mt-0.5">{fee.desc}</p>
                        </div>
                        <span className="text-sm font-black text-[#FF6B00] italic">{fee.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl p-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-white/80 mb-6">Rezime Finansye Sistèm</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total HTG Sistèm', value: `${totalBalance.toLocaleString('fr-FR')} HTG` },
                    { label: 'Mwayèn Balans Node', value: `${totalUsers > 0 ? (totalBalance / totalUsers).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : 0} HTG` },
                    { label: 'Revenue Total Accumulated', value: `${Number(totalFeesGenerated).toLocaleString('fr-FR')} HTG` },
                    { label: 'KYC Core Revenue', value: `${(approvedKyc * 2970).toLocaleString('fr-FR')} HTG` },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-2">{item.label}</p>
                      <p className="font-black text-xs text-white/90 font-mono tracking-tight">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: ÉQUIPE ==================== */}
          {activeTab === 'equipe' && isMaster && (
            <div className="space-y-6">

              {/* Invitations header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-white/80">Équipe OZAMAPAY</h3>
                  <p className="text-[9px] font-mono text-white/30 mt-0.5 uppercase tracking-wider">Invitations employés &amp; gestion des accès</p>
                </div>
                <button onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#E05E00] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-[#FF6B00]/10">
                  <Send size={12} /> Inviter un employé
                </button>
              </div>

              {/* Invitations list */}
              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/[0.03]">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-white/60">Invitations envoyées</h4>
                </div>
                {(invitations ?? []).length === 0 ? (
                  <div className="p-10 text-center">
                    <Users2 size={24} className="text-white/10 mx-auto mb-3" />
                    <p className="text-white/20 text-xs font-mono">Aucune invitation pour le moment</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.03]">
                        {['Email', 'Rôle', 'Statut', 'Date'].map(h => (
                          <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/20">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(invitations ?? []).map((inv: any) => (
                        <tr key={inv.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition">
                          <td className="px-5 py-4 text-xs font-bold text-white/70">{inv.email}</td>
                          <td className="px-5 py-4">
                            <span className="text-[9px] font-black bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-lg text-[#FF6B00] uppercase tracking-wider">
                              {inv.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {inv.accepted ? (
                              <span className="text-[9px] font-black text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg uppercase">Acceptée</span>
                            ) : new Date(inv.expiresAt) < new Date() ? (
                              <span className="text-[9px] font-black text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-lg uppercase">Expirée</span>
                            ) : (
                              <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-lg uppercase">En attente</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-[10px] font-mono text-white/30">
                            {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Sessions */}
              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/[0.03]">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-white/60">Historique des Sessions</h4>
                </div>
                {sessions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-white/20 text-xs font-mono">Aucune session enregistrée</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.03]">
                          {['Employé', 'Rôle', 'Connexion', 'Déconnexion', 'IP Address', 'Statut'].map(h => (
                            <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/20">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s: any) => (
                          <tr key={s.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition">
                            <td className="px-5 py-4">
                              <div className="font-bold text-xs text-white/80">{s.user?.name || 'N/A'}</div>
                              <div className="text-[10px] font-mono text-white/30">{s.user?.email}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[9px] font-black bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-lg text-[#FF6B00] uppercase tracking-wider">
                                {s.user?.role}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-[10px] font-mono text-white/50">
                              {new Date(s.loginAt).toLocaleString('fr-FR')}
                            </td>
                            <td className="px-5 py-4 text-[10px] font-mono">
                              {s.logoutAt ? (
                                <span className="text-white/40">{new Date(s.logoutAt).toLocaleString('fr-FR')}</span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                                  <span className="text-green-400 font-bold">En ligne</span>
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-[10px] font-mono text-white/30">{s.ipAddress || '—'}</td>
                            <td className="px-5 py-4">
                              {s.isActive ? (
                                <span className="text-[9px] font-black text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg uppercase">Actif</span>
                              ) : (
                                <span className="text-[9px] font-black text-white/30 bg-white/[0.02] border border-white/[0.05] px-2 py-1 rounded-lg uppercase">Déconnecté</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Activity Logs */}
              <div className="bg-[#0D0E14] border border-white/[0.03] rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/[0.03]">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-white/60">Activité Récente</h4>
                </div>
                {activityLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-white/20 text-xs font-mono">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.03]">
                          {['Employé', 'Action', 'Détails', 'Date / Heure', 'IP'].map(h => (
                            <th key={h} className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/20">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.map((log: any) => (
                          <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition">
                            <td className="px-5 py-4">
                              <div className="font-bold text-xs text-white/80">{log.admin?.name || 'Système'}</div>
                              <div className="text-[10px] font-mono text-white/30">{log.admin?.email}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[9px] font-black font-mono bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-lg text-white/60 uppercase tracking-wider">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-[10px] text-white/40 max-w-[200px] truncate">{log.details || '—'}</td>
                            <td className="px-5 py-4 text-[10px] font-mono text-white/30">
                              {new Date(log.createdAt).toLocaleString('fr-FR')}
                            </td>
                            <td className="px-5 py-4 text-[10px] font-mono text-white/30">{log.ipAddress || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>

      {/* INVITE EMPLOYEE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-[#0A0B0F]/70 backdrop-blur-md">
          <div className="bg-[#0D0E14] border border-white/[0.05] w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button onClick={() => setShowInviteModal(false)} className="absolute right-5 top-5 text-white/20 hover:text-white transition">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl">
                <Send size={14} className="text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-white/90">Inviter un employé</h3>
                <p className="text-[9px] font-mono text-white/30 mt-0.5">Lien valable 7 jours</p>
              </div>
            </div>
            <form onSubmit={handleInviteEmployee} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Email</label>
                <input
                  type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employe@example.com"
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#FF6B00]/30 text-white placeholder:text-white/10 transition"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-white/30 tracking-widest mb-1.5 block">Rôle</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#FF6B00]/30 text-white/80 cursor-pointer transition">
                  <option value="SUPER_ADMIN">COO — Opérations</option>
                  <option value="AGENT">Directeur des Agents</option>
                  <option value="SUPPORT">Support Opérationnel</option>
                  <option value="ADMIN">Administrateur (CEO)</option>
                </select>
              </div>
              <button type="submit" disabled={inviteLoading}
                className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition active:scale-[0.98] shadow-lg shadow-[#FF6B00]/5 disabled:opacity-50">
                {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM TOPUP MODAL */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-[#0A0B0F]/60 backdrop-blur-md">
          <div className="bg-[#0D0E14] border border-white/[0.05] w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <button onClick={() => { setShowTopupModal(false); setIsAgentTopup(false); }} className="absolute right-5 top-5 text-white/20 hover:text-white transition">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl">
                <Zap size={14} className="text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-widest text-white/90">Direct Node Credit</h3>
                <p className="text-[9px] font-mono text-white/30 mt-0.5">ID: <span className="text-[#FF6B00] font-bold">{selectedUser?.name || selectedUser?.email}</span></p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input autoFocus type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-white/[0.01] border border-white/[0.05] rounded-xl py-4 px-5 text-2xl font-black font-mono outline-none focus:border-[#FF6B00]/30 text-white italic placeholder:text-white/5 transition"
                  placeholder="0" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-[#FF6B00] text-xs font-sans tracking-widest">HTG</span>
              </div>
              <div className="flex gap-1.5">
                {[1000, 5000, 10000, 50000].map(amt => (
                  <button key={amt} onClick={() => setTopupAmount(String(amt))}
                    className="flex-1 py-2 bg-white/[0.01] hover:bg-[#FF6B00]/5 border border-white/[0.04] hover:border-[#FF6B00]/20 rounded-xl text-[9px] font-mono font-black text-white/40 hover:text-[#FF6B00] transition">
                    {amt >= 1000 ? `${amt/1000}k` : amt}
                  </button>
                ))}
              </div>
              <button onClick={handleDirectTopup}
                className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition active:scale-[0.98] shadow-lg shadow-[#FF6B00]/5">
                Konfime Depo Pipeline →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}