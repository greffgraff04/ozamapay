"use client";
import React, { useState, useEffect, useRef } from 'react';
import UserSecurityCard from "./UserSecurityCard"; // Ajiste chemen an si w mete l nan yon lòt katab
import {
  Home, Send, PlusCircle, Banknote, CreditCard, History, User, Landmark,
  Smartphone, Bitcoin, Gamepad2, CheckCircle2, Upload, Info, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, Bell, Wallet2, LogOut, Settings,
  ShieldCheck, Zap, Copy, QrCode, ArrowLeftRight, ShieldEllipsis, Activity, FileText, Camera, X,
  Shield, BadgeCheck, Briefcase, TrendingUp, Star, Pencil, Download, Share2,
  HelpCircle, CreditCard as CardIcon, Eye, EyeOff, Lock, Unlock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
 
const PAYMENT_INFO = {
  bank_usd: { acc: "1920222", name: "Ralph Olivier Greffin", bank: "Capital Bank (USD)" },
  bank_htg: { acc: "000-000-000", name: "Ralph Olivier Greffin", bank: "Capital Bank (Gourdes)" },
  wise: { acc: "contact@ozamapay.com", name: "OzamaPay Business" },
  meru: { acc: "oliou04@gmail.com", name: "Ralph Olivier Greffin" },
  zelle: { acc: "786 868 6782", name: "Ralph Olivier Greffin" },
  cashapp: { acc: "$Pascoue93", name: "Ralph Olivier Greffin" },
  usdt: { acc: "https://ozamapay.com/pay/usdt-link", name: "TRC20 Network" },
  natcash: { label: 'MonCash / NatCash', value: 'À konfigire - Kontakte sipò nou', note: 'HTG Transfer' }
};
 
const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "Kounye a";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Kounye a";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yè";
  if (diffInDays < 30) return `${diffInDays}j`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mwa`;
  return `${Math.floor(diffInMonths / 12)}an`;
};
 
const signOut = async () => {
  localStorage.clear();
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.replace("/login");
};
 
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minLoadDone, setMinLoadDone] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
 

  const [virtualCard, setVirtualCard] = useState<any>(null);
  const [showCardDetails, setShowCardDetails] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState('moncash');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpType, setTopUpType] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [mccPaymentUrl, setMccPaymentUrl] = useState<string | null>(null);
  const [mccPolling, setMccPolling] = useState(false);
  const [mccInitialBalance, setMccInitialBalance] = useState(0);
  const mccPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawAccountInfo, setWithdrawAccountInfo] = useState('');
  const [pin, setPin] = useState('');
  
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
  const [toastFading, setToastFading] = useState(false);
  const [showSecurityCard, setShowSecurityCard] = useState(false);
  const [cardCreateAmount, setCardCreateAmount] = useState('3');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [showMoncashGuide, setShowMoncashGuide] = useState(true);
 
  const [financeType, setFinanceType] = useState<'BUY' | 'SELL'>('BUY');
  const [financeDetails, setFinanceDetails] = useState({
    email: '', tag: '', amount: '', currency: 'USD', gameId: '', gamePack: ''
  });
  const [selectedFinanceService, setSelectedFinanceService] = useState<any>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [financeReceipt, setFinanceReceipt] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const financeFileInputRef = useRef<HTMLInputElement>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(135);

  // --- NEW KYC STATES (STROWALLET DYNAMIC) ---
  const [showKycForm, setShowKycForm] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  
  const [kycData, setKycData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    idType: 'PASSPORT',
    idNumber: '',
    line1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'HT',
  });
  
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null);
  
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  // QR modal
  const [showQrModal, setShowQrModal] = useState(false);

  // Onboarding tour
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
 
 const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:10000';// IP Backend ou a
 
  const paymentMethods = [
    { id: 'zelle', label: 'Zelle', img: 'zelle.png', info: "786 868 6782", name: "Ralph Olivier Greffin" },
    { id: 'cashapp', label: 'CashApp', img: 'cashapp.png', info: "$Pascoue93", name: "Ralph Olivier Greffin" },
    { id: 'moncash', label: 'MonCash', img: 'moncash.png', info: "Nimewo MonCash la", name: "Ralph Olivier Greffin" },
    { id: 'natcash', label: 'NatCash', img: 'natcash.png', info: "55187047", name: "Ralph Olivier Greffin" },
    { id: 'bank', label: 'Capital Bank', img: 'capitalbank.png', info: "1920222", name: "Ralph Olivier Greffin" }
  ];
  const INTL_METHODS = ['zelle', 'cashapp', 'wise', 'meru', 'bank', 'usdt'];
  const topupIsIntl = INTL_METHODS.includes(selectedMethod.toLowerCase());
  const withdrawIsIntl = INTL_METHODS.includes(withdrawMethod.toLowerCase());
  const topupHTG = topupIsIntl ? Math.round(Number(topUpAmount) * exchangeRate) : Number(topUpAmount);
  const withdrawHTG = withdrawIsIntl ? Math.round(Number(withdrawAmount) * exchangeRate) : Number(withdrawAmount);
 
  const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToastFading(false);
    setToast({ message, type });
    setTimeout(() => setToastFading(true), 3600);
    setTimeout(() => setToast(null), 4000);
  };

  const closeToast = () => {
    setToastFading(true);
    setTimeout(() => { setToast(null); setToastFading(false); }, 350);
  };
 
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Kopye ak siksè!", "success");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Kounye a';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${backendUrl}/wallet/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleEditProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setEditProfileLoading(true);
    try {
      const res = await fetch(`${backendUrl}/user/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev: any) => ({ ...prev, name: editName.trim(), phone: editPhone.trim() }));
        setIsEditingProfile(false);
        showToast('Pwofil mete ajou ✓', 'success');
      } else {
        showToast(data.message || 'Erè pandan mete ajou a', 'error');
      }
    } catch {
      showToast('Erè rezo', 'error');
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleProfilePhotoUpload = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token || !file) return;
    setProfilePhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${backendUrl}/user/profile-photo`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.photoUrl) {
        setProfilePhoto(data.photoUrl);
        showToast('Foto pwofil mete ajou ✓', 'success');
      } else {
        showToast(data.message || 'Erè pandan upload foto a', 'error');
      }
    } catch {
      showToast('Erè rezo pandan upload foto a', 'error');
    } finally {
      setProfilePhotoUploading(false);
    }
  };
 
  const calculateFees = (amt: string, rate: number = 0.02) => {
    const val = parseFloat(amt) || 0;
    const fee = val * rate;
    return { 
        fee: fee.toFixed(2), 
        total: (val + fee).toFixed(2),
        totalWithdraw: (val - fee).toFixed(2)
    };
  };
 
  const fetchData = async () => {
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!localToken) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${localToken}` };
      const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

      const [txRes, meRes, rateRes, notifRes, cardRes] = await Promise.all([
        fetch(`${API_BASE}/wallet/transactions?limit=5`, { headers }).catch(() => null),
        fetch(`${API_BASE}/auth/me`, { headers }).catch(() => null),
        fetch(`${API_BASE}/rates`).catch(() => null),
        fetch(`${API_BASE}/wallet/notifications`, { headers }).catch(() => null),
        fetch(`${API_BASE}/v1/cards/my-card`, { headers: { Authorization: `Bearer ${localToken}` } }).catch(() => null),
      ]);

      const [txData, meData, ratesData, notifData, cardData] = await Promise.all([
        txRes?.ok ? txRes.json().catch(() => null) : null,
        meRes?.ok ? meRes.json().catch(() => null) : null,
        rateRes?.ok ? rateRes.json().catch(() => null) : null,
        notifRes?.ok ? notifRes.json().catch(() => null) : null,
        cardRes?.ok ? cardRes.json().catch(() => null) : null,
      ]);

      setTransactions(Array.isArray(txData) ? txData : []);

      if (meData) {
        setUser(meData);
        if (meData.photoUrl) setProfilePhoto(meData.photoUrl);
        localStorage.setItem('user', JSON.stringify(meData));
        if (
          !localStorage.getItem('ozama_onboarded') &&
          Number(meData.wallet?.balance || 0) === 0 &&
          !meData.kyc
        ) {
          setShowOnboarding(true);
        }
      }

      if (ratesData) {
        const rate = Array.isArray(ratesData) ? ratesData.find((r: any) => r.key === 'USD_HTG')?.value : ratesData.value;
        setExchangeRate(Number(rate || 135));
      }

      if (Array.isArray(notifData)) {
        setNotifications(notifData);
        setUnreadCount(notifData.filter((n: any) => !n.isRead).length);
      }

      if (cardData) {
        setVirtualCard((prev: any) => ({
          ...cardData,
          cardNumber: prev?.cardNumber,
          cvv: prev?.cvv,
          expiryDate: prev?.expiryDate,
          cardName: prev?.cardName || cardData?.cardName,
          last4: prev?.last4 || cardData?.last4,
        }));
      }

    } catch (e) {
      console.error("SYNC ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceSubmit = async () => {
    if (!selectedFinanceService || !financeDetails.amount || Number(financeDetails.amount) <= 0) {
      showToast('Tanpri antre yon montan valid', 'error');
      return;
    }
    if (financeType === 'BUY' && !financeReceipt) {
      showToast('Ou dwe upload prèv peman ou anvan soumèt', 'error');
      return;
    }

    setFinanceLoading(true);
    const token = localStorage.getItem('token');
    try {
      const details = JSON.stringify({
        mode: financeType,
        service: selectedFinanceService.id,
        email: financeDetails.email,
        gameId: financeDetails.gameId,
        gamePack: financeDetails.gamePack,
        currency: selectedFinanceService.id === 'usdt' ? 'USDT' : 'USD',
      });

      const formData = new FormData();
      formData.append('serviceType', selectedFinanceService.id.toUpperCase());
      formData.append('amount', financeDetails.amount);
      formData.append('details', details);
      if (financeReceipt) formData.append('proofImage', financeReceipt);

      const res = await fetch(`${backendUrl}/wallet/finance-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Demann ou an voye avèk siksè! Admin ap revize li.', 'success');
        setSelectedFinanceService(null);
        setFinanceReceipt(null);
        setFinanceDetails({ email: '', tag: '', amount: '', currency: 'USD', gameId: '', gamePack: '' });
        setFinanceType('BUY');
      } else {
        showToast(data.message || 'Erè pandan soumisyon an', 'error');
      }
    } catch {
      showToast('Sèvè a pa reponn. Verifye koneksyon ou.', 'error');
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setMinLoadDone(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      fetchData();
    } else {
      signOut();
    }
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);
 
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'home') return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('tx-visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -10px 0px' }
    );
    document.querySelectorAll('.tx-item').forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.07}s`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [transactions, activeTab]);

  const handlePaymentLogic = async () => {
  if (!topUpAmount || Number(topUpAmount) <= 0) {
    showToast('Antre yon montan valid', 'error');
    return;
  }
  if (!selectedMethod) {
    showToast('Chwazi yon mwayen peman', 'error');
    return;
  }
  if (topUpType === 'MANUAL' && !receipt) {
    showToast('Upload reçu peman ou anvan ou soumèt', 'error');
    return;
  }

  const token =
    localStorage.getItem('token');

  // 🔥 Agent ID récupéré localement
  const agentId =
    localStorage.getItem(
      'ozama_agent_id',
    );

  if (selectedMethod === 'moncash' && topUpType === 'AUTOMATIC') {
    try {
      const res = await fetch(`${backendUrl}/payments/moncashconnect/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: topupHTG }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erè');

      const initialBal = Number(user?.wallet?.balance ?? 0);
      setMccInitialBalance(initialBal);
      setMccPaymentUrl(data.paymentUrl);
      setMccPolling(true);

      if (mccPollRef.current) clearInterval(mccPollRef.current);
      const deadline = Date.now() + 3 * 60 * 1000;
      mccPollRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          clearInterval(mccPollRef.current!);
          setMccPolling(false);
          return;
        }
        try {
          const t = localStorage.getItem('token');
          const r = await fetch(`${backendUrl}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
          if (r.ok) {
            const fresh = await r.json();
            const newBal = Number(fresh?.wallet?.balance ?? 0);
            if (newBal > initialBal) {
              clearInterval(mccPollRef.current!);
              setMccPolling(false);
              setMccPaymentUrl(null);
              setUser(fresh);
              setTopUpAmount('');
              setToast({ message: `Depot konfime! +${(newBal - initialBal).toLocaleString()} HTG ✅`, type: 'success' });
            }
          }
        } catch {}
      }, 10000);
    } catch {
      setToast({ message: 'Erè koneksyon ak sèvè MonCash', type: 'error' });
    }
  } else {
    try {
      const formData = new FormData();
      formData.append('method', selectedMethod.toUpperCase());
      formData.append('amount', topUpAmount);
      if (agentId) formData.append('agentId', agentId);
      if (receipt) formData.append('receipt', receipt);

      const res = await fetch(
        `${backendUrl}/wallet/topup`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (res.ok) {
        setToast({
          message: `Demann ${selectedMethod} voye! Tann admin konfime l. ✅`,
          type: 'success',
        });
        setTopUpAmount('');
        setReceipt(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ message: data.message || 'Erè nan voye demann manuel la', type: 'error' });
      }
    } catch (e) {
      setToast({
        message: "Erè nan voye demann manuel la",
        type: 'error',
      });
    }
  }
};
 
  const handleSendMoney = async (
  recipientId: string,
  value: string,
  pin: string,
) => {
  try {
    if (!recipientId || !value || !pin) {
      alert('Ranpli tout chan yo');
      return;
    }

    if (pin.length !== 4) {
      alert('PIN dwe gen 4 chif');
      return;
    }

    setLoading(true);

    const token =
      localStorage.getItem('token');

    const response = await fetch(
      `${backendUrl}/wallet/transfer`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          recipientEmail: recipientId,

          amount: Number(value),

          pin,
        }),
      },
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Transfer failed',
      );
    }

    alert('Transfer reyisi 🔥');

    setRecipient('');
    setAmount('');
    setPin('');

    await fetchData();

  } catch (error: any) {
    alert(
      error.message ||
        'Erreur transfer',
    );
  } finally {
    setLoading(false);
  }
};

  const handleWithdraw = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${backendUrl}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount), method: withdrawMethod, accountInfo: withdrawAccountInfo })
      });
      if (res.ok) { alert("Demann retrè voye !"); fetchData(); }
    } catch (e) { alert("Erè koneksyon"); }
  };

  // --- SUBMIT KYC WITH TWO PHOTOS (ID + PROFILE PHOTO) ---
  // --- SUBMIT KYC WITH TWO PHOTOS (ID + PROFILE PHOTO) ---
  const handleKycSubmit = async () => {
    if (!kycData.firstName || !kycData.lastName || !kycData.idNumber || !kycData.line1 || !kycData.city) {
      showToast("Tanpri ranpli tout chan ki obligatwa yo", "error");
      return;
    }
    if (!idCardFile) {
      showToast("Tanpri upload foto pyès idantite w la", "error");
      return;
    }
    if (!userPhotoFile) {
      showToast("Tanpri mete yon foto pa w (Selfie) pou verifikasyon", "error");
      return;
    }

    const kycCostHtg = 3375; // $25 USD = 3375 HTG
    const currentBalance = user?.wallet?.balance || 0;

    if (currentBalance < kycCostHtg) {
      showToast(`Balans ou pa ase. Ou bezwen omwen ${kycCostHtg} HTG ($25 USD).`, "error");
      return;
    }

    setKycLoading(true);
    const token = localStorage.getItem('token');
    const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('idType', kycData.idType);
      formDataToSend.append('idNumber', kycData.idNumber);
      formDataToSend.append('idCardFile', idCardFile);
      formDataToSend.append('userPhotoFile', userPhotoFile);

      formDataToSend.append('additionalData', JSON.stringify({
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        phoneNumber: kycData.phoneNumber,
        line1: kycData.line1,
        city: kycData.city,
        state: kycData.state,
        zipCode: kycData.zipCode,
        country: kycData.country,
        dateOfBirth: kycData.dateOfBirth,
      }));

      const res = await fetch(`${currentBackendUrl}/kyc/submit`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
          // REMAK: Pa mete 'Content-Type': 'application/json' lè w ap voye FormData
        },
        body: formDataToSend
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Verifikasyon soumèt epi $25 USD debite ak siksè! 🎉", "success");
        setShowKycForm(false);
        
        // 1. Kreye nouvo objè user a ak status PENDING lan
        const updatedUser = { 
          ...user, 
          kyc: { status: 'PENDING' },
        };
        
        // 2. Mete l nan State la pou l chanje sou ekran an kounye a
        setUser(updatedUser);
        
        // 3. SOVE L NAN LOCALSTORAGE pou lè w refresh li pa disparèt!
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // 4. Reload done yo depi nan sèvè a pou sekirite
        fetchData();
      } else {
        showToast(data.message || "Erè pandan n ap soumèt KYC a.", "error");
      }
    } catch (err) {
      console.error("Détail erè KYC nan Console lan:", err);
      showToast("Erè rezo! Verifye si backend la ap kouri.", "error");
    } finally {
      setKycLoading(false);
    }
  };
 
  if (loading || !user || !minLoadDone) return (
    <div className="min-h-screen bg-[#0A0B0F] flex flex-col items-center justify-center gap-6">
      <img src="/logoicon.png" alt="OzamaPay" className="w-44 h-44 object-contain animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FF6B00]">LOADING...</span>
    </div>
  );
 
  const displayName = user?.name || user?.email?.split('@')[0] || 'Itilizatè';
 
  return (
    <main className="min-h-screen bg-white text-[#0F121E] font-sans overflow-x-hidden relative pb-28">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            backdropFilter: 'blur(20px)',
            background: 'rgba(15,18,30,0.95)',
            opacity: toastFading ? 0 : 1,
            transform: toastFading ? 'translateY(-6px)' : 'translateY(0)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
          className="fixed top-6 left-4 right-4 z-[999] border border-white/10 text-white px-4 py-4 rounded-2xl shadow-xl"
        >
          <div className="flex items-center gap-3">
            <Zap size={15} className={`flex-shrink-0 ${toast.type === 'success' ? 'text-green-400' : toast.type === 'warning' ? 'text-yellow-400' : 'text-[#FF7A00]'}`} />
            <span className="flex-1 font-black italic uppercase text-[10px] tracking-widest leading-relaxed">{toast.message}</span>
            <button onClick={closeToast} className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all">
              <X size={13} className="text-white/50" />
            </button>
          </div>
        </div>
      )}
 
      {/* ── ONBOARDING MODAL ── */}
      {showOnboarding && (() => {
        const steps = [
          {
            emoji: '🇭🇹',
            title: 'Byenvini nan OZAMAPAY!',
            text: 'Premye platfòm peman dijital ayisyen. Kòmanse an 4 etap senp.',
            btn: 'Kòmanse →',
          },
          {
            icon: <PlusCircle size={48} className="text-[#FF6B00]" />,
            title: 'Etap 1: Chaje Bous Ou',
            text: 'Klike TOPUP pou ajoute lajan nan kont ou via MonCash, Zelle ak plis.',
            btn: 'Kontinye →',
          },
          {
            icon: <Shield size={48} className="text-[#FF6B00]" />,
            title: 'Etap 2: Verifye Idantite Ou',
            text: 'Pase KYC pou jwenn aksè konplè. Sa pran < 24h. Frè: $25 USD.',
            btn: 'Kontinye →',
          },
          {
            icon: <CreditCard size={48} className="text-[#FF6B00]" />,
            title: 'Etap 3: Kreye Kat VISA Ou',
            text: 'Apre KYC, kreye kat VISA GRATIS. Achte sou Amazon, Netflix ak plis!',
            btn: 'Kòmanse Kounye a! 🚀',
          },
        ];
        const step = steps[onboardingStep];
        const isLast = onboardingStep === steps.length - 1;
        const finish = () => {
          localStorage.setItem('ozama_onboarded', 'true');
          setShowOnboarding(false);
          setOnboardingStep(0);
        };
        return (
          <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-4" style={{ background: 'rgba(0,0,0,0.88)' }}>
            <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
              {/* Skip */}
              <div className="flex justify-end px-5 pt-4">
                <button onClick={finish} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition">
                  Pase
                </button>
              </div>

              {/* Content */}
              <div className="px-7 pt-2 pb-6 text-center">
                <div className="flex items-center justify-center mb-5 h-20">
                  {'emoji' in step ? (
                    <span className="text-6xl">{(step as any).emoji}</span>
                  ) : (
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center">
                      {(step as any).icon}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-black text-[#0F121E] leading-tight mb-3">{step.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">{step.text}</p>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-6 bg-[#FF6B00]' : 'w-2 bg-gray-200'}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (isLast) finish();
                    else setOnboardingStep(s => s + 1);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] text-white font-black text-sm uppercase tracking-widest hover:bg-[#e85f00] transition active:scale-[0.98]"
                >
                  {step.btn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HEADER - non-home tabs only; home tab has it inside the fixed hero */}
      {activeTab !== 'home' && (
        <header className="px-4 pt-4 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#0F121E] flex items-center justify-center text-[#FF7A00] font-black text-xl shadow-lg relative">
               {displayName.substring(0, 2).toUpperCase()}
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tighter uppercase italic truncate max-w-[160px]">{displayName}</h1>
                <ShieldCheck size={16} className="text-[#FF7A00]" />
              </div>
              <p className="text-[#8E929B] text-[10px] font-bold italic mt-1 uppercase">BYENVINI NAN WALLET OU : <span className="text-[#FF7A00]">OZAMAPAY</span></p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-black/5 active:scale-90 transition-all relative"
            >
              <Bell size={20} className="text-[#0F121E]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF6B00] rounded-full flex items-center justify-center text-white text-[9px] font-black px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {showNotifications && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-14 z-50 w-80 bg-white rounded-3xl shadow-2xl border border-[#F0F0F0] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#0F121E] uppercase tracking-wider">Notifikasyon</span>
                      {unreadCount > 0 && (
                        <span className="text-[9px] font-black bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[9px] font-black text-[#FF6B00] uppercase tracking-wider hover:underline"
                        >
                          Li tout
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-12 flex flex-col items-center gap-3">
                        <Bell size={28} className="text-gray-200" />
                        <p className="text-xs text-gray-400 font-bold">Pa gen notifikasyon toujou</p>
                      </div>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-5 py-4 border-b border-[#F8F9FA] last:border-0 ${n.isRead ? 'bg-[#F8F9FA]' : 'bg-white'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            n.type === 'SUCCESS' ? 'bg-emerald-100' :
                            n.type === 'ERROR'   ? 'bg-red-100' :
                            n.type === 'WARNING' ? 'bg-yellow-100' :
                            'bg-[#FF6B00]/10'
                          }`}>
                            <span className={`text-[10px] font-black ${
                              n.type === 'SUCCESS' ? 'text-emerald-600' :
                              n.type === 'ERROR'   ? 'text-red-500' :
                              n.type === 'WARNING' ? 'text-yellow-600' :
                              'text-[#FF6B00]'
                            }`}>
                              {n.type === 'SUCCESS' ? '✓' : n.type === 'ERROR' ? '✕' : n.type === 'WARNING' ? '!' : 'i'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-[#0F121E] leading-snug">{n.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-300 mt-1 font-bold">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-[#FF6B00] rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}
 
      <div className="px-4">
        
        {/* --- HOME SECTION --- */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-500" style={{ paddingTop: '420px' }}>
            {/* FIXED HERO: header + balance card + action buttons */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }}>
              <header className="px-4 pt-4 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#0F121E] flex items-center justify-center text-[#FF7A00] font-black text-xl shadow-lg relative">
                     {displayName.substring(0, 2).toUpperCase()}
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black tracking-tighter uppercase italic truncate max-w-[160px]">{displayName}</h1>
                      <ShieldCheck size={16} className="text-[#FF7A00]" />
                    </div>
                    <p className="text-[#8E929B] text-[10px] font-bold italic mt-1 uppercase">BYENVINI NAN WALLET OU : <span className="text-[#FF7A00]">OZAMAPAY</span></p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-black/5 active:scale-90 transition-all relative"
                  >
                    <Bell size={20} className="text-[#0F121E]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF6B00] rounded-full flex items-center justify-center text-white text-[9px] font-black px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification panel */}
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute right-0 top-14 z-50 w-80 bg-white rounded-3xl shadow-2xl border border-[#F0F0F0] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#0F121E] uppercase tracking-wider">Notifikasyon</span>
                            {unreadCount > 0 && (
                              <span className="text-[9px] font-black bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="text-[9px] font-black text-[#FF6B00] uppercase tracking-wider hover:underline">
                                Li tout
                              </button>
                            )}
                            <button onClick={() => setShowNotifications(false)} className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-3">
                              <Bell size={28} className="text-gray-200" />
                              <p className="text-xs text-gray-400 font-bold">Pa gen notifikasyon toujou</p>
                            </div>
                          ) : (
                            notifications.map((n: any) => (
                              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 border-b border-[#F8F9FA] last:border-0 ${n.isRead ? 'bg-[#F8F9FA]' : 'bg-white'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.type === 'SUCCESS' ? 'bg-emerald-100' : n.type === 'ERROR' ? 'bg-red-100' : n.type === 'WARNING' ? 'bg-yellow-100' : 'bg-[#FF6B00]/10'}`}>
                                  <span className={`text-[10px] font-black ${n.type === 'SUCCESS' ? 'text-emerald-600' : n.type === 'ERROR' ? 'text-red-500' : n.type === 'WARNING' ? 'text-yellow-600' : 'text-[#FF6B00]'}`}>
                                    {n.type === 'SUCCESS' ? '✓' : n.type === 'ERROR' ? '✕' : n.type === 'WARNING' ? '!' : 'i'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-[#0F121E] leading-snug">{n.title}</p>
                                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                                  <p className="text-[10px] text-gray-300 mt-1 font-bold">{timeAgo(n.createdAt)}</p>
                                </div>
                                {!n.isRead && <div className="w-2 h-2 bg-[#FF6B00] rounded-full shrink-0 mt-1.5" />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </header>
              <div className="px-4 pb-4">
              <div className="relative w-full overflow-hidden rounded-2xl shadow-lg"
                   style={{ backgroundImage: "url('/card.png')", backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: '1.8 / 1' }}>
                <div className="h-full flex flex-col justify-end p-8 text-white relative z-10">
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] mb-1">CURRENT BALANCE</p>
                  <h2 className="text-5xl font-black tracking-tighter italic">
                    {user.wallet?.balance?.toLocaleString() || '0'} <span className="text-white/80 text-2xl font-normal">HTG</span>
                  </h2>
                </div>
              </div>
 
              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {[
                  { id: 'SEND', icon: <Send size={20} />, tab: 'send' },
                  { id: 'TOPUP', icon: <PlusCircle size={20} />, tab: 'topup' },
                  { id: 'RETRAIT', icon: <Banknote size={20} />, tab: 'withdraw' },
                  { id: 'CARDS', icon: <CreditCard size={20} />, tab: 'cards' },
                ].map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.tab)} className="flex flex-col items-center gap-2 active:scale-95 transition-all">
                    <div className="w-full aspect-square rounded-[1.6rem] bg-[#FDF8F3] text-[#FF7A00] flex items-center justify-center border border-black/5 shadow-sm hover:bg-[#FF7A00] hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-widest opacity-70">{item.id}</span>
                  </button>
                ))}
                <button onClick={() => setShowQrModal(true)} className="flex flex-col items-center gap-2 active:scale-95 transition-all">
                  <div className="w-full aspect-square rounded-[1.6rem] bg-[#FDF8F3] text-[#FF7A00] flex items-center justify-center border border-black/5 shadow-sm hover:bg-[#FF7A00] hover:text-white transition-colors">
                    <QrCode size={20} />
                  </div>
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-70">QR</span>
                </button>
              </div>

              {/* QR MODAL */}
              {showQrModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                  <div className="relative bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-black text-lg text-[#0F121E] uppercase tracking-tight">Kòd QR Peman Ou</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Lòt moun skane sa pou voye kòb ba ou</p>
                      </div>
                      <button onClick={() => setShowQrModal(false)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-5">
                      <div className="p-4 bg-[#FDF8F3] rounded-3xl border border-orange-100">
                        <QRCodeSVG
                          id="qr-svg"
                          value={`https://ozamapay.com/pay?to=${user?.email || ''}&name=${encodeURIComponent(user?.name || displayName)}`}
                          size={200}
                          fgColor="#FF6B00"
                          bgColor="#FDF8F3"
                          level="M"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-[#0F121E]">{displayName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{user?.email}</p>
                      </div>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => { navigator.share?.({ title: 'OzamaPay QR', text: `Voye kòb ba ${displayName} sou OzamaPay`, url: `https://ozamapay.com/pay?to=${user?.email}&name=${encodeURIComponent(user?.name || displayName)}` }).catch(() => {}); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-black uppercase tracking-wider hover:bg-[#e85f00] transition"
                        >
                          <Share2 size={14} /> Pataje
                        </button>
                        <button
                          onClick={() => {
                            const svg = document.querySelector('#qr-svg') as SVGElement | null;
                            if (!svg) return;
                            const data = new XMLSerializer().serializeToString(svg);
                            const a = document.createElement('a');
                            a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
                            a.download = 'ozamapay-qr.svg';
                            a.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-[#0F121E] text-xs font-black uppercase tracking-wider hover:bg-gray-200 transition"
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
 
            <div style={{ height: 'calc(100vh - 420px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
            <div className="flex justify-between items-end mb-5 mt-2">
              <h3 className="font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
                <Activity size={14} className="text-[#FF7A00]" /> Recent Activity
              </h3>
              <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard/transactions'; }} className="text-[#FF7A00] text-[10px] font-black uppercase italic tracking-widest">See More +</button>
            </div>
 
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-gray-400 text-xs italic text-center py-6 bg-white rounded-[2.2rem] border border-black/[0.04]">
                  Pa gen okenn tranzaksyon pou kounye a.
                </p>
              ) : (
                transactions.slice(0, 4).map((t: any, idx) => {
                  const isDebit = t.type === 'WITHDRAWAL' || t.type === 'DEBIT' || t.type === 'sent' ||
                    (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email);

                  const amt = (t.amount || 0).toLocaleString();
                  const serviceName = (() => {
                    if (t.type === 'TOPUP') return 'Topup';
                    if (t.type === 'TRANSFER') return 'Transfer';
                    if (t.type === 'WITHDRAWAL') return 'Retrè';
                    if (t.type === 'CARD') return 'Visa';
                    if (t.type === 'PAYMENT') return 'Peman';
                    return t.type || 'Tranzaksyon';
                  })();
                  const agentFirstName = t.agentName ? t.agentName.split(' ')[0] : null;
                  const txTitle = `${serviceName} ${amt} HTG${agentFirstName ? ` · kay ${agentFirstName}` : ''}`;
                  const statusBadge = (() => {
                    switch (t.status) {
                      case 'COMPLETED': return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-600">Konplète</span>;
                      case 'PENDING': case 'PROCESSING': return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">Atant</span>;
                      case 'FAILED': return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-500">Echwe</span>;
                      case 'REJECTED': case 'CANCELLED': return <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Rejte</span>;
                      default: return null;
                    }
                  })();

                  return (
                    <div key={idx} className="tx-item group flex items-center justify-between p-5 bg-white rounded-[2.2rem] border border-black/[0.04] hover:border-[#FF7A00]/20 transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDebit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          {isDebit ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-[11px] uppercase italic leading-snug tracking-tight text-black max-w-[180px]">
                            {txTitle}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#8E929B] font-bold uppercase tracking-tighter">
                              {t.createdAt ? formatTimeAgo(t.createdAt) : 'Kounye a'}
                            </span>
                            {statusBadge}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </div>
          </div>
        )}

        {/* --- HISTORY SECTION --- */}
        {activeTab === 'history' && (
          <div className="animate-in slide-in-from-right duration-500">
            <button onClick={() => setActiveTab('home')} className="mb-8 text-[#FF7A00] font-black italic uppercase text-[10px] flex items-center gap-2">
              <ChevronRight size={14} className="rotate-180" /> Retounen
            </button>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-8 text-[#0F121E]">Istorik Konplè</h2>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-gray-400 text-xs italic text-center py-6 bg-white rounded-xl border border-black/5 shadow-sm">
                  Pa gen okenn istwa tranzaksyon.
                </p>
              ) : (
                transactions.map((t: any, idx) => {
                  const isDebit = t.type === 'WITHDRAWAL' || t.type === 'DEBIT' || t.type === 'sent' ||
                    (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email);

                  return (
                    <div key={idx} className="flex items-center justify-between p-6 bg-white border border-black/5 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDebit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          {isDebit ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
<p className="font-black text-sm uppercase italic leading-none tracking-tight text-black">
  {t.type === 'TOPUP' ? (t.method || 'Depot') :
   t.type === 'WITHDRAWAL' ? (t.description || t.method || 'Retrè') :
   isDebit
    ? (t.receiverWallet?.user?.name || t.receiverWallet?.user?.email || 'Destinatè')
    : (t.senderWallet?.user?.name || t.senderWallet?.user?.email || 'Ozama User')}
</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                            {t.type === 'TOPUP' ? 'Depot' : t.type === 'WITHDRAWAL' ? 'Retrè' : (isDebit ? 'Transfè' : 'Depo')} • {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : ''}
                          </p>
                        </div>
                      </div>
                      <p className={`font-black italic text-base ${isDebit ? 'text-red-500' : 'text-[#00C566]'}`}>
                        {isDebit ? '-' : '+'}{(t.amount || 0).toLocaleString()} HTG
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
 
        {/* --- SEND SECTION --- */}
{activeTab === 'send' && (
  <div className="animate-in slide-in-from-right duration-500" style={{ paddingTop: '92px' }}>
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }} className="px-4 pt-4 pb-4">
      <button
        onClick={() => setActiveTab('home')}
        className="mb-4 text-[#FF7A00] font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2"
      >
        <ArrowLeftRight size={14} className="rotate-180" />
        Back Home
      </button>
      <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
        Send<br />Money
      </h2>
    </div>
    <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
    <div className="space-y-6">
      
      {/* RECIPIENT */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">
          Recipient Email
        </label>

        <input
          className="w-full p-8 bg-gray-50 rounded-[2rem] font-bold outline-none border border-black/5 focus:bg-white transition-all"
          placeholder="example@ozamapay.com"
          value={recipient}
          onChange={(e) =>
            setRecipient(e.target.value)
          }
        />
      </div>

      {/* AMOUNT */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">
          Amount (HTG)

          <span className="text-[#FF7A00] ml-2">
            FEE: 0%
          </span>
        </label>

        <input
          className="w-full p-8 bg-gray-50 rounded-[2rem] font-black italic text-4xl outline-none border border-black/5 focus:bg-white"
          placeholder="0.00"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            if (Number(val) < 0) return;
            setAmount(val);
          }}
        />
      </div>

      {/* SECURITY PIN */}
      <div className="space-y-2">
        <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">
          Security PIN
        </label>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          className="w-full p-8 bg-gray-50 rounded-[2rem] font-black text-3xl outline-none border border-black/5 focus:bg-white transition-all tracking-[12px]"
          placeholder="••••"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value)
          }
        />
      </div>

      {/* BUTTON */}
      <button
        onClick={() =>
          handleSendMoney(
            recipient,
            amount,
            pin,
          )
        }
        className="w-full bg-[#0F121E] text-white py-8 rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all text-xs"
      >
        Confirm Transfer
      </button>
    </div>
    </div>{/* end scroll */}
  </div>
)}
        {/* --- TOPUP SECTION --- */}
        {activeTab === 'topup' && (
          <div className="animate-in slide-in-from-bottom duration-500" style={{ paddingTop: '152px' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }} className="px-4 pt-4 pb-4">
              <button onClick={() => setActiveTab('home')} className="mb-3 text-[#FF7A00] font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                <PlusCircle size={14} /> Back Home
              </button>
              <h2 className="text-4xl font-black italic uppercase mb-1 tracking-tighter leading-none">Add Funds</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Chaje bous ou ak sekirite</p>
              {selectedMethod !== 'natcash' ? (
                <div className="bg-gray-100 p-2 rounded-[2rem] flex gap-2 border border-black/5">
                  <button onClick={() => setTopUpType('AUTOMATIC')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase italic tracking-widest transition-all ${topUpType === 'AUTOMATIC' ? 'bg-white text-[#FF7A00] shadow-sm' : 'text-gray-400'}`}>Automatic</button>
                  <button onClick={() => setTopUpType('MANUAL')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase italic tracking-widest transition-all ${topUpType === 'MANUAL' ? 'bg-[#0F121E] text-white shadow-lg' : 'text-gray-400'}`}>Manuel (2H)</button>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-[2rem] flex items-center justify-center border border-black/5">
                  <span className="font-black text-[10px] uppercase italic tracking-widest text-[#0F121E]">Manuel (15-25 min)</span>
                </div>
              )}
            </div>
            <div style={{ height: 'calc(100vh - 240px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
            <div className="space-y-6">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-black/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><PlusCircle size={60}/></div>
                <label className="text-[9px] font-black uppercase opacity-40 mb-4 block tracking-[0.2em]">{topupIsIntl ? 'Montan an USD' : 'Montan an HTG'}</label>
                <input className="w-full bg-transparent font-black italic text-5xl outline-none text-[#0F121E]" placeholder="0" type="number" min="0" value={topUpAmount} onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setTopUpAmount(val); }} />
                {topUpAmount && (() => {
                  const isMccAuto = selectedMethod === 'moncash' && topUpType === 'AUTOMATIC';
                  const feeRate = isMccAuto ? 0.089 : 0.06;
                  const feeAmount = Math.round(topupHTG * feeRate);
                  const amountAfterFee = topupHTG - feeAmount;
                  const feeLabel = isMccAuto
                    ? 'FRAIS (8.9% — 6% OZAMAPAY + 2.9% MonCash)'
                    : 'FRAIS OZAMAPAY (6.0%)';
                  return (
                    <div className="mt-4 pt-4 border-t border-black/5 animate-in fade-in space-y-2">
                      {topupIsIntl && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase italic text-gray-400">Ekivalan HTG</span>
                          <span className="text-[10px] font-black italic text-[#0F121E]">${topUpAmount} USD = {topupHTG.toLocaleString()} HTG</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase italic text-gray-400">{feeLabel}</span>
                        <span className="text-[10px] font-black uppercase italic text-gray-400">{feeAmount.toLocaleString()} HTG</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black italic text-[#FF7A00]">Wap Resevwa</span>
                        <span className="text-xs font-black italic text-[#FF7A00]">{amountAfterFee.toLocaleString()} HTG</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
 
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">Chwazi Mwayen Peman</label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((m) => (
                    <button key={m.id} onClick={() => {
                      if (m.id === 'natcash') {
                        setSelectedMethod('natcash');
                        setTopUpType('MANUAL');
                        return;
                      }
                      setSelectedMethod(m.id);
                    }} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between ${selectedMethod === m.id ? 'border-[#FF7A00] bg-[#FFF9F5]' : 'border-black/5 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <img src={`/${m.img}`} className="w-6 h-6 object-contain" alt="" />
                        <span className="font-black italic uppercase text-[10px]">{m.label}</span>
                      </div>
                      {selectedMethod === m.id && <CheckCircle2 size={14} className="text-[#FF7A00]" />}
                    </button>
                  ))}
                </div>
              </div>
 
              {topUpType === 'MANUAL' && selectedMethod && (
                <div className="animate-in zoom-in duration-300 bg-[#0F121E] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                  <p className="text-[9px] font-black uppercase text-[#FF7A00] mb-2 tracking-widest">Instruction Peman</p>
                  <h4 className="text-xl font-black italic uppercase mb-1">Voye kòb la sou:</h4>
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-6">{paymentMethods.find(x => x.id === selectedMethod)?.name}</p>
                  
                  <div className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/10 mb-6">
                    <span className="font-black italic text-lg text-white truncate pr-4">
                        {paymentMethods.find(x => x.id === selectedMethod)?.info}
                    </span>
                    <button onClick={() => copyToClipboard(paymentMethods.find(x => x.id === selectedMethod)?.info || '')} className="p-3 bg-[#FF7A00] rounded-xl active:scale-90">
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  {selectedMethod === 'moncash' && topUpType === 'MANUAL' && showMoncashGuide && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 relative">
                      <button
                        onClick={() => setShowMoncashGuide(false)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                      <p className="text-blue-700 font-bold text-sm mb-3 flex items-center gap-2">
                        <Info size={16} /> Kijan pou w depoze manyèlman
                      </p>
                      <div className="space-y-2">
                        {[
                          "Ouvri aplikasyon MonCash ou a",
                          `Voye egzak montan an sou: ${process.env.NEXT_PUBLIC_MONCASH_NUMBER || '+(509) 48-08-8715'}`,
                          "Non: Ralph Olivier Greffin",
                          "Fè yon screenshot reçu konfirmasyon MonCash la",
                          "Retounen isit epi upload screenshot la",
                          "Soumèt demann nan — ekip nou ap konfime nan 15-25 minit"
                        ].map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <p className="text-blue-800 text-xs">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center gap-2 hover:bg-white/5 transition-all mb-4">
                    <Upload size={20} className="text-[#FF7A00]" />
                    <span className="text-[9px] font-black uppercase italic">{receipt ? receipt.name : 'Upload Screenshot Resi'}</span>
                  </button>
                </div>
              )}
 
              {mccPaymentUrl ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <a
                    href={mccPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-8 rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-xl text-xs bg-[#FF7A00] text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    Peye via MonCash →
                  </a>
                  {mccPolling && (
                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse py-2">
                      Ap verifye peman ou… 🔄
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setMccPaymentUrl(null);
                      setMccPolling(false);
                      if (mccPollRef.current) clearInterval(mccPollRef.current);
                    }}
                    className="w-full py-3 text-[10px] font-black uppercase italic tracking-widest text-gray-400 hover:text-red-400 transition-all"
                  >
                    Anile
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePaymentLogic}
                  className={`w-full py-8 rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-xl text-xs transition-all active:scale-95 ${
                    topUpAmount && selectedMethod ? 'bg-[#FF7A00] text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  Confirm TopUp
                </button>
              )}
            </div>
            </div>{/* end scroll */}
          </div>
        )}

        {/* --- WITHDRAW SECTION --- */}
        {activeTab === 'withdraw' && (
          <div className="animate-in slide-in-from-bottom duration-500" style={{ paddingTop: '92px' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }} className="px-4 pt-4 pb-4">
              <button onClick={() => setActiveTab('home')} className="mb-3 text-[#FF7A00] font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Banknote size={14} /> Back Home
              </button>
              <h2 className="text-4xl font-black italic uppercase mb-1 tracking-tighter leading-none">Withdraw</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Retire kòb ou rapidman</p>
            </div>
            <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
            <div className="space-y-6">
              <div className="bg-[#0F121E] p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote size={80}/></div>
                <label className="text-[9px] font-black uppercase text-[#FF7A00] mb-4 block tracking-[0.2em]">{withdrawIsIntl ? 'Montan an USD' : 'Kòb pou retire (HTG)'}</label>
                <input className="w-full bg-transparent font-black italic text-5xl outline-none text-white" placeholder="0" type="number" min="0" value={withdrawAmount} onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setWithdrawAmount(val); }} />
                {withdrawAmount && (
                  <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in space-y-2">
                    {withdrawIsIntl && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase italic text-white/40">Ekivalan HTG</span>
                        <span className="text-[10px] font-black italic text-white">${withdrawAmount} USD = {withdrawHTG.toLocaleString()} HTG</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase italic text-white/40">Frais Ozama (2.0%)</span>
                      <span className="text-[10px] font-black uppercase italic text-white/40">-{calculateFees(String(withdrawHTG)).fee} HTG</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black italic text-green-400">Total Debite</span>
                      <span className="text-xs font-black italic text-green-400">{(withdrawHTG + Number(calculateFees(String(withdrawHTG)).fee)).toLocaleString()} HTG</span>
                    </div>
                  </div>
                )}
              </div>
 
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">Ki kote pou n voye kòb la?</label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((m) => (
                    <button key={m.id} onClick={() => setWithdrawMethod(m.id)} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between ${withdrawMethod === m.id ? 'border-[#FF7A00] bg-[#FFF9F5]' : 'border-black/5 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <img src={`/${m.img}`} className="w-6 h-6 object-contain" alt="" />
                        <span className="font-black italic uppercase text-[10px]">{m.label}</span>
                      </div>
                      {withdrawMethod === m.id && <CheckCircle2 size={14} className="text-[#FF7A00]" />}
                    </button>
                  ))}
                </div>
              </div>
 
              {withdrawMethod && (
                <div className="animate-in slide-in-from-top duration-300 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase opacity-40 ml-4 tracking-widest">Enfòmasyon Kont ou ({withdrawMethod})</label>
                    <input className="w-full p-8 bg-gray-50 rounded-[2rem] font-bold outline-none border border-black/5 focus:bg-white" 
                           placeholder={withdrawMethod === 'bank' ? "Nimewo Kont & Non Bank..." : "Nimewo Telefòn oswa Tag..."} 
                           value={withdrawAccountInfo} 
                           onChange={(e) => setWithdrawAccountInfo(e.target.value)} />
                  </div>
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex gap-4">
                    <Info size={20} className="text-blue-500 shrink-0" />
                    <p className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed">
                      Pwosesis retrè a ka pran ant 30 minit a 2 è tan pou l konfime. Tanpri asire enfòmasyon yo kòrèk.
                    </p>
                  </div>
                </div>
              )}
 
              <button onClick={handleWithdraw} className={`w-full py-8 rounded-[2.5rem] font-black uppercase italic tracking-widest shadow-xl text-xs transition-all active:scale-95 ${withdrawAmount && withdrawMethod ? 'bg-[#0F121E] text-white' : 'bg-gray-200 text-gray-400'}`}>
                Confirm Withdrawal
              </button>
            </div>
            </div>{/* end scroll */}
          </div>
        )}

        {/* --- GLOBAL FINANCE SECTION --- */}
        {activeTab === 'finance' && !selectedFinanceService && (
          <div className="animate-in slide-in-from-right duration-500" style={{ paddingTop: '102px' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }} className="px-4 pt-4 pb-4">
              <button onClick={() => setActiveTab('home')} className="mb-3 text-[#FF7A00] font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Landmark size={14} /> Back Home
              </button>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Ozama<br/>Exchange</h2>
            </div>
            <div style={{ height: 'calc(100vh - 190px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
            <div className="grid gap-4">
              {[
                { id: 'wise', name: 'Wise', desc: 'USD Transfer', img: 'wise.png' },
                { id: 'meru', name: 'Meru', desc: 'USD Transfer', img: 'meru.png' },
                { id: 'zelle', name: 'Zelle', desc: 'USD Transfer', img: 'zelle.png' },
                { id: 'cashapp', name: 'CashApp', desc: 'USD Transfer', img: 'cashapp.png' },
                { id: 'natcash', name: 'Natcash', desc: 'HTG Transfer', img: 'natcash.png' },
                { id: 'usdt', name: 'USDT ONLY', desc: 'TRC20 Network', img: 'usdt.png' },
                { id: 'gaming', name: 'Gaming Topup', desc: 'Diamonds & Coins', img: 'gaming.png' }
              ].map(item => (
                <button key={item.id} onClick={() => setSelectedFinanceService(item)} className="p-8 bg-gray-50 rounded-[2.5rem] border border-black/5 flex items-center justify-between group active:scale-95 transition-all hover:bg-white hover:shadow-xl">
                  <div className="flex items-center gap-6 text-left">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#FF7A00] shadow-sm p-3">
                       <img src={`/${item.img}`} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h4 className="font-black italic uppercase text-sm">{item.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#FF7A00] group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
            </div>{/* end scroll */}
          </div>
        )}
 
        {/* --- SERVICE DETAIL --- */}
        {activeTab === 'finance' && selectedFinanceService && (
          <div className="animate-in zoom-in duration-500" style={{ paddingTop: '132px' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }} className="px-4 pt-4 pb-4">
              <button onClick={() => { setSelectedFinanceService(null); setFinanceReceipt(null); }} className="mb-3 text-[#FF7A00] font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ChevronRight size={14} className="rotate-180" /> Back to Services
              </button>
              <div className="flex items-center gap-4 mb-3">
                <img src={`/${selectedFinanceService.img}`} className="w-10 h-10 object-contain" alt="" />
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{selectedFinanceService.name}</h2>
              </div>
              <div className="bg-gray-100 p-2 rounded-3xl flex gap-2">
                <button onClick={() => setFinanceType('BUY')} className={`flex-1 py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all ${financeType === 'BUY' ? 'bg-[#0F121E] text-white' : 'text-gray-400'}`}>Buy / Deposit</button>
                <button onClick={() => setFinanceType('SELL')} className={`flex-1 py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all ${financeType === 'SELL' ? 'bg-[#0F121E] text-white' : 'text-gray-400'}`}>Sell / Cashout</button>
              </div>
            </div>
            <div style={{ height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'relative' }} className="pb-24">
            {financeType === 'BUY' && (
              <div className="bg-[#0F121E] p-8 text-white mb-8 rounded-3xl shadow-xl border-l-4 border-[#FF7A00]">
                <p className="text-[9px] font-black uppercase text-[#FF7A00] mb-4 tracking-widest italic">Info Peman Benefisyè</p>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-1">
                    {selectedFinanceService.id === 'bank' ? 'Capital Bank USD' : selectedFinanceService.name}
                  </p>
                  <p className="font-black italic text-xl tracking-tight mb-2">
                    {selectedFinanceService.id === 'bank' && PAYMENT_INFO.bank_usd.acc}
                    {selectedFinanceService.id === 'wise' && PAYMENT_INFO.wise.acc}
                    {selectedFinanceService.id === 'meru' && PAYMENT_INFO.meru.acc}
                    {selectedFinanceService.id === 'zelle' && PAYMENT_INFO.zelle.acc}
                    {selectedFinanceService.id === 'cashapp' && PAYMENT_INFO.cashapp.acc}
                    {selectedFinanceService.id === 'usdt' && PAYMENT_INFO.usdt.acc}
                  </p>
                  <p className="text-[10px] font-black uppercase text-[#FF7A00]">{PAYMENT_INFO.zelle.name}</p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {selectedFinanceService.id === 'gaming' && (
                <div className="space-y-4">
                  <select value={financeDetails.gamePack} onChange={(e) => setFinanceDetails({...financeDetails, gamePack: e.target.value})} className="w-full p-6 bg-gray-50 rounded-2xl font-black uppercase italic text-xs border border-black/5 outline-none focus:border-[#FF7A00]">
                    <option value="">CHWAZI JWÈT LA</option>
                    <option value="FREE FIRE (Diamonds)">FREE FIRE (Diamonds)</option>
                    <option value="PUBG MOBILE (UC)">PUBG MOBILE (UC)</option>
                    <option value="CALL OF DUTY (CP)">CALL OF DUTY (CP)</option>
                  </select>
                  <input value={financeDetails.gameId} onChange={(e) => setFinanceDetails({...financeDetails, gameId: e.target.value})} className="w-full p-6 bg-gray-50 rounded-2xl font-bold uppercase text-xs border border-black/5 outline-none" placeholder="METE PLAYER ID OU LA..." />
                </div>
              )}
 
              <div className="bg-gray-50 p-8 rounded-3xl border border-black/5">
                <label className="text-[9px] font-black uppercase opacity-40 mb-4 block tracking-widest">Montan ({selectedFinanceService.id === 'usdt' ? 'USDT' : 'USD'})</label>
                <input className="w-full bg-transparent font-black italic text-5xl outline-none" placeholder="0.00" type="number" min="0" value={financeDetails.amount} onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setFinanceDetails({...financeDetails, amount: val}); }} />
                <div className="mt-4 pt-4 border-t border-black/5 flex justify-between">
                    <span className="text-[10px] font-black italic uppercase text-gray-400">Frais Echanj: 6%</span>
                    <span className="text-[10px] font-black italic uppercase text-[#FF7A00]">Rate: 1 USD = {exchangeRate} HTG</span>
                </div>
              </div>
              
              {selectedFinanceService.id !== 'gaming' && (
                <input className="w-full p-8 bg-gray-50 rounded-2xl font-bold outline-none border border-black/5" placeholder="Email oswa Username Sèvis la..." onChange={(e) => setFinanceDetails({...financeDetails, email: e.target.value})} />
              )}
              
              {financeType === 'BUY' && (
                <div className="p-8 bg-orange-50/30 border border-orange-100 rounded-3xl">
                    <p className="text-[10px] font-black uppercase text-[#FF7A00] mb-4 tracking-widest">Etap Final: Upload Prèv Peman</p>
                    <button onClick={() => financeFileInputRef.current?.click()} className="w-full p-10 rounded-2xl border-2 border-dashed border-orange-200 bg-white flex flex-col items-center gap-2 hover:bg-orange-50 transition-all">
                        <Upload size={24} className="text-[#FF7A00]" />
                        <span className="text-[9px] font-black uppercase italic text-gray-500">{financeReceipt ? financeReceipt.name : 'Chwazi Screenshot la'}</span>
                    </button>
                </div>
              )}
              
              <button
                onClick={handleFinanceSubmit}
                disabled={financeLoading}
                className="w-full bg-[#0F121E] text-white py-8 rounded-3xl font-black uppercase italic tracking-[0.3em] shadow-xl text-xs active:scale-95 transition-all hover:bg-[#FF7A00] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {financeLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Voye demann...
                  </>
                ) : (
                  `Execute ${selectedFinanceService.name} Order`
                )}
              </button>
            </div>
            </div>{/* end scroll */}
          </div>
        )}

        {/* --- CARDS SECTION --- */}
        {activeTab === 'cards' && (
          <div className="animate-in fade-in duration-700">
            {!virtualCard?.cardId ? (
              /* ===== CREATION FORM ===== */
              <div className="px-4 pt-6">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-[#0F121E] italic">OZAMA<br/>VIRTUAL CARD</h2>
                </div>

                {/* Card preview placeholder */}
                <div className="relative w-full rounded-3xl overflow-hidden mb-6" style={{aspectRatio: '1.586'}}>
                  <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" />
                </div>

                {/* Creation form */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-[#0F121E]">KREYE KAT VISA</p>
                    <span className="bg-[#b8e832] text-black text-xs font-black px-3 py-1 rounded-full">GRATIS</span>
                  </div>
                  <p className="text-orange-500 text-sm font-medium mb-4">
                    Kreye kat VISA ou GRATIS — OZAMAPAY peye frè kreye a pou ou!
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Depo Inisyal (Min. $3 USD)</p>
                  <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3 mb-4">
                    <span className="text-gray-400 mr-2">$</span>
                    <input
                      type="number"
                      min="3"
                      value={cardCreateAmount}
                      onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setCardCreateAmount(val); }}
                      className="flex-1 outline-none text-[#0F121E] font-bold text-lg"
                      placeholder="3"
                    />
                    <span className="text-gray-400 text-sm">USD</span>
                  </div>
                  <button
                    onClick={async () => {
                      const amt = Number(cardCreateAmount);
                      if (!amt || amt < 3) { alert('Montan minim se $3 USD'); return; }
                      try {
                        const token = localStorage.getItem('token');
                        const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                        const res = await fetch(`${currentBackendUrl}/v1/cards/create`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount_usd: amt }),
                        });
                        const contentType = res.headers.get('content-type');
                        if (res.ok && contentType?.includes('application/json')) {
                          const data = await res.json();
                          setVirtualCard(data.card || data);
                          fetchData();
                        } else {
                          const errorData = contentType?.includes('application/json') ? await res.json() : null;
                          alert(errorData?.message || 'Erè pandan kreyasyon kat la.');
                        }
                      } catch (err) {
                        alert('Sèvè a pa ka jwenn requete a.');
                      }
                    }}
                    className="w-full py-4 bg-[#b8e832] text-black font-black rounded-2xl tracking-wider flex items-center justify-center gap-2"
                  >
                    <Zap size={16} /> KREYE KAT GRATIS
                  </button>
                </div>
              </div>
            ) : (
              /* ===== CARD DISPLAY ===== */
              <div className="animate-in fade-in duration-500" style={{ paddingTop: 'calc(56vw + 48px)' }}>

                {/* FIXED CARD */}
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }}>

                  {/* Card image */}
                  <div className="px-4 pt-12">
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.586' }}>
                    <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 px-6 py-5 flex flex-col justify-between">
                      <div></div>
                      <div>
                        <p className="text-white/60 text-[10px] mb-0.5">Card Number</p>
                        <button
                          onClick={() => {
                            const num = showCardDetails && virtualCard?.cardNumber
                              ? virtualCard.cardNumber
                              : virtualCard?.cardId;
                            navigator.clipboard.writeText(num || '');
                            alert('Nimewo kopye!');
                          }}
                          className="flex items-center gap-2 group"
                        >
                          <p className="text-white font-bold text-base tracking-wider drop-shadow">
                            {showCardDetails && virtualCard?.cardNumber
                              ? virtualCard.cardNumber.replace(/(.{4})/g, '$1 ').trim()
                              : `${virtualCard?.cardId?.slice(0,4).toUpperCase()} •••• •••• ${virtualCard?.cardId?.slice(-4).toUpperCase()}`
                            }
                          </p>
                          <Copy size={12} className="text-white/50 group-hover:text-white" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/60 text-[10px] mb-0.5">Cardholder</p>
                          <p className="text-white font-bold text-sm leading-tight">
                            {showCardDetails ? (virtualCard?.cardName || 'OZAMA USER') : 'OZAMA USER'}
                          </p>
                          <p className="text-white/60 text-[10px] mt-1.5 mb-0.5">Expires</p>
                          <p className="text-white font-bold text-sm">
                            {showCardDetails ? (virtualCard?.expiryDate || 'MM/AA') : 'MM/AA'}
                          </p>
                        </div>
                        <p className="text-white/30 font-black text-lg tracking-widest">VISA</p>
                      </div>
                    </div>
                  </div>
                  </div>{/* end px-4 pt-12 wrapper */}

                  <div style={{
                    position: 'absolute',
                    bottom: '-24px',
                    left: 0,
                    right: 0,
                    height: '24px',
                    background: 'linear-gradient(to bottom, white, transparent)',
                    zIndex: 41,
                    pointerEvents: 'none'
                  }}></div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div style={{ height: 'calc(100vh - 56vw - 48px)', overflowY: 'auto', position: 'relative' }} className="pb-24 px-4">

                  {/* 5 ACTION BUTTONS */}
                  <div className="flex justify-between items-center mt-4 pb-3">
                    {[
                      { icon: <Eye size={22} className="text-orange-500" />, label: 'WÈ INFO', action: 'info' },
                      { icon: <Zap size={22} className="text-orange-500" />, label: 'RECHARGE', action: 'recharge' },
                      { icon: <Copy size={22} className="text-orange-500" />, label: 'KOPYE', action: 'copy' },
                      { icon: <Lock size={22} className="text-orange-500" />, label: 'BLOKE', action: 'freeze' },
                    ].map((btn) => (
                      <button
                        key={btn.action}
                        onClick={async () => {
                          if (btn.action === 'copy') {
                            const num = showCardDetails && virtualCard?.cardNumber
                              ? virtualCard.cardNumber
                              : virtualCard?.cardId;
                            navigator.clipboard.writeText(num || '');
                            alert('Nimewo kopye!');
                            return;
                          }
                          if (btn.action === 'recharge') { setShowRechargeModal(true); return; }
                          if (btn.action === 'info') {
                            if (showCardDetails) { setShowCardDetails(false); return; }
                            try {
                              const token = localStorage.getItem('token');
                              const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                              const res = await fetch(`${currentBackendUrl}/v1/cards/secret-details`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setVirtualCard((prev: any) => ({
                                  ...prev,
                                  cardNumber: data.cardNumber,
                                  cvv: data.cvv,
                                  expiryDate: data.expiryDate,
                                  cardName: data.cardName,
                                  balance: data.balance,
                                  last4: data.last4,
                                }));
                                setShowCardDetails(true);
                              } else { alert(data.message || 'Erè'); }
                            } catch { alert('Erè koneksyon'); }
                            return;
                          }
                          if (btn.action === 'freeze') {
                            try {
                              const token = localStorage.getItem('token');
                              const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                              const endpoint = virtualCard?.status === 'FROZEN' ? 'unfreeze' : 'freeze';
                              const res = await fetch(`${currentBackendUrl}/v1/cards/${endpoint}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setVirtualCard((prev: any) => ({
                                  ...prev,
                                  status: endpoint === 'freeze' ? 'FROZEN' : 'ACTIVE'
                                }));
                                alert(endpoint === 'freeze' ? 'Kat bloke!' : 'Kat debloke!');
                              } else { alert(data.message || 'Erè'); }
                            } catch { alert('Erè koneksyon'); }
                            return;
                          }
                          if (btn.action === 'history') {
                            alert('ISTORIK ap vini byento!');
                            return;
                          }
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className={`w-14 h-14 rounded-[1.4rem] flex items-center justify-center border-2 transition-all ${
                          (btn.action === 'info' && showCardDetails) || (btn.action === 'freeze' && virtualCard?.status === 'FROZEN')
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-orange-50 border-orange-100'
                        }`}>
                          {btn.action === 'info' && showCardDetails
                            ? <EyeOff size={22} className="text-white" />
                            : btn.action === 'freeze' && virtualCard?.status === 'FROZEN'
                            ? <Unlock size={22} className="text-white" />
                            : btn.icon
                          }
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#0F121E]">{btn.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* BALANCE */}
                  <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 mb-3">
                    <div>
                      <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-1">Balans Kat</p>
                      <p className="text-[#0F121E] text-3xl font-black">${Number(virtualCard?.balance || 0).toFixed(2)} <span className="text-base font-normal text-gray-400">USD</span></p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center">
                      <Wallet2 size={22} className="text-white" />
                    </div>
                  </div>

                  {/* CARD DETAILS — shown only when showCardDetails is true */}
                  {showCardDetails && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-3">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[#0F121E] font-black text-sm">Detay Kat</p>
                        <button onClick={() => setShowCardDetails(false)} className="text-gray-300 hover:text-gray-500">
                          <EyeOff size={18} />
                        </button>
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>

                        {/* Nimewo konplè - full width */}
                        <div style={{gridColumn: '1 / -1', background: 'var(--color-background-secondary, #f5f5f5)'}} className="rounded-xl p-3">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Nimewo Konplè</p>
                          <div className="flex items-center justify-between gap-2">
                            <p style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} className="text-[#0F121E] font-bold text-sm">
                              {virtualCard?.cardNumber?.replace(/(.{4})/g, '$1 ').trim() || '————'}
                            </p>
                            <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardNumber || ''); alert('Nimewo kopye!'); }} className="flex-shrink-0">
                              <Copy size={13} className="text-gray-300" />
                            </button>
                          </div>
                        </div>

                        {/* CVV */}
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">CVV</p>
                          <p className="text-[#0F121E] font-bold text-xl">{virtualCard?.cvv || '———'}</p>
                        </div>

                        {/* Ekspire */}
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Ekspire</p>
                          <p className="text-[#0F121E] font-bold text-sm">{virtualCard?.expiryDate || '——/——'}</p>
                        </div>

                        {/* Nom sou kat - full width */}
                        <div style={{gridColumn: '1 / -1'}} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Nom sou Kat</p>
                          <div className="flex items-center justify-between gap-2">
                            <p style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} className="text-[#0F121E] font-bold text-sm">
                              {virtualCard?.cardName || '————'}
                            </p>
                            <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardName || ''); alert('Nom kopye!'); }} className="flex-shrink-0">
                              <Copy size={13} className="text-gray-300" />
                            </button>
                          </div>
                        </div>

                        {/* Adres - full width */}
                        <div style={{gridColumn: '1 / -1'}} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Billing</p>
                          <p style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} className="text-[#0F121E] font-bold text-xs">
                            {user?.kyc?.line1 || '—'}, {user?.kyc?.city || 'Jacmel'}, Haiti · {user?.kyc?.zipCode || '0000'}
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* NFC BADGE */}
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Smartphone size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[#0F121E] font-bold text-sm">Google Pay & Apple Pay</p>
                      <p className="text-gray-400 text-xs">Kat ou a sipòte NFC contactless</p>
                    </div>
                    <span className="ml-auto text-orange-500 text-xs font-black bg-orange-100 px-2 py-1 rounded-full">AKTIF</span>
                  </div>

                </div>{/* end scrollable */}

                {/* RECHARGE MODAL */}
                {showRechargeModal && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full rounded-t-3xl p-6 pb-10 shadow-2xl">
                      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[#0F121E] font-black text-lg">Recharge Kat</h3>
                        <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }} className="text-gray-400">
                          <X size={20} />
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">Balans aktyèl: <span className="text-orange-500 font-bold">${Number(virtualCard?.balance || 0).toFixed(2)} USD</span></p>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 mt-4">Montan (USD)</p>
                      <div className="flex items-center border-2 border-gray-100 rounded-2xl px-4 py-3 mb-3 focus-within:border-orange-400 transition-colors">
                        <span className="text-orange-500 font-bold mr-2 text-lg">$</span>
                        <input
                          type="number"
                          min="1"
                          value={rechargeAmount}
                          onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setRechargeAmount(val); }}
                          className="flex-1 outline-none text-[#0F121E] font-bold text-xl"
                          placeholder="0.00"
                          autoFocus
                        />
                        <span className="text-gray-400 text-sm">USD</span>
                      </div>
                      {rechargeAmount && Number(rechargeAmount) > 0 && (
                        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-gray-400 text-xs">Montan recharge</p>
                            <p className="text-[#0F121E] font-bold text-sm">${Number(rechargeAmount).toFixed(2)} USD</p>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-gray-400 text-xs">Frè (${(1.90 + Number(rechargeAmount) * 0.019).toFixed(2)})</p>
                            <p className="text-orange-500 font-bold text-sm">+ ${(1.90 + Number(rechargeAmount) * 0.019).toFixed(2)} USD</p>
                          </div>
                          <div className="border-t border-orange-100 mt-2 pt-2 flex justify-between items-center">
                            <p className="text-gray-600 text-xs font-semibold">Total HTG</p>
                            <p className="text-[#0F121E] font-black text-base">
                              {Math.ceil((Number(rechargeAmount) + 1.90 + Number(rechargeAmount) * 0.019) * exchangeRate).toLocaleString()} HTG
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {['5', '10', '20'].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setRechargeAmount(amt)}
                            className={`py-2 rounded-xl text-sm font-bold border-2 transition-colors ${rechargeAmount === amt ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-gray-100 text-gray-400'}`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={rechargeLoading || !rechargeAmount || Number(rechargeAmount) < 1}
                        onClick={async () => {
                          setRechargeLoading(true);
                          try {
                            const token = localStorage.getItem('token');
                            const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                            const res = await fetch(`${currentBackendUrl}/v1/cards/recharge`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({ amount_usd: Number(rechargeAmount) })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setShowRechargeModal(false);
                              setRechargeAmount('');
                              fetchData();
                            } else {
                              alert(data.message || 'Erè recharge');
                            }
                          } catch {
                            alert('Erè koneksyon');
                          } finally {
                            setRechargeLoading(false);
                          }
                        }}
                        className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {rechargeLoading ? 'Ap trete...' : <><Zap size={16} /> Konfime Recharge</>}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
 
        {/* --- PROFILE SECTION --- */}
        {activeTab === 'profile' && (
          <div className="animate-in slide-in-from-bottom duration-700 pb-8">
            {showKycForm ? (
              /* KYC FORM */
              <div className="animate-in zoom-in duration-300">
                <div className="pb-4 mb-6">
                  <button onClick={() => setShowKycForm(false)} className="flex items-center gap-2 text-[#FF6B00] font-black italic uppercase text-[10px] tracking-widest mb-4">
                    <ChevronRight size={14} className="rotate-180" /> Anile / Tounen
                  </button>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">KYC Verification</h2>
                    <span className="text-[10px] font-black bg-orange-50 text-[#FF6B00] px-3 py-1 rounded-full border border-orange-100">Etap 1/2</span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Mete enfòmasyon reyèl pou deboke limit lan</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Premye Non</label>
                      <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="Eg: Ralph" value={kycData.firstName} onChange={(e) => setKycData({ ...kycData, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Siyati</label>
                      <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="Eg: Greffin" value={kycData.lastName} onChange={(e) => setKycData({ ...kycData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Dat Nesans</label>
                      <input type="date" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" value={kycData.dateOfBirth} onChange={(e) => setKycData({ ...kycData, dateOfBirth: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Telefòn</label>
                      <input type="tel" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="50933333333" value={kycData.phoneNumber} onChange={(e) => setKycData({ ...kycData, phoneNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Adrès</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="45, Rue Faubert" value={kycData.line1} onChange={(e) => setKycData({ ...kycData, line1: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-1 tracking-widest">Vil</label>
                      <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="Pétion-Ville" value={kycData.city} onChange={(e) => setKycData({ ...kycData, city: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-1 tracking-widest">Depatman</label>
                      <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="Ouest" value={kycData.state} onChange={(e) => setKycData({ ...kycData, state: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 ml-1 tracking-widest">Zip</label>
                      <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="6110" value={kycData.zipCode} onChange={(e) => setKycData({ ...kycData, zipCode: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Kalite Dokiman</label>
                    <select value={kycData.idType} onChange={(e) => setKycData({ ...kycData, idType: e.target.value })} className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-black uppercase italic text-xs outline-none text-gray-900 transition-colors">
                      <option value="NATIONAL_ID">CIN (Kat Elektoral)</option>
                      <option value="PASSPORT">Paspò (Passport)</option>
                      <option value="DRIVERS_LICENSE">Lisans Kondwi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Nimewo Dokiman</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-gray-900 text-xs transition-colors" placeholder="01-01-99-1990-00-00000" value={kycData.idNumber} onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Foto Pyès Idantite</label>
                      <button type="button" onClick={() => idCardInputRef.current?.click()} className="w-full p-5 rounded-2xl border-2 border-dashed border-[#FF6B00]/30 bg-orange-50/50 flex flex-col items-center gap-2 hover:bg-orange-50 transition-all">
                        <FileText size={22} className="text-[#FF6B00]" />
                        <span className="text-[8px] font-black uppercase italic text-gray-500 text-center">{idCardFile ? idCardFile.name : 'Chwazi foto pyès'}</span>
                      </button>
                      <input type="file" ref={idCardInputRef} hidden onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Selfie / Portrait</label>
                      <button type="button" onClick={() => userPhotoInputRef.current?.click()} className="w-full p-5 rounded-2xl border-2 border-dashed border-[#FF6B00]/30 bg-orange-50/50 flex flex-col items-center gap-2 hover:bg-orange-50 transition-all">
                        <Camera size={22} className="text-[#FF6B00]" />
                        <span className="text-[8px] font-black uppercase italic text-gray-500 text-center">{userPhotoFile ? userPhotoFile.name : 'Chwazi selfie'}</span>
                      </button>
                      <input type="file" ref={userPhotoInputRef} hidden onChange={(e) => setUserPhotoFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                    <Info size={18} className="text-[#FF6B00] shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-orange-800 uppercase leading-relaxed">
                      Sistèm lan ap debite <span className="text-black font-black">3,375 HTG ($25 USD)</span> otomatikman pou frè verifikasyon.
                    </p>
                  </div>
                  <button onClick={handleKycSubmit} disabled={kycLoading} className="w-full bg-[#FF6B00] text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-lg text-xs transition-all active:scale-95 hover:bg-[#e66000] flex items-center justify-center gap-2 disabled:opacity-50">
                    {kycLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Peye $25 & Soumèt'}
                  </button>
                </div>
              </div>
            ) : (
              /* PROFILE VIEW */
              <>
                {/* HERO CARD — fixed under header */}
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: 'white' }}
                  className="px-4 pt-4 pb-3"
                >
                  <div className="bg-[#0F121E] rounded-3xl p-6">
                    <div className="flex items-center gap-4">
                      {/* Avatar with camera overlay */}
                      <div className="relative flex-shrink-0">
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover shadow-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] to-amber-400 flex items-center justify-center shadow-lg">
                            <span className="text-white text-2xl font-black">{displayName.substring(0, 1).toUpperCase()}</span>
                          </div>
                        )}
                        <button
                          onClick={() => profilePhotoInputRef.current?.click()}
                          disabled={profilePhotoUploading}
                          className="absolute bottom-0 right-0 w-7 h-7 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-md border-2 border-[#0F121E] hover:bg-[#e85f00] transition disabled:opacity-60"
                        >
                          {profilePhotoUploading
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Camera size={12} className="text-white" />
                          }
                        </button>
                        <input
                          ref={profilePhotoInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleProfilePhotoUpload(f);
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditingProfile ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              placeholder="Non"
                              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold placeholder:text-white/30 outline-none focus:border-[#FF6B00] transition"
                            />
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              placeholder="Telefòn"
                              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold placeholder:text-white/30 outline-none focus:border-[#FF6B00] transition"
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleEditProfile}
                                disabled={editProfileLoading}
                                className="flex-1 py-1.5 rounded-xl bg-[#FF6B00] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#e85f00] transition disabled:opacity-50"
                              >
                                {editProfileLoading ? '...' : 'Sove'}
                              </button>
                              <button
                                onClick={() => setIsEditingProfile(false)}
                                className="flex-1 py-1.5 rounded-xl bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-wider hover:bg-white/20 transition"
                              >
                                Anile
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-black text-xl leading-tight">{displayName}</h3>
                              <button
                                onClick={() => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setIsEditingProfile(true); }}
                                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-[#FF6B00] transition"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                            <p className="text-white/50 text-xs mt-1 truncate">{user?.email}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {user?.kyc?.status === 'APPROVED' ? (
                                <span className="text-[9px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">✓ Verified</span>
                              ) : user?.kyc?.status === 'PENDING' ? (
                                <span className="text-[9px] font-black uppercase bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">⏳ Pending</span>
                              ) : (
                                <span className="text-[9px] font-black uppercase bg-white/10 text-white/50 px-2 py-0.5 rounded-full border border-white/10">Unverified</span>
                              )}
                              {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED') && (
                                <span className="text-[9px] font-black uppercase bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded-full border border-[#FF6B00]/30">⚡ Agent</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacer so scrollable content clears the fixed hero */}
                <div style={{ paddingTop: '168px' }} />

                {/* STATS ROW */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Balans</p>
                    <p className="text-sm font-black text-[#FF6B00] leading-tight">{(user?.wallet?.balance || 0).toLocaleString()}</p>
                    <p className="text-[8px] text-gray-400 font-bold">HTG</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 mb-1">KYC</p>
                    <div className="flex justify-center">
                      <BadgeCheck size={22} className={user?.kyc?.status === 'APPROVED' ? 'text-green-500' : user?.kyc?.status === 'PENDING' ? 'text-orange-400' : 'text-gray-300'} />
                    </div>
                    <p className={`text-[8px] font-black uppercase mt-1 ${user?.kyc?.status === 'APPROVED' ? 'text-green-500' : user?.kyc?.status === 'PENDING' ? 'text-orange-400' : 'text-gray-400'}`}>
                      {user?.kyc?.status === 'APPROVED' ? 'OK' : user?.kyc?.status === 'PENDING' ? 'Pandan' : 'Non'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Wòl</p>
                    <div className="flex justify-center">
                      {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED') ? (
                        <Briefcase size={22} className="text-[#FF6B00]" />
                      ) : (
                        <User size={22} className="text-gray-400" />
                      )}
                    </div>
                    <p className="text-[8px] font-black uppercase text-gray-500 mt-1">{user?.role || 'USER'}</p>
                  </div>
                </div>

                {/* MENU LIST */}
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-4">
                  <button onClick={() => setShowSecurityCard(s => !s)} className="w-full flex items-center gap-4 p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
                    <div className="bg-orange-50 p-2 rounded-xl flex-shrink-0"><Shield size={20} className="text-[#FF6B00]" /></div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-[#0F121E]">Sekirite & PIN</p>
                      <p className="text-xs text-gray-400">Chanje PIN ou</p>
                    </div>
                    <ChevronRight size={18} className={`transition-transform ${showSecurityCard ? 'rotate-90' : ''} text-gray-300`} />
                  </button>
                  {showSecurityCard && (
                    <div className="px-4 pb-4 border-b border-gray-50"><UserSecurityCard /></div>
                  )}

                  <button onClick={() => { if (user?.kyc?.status !== 'APPROVED') setShowKycForm(true); }} className="w-full flex items-center gap-4 p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${user?.kyc?.status === 'APPROVED' ? 'bg-green-50' : 'bg-orange-50'}`}>
                      <BadgeCheck size={20} className={user?.kyc?.status === 'APPROVED' ? 'text-green-500' : 'text-orange-400'} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-[#0F121E]">Verifikasyon KYC</p>
                      <p className="text-xs text-gray-400">{user?.kyc?.status === 'APPROVED' ? 'Verified — Full access' : user?.kyc?.status === 'PENDING' ? 'Under review...' : 'Non verifye'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.kyc?.status === 'APPROVED' ? (
                        <span className="text-[8px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase">✓ Done</span>
                      ) : user?.kyc?.status === 'PENDING' ? (
                        <span className="text-[8px] font-black bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full uppercase">Pending</span>
                      ) : (
                        <span className="text-[8px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">$25</span>
                      )}
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </button>

                  {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED') ? (
                    <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/agent-dashboard'; }} className="w-full flex items-center gap-4 p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
                      <div className="bg-orange-50 p-2 rounded-xl flex-shrink-0"><Briefcase size={20} className="text-[#FF6B00]" /></div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm text-[#0F121E]">Agent Dashboard</p>
                        <p className="text-xs text-gray-400">Jere kont ajan w lan</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </button>
                  ) : user?.agent?.status === 'PENDING' ? (
                    <div className="w-full flex items-center gap-4 p-5 border-b border-gray-50">
                      <div className="bg-yellow-50 p-2 rounded-xl flex-shrink-0"><Briefcase size={20} className="text-yellow-500" /></div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm text-[#0F121E]">Aplikasyon Ajan</p>
                        <p className="text-xs text-yellow-600 font-semibold mt-0.5">⏳ Demann ou an ap tann apwobasyon admin</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        if (user?.kyc?.status !== 'APPROVED') {
                          showToast('Ou dwe gen KYC apwouve anvan ou ka vin yon Ajan.', 'error');
                          return;
                        }
                        const token = localStorage.getItem('token');
                        try {
                          const res = await fetch(`${backendUrl}/agents/apply`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ businessName: `${user?.name || 'Ozama'} Agent` }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast('Aplikasyon w lan soumèt! Admin ap revize l. 🚀', 'success');
                            fetchData();
                          } else {
                            showToast(data.message || 'Erè pandan aplikasyon an.', 'error');
                          }
                        } catch {
                          showToast('Erè rezo. Verifye koneksyon ou.', 'error');
                        }
                      }}
                      className="w-full flex items-center gap-4 p-5 border-b border-gray-50 active:bg-gray-50 transition-colors"
                    >
                      <div className="bg-orange-50 p-2 rounded-xl flex-shrink-0"><Briefcase size={20} className="text-[#FF6B00]" /></div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm text-[#0F121E]">Vin yon Ajan</p>
                        <p className="text-xs text-gray-400">Aplike kounye a — Requis: KYC Apwouve</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </button>
                  )}

                  <button onClick={() => setShowRates(r => !r)} className="w-full flex items-center gap-4 p-5 active:bg-gray-50 transition-colors">
                    <div className="bg-blue-50 p-2 rounded-xl flex-shrink-0"><TrendingUp size={20} className="text-blue-500" /></div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-[#0F121E]">Taux & Frè</p>
                      <p className="text-xs text-gray-400">BRH, P2P, Topup, Retrait</p>
                    </div>
                    <ChevronRight size={18} className={`transition-transform ${showRates ? 'rotate-90' : ''} text-gray-300`} />
                  </button>
                  {showRates && (
                    <div className="px-5 pb-5 border-t border-gray-50 space-y-2 pt-3">
                      {[
                        { label: 'Taux BRH', value: `${exchangeRate} HTG`, color: 'text-green-500' },
                        { label: 'Transfè P2P', value: '0%', color: 'text-green-500' },
                        { label: 'Topup (Depo)', value: '6%', color: 'text-[#0F121E]' },
                        { label: 'Retrait', value: '2%', color: 'text-[#0F121E]' },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center py-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{r.label}</span>
                          <span className={`text-xs font-black ${r.color}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SUPPORT */}
                <button
                  onClick={() => { window.location.href = '/support'; }}
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 mb-3 active:bg-gray-50 transition-colors"
                >
                  <div className="bg-blue-50 p-2 rounded-xl flex-shrink-0">
                    <HelpCircle size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-[#0F121E]">Sipò & Èd</p>
                    <p className="text-xs text-gray-400">Kontakte nou</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>

                {/* LOGOUT */}
                <button onClick={signOut} className="w-full bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-center gap-3 active:bg-red-100 transition-all">
                  <LogOut size={18} className="text-red-500" />
                  <span className="text-red-500 font-black text-sm uppercase">Dekonekte</span>
                </button>
              </>
            )}
          </div>
        )}

      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 h-24 flex items-center justify-around px-4 z-50">
        {[
          { id: 'home', icon: <Home size={24} />, label: 'HOME' },
          { id: 'finance', icon: <Landmark size={24} />, label: 'FINANCE' },
          { id: 'cards', icon: <CreditCard size={24} />, label: 'CARDS' },
          { id: 'profile', icon: <User size={24} />, label: 'PROFILE' }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => { setActiveTab(item.id); setSelectedFinanceService(null); setShowKycForm(false); }}
            className={`w-14 h-14 flex flex-col items-center justify-center transition-all ${activeTab === item.id ? 'text-[#FF7A00] scale-110' : 'text-[#8E929B] opacity-30 hover:opacity-100'}`}
          >
            {item.icon}
            <span className="text-[7px] font-black uppercase mt-1 tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <input type="file" ref={fileInputRef} hidden onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
      <input type="file" ref={financeFileInputRef} hidden onChange={(e) => setFinanceReceipt(e.target.files?.[0] || null)} />
    </main>
  );
}
