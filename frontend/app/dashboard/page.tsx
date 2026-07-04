"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Home, Send, PlusCircle, Banknote, CreditCard, History, User, Landmark, ChevronLeft,
  Smartphone, Bitcoin, Gamepad2, CheckCircle2, Upload, Info, ChevronRight,
  ArrowDown, ArrowUp, ArrowDownCircle, ArrowUpCircle, Bell, Wallet2, Settings,
  ShieldCheck, Zap, Clock, Copy, QrCode, ArrowLeftRight, ShieldEllipsis, Activity, FileText, Camera, X,
  Shield, BadgeCheck, Briefcase, TrendingUp, Star, Pencil, Download, Share2,
  HelpCircle, CreditCard as CardIcon, Eye, EyeOff, Lock, Unlock, ShoppingCart, Phone,
  Sun, Moon, ChevronDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../contexts/ThemeContext';
 
const CARD_BILLING = {
  street: '3401 N. Miami Ave, Ste 230',
  city: 'Miami',
  state: 'Florida',
  zip: '33127',
  country: 'United States',
};

const PAYMENT_INFO = {
  bank_usd: { acc: "1920222", name: "Ralph Olivier Greffin", bank: "Capital Bank (USD)" },
  bank_htg: { acc: "000-000-000", name: "Ralph Olivier Greffin", bank: "Capital Bank (Gourdes)" },
  wise: { acc: "contact@ozamapay.com", name: "OzamaPay Business" },
  meru: { acc: "oliou04@gmail.com", name: "Ralph Olivier Greffin" },
  zelle: { acc: "786 868 6782", name: "Ralph Olivier Greffin" },
  cashapp: { acc: "$Pascoue93", name: "Ralph Olivier Greffin" },
  usdt: { acc: "TBVM2M4UgjF4aWfseHVDuW1ZTKc7dTTWbi", name: "TRC20 Network" },
  natcash: { label: 'MonCash / NatCash', value: 'À konfigire - Kontakte sipò nou', note: 'HTG Transfer' }
};

const FINANCE_ACCOUNTS: Record<string, { label: string; info: string; warning?: string }> = {
  wise:    { label: 'Email Wise',     info: 'contact@ozamapay.com' },
  meru:    { label: 'Email Meru',     info: 'oliou04@gmail.com' },
  zelle:   { label: 'Nimewo Zelle',   info: '786 868 6782' },
  cashapp: { label: 'CashApp Tag',    info: '$Pascoue93' },
  usdt:    { label: 'Adrès TRC20',    info: 'TBVM2M4UgjF4aWfseHVDuW1ZTKc7dTTWbi', warning: '⚠️ Sèlman rezo TRC20!' },
  natcash: { label: 'Nimewo NatCash', info: '1920222' },
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
 
const formatTxDate = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hh}:${mm}`;
};

const signOut = async () => {
  localStorage.clear();
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.replace("/login");
};
 
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isCardFrozen, setIsCardFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minLoadDone, setMinLoadDone] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
 

  const [virtualCard, setVirtualCard] = useState<any>(null);
  const [showCardDetails, setShowCardDetails] = useState<boolean>(false);
  const [secretDetailsLoading, setSecretDetailsLoading] = useState(false);
  const [secretDetailsFailed, setSecretDetailsFailed] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('moncash');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpType, setTopUpType] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [topupNote, setTopupNote] = useState('');
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
  const [topupLoading, setTopupLoading] = useState(false);
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

  // --- NEW KYC STATES ---
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

  // Send money bottom-sheet modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Onboarding tour
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Gift cards
  const [gcProducts, setGcProducts] = useState<any[]>([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcSelectedBrand, setGcSelectedBrand] = useState<string | null>(null);
  const [gcSelectedDenom, setGcSelectedDenom] = useState<number | null>(null);
  const [gcOrderLoading, setGcOrderLoading] = useState(false);
  const [gcOrderResult, setGcOrderResult] = useState<any>(null);
  const [gcOrders, setGcOrders] = useState<any[]>([]);
  // Airtime (Kredi) sub-section
  const [gcSection, setGcSection] = useState<'gifts' | 'airtime'>('gifts');
  const [atOperators, setAtOperators] = useState<any[]>([]);
  const [atOpLoading, setAtOpLoading] = useState(false);
  const [atSelectedOp, setAtSelectedOp] = useState<any>(null);
  const [atAmount, setAtAmount] = useState<number | null>(null);
  const [atPhone, setAtPhone] = useState('');
  const [atLoading, setAtLoading] = useState(false);
  const [atResult, setAtResult] = useState<any>(null);
  const [atOrders, setAtOrders] = useState<any[]>([]);
  const [atOrdersLoading, setAtOrdersLoading] = useState(false);
  // Gift card buy modal
  const [gcSelectedProduct, setGcSelectedProduct] = useState<any>(null);
  const [gcBuyAmount, setGcBuyAmount] = useState('');
  // Profile PIN form
  const [profilePinValue, setProfilePinValue] = useState('');
  const [profilePinVisible, setProfilePinVisible] = useState(false);
  const [profilePinLoading, setProfilePinLoading] = useState(false);

 const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:10000';// IP Backend ou a

  const { colors, glass, isDark, toggleTheme } = useTheme();
  const accentMuted = isDark ? '#FF7A001A' : '#FF7A0033';

  const fetchSecretDetails = async () => {
    if (virtualCard?.cardNumber) { setShowCardDetails(true); return; }
    setSecretDetailsFailed(false);
    setSecretDetailsLoading(true);
    setShowCardDetails(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/v1/cards/secret-details`, {
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
      } else {
        setSecretDetailsFailed(true);
      }
    } catch {
      setSecretDetailsFailed(true);
    } finally {
      setSecretDetailsLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'zelle', label: 'Zelle', img: 'zelle.png', info: "786 868 6782", name: "Ralph Olivier Greffin" },
    { id: 'cashapp', label: 'CashApp', img: 'cashapp.png', info: "$Pascoue93", name: "Ralph Olivier Greffin" },
    { id: 'moncash', label: 'MonCash', img: 'moncash.png', info: "Nimewo MonCash la", name: "Ralph Olivier Greffin" },
    { id: 'natcash', label: 'NatCash', img: 'natcash.png', info: "55187047", name: "Ralph Olivier Greffin" },
    { id: 'bank', label: 'Capital Bank', img: 'capitalbank.png', info: "1920222", name: "Ralph Olivier Greffin" },
    { id: 'usdt', label: 'USDT', img: 'usdt.png', info: PAYMENT_INFO.usdt.acc, name: "Adrès USDT TRC20" }
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

  const toErrorMsg = (msg: any, fallback = 'Erè'): string => {
    if (!msg) return fallback;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    return JSON.stringify(msg);
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

  const handleSavePin = async () => {
    if (profilePinValue.length < 4 || profilePinValue.length > 6) {
      showToast('PIN dwe gen 4 a 6 chif.', 'error');
      return;
    }
    setProfilePinLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${backendUrl}/user/change-pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: profilePinValue }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('PIN mete ajou ak siksè.', 'success');
        setProfilePinValue('');
        setUser((prev: any) => prev ? { ...prev, transactionPin: '****' } : prev);
      } else {
        showToast(data.message || 'Chanjman PIN echwe.', 'error');
      }
    } catch {
      showToast('Erè rezo', 'error');
    } finally {
      setProfilePinLoading(false);
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

      const [txRes, meRes, rateRes, notifRes, cardRes, bizRes] = await Promise.all([
        fetch(`${API_BASE}/wallet/transactions?limit=5`, { headers }).catch(() => null),
        fetch(`${API_BASE}/auth/me`, { headers }).catch(() => null),
        fetch(`${API_BASE}/rates`).catch(() => null),
        fetch(`${API_BASE}/wallet/notifications`, { headers }).catch(() => null),
        fetch(`${API_BASE}/v1/cards/my-card`, { headers: { Authorization: `Bearer ${localToken}` } }).catch(() => null),
        fetch(`${API_BASE}/business/me`, { headers }).catch(() => null),
      ]);

      const [txData, meData, ratesData, notifData, cardData, bizData] = await Promise.all([
        txRes?.ok ? txRes.json().catch(() => null) : null,
        meRes?.ok ? meRes.json().catch(() => null) : null,
        rateRes?.ok ? rateRes.json().catch(() => null) : null,
        notifRes?.ok ? notifRes.json().catch(() => null) : null,
        cardRes?.ok ? cardRes.json().catch(() => null) : null,
        bizRes?.ok ? bizRes.json().catch(() => null) : null,
      ]);

      setMyBusinesses(bizData);

      setTransactions(Array.isArray(txData?.data) ? txData.data : []);

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
    if (activeTab === 'giftcards' && gcProducts.length === 0) {
      const token = localStorage.getItem('token');
      if (!token) return;
      setGcLoading(true);
      Promise.all([
        fetch(`${backendUrl}/giftcards/products`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${backendUrl}/giftcards/orders`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]).then(([products, orders]) => {
        setGcProducts(Array.isArray(products?.content) ? products.content : (Array.isArray(products) ? products : []));
        setGcOrders(Array.isArray(orders) ? orders : []);
      }).catch(() => {}).finally(() => setGcLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (gcSection !== 'airtime') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    if (atOperators.length === 0 && !atOpLoading) {
      setAtOpLoading(true);
      fetch(`${backendUrl}/airtime/operators`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(ops => setAtOperators(Array.isArray(ops) ? ops : []))
        .catch(() => {})
        .finally(() => setAtOpLoading(false));
    }
    setAtOrdersLoading(true);
    fetch(`${backendUrl}/airtime/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(orders => setAtOrders(Array.isArray(orders) ? orders : []))
      .catch(() => {})
      .finally(() => setAtOrdersLoading(false));
  }, [gcSection]);

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

  setTopupLoading(true);
  try {
    if (selectedMethod === 'moncash' && topUpType === 'AUTOMATIC') {
      try {
        const res = await fetch(`${backendUrl}/payments/moncashconnect/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: topupHTG }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erè');

        const freshMeRes = await fetch(`${backendUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const freshMe = freshMeRes.ok ? await freshMeRes.json() : null;
        const initialBal = Number(freshMe?.wallet?.balance ?? user?.wallet?.balance ?? 0);
        setMccInitialBalance(initialBal);
        setMccPaymentUrl(data.paymentUrl);
        setMccPolling(true);

        if (mccPollRef.current) clearInterval(mccPollRef.current);
        const deadline = Date.now() + 10 * 60 * 1000;
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
                fetchData();
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
  } finally {
    setTopupLoading(false);
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
    <div className="font-space-grotesk" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(130% 80% at 50% -8%, #1c1322 0%, #0a0c14 56%)',
    }}>

      {/* Ambient orb — orange top-center */}
      <div aria-hidden style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 480, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,122,0,.18), transparent 68%)',
        filter: 'blur(40px)', pointerEvents: 'none',
        animation: 'floatA 12s ease-in-out infinite',
      }} />
      {/* Ambient orb — purple bottom-right */}
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, right: -80,
        width: 340, height: 340, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,60,255,.14), transparent 70%)',
        filter: 'blur(36px)', pointerEvents: 'none',
        animation: 'floatB 15s ease-in-out infinite',
      }} />

      {/* Logo mark + pulse rings */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Ring 1 */}
        <div aria-hidden style={{
          position: 'absolute', top: -20, right: -20, bottom: -20, left: -20,
          borderRadius: 'clamp(52px, 7.5vw, 62px)',
          border: '1.5px solid rgba(255,122,0,.5)',
          pointerEvents: 'none',
          animation: 'splashRing 2.4s ease-out infinite',
        }} />
        {/* Ring 2 */}
        <div aria-hidden style={{
          position: 'absolute', top: -20, right: -20, bottom: -20, left: -20,
          borderRadius: 'clamp(52px, 7.5vw, 62px)',
          border: '1.5px solid rgba(255,122,0,.5)',
          pointerEvents: 'none',
          animation: 'splashRing 2.4s ease-out 1.2s infinite',
        }} />

        {/* Logo box */}
        <div style={{
          width: 'clamp(108px, 22vw, 140px)', height: 'clamp(108px, 22vw, 140px)',
          borderRadius: 'clamp(32px, 5vw, 42px)',
          background: 'linear-gradient(140deg, #FF8a1a, #FF6B00)',
          boxShadow: '0 22px 50px -14px rgba(255,107,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          animation: 'splashBreath 2.6s ease-in-out infinite',
        }}>
          {/* Diagonal shine sweep */}
          <div aria-hidden style={{
            position: 'absolute', top: '-10%', left: 0,
            width: '38%', height: '120%', pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent, rgba(255,255,255,.28) 50%, transparent)',
            animation: 'splashShine 2.8s linear infinite',
          }} />
          {/* Card / wallet icon */}
          <svg width="54" height="40" viewBox="0 0 54 40" fill="none" aria-hidden>
            <rect x="2" y="2" width="50" height="36" rx="8" stroke="white" strokeWidth="2.5" />
            <line x1="2" y1="14" x2="52" y2="14" stroke="white" strokeWidth="2.5" />
            <rect x="8" y="21" width="14" height="8" rx="2.5" fill="white" fillOpacity="0.8" />
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      <div style={{ marginTop: 32, textAlign: 'center', animation: 'fadeUp 0.6s 0.3s both' }}>
        <p style={{ margin: 0, fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', lineHeight: 1 }}>
          OZAMA<span style={{ color: '#FF7A00' }}>PAY</span>
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
          Bankè dijital Ayiti a
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: 28, animation: 'fadeUp 0.6s 0.5s both',
        width: 'clamp(230px, 55vw, 320px)', height: 6,
        borderRadius: 99, background: 'rgba(255,255,255,.09)', overflow: 'hidden',
      }}>
        <div style={{
          width: '6%', height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #FF7A00, #ff9d4d)',
          boxShadow: '0 0 12px 2px rgba(255,122,0,.5)',
          animation: 'splashBar 2.7s cubic-bezier(.4,0,.2,1) infinite',
        }} />
      </div>

      {/* Bounce dots + label */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'fadeUp 0.6s 0.65s both' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF7A00', animation: `splashDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.38)', fontWeight: 600 }}>
          N ap prepare kont ou…
        </span>
      </div>

      {/* Footer — security badge */}
      <div style={{ position: 'absolute', bottom: 'max(28px, env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, animation: 'fadeUp 0.6s 0.8s both' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <span style={{ fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.30)', fontWeight: 600 }}>
          Sekirize · chifre bout-a-bout
        </span>
      </div>
    </div>
  );
 
  const displayName = user?.name || user?.email?.split('@')[0] || 'Itilizatè';
 
  return (
    <main className="min-h-screen font-space-grotesk overflow-x-hidden relative pb-32 lg:pb-0 lg:pl-64" style={{ background: glass.pageGradient }}>
      {/* atmosphere orbs */}
      <div aria-hidden style={{ position: 'fixed', top: -60, left: '50%', transform: 'translateX(-50%)', width: 420, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,122,0,.22),transparent 68%)', filter: 'blur(24px)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', bottom: 60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(120,90,255,.14),transparent 70%)', filter: 'blur(24px)', animation: 'floatA 14s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            backdropFilter: 'blur(20px)',
            background: 'rgba(15,18,30,0.95)',
            opacity: toastFading ? 0 : 1,
            transform: toastFading ? 'translateY(-6px)' : 'translateY(0)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            top: 'calc(1.5rem + env(safe-area-inset-top))',
          }}
          className="fixed left-4 right-4 z-[999] border border-white/10 text-white px-4 py-4 rounded-2xl shadow-xl"
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
            <div className="w-full max-w-sm bg-[var(--oz-surface)] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
              {/* Skip */}
              <div className="flex justify-end px-5 pt-4">
                <button onClick={finish} className="text-[10px] font-black text-[var(--oz-text-sec)] uppercase tracking-widest hover:text-[var(--oz-text-sec)] transition">
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
                <h2 className="text-xl font-black text-[var(--oz-text)] leading-tight mb-3">{step.title}</h2>
                <p className="text-sm text-[var(--oz-text-sec)] leading-relaxed mb-8">{step.text}</p>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-6 bg-[#FF6B00]' : 'w-2 bg-[var(--oz-border)]'}`}
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

 
      <div className="px-4 lg:px-8 lg:max-w-[1400px] lg:mx-auto lg:w-full">

        {/* --- HOME SECTION --- */}
        {activeTab === 'home' && (
          <>
          {/* ── Mobile layout (hidden on desktop) ── */}
          <div className="lg:hidden animate-in fade-in duration-500" style={{ paddingTop: 'calc(366px + env(safe-area-inset-top))' }}>
            {/* FIXED HERO: header + balance card + action buttons */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: glass.headerBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingTop: 'env(safe-area-inset-top)' }}>
              <header className="px-4 pt-2 pb-2 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {/* gradient-ring avatar */}
                  <div style={{ position: 'relative', width: 46, height: 46, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg,#FF7A00,#ff9d4d)', flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: glass.innerDark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary, fontWeight: 700, fontSize: 15 }}>
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="oz-dotPulse" style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#22C55E', border: `2px solid ${glass.innerDark}` }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-[16px] font-black tracking-tighter uppercase italic truncate max-w-[160px] leading-tight">{displayName}</h1>
                      <ShieldCheck size={14} className="text-[#FF7A00]" />
                    </div>
                    <p style={{ fontSize: 10, color: glass.textDimmer, fontWeight: 600, letterSpacing: '.04em' }}>Bonjou · <span className="text-[#FF7A00]">OzamaPay</span></p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className="active:scale-90 transition-all relative"
                    style={{ width: 42, height: 42, borderRadius: 14, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bell size={19} color="#fff" />
                    {unreadCount > 0 && (
                      <span className="absolute min-w-[18px] h-[18px] bg-[#FF7A00] rounded-full flex items-center justify-center text-white text-[9px] font-black px-1" style={{ top: -4, right: -4 }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification panel */}
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute right-0 top-14 z-50 w-80 bg-[var(--oz-surface)] rounded-3xl shadow-2xl border border-[var(--oz-border)] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--oz-border)]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[var(--oz-text)] uppercase tracking-wider">Notifikasyon</span>
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
                            <button onClick={() => setShowNotifications(false)} className="w-7 h-7 rounded-2xl bg-[var(--oz-surface)] flex items-center justify-center text-[var(--oz-text-sec)] hover:bg-[var(--oz-surface)] transition">
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-3">
                              <Bell size={28} className="text-gray-200" />
                              <p className="text-xs text-[var(--oz-text-sec)] font-bold">Pa gen notifikasyon toujou</p>
                            </div>
                          ) : (
                            notifications.map((n: any) => (
                              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 border-b border-[var(--oz-border)] last:border-0 ${n.isRead ? 'bg-[var(--oz-surface)]' : 'bg-[var(--oz-bg)]'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.type === 'SUCCESS' ? 'bg-emerald-100' : n.type === 'ERROR' ? 'bg-red-100' : n.type === 'WARNING' ? 'bg-yellow-100' : 'bg-[#FF6B00]/10'}`}>
                                  <span className={`text-[10px] font-black ${n.type === 'SUCCESS' ? 'text-emerald-600' : n.type === 'ERROR' ? 'text-red-500' : n.type === 'WARNING' ? 'text-yellow-600' : 'text-[#FF6B00]'}`}>
                                    {n.type === 'SUCCESS' ? '✓' : n.type === 'ERROR' ? '✕' : n.type === 'WARNING' ? '!' : 'i'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-[var(--oz-text)] leading-snug">{n.title}</p>
                                  <p className="text-[11px] text-[var(--oz-text-sec)] mt-0.5 leading-relaxed">{n.message}</p>
                                  <p className="text-[10px] text-[var(--oz-text-sec)] mt-1 font-bold">{timeAgo(n.createdAt)}</p>
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
              {/* BALANCE CARD — glass + glow + sparkline */}
              <div className="relative w-full overflow-hidden oz-glass-strong" style={{ borderRadius: 30, padding: 22 }}>
                {/* orange glow blob */}
                <div aria-hidden style={{ position: 'absolute', top: -30, right: -10, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,122,0,.22),transparent 70%)', pointerEvents: 'none' }} />
                {/* label row */}
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim }}>BALANS DISPONIB</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,.14)', padding: '4px 9px', borderRadius: 20 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5h-9M19 5v9" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E' }}>Aktif</span>
                  </span>
                </div>
                {/* balance number */}
                {(() => {
                  const raw = Number(user.wallet?.balance || 0);
                  const formatted = raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const dotIdx = formatted.lastIndexOf('.');
                  const whole = formatted.slice(0, dotIdx);
                  const dec = formatted.slice(dotIdx);
                  return (
                    <p className="oz-balIn" style={{ fontWeight: 700, fontSize: 38, color: colors.textPrimary, letterSpacing: '-0.02em', marginTop: 8 }}>
                      {whole}<span style={{ fontSize: 19, color: glass.textDim }}>{dec} <span style={{ fontSize: 13, letterSpacing: 0 }}>HTG</span></span>
                    </p>
                  );
                })()}
                {/* sparkline */}
                <svg width="100%" height="56" viewBox="0 0 320 56" preserveAspectRatio="none" style={{ display: 'block', marginTop: 10 }}>
                  <defs>
                    <linearGradient id="spk-m" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#FF7A00" stopOpacity=".38" />
                      <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 40 C30 36 48 22 76 26 S122 10 150 18 S206 38 236 16 S294 6 320 12 L320 56 L0 56 Z" fill="url(#spk-m)" />
                  <path d="M0 40 C30 36 48 22 76 26 S122 10 150 18 S206 38 236 16 S294 6 320 12" fill="none" stroke="#FF7A00" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="600" strokeDashoffset="600" style={{ animation: 'dash 1.4s ease-out .2s forwards' }} />
                </svg>
              </div>

              {/* QUICK ACTIONS */}
              <div className="flex flex-row gap-2 mt-4">
                {[
                  { id: 'VOYE',  icon: <Send size={19} />,       action: () => setShowSendModal(true), primary: true },
                  { id: 'TOPUP', icon: <PlusCircle size={19} />, action: () => setActiveTab('topup') },
                  { id: 'RETRÈ', icon: <Banknote size={19} />,   action: () => setActiveTab('withdraw') },
                  { id: 'KAT',   icon: <CreditCard size={19} />, action: () => setActiveTab('cards') },
                ].map((item) => (
                  <button key={item.id} onClick={item.action} className="flex-1 flex flex-col items-center gap-[7px] active:scale-95 transition-all">
                    <div className={(item as any).primary ? 'oz-glowPulse' : ''} style={(item as any).primary
                      ? { width: 52, height: 52, borderRadius: 18, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0C14' }
                      : { width: 52, height: 52, borderRadius: 18, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary }
                    }>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: glass.textDim }}>{item.id}</span>
                  </button>
                ))}
                <button onClick={() => setShowQrModal(true)} className="flex-1 flex flex-col items-center gap-[7px] active:scale-95 transition-all">
                  <div style={{ width: 52, height: 52, borderRadius: 18, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary }}>
                    <QrCode size={19} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: glass.textDim }}>QR</span>
                </button>
              </div>

              {/* QR MODAL */}
              {showQrModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.78)' }} onClick={() => setShowQrModal(false)}>
                  <div className="relative w-full max-w-[320px] rounded-3xl p-6 border shadow-2xl flex flex-col items-center" style={{ background: colors.surface, borderColor: colors.border }} onClick={e => e.stopPropagation()}>
                    <h3 className="font-black italic text-[16px] uppercase tracking-[1px] mb-1 text-center" style={{ color: colors.textPrimary }}>Kòd QR Peman Ou</h3>
                    <p className="font-medium text-[11px] text-center mb-6" style={{ color: colors.textSecondary }}>Lòt moun skane sa pou voye kòb ba ou</p>
                    <div className="p-4 rounded-2xl border mb-4" style={{ background: colors.background, borderColor: colors.border }}>
                      <QRCodeSVG
                        id="qr-svg"
                        value={`https://ozamapay.com/pay?to=${user?.email || ''}`}
                        size={180}
                        fgColor={colors.accent}
                        bgColor={colors.background}
                        level="M"
                      />
                    </div>
                    <p className="font-black italic text-[14px] uppercase tracking-[1px] mb-1" style={{ color: colors.textPrimary }}>{displayName}</p>
                    {user?.email && <p className="font-medium text-[12px] mb-6" style={{ color: colors.textSecondary }}>{user.email}</p>}
                    <button
                      onClick={() => setShowQrModal(false)}
                      className="font-black italic uppercase text-[12px] text-white rounded-2xl active:scale-95 transition-all"
                      style={{ background: colors.accent, paddingTop: 14, paddingBottom: 14, paddingLeft: 32, paddingRight: 32, letterSpacing: '2px' }}
                    >
                      FÈMEN
                    </button>
                  </div>
                </div>
              )}
              </div>
              {/* RECENT ACTIVITY header — pinned in fixed hero, never scrolls */}
              <div className="flex justify-between items-center px-4 pt-2 pb-2">
                <div className="flex items-center gap-[6px]">
                  <Activity size={14} className="text-[#FF7A00]" />
                  <h3 className="font-black italic uppercase text-[13px] tracking-[1px]" style={{ color: colors.textPrimary }}>DÈNYE TRANZAKSYON</h3>
                </div>
                <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard/transactions'; }} className="text-[#FF7A00] text-[11px] font-black italic tracking-[0.5px]">Wè Tout →</button>
              </div>
            </div>

            <div style={{ height: 'calc(100vh - 396px - env(safe-area-inset-top))', overflowY: 'auto', position: 'relative' }} className="pb-24 pt-2">
 
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="font-medium italic text-[13px] text-center py-6 rounded-[28px] border border-[var(--oz-border)]" style={{ background: colors.surface, color: colors.textSecondary }}>
                  Pa gen okenn tranzaksyon poko.
                </p>
              ) : (
                transactions.slice(0, 5).map((t: any, idx) => {
                  const isDebit = t.type === 'WITHDRAWAL' || t.type === 'DEBIT' || t.type === 'sent' ||
                    t.type === 'PAYMENT' || t.type === 'CARD' ||
                    (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email);

                  const TX_LABELS: Record<string, string> = {
                    TRANSFER: 'Virement', PAYMENT: 'Peman', TOPUP: 'Rechajman',
                    WITHDRAWAL: 'Retrè', CARD: 'Kat',
                  };
                  const txTitle = t.title ?? (TX_LABELS[t.type] || t.type || 'Tranzaksyon');
                  const amtNum = Number(t.amount || 0);
                  const amtDisplay = amtNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const statusColor = t.status === 'COMPLETED' ? colors.success
                    : (t.status === 'PENDING' || t.status === 'PROCESSING') ? colors.accent
                    : colors.error;
                  const STATUS_TX: Record<string, string> = {
                    COMPLETED: 'Konplete', PENDING: 'Annatant', PROCESSING: 'Ap trete',
                    FAILED: 'Echwe', REJECTED: 'Refize', CANCELLED: 'Anile',
                  };

                  return (
                    <div key={idx} className="tx-item flex items-center justify-between p-4 gap-2 transition-all active:scale-[0.98]" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}`, backdropFilter: 'blur(20px)', borderRadius: 20 }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: isDebit ? 'rgba(239,68,68,.14)' : 'rgba(34,197,94,.14)' }}>
                          {isDebit
                            ? <ArrowUpCircle size={18} color="#EF4444" />
                            : <ArrowDownCircle size={18} color="#22C55E" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black italic uppercase text-[11px] tracking-[0.5px] mb-[2px] truncate" style={{ color: colors.textPrimary }}>
                            {txTitle}
                          </p>
                          <p className="font-medium text-[10px]" style={{ color: glass.textDimmer }}>
                            {t.createdAt ? formatTxDate(t.createdAt) : 'Kounye a'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="font-black text-[13px]" style={{ color: isDebit ? '#EF4444' : '#22C55E' }}>
                          {isDebit ? '-' : '+'}{amtDisplay}
                        </span>
                        <span className="font-black uppercase text-[8px] px-[6px] py-[2px] rounded-full"
                              style={{ background: `${statusColor}22`, color: statusColor }}>
                          {STATUS_TX[t.status] || t.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </div>
          </div>

          {/* ── Desktop home layout (2-col, hidden on mobile) ── */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-10 lg:py-10 lg:items-start animate-in fade-in duration-500">

            {/* LEFT COLUMN — balance + actions + activity */}
            <div className="flex flex-col gap-5">

              {/* Balance card — glass + glow + sparkline (desktop) */}
              <div className="relative overflow-hidden oz-glass-strong" style={{ borderRadius: 30, padding: 26, maxWidth: 420 }}>
                <div aria-hidden style={{ position: 'absolute', top: -30, right: -10, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,122,0,.22),transparent 70%)', pointerEvents: 'none' }} />
                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim }}>BALANS DISPONIB</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,.14)', padding: '4px 10px', borderRadius: 20 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5h-9M19 5v9" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E' }}>Aktif</span>
                  </span>
                </div>
                {(() => {
                  const raw = Number(user.wallet?.balance || 0);
                  const formatted = raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const dotIdx = formatted.lastIndexOf('.');
                  const whole = formatted.slice(0, dotIdx);
                  const dec = formatted.slice(dotIdx);
                  return (
                    <p className="oz-balIn" style={{ fontWeight: 700, fontSize: 42, color: colors.textPrimary, letterSpacing: '-0.02em', marginTop: 10 }}>
                      {whole}<span style={{ fontSize: 21, color: glass.textDim }}>{dec} <span style={{ fontSize: 14, letterSpacing: 0 }}>HTG</span></span>
                    </p>
                  );
                })()}
                <svg width="100%" height="64" viewBox="0 0 320 64" preserveAspectRatio="none" style={{ display: 'block', marginTop: 12 }}>
                  <defs>
                    <linearGradient id="spk-d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#FF7A00" stopOpacity=".38" />
                      <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 46 C30 42 48 26 76 30 S122 12 150 22 S206 44 236 20 S294 8 320 16 L320 64 L0 64 Z" fill="url(#spk-d)" />
                  <path d="M0 46 C30 42 48 26 76 30 S122 12 150 22 S206 44 236 20 S294 8 320 16" fill="none" stroke="#FF7A00" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="600" strokeDashoffset="600" style={{ animation: 'dash 1.4s ease-out .2s forwards' }} />
                </svg>
                <div className="flex gap-[10px] mt-[4px]">
                  <div style={{ flex: 1, background: glass.bg, border: `1px solid ${glass.borderSubtle}`, borderRadius: 14, padding: '6px 12px' }}>
                    <div className="flex items-center gap-[6px]">
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(34,197,94,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowDownCircle size={10} color="#22C55E" />
                      </div>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 9, color: glass.textDim }}>ANTRE</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: colors.textPrimary, marginTop: 2 }}>
                      +{transactions.filter((t: any) => t.type === 'TOPUP' || (t.type === 'TRANSFER' && t.receiverWallet?.user?.email === user?.email)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: glass.bg, border: `1px solid ${glass.borderSubtle}`, borderRadius: 14, padding: '6px 12px' }}>
                    <div className="flex items-center gap-[6px]">
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(239,68,68,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowUpCircle size={10} color="#EF4444" />
                      </div>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 9, color: glass.textDim }}>SOTI</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: colors.textPrimary, marginTop: 2 }}>
                      -{transactions.filter((t: any) => t.type === 'WITHDRAWAL' || (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email)).reduce((s: number, t: any) => s + Number(t.amount || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions (desktop) */}
              <div className="flex flex-row gap-3">
                {[
                  { id: 'VOYE',  icon: <Send size={20} />,       action: () => setShowSendModal(true), primary: true },
                  { id: 'TOPUP', icon: <PlusCircle size={20} />, action: () => setActiveTab('topup') },
                  { id: 'RETRÈ', icon: <Banknote size={20} />,   action: () => setActiveTab('withdraw') },
                  { id: 'KAT',   icon: <CreditCard size={20} />, action: () => setActiveTab('cards') },
                ].map((item) => (
                  <button key={item.id} onClick={item.action} className="flex flex-col items-center gap-[7px] hover:scale-105 transition-all">
                    <div className={(item as any).primary ? 'oz-glowPulse' : ''} style={(item as any).primary
                      ? { width: 56, height: 56, borderRadius: 19, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0C14' }
                      : { width: 56, height: 56, borderRadius: 19, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary }
                    }>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: glass.textDim }}>{item.id}</span>
                  </button>
                ))}
                <button onClick={() => setShowQrModal(true)} className="flex flex-col items-center gap-[7px] hover:scale-105 transition-all">
                  <div style={{ width: 56, height: 56, borderRadius: 19, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary }}>
                    <QrCode size={20} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: glass.textDim }}>QR</span>
                </button>
              </div>

              {/* Recent activity */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-[6px]">
                    <Activity size={14} className="text-[#FF7A00]" />
                    <h3 className="font-black italic uppercase text-[13px] tracking-[1px]" style={{ color: colors.textPrimary }}>DÈNYE TRANZAKSYON</h3>
                  </div>
                  <button
                    onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard/transactions'; }}
                    className="text-[11px] font-black italic tracking-[0.5px] hover:underline"
                    style={{ color: colors.accent }}
                  >
                    Wè Tout →
                  </button>
                </div>
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <p className="font-medium italic text-[13px] text-center py-6 rounded-[28px] border border-[var(--oz-border)]" style={{ background: colors.surface, color: colors.textSecondary }}>
                      Pa gen okenn tranzaksyon poko.
                    </p>
                  ) : (
                    transactions.slice(0, 5).map((t: any, idx: number) => {
                      const isDebit = t.type === 'WITHDRAWAL' || t.type === 'DEBIT' || t.type === 'sent' ||
                        t.type === 'PAYMENT' || t.type === 'CARD' ||
                        (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email);
                      const TX_LABELS_D: Record<string, string> = {
                        TRANSFER: 'Virement', PAYMENT: 'Peman', TOPUP: 'Rechajman', WITHDRAWAL: 'Retrè', CARD: 'Kat',
                      };
                      const txTitleD = t.title ?? (TX_LABELS_D[t.type] || t.type || 'Tranzaksyon');
                      const amtNum = Number(t.amount || 0);
                      const amtDisplay = amtNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const statusColor = t.status === 'COMPLETED' ? colors.success
                        : (t.status === 'PENDING' || t.status === 'PROCESSING') ? colors.accent : colors.error;
                      const STATUS_TX_D: Record<string, string> = {
                        COMPLETED: 'Konplete', PENDING: 'Annatant', PROCESSING: 'Ap trete',
                        FAILED: 'Echwe', REJECTED: 'Refize', CANCELLED: 'Anile',
                      };
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 gap-2 transition-all" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}`, backdropFilter: 'blur(20px)', borderRadius: 20 }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                 style={{ background: isDebit ? 'rgba(239,68,68,.14)' : 'rgba(34,197,94,.14)' }}>
                              {isDebit
                                ? <ArrowUpCircle size={18} color="#EF4444" />
                                : <ArrowDownCircle size={18} color="#22C55E" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black italic uppercase text-[11px] tracking-[0.5px] mb-[2px] truncate" style={{ color: colors.textPrimary }}>{txTitleD}</p>
                              <p className="font-medium text-[10px]" style={{ color: glass.textDimmer }}>{t.createdAt ? formatTxDate(t.createdAt) : 'Kounye a'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="font-black text-[13px]" style={{ color: isDebit ? '#EF4444' : '#22C55E' }}>
                              {isDebit ? '-' : '+'}{amtDisplay}
                            </span>
                            <span className="font-black uppercase text-[8px] px-[6px] py-[2px] rounded-full"
                                  style={{ background: `${statusColor}22`, color: statusColor }}>
                              {STATUS_TX_D[t.status] || t.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — upsell / feature cards */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-[var(--oz-text)] uppercase italic tracking-tight mb-1">
                  Alè pi lwen ak lajan ou
                </h2>
                <p className="text-xs text-[var(--oz-text-sec)] font-medium">Dekouvri tout sèvis OZAMAPAY ofri ou</p>
              </div>

              {/* Virtual Card */}
              <button
                onClick={() => setActiveTab('cards')}
                className="group relative overflow-hidden p-6 text-left transition-all oz-glass"
                style={{ borderRadius: 28, boxShadow: '0 12px 36px -16px rgba(0,0,0,.6)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,122,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} color="#FF7A00" />
                  </div>
                  <ChevronRight size={16} className="group-hover:text-[#FF7A00] group-hover:translate-x-1 transition-all mt-1" style={{ color: glass.textDimmer }} />
                </div>
                <h3 className="font-black uppercase italic text-sm tracking-tight mb-1" style={{ color: colors.textPrimary }}>Kat Vityèl NFC</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: glass.textDim }}>Peye toupatou nan lemond avèk kat vityèl OZAMAPAY ou. Konpatib Google Pay ak Apple Pay.</p>
              </button>

              {/* Gift Cards */}
              <button
                onClick={() => setActiveTab('giftcards')}
                className="group relative overflow-hidden p-6 text-left transition-all oz-glass"
                style={{ borderRadius: 28, boxShadow: '0 12px 36px -16px rgba(0,0,0,.6)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,122,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={20} color="#FF7A00" />
                  </div>
                  <ChevronRight size={16} className="group-hover:text-[#FF7A00] group-hover:translate-x-1 transition-all mt-1" style={{ color: glass.textDimmer }} />
                </div>
                <h3 className="font-black uppercase italic text-sm tracking-tight mb-1" style={{ color: colors.textPrimary }}>Gift Cards</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: glass.textDim }}>Achte Amazon, Apple, Google Play ak plis ankò dirèkteman ak balans OZAMAPAY ou.</p>
              </button>

              {/* Finance services */}
              <button
                onClick={() => setActiveTab('finance')}
                className="group relative overflow-hidden p-6 text-left transition-all oz-glass"
                style={{ borderRadius: 28, boxShadow: '0 12px 36px -16px rgba(0,0,0,.6)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,122,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark size={20} color="#FF7A00" />
                  </div>
                  <ChevronRight size={16} className="group-hover:text-[#FF7A00] group-hover:translate-x-1 transition-all mt-1" style={{ color: glass.textDimmer }} />
                </div>
                <h3 className="font-black uppercase italic text-sm tracking-tight mb-1" style={{ color: colors.textPrimary }}>Sèvis Finansye</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: glass.textDim }}>Recharge MonCash, voye kòb Ayiti ak plis lòt sèvis finansye pou ou ak fanmi ou.</p>
              </button>
            </div>

          </div>
          </>
        )}

        {/* --- HISTORY SECTION --- */}
        {activeTab === 'history' && (
          <div className="animate-in slide-in-from-right duration-500" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <button onClick={() => setActiveTab('home')} className="mb-8 text-[#FF7A00] font-black italic uppercase text-[10px] flex items-center gap-2">
              <ChevronRight size={14} className="rotate-180" /> Retounen
            </button>
            <h2 className="text-4xl font-black italic uppercase tracking-wide mb-8 text-[var(--oz-text)]">Istorik Konplè</h2>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-[var(--oz-text-sec)] text-xs italic text-center py-6 bg-[var(--oz-surface)] rounded-3xl border border-[var(--oz-border)] shadow-sm">
                  Pa gen okenn istwa tranzaksyon.
                </p>
              ) : (
                transactions.map((t: any, idx) => {
                  const isDebit = t.type === 'WITHDRAWAL' || t.type === 'DEBIT' || t.type === 'sent' ||
                    t.type === 'PAYMENT' || t.type === 'CARD' ||
                    (t.type === 'TRANSFER' && t.senderWallet?.user?.email === user?.email);

                  return (
                    <div key={idx} className="flex items-center justify-between p-6 bg-[var(--oz-surface)] border border-[var(--oz-border)] rounded-[28px] shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDebit ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                          {isDebit ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                        </div>
                        <div>
<p className="font-black text-sm uppercase italic leading-none tracking-tight text-[var(--oz-text)]">
  {t.type === 'TOPUP' ? (t.method || 'Depot') :
   t.type === 'WITHDRAWAL' ? (t.description || t.method || 'Retrè') :
   t.type === 'PAYMENT' ? (t.title || t.description || 'Peman Visa') :
   t.type === 'CARD' ? (t.title || 'Viz Kont') :
   isDebit
    ? (t.receiverWallet?.user?.name || t.receiverWallet?.user?.email || 'Destinatè')
    : (t.senderWallet?.user?.name || t.senderWallet?.user?.email || 'Ozama User')}
</p>
                          <p className="text-[9px] text-[var(--oz-text-sec)] font-bold uppercase mt-1">
                            {t.type === 'TOPUP' ? 'Depot' : t.type === 'WITHDRAWAL' ? 'Retrè' : t.type === 'PAYMENT' ? 'Peman Visa' : t.type === 'CARD' ? 'Viz' : (isDebit ? 'Transfè' : 'Depo')} • {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : ''}
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
 
        {/* --- SEND MONEY BOTTOM-SHEET MODAL --- */}
{showSendModal && (
  <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setShowSendModal(false)}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative w-full max-w-lg rounded-t-3xl shadow-2xl oz-slideUp"
      style={{ background: glass.sheetBg, borderTop: `1px solid ${glass.border}`, backdropFilter: 'blur(28px)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-6 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-black italic uppercase tracking-[1px]" style={{ color: colors.textPrimary }}>Voye Lajan</h2>
          <button onClick={() => setShowSendModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: colors.background, color: colors.textSecondary, borderColor: colors.border }}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4">
          {/* RECIPIENT */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[1.5px]" style={{ color: colors.textSecondary }}>EMAIL DESTINATÈ</label>
            <input
              className="w-full px-4 py-[14px] rounded-xl font-medium outline-none border text-[14px]"
              style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
              placeholder="example@ozamapay.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          {/* AMOUNT */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-[1.5px]" style={{ color: colors.textSecondary }}>MONTAN (HTG)</label>
              <span className="px-[6px] py-[2px] rounded-[4px] font-black text-[9px]" style={{ background: 'rgba(34,197,94,0.15)', color: colors.success }}>FRÈ: 0%</span>
            </div>
            <input
              className="w-full px-4 py-[14px] rounded-xl font-medium text-[14px] outline-none border"
              style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
              placeholder="0.00"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setAmount(val); }}
            />
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[1.5px]" style={{ color: colors.textSecondary }}>KÒD PIN SEKIRITE</label>
            <div className="flex items-center gap-2">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                className="flex-1 px-4 py-[14px] rounded-xl font-medium text-[14px] outline-none border tracking-[6px]"
                style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPin(p => !p)}
                className="w-[50px] h-[50px] rounded-xl flex items-center justify-center border flex-shrink-0"
                style={{ background: colors.background, borderColor: colors.border, color: colors.textSecondary }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={() => { handleSendMoney(recipient, amount, pin); setShowSendModal(false); }}
            className="w-full py-4 rounded-2xl font-black uppercase italic tracking-[1.5px] shadow-xl active:scale-95 transition-all text-[13px] text-white mt-2"
            style={{ background: colors.accent }}
          >
            Konfime Transfè
          </button>
        </div>
      </div>
    </div>
  </div>
)}
        {/* --- TOPUP SECTION --- */}
        {activeTab === 'topup' && (
          <div className="animate-in slide-in-from-bottom duration-500" style={{ paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: colors.background, paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center gap-2 px-6 pt-6 pb-4">
                <button onClick={() => setActiveTab('home')} className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 active:scale-90 transition-all" style={{ background: colors.surface, borderColor: colors.border }}>
                  <ChevronLeft size={20} style={{ color: colors.textPrimary }} />
                </button>
                <h2 className="font-black italic uppercase text-[16px] tracking-[1.5px]" style={{ color: colors.textPrimary }}>Topup</h2>
              </div>
            </div>
            <div style={{ height: 'calc(100vh - 80px - env(safe-area-inset-top))', overflowY: 'auto' }} className="px-6 pb-14">
            <div>

              {/* ── MonCash Otomatik ── */}
              <div className="mb-6">
                <div className="flex items-center gap-[6px] mb-2">
                  <Landmark size={16} style={{ color: colors.accent }} />
                  <h3 className="font-black italic uppercase text-[14px] tracking-[1px]" style={{ color: colors.textPrimary }}>MonCash Otomatik</h3>
                </div>
                <div className="rounded-[28px] border p-4 flex flex-col gap-1" style={{ background: colors.surface, borderColor: colors.border }}>
                  <div className="mb-2">
                    <label className="font-black italic uppercase text-[10px] tracking-[1px] mb-1 block" style={{ color: colors.textSecondary }}>Montan (HTG)</label>
                    <input
                      className="w-full rounded-xl border px-4 py-[13px] text-[15px] outline-none"
                      style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                      placeholder="Egzanp: 1000"
                      type="number"
                      min="0"
                      value={topUpAmount}
                      onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setTopUpAmount(val); }}
                    />
                  </div>
                  {topUpAmount && Number(topUpAmount) > 0 && (() => {
                    const feeAmount = Math.round(Number(topUpAmount) * 0.089);
                    const amountAfterFee = Number(topUpAmount) - feeAmount;
                    return (
                      <div className="pt-2 border-t space-y-1 animate-in fade-in mb-2" style={{ borderColor: colors.border }}>
                        <div className="flex justify-between">
                          <span className="font-medium italic text-[10px]" style={{ color: colors.textSecondary }}>Frè 8.9%</span>
                          <span className="font-medium italic text-[10px]" style={{ color: colors.textSecondary }}>{feeAmount.toLocaleString()} HTG</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-black italic text-[10px]" style={{ color: colors.accent }}>Wap Resevwa</span>
                          <span className="font-black italic text-[10px]" style={{ color: colors.accent }}>{amountAfterFee.toLocaleString()} HTG</span>
                        </div>
                      </div>
                    );
                  })()}
                  {mccPaymentUrl ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { window.location.href = mccPaymentUrl; }}
                        className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] active:scale-95 transition-all"
                        style={{ background: colors.accent, paddingTop: 16, paddingBottom: 16 }}
                      >
                        Peye via MonCash →
                      </button>
                      {mccPolling && (
                        <p className="font-medium italic text-[11px] text-center animate-pulse" style={{ color: colors.textSecondary }}>Ap verifye peman ou… 🔄</p>
                      )}
                      <button
                        onClick={() => { setMccPaymentUrl(null); setMccPolling(false); if (mccPollRef.current) clearInterval(mccPollRef.current); }}
                        className="font-medium italic text-[11px] text-center py-1 hover:opacity-70 transition-all"
                        style={{ color: colors.textSecondary }}
                      >
                        Anile
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSelectedMethod('moncash'); setTopUpType('AUTOMATIC'); handlePaymentLogic(); }}
                      disabled={topupLoading || !topUpAmount || Number(topUpAmount) <= 0}
                      className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: colors.accent, paddingTop: 16, paddingBottom: 16 }}
                    >
                      {topupLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ap trete...</> : 'Depoze ak MonCash'}
                    </button>
                  )}
                  <p className="font-medium italic text-[11px] text-center mt-2" style={{ color: colors.textSecondary }}>
                    Sistèm otomatik — 8.9% frè aplike (6% OZAMAPAY + 2.9% MonCash), ou resevwa 91.1% nan depo a imedyatman apre peman konfime.
                  </p>
                </div>
              </div>

              {/* ── Depo Manyèl ── */}
              <div className="mb-6">
                <div className="flex items-center gap-[6px] mb-2">
                  <Upload size={16} style={{ color: colors.accent }} />
                  <h3 className="font-black italic uppercase text-[14px] tracking-[1px]" style={{ color: colors.textPrimary }}>Depo Manyèl</h3>
                </div>
                <div className="rounded-[28px] border p-4 flex flex-col gap-1" style={{ background: colors.surface, borderColor: colors.border }}>
                  <div className="mb-2">
                    <label className="font-black italic uppercase text-[10px] tracking-[1px] mb-1 block" style={{ color: colors.textSecondary }}>Montan (HTG)</label>
                    <input
                      className="w-full rounded-xl border px-4 py-[13px] text-[15px] outline-none"
                      style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                      placeholder="Egzanp: 2000"
                      type="number"
                      min="0"
                      value={topUpAmount}
                      onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setTopUpAmount(val); }}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="font-black italic uppercase text-[10px] tracking-[1px] mb-2 block" style={{ color: colors.textSecondary }}>Metòd</label>
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      {paymentMethods.map((m) => {
                        const isSel = selectedMethod === m.id && topUpType === 'MANUAL';
                        return (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedMethod(m.id); setTopUpType('MANUAL'); }}
                            className="flex-shrink-0 flex flex-col items-center gap-[6px] rounded-xl py-[10px] px-[6px] transition-colors active:scale-95"
                            style={{
                              width: 76,
                              background: isSel ? 'rgba(255,122,0,0.08)' : colors.background,
                              border: `1.5px solid ${isSel ? colors.accent : colors.border}`,
                            }}
                          >
                            <img src={`/${m.img}`} className="w-10 h-10 object-contain" alt={m.label} />
                            <span className="font-black text-[9px] uppercase tracking-[0.5px] text-center leading-tight"
                              style={{ color: isSel ? colors.accent : colors.textSecondary }}>
                              {m.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {topUpType === 'MANUAL' && selectedMethod && (() => {
                    const method = paymentMethods.find(x => x.id === selectedMethod);
                    if (!method) return null;
                    return (
                      <div className="flex items-center gap-2 rounded-xl border px-2 py-2 mb-1" style={{ background: colors.background, borderColor: colors.border, marginTop: 4 }}>
                        <p className="flex-1 font-medium text-[11px] leading-4" style={{ color: colors.textSecondary }}>
                          Voye lajan sou:{' '}
                          <span className="font-black" style={{ color: colors.accent }}>{method.info}</span>
                        </p>
                        <button
                          onClick={() => copyToClipboard(method.info)}
                          className="flex items-center gap-1 rounded-xl border px-2 py-[5px] flex-shrink-0 active:scale-90 transition-all"
                          style={{ background: 'rgba(255,122,0,0.1)', borderColor: 'rgba(255,122,0,0.25)' }}
                        >
                          <Copy size={12} style={{ color: colors.accent }} />
                          <span className="font-black text-[10px] tracking-[0.5px]" style={{ color: colors.accent }}>Kopye</span>
                        </button>
                      </div>
                    );
                  })()}
                  {selectedMethod === 'usdt' && topUpType === 'MANUAL' && (
                    <div className="rounded-xl border px-3 py-2 flex items-start gap-2 mb-1" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
                      <span className="text-[13px] flex-shrink-0">⚠️</span>
                      <p className="font-black text-[9px] uppercase tracking-wide leading-relaxed" style={{ color: colors.error }}>TRC20 sèlman — Pa itilize ERC20 oswa BEP20!</p>
                    </div>
                  )}
                  <div className="mb-2">
                    <label className="font-black italic uppercase text-[10px] tracking-[1px] mb-1 block" style={{ color: colors.textSecondary }}>Referans / Kont Ou (opsyonèl)</label>
                    <input
                      className="w-full rounded-xl border px-4 py-[13px] text-[15px] outline-none"
                      style={{ background: colors.background, borderColor: colors.border, color: colors.textPrimary }}
                      placeholder="Nimewo kont/telefòn ou"
                      value={topupNote}
                      onChange={(e) => setTopupNote(e.target.value)}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="font-black italic uppercase text-[10px] tracking-[1px] mb-2 block" style={{ color: colors.textSecondary }}>Foto Prèv Peman (Opsyonèl)</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 rounded-xl px-4 py-[14px] active:scale-95 transition-all"
                      style={{
                        background: receipt ? 'rgba(34,197,94,0.06)' : colors.background,
                        border: `1.5px ${receipt ? 'solid' : 'dashed'} ${receipt ? colors.success : colors.border}`,
                      }}
                    >
                      {receipt ? (
                        <>
                          <CheckCircle2 size={20} style={{ color: colors.success }} />
                          <span className="font-medium text-[12px] flex-1 truncate text-left" style={{ color: colors.success }}>{receipt.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} style={{ color: colors.textSecondary }} />
                          <span className="font-medium text-[12px]" style={{ color: colors.textSecondary }}>Chwazi Screenshot la</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handlePaymentLogic}
                    disabled={topupLoading || !(topUpAmount && selectedMethod && topUpType === 'MANUAL')}
                    className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: colors.accent, paddingTop: 16, paddingBottom: 16 }}
                  >
                    {topupLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ap trete...</> : 'Soumèt Depo'}
                  </button>
                  <p className="font-medium italic text-[11px] text-center mt-2" style={{ color: colors.textSecondary }}>
                    Depo manyèl bezwen apwobasyon yon ajan OZAMAPAY.
                  </p>
                </div>
              </div>

            </div>
            </div>
          </div>
        )}

        {/* --- WITHDRAW SECTION --- */}
        {activeTab === 'withdraw' && (
          <div className="oz-fadeUp" style={{ paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>
            {/* fixed header */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: glass.headerBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `1px solid ${glass.borderSubtle}`, paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                  style={{ width: 38, height: 38, borderRadius: 12, background: glass.bg, border: `1px solid ${glass.border}`, backdropFilter: 'blur(12px)' }}
                >
                  <ChevronLeft size={18} color={colors.textPrimary} />
                </button>
                <h2 style={{ fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary, fontSize: 18 }}>Retrè Lajan</h2>
              </div>
            </div>

            {/* scrollable body */}
            <div style={{ height: 'calc(100vh - 80px - env(safe-area-inset-top))', overflowY: 'auto' }} className="px-5 pb-20 space-y-4">

              {/* main form glass card */}
              <div className="oz-glass-strong" style={{ borderRadius: 26, padding: 20 }}>

                {/* section label */}
                <div className="flex items-center gap-2 mb-4">
                  <Banknote size={15} color="#FF7A00" />
                  <span style={{ fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary, fontSize: 15 }}>Demand Retrè</span>
                </div>

                {/* amount label */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 6 }}>
                  {withdrawIsIntl ? 'Montan (USD)' : 'Montan (HTG)'}
                </span>
                <input
                  className="w-full outline-none text-[15px]"
                  style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, borderRadius: 14, padding: '13px 16px', color: colors.textPrimary }}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  value={withdrawAmount}
                  onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setWithdrawAmount(val); }}
                />

                {/* fee breakdown */}
                {withdrawAmount && Number(withdrawAmount) > 0 && (
                  <div className="mt-3 rounded-[14px] p-3 space-y-1" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer }}>Frais Ozama (2.0%)</span>
                      <span style={{ fontWeight: 700, fontSize: 11, color: glass.textDim }}>-{calculateFees(String(withdrawAmount)).fee} HTG</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: '#FF7A00' }}>Total Debite</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: '#FF7A00' }}>{(Number(withdrawAmount) + Number(calculateFees(String(withdrawAmount)).fee)).toLocaleString()} HTG</span>
                    </div>
                  </div>
                )}

                {/* method label */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginTop: 16, marginBottom: 10 }}>
                  Metòd Retrè
                </span>
                {/* method picker */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {paymentMethods.map((m) => {
                    const isSel = withdrawMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setWithdrawMethod(m.id)}
                        className="flex-shrink-0 flex flex-col items-center gap-[6px] active:scale-95 transition-all"
                        style={{
                          width: 74,
                          padding: '10px 6px',
                          borderRadius: 16,
                          background: isSel ? 'rgba(255,122,0,.12)' : glass.bg,
                          border: `1.5px solid ${isSel ? 'rgba(255,122,0,.6)' : glass.borderSubtle}`,
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <img src={`/${m.img}`} className="w-9 h-9 object-contain" alt={m.label} />
                        <span style={{ fontWeight: 700, fontSize: 8, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', lineHeight: 1.3, color: isSel ? '#FF7A00' : glass.textDim }}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* selected method info strip */}
                {withdrawMethod && (() => {
                  const method = paymentMethods.find(x => x.id === withdrawMethod);
                  if (!method) return null;
                  return (
                    <div className="flex items-center gap-2 mt-3" style={{ background: 'rgba(255,122,0,.07)', border: '1px solid rgba(255,122,0,.2)', borderRadius: 14, padding: '10px 12px' }}>
                      <p className="flex-1 text-[11px] leading-5" style={{ color: glass.textDim }}>
                        Voye lajan sou:{' '}
                        <span style={{ fontWeight: 700, color: '#FF7A00' }}>{method.info}</span>
                      </p>
                      <button
                        onClick={() => copyToClipboard(method.info)}
                        className="flex items-center gap-1 active:scale-90 transition-all"
                        style={{ background: 'rgba(255,122,0,.15)', border: '1px solid rgba(255,122,0,.3)', borderRadius: 10, padding: '5px 9px' }}
                      >
                        <Copy size={11} color="#FF7A00" />
                        <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: '.05em', color: '#FF7A00' }}>KOPYE</span>
                      </button>
                    </div>
                  );
                })()}

                {/* account info input */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginTop: 16, marginBottom: 6 }}>
                  Enfòmasyon Kont (opsyonèl)
                </span>
                <input
                  className="w-full outline-none text-[14px]"
                  style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, borderRadius: 14, padding: '13px 16px', color: colors.textPrimary }}
                  placeholder={withdrawMethod === 'bank' ? 'Nimewo Kont & Non Bank...' : 'Nimewo Telefòn oswa Tag...'}
                  value={withdrawAccountInfo}
                  onChange={(e) => setWithdrawAccountInfo(e.target.value)}
                />

                {/* danger submit — glass with red border */}
                <button
                  onClick={handleWithdraw}
                  disabled={!(withdrawAmount && withdrawMethod)}
                  className="w-full font-black italic uppercase active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2 mt-5"
                  style={{
                    background: 'rgba(239,68,68,.08)',
                    border: '1px solid rgba(239,68,68,.45)',
                    borderRadius: 16,
                    color: '#EF4444',
                    fontSize: 12,
                    letterSpacing: '.12em',
                    padding: '14px 20px',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <Banknote size={15} />
                  Mande Retrè
                </button>
              </div>

              {/* info note */}
              <div className="flex items-start gap-3" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}`, borderRadius: 18, padding: '14px 16px' }}>
                <Info size={15} color={glass.textDimmer} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: glass.textDimmer, lineHeight: 1.6 }}>
                  Demann retrè yo trete nan 1–3 jou ouvrab. Frais 2% aplike sou tout retrè.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* --- GLOBAL FINANCE SECTION --- */}
        {activeTab === 'finance' && !selectedFinanceService && (
          <div className="oz-fadeUp px-4" style={{ paddingTop: 'calc(102px + env(safe-area-inset-top))' }}>
            {/* fixed header */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: glass.headerBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `1px solid ${glass.borderSubtle}`, paddingTop: 'env(safe-area-inset-top)' }} className="px-4 pt-4 pb-3">
              <p className="font-black italic uppercase text-white" style={{ fontSize: 24, letterSpacing: 1.5, marginTop: 16, marginBottom: 16 }}>Ozama Exchange</p>
            </div>
            <div style={{ height: 'calc(100vh - 190px - env(safe-area-inset-top))', overflowY: 'auto', position: 'relative' }} className="pb-24">
              <p className="font-medium" style={{ color: glass.textDimmer, fontSize: 12, lineHeight: '18px', marginBottom: 20 }}>
                Echanj lajan ak Wise, Zelle, USDT, ak plis ankò. Chwazi yon sèvis pou kòmanse.
              </p>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {[
                  { id: 'wise',    name: 'Wise',         desc: 'USD Transfer',     img: 'wise.png' },
                  { id: 'meru',    name: 'Meru',         desc: 'USD Transfer',     img: 'meru.png' },
                  { id: 'zelle',   name: 'Zelle',        desc: 'USD Transfer',     img: 'zelle.png' },
                  { id: 'cashapp', name: 'CashApp',      desc: 'USD Transfer',     img: 'cashapp.png' },
                  { id: 'natcash', name: 'Natcash',      desc: 'HTG Transfer',     img: 'natcash.png' },
                  { id: 'usdt',    name: 'USDT ONLY',    desc: 'TRC20 Network',    img: 'usdt.png' },
                  { id: 'gaming',  name: 'Gaming Topup', desc: 'Diamonds & Coins', img: 'gaming.png' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedFinanceService(item); setFinanceType('BUY'); setFinanceDetails({ email: '', tag: '', amount: '', currency: 'USD', gameId: '', gamePack: '' }); setFinanceReceipt(null); }}
                    className="oz-glass flex items-center justify-between active:scale-95 transition-all"
                    style={{ borderRadius: 24, padding: 16, gap: 16 }}
                  >
                    <div className="flex items-center flex-1" style={{ gap: 14 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: glass.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${glass.borderSubtle}`, flexShrink: 0 }}>
                        <img src={`/${item.img}`} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                      </div>
                      <div>
                        <p className="font-black italic uppercase text-white" style={{ fontSize: 14, letterSpacing: 0.5, marginBottom: 3 }}>{item.name}</p>
                        <p className="font-medium" style={{ color: glass.textDimmer, fontSize: 12 }}>{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: glass.textDimmer, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
 
        {/* --- SERVICE DETAIL --- */}
        {(() => {
          if (activeTab !== 'finance' || !selectedFinanceService) return null;
          const svcId = selectedFinanceService.id;
          const isGaming = svcId === 'gaming';
          const isUsdt = svcId === 'usdt';
          const finAcct = FINANCE_ACCOUNTS[svcId];
          const amountLabel = isUsdt ? 'Montan (USDT)' : 'Montan (USD)';
          const finSubmitDisabled = financeLoading
            || !(parseFloat(financeDetails.amount) > 0)
            || (!isGaming && !financeDetails.email.trim())
            || (isGaming && (!financeDetails.gamePack || !financeDetails.gameId.trim()))
            || (financeType === 'BUY' && !financeReceipt);
          return (
            <div className="oz-fadeUp" style={{ paddingTop: 'calc(152px + env(safe-area-inset-top))' }}>
              {/* Fixed detail header */}
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: glass.headerBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `1px solid ${glass.borderSubtle}`, paddingTop: 'env(safe-area-inset-top)' }} className="px-4 pt-4 pb-4">
                {/* Back + logo + name */}
                <div className="flex items-center mb-4" style={{ gap: 8 }}>
                  <button
                    onClick={() => { setSelectedFinanceService(null); setFinanceReceipt(null); }}
                    className="flex items-center active:scale-90 transition-all"
                    style={{ gap: 4 }}
                  >
                    <ChevronLeft size={16} color={glass.textDim} />
                    <span className="font-black italic uppercase" style={{ color: glass.textDim, fontSize: 11, letterSpacing: 0.5 }}>Tounen Sèvis</span>
                  </button>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: glass.bgStrong, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${glass.border}`, marginLeft: 8, marginRight: 8, flexShrink: 0 }}>
                    <img src={`/${selectedFinanceService.img}`} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  </div>
                  <p className="font-black italic uppercase flex-1 text-white" style={{ fontSize: 15, letterSpacing: 1 }}>{selectedFinanceService.name}</p>
                </div>
                {/* BUY / SELL segmented control */}
                <div className="flex" style={{ background: glass.bg, borderRadius: 12, padding: 4, border: `1px solid ${glass.border}` }}>
                  <button
                    onClick={() => setFinanceType('BUY')}
                    className="flex-1 flex items-center justify-center transition-all"
                    style={{ paddingTop: 10, paddingBottom: 10, borderRadius: 10, background: financeType === 'BUY' ? 'linear-gradient(135deg,#FF7A00,#FF6B00)' : 'transparent' }}
                  >
                    <span className="font-black italic uppercase" style={{ fontSize: 11, letterSpacing: 0.5, color: financeType === 'BUY' ? '#fff' : glass.textDimmer }}>Achte / Depoze</span>
                  </button>
                  <button
                    onClick={() => setFinanceType('SELL')}
                    className="flex-1 flex items-center justify-center transition-all"
                    style={{ paddingTop: 10, paddingBottom: 10, borderRadius: 10, background: financeType === 'SELL' ? 'linear-gradient(135deg,#FF7A00,#FF6B00)' : 'transparent' }}
                  >
                    <span className="font-black italic uppercase" style={{ fontSize: 11, letterSpacing: 0.5, color: financeType === 'SELL' ? '#fff' : glass.textDimmer }}>Vann / Retire</span>
                  </button>
                </div>
              </div>

              {/* Scrollable form */}
              <div style={{ height: 'calc(100vh - 240px - env(safe-area-inset-top))', overflowY: 'auto' }} className="pb-24 px-4 space-y-4">

                {/* Account info card — BUY only */}
                {financeType === 'BUY' && finAcct && (
                  <div style={{ background: 'rgba(255,122,0,.07)', borderRadius: 20, padding: 16, border: '1px solid rgba(255,122,0,.2)' }}>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 8 }}>Voye lajan sou kont OZAMAPAY sa a</span>
                    <p className="font-medium" style={{ color: glass.textDim, fontSize: 11, marginBottom: 6 }}>{finAcct.label}</p>
                    <div className="flex items-center" style={{ gap: 10 }}>
                      <p className="font-black flex-1" style={{ color: '#FF7A00', fontSize: 13, wordBreak: 'break-all' }}>{finAcct.info}</p>
                      <button
                        onClick={() => copyToClipboard(finAcct.info)}
                        className="flex items-center active:scale-90 transition-all flex-shrink-0"
                        style={{ gap: 4, paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6, borderRadius: 12, background: 'rgba(255,122,0,.15)', border: '1px solid rgba(255,122,0,.3)' }}
                      >
                        <Copy size={12} color="#FF7A00" />
                        <span className="font-black" style={{ color: '#FF7A00', fontSize: 10, letterSpacing: 0.5 }}>Kopye</span>
                      </button>
                    </div>
                    {finAcct.warning && (
                      <p className="font-black" style={{ color: '#EF4444', fontSize: 11, marginTop: 8 }}>{finAcct.warning}</p>
                    )}
                  </div>
                )}

                {/* Amount field */}
                <div>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 8 }}>{amountLabel}</span>
                  <input
                    className="w-full outline-none font-medium"
                    style={{ background: glass.inputBg, borderRadius: 14, border: `1px solid ${glass.border}`, paddingLeft: 16, paddingRight: 16, paddingTop: 13, paddingBottom: 13, fontSize: 15, color: colors.textPrimary }}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    value={financeDetails.amount}
                    onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setFinanceDetails({...financeDetails, amount: val}); }}
                  />
                </div>

                {/* Fee row */}
                <div className="flex justify-between" style={{ paddingLeft: 2, paddingRight: 2 }}>
                  <span className="font-medium italic" style={{ color: glass.textDimmer, fontSize: 11 }}>
                    Frè Echanj: <span className="font-black" style={{ color: '#FF7A00' }}>6%</span>
                  </span>
                  <span className="font-medium italic" style={{ color: glass.textDimmer, fontSize: 11 }}>
                    To: <span className="font-black" style={{ color: '#FF7A00' }}>1 USD = {exchangeRate} HTG</span>
                  </span>
                </div>

                {/* Gaming chips + Player ID — or Email/Account field */}
                {isGaming ? (
                  <>
                    <div>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 10 }}>Chwazi Jwèt</span>
                      <div className="flex flex-wrap" style={{ gap: 8 }}>
                        {['Free Fire', 'PUBG Mobile', 'Call of Duty'].map(g => (
                          <button
                            key={g}
                            onClick={() => setFinanceDetails({...financeDetails, gamePack: g})}
                            className="active:scale-95 transition-all"
                            style={financeDetails.gamePack === g
                              ? { paddingLeft: 14, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 14, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', border: '1.5px solid #FF7A00' }
                              : { paddingLeft: 14, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 14, background: glass.bg, border: `1px solid ${glass.border}` }}
                          >
                            <span className="font-black" style={{ color: financeDetails.gamePack === g ? '#fff' : glass.textDim, fontSize: 12 }}>{g}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 8 }}>Player ID</span>
                      <input
                        className="w-full outline-none font-medium"
                        style={{ background: glass.inputBg, borderRadius: 14, border: `1px solid ${glass.border}`, paddingLeft: 16, paddingRight: 16, paddingTop: 13, paddingBottom: 13, fontSize: 14, color: colors.textPrimary }}
                        value={financeDetails.gameId}
                        onChange={(e) => setFinanceDetails({...financeDetails, gameId: e.target.value})}
                        placeholder="ID jwè ou (egz: 123456789)"
                        inputMode="numeric"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 8 }}>
                      {isUsdt ? 'Adrès TRC20 Ou' : 'Email / Kont Ou'}
                    </span>
                    <input
                      className="w-full outline-none font-medium"
                      style={{ background: glass.inputBg, borderRadius: 14, border: `1px solid ${glass.border}`, paddingLeft: 16, paddingRight: 16, paddingTop: 13, paddingBottom: 13, fontSize: 14, color: colors.textPrimary }}
                      value={financeDetails.email}
                      onChange={(e) => setFinanceDetails({...financeDetails, email: e.target.value})}
                      placeholder={isUsdt ? 'Adrès TRC20 pou resevwa' : 'email@exemple.com'}
                      type={isUsdt ? 'text' : 'email'}
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Upload box */}
                <div>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 8 }}>
                    {financeType === 'SELL' ? 'Screenshot Tranzaksyon (opsyonèl)' : 'Screenshot Prèv Peman (obligatwa)'}
                  </span>
                  <button
                    onClick={() => financeFileInputRef.current?.click()}
                    className="w-full flex flex-col items-center active:scale-95 transition-all"
                    style={financeReceipt
                      ? { borderRadius: 16, border: '1.5px solid rgba(34,197,94,.5)', padding: 24, gap: 8, background: 'rgba(34,197,94,.07)' }
                      : { borderRadius: 16, border: `1.5px dashed ${glass.border}`, padding: 24, gap: 8, background: glass.inputBg }}
                  >
                    {financeReceipt ? (
                      <>
                        <CheckCircle2 size={28} color="#22C55E" />
                        <span className="font-medium" style={{ color: '#22C55E', fontSize: 11, textAlign: 'center' }}>{financeReceipt.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color={glass.textDimmer} />
                        <span className="font-black italic uppercase" style={{ color: glass.textDimmer, fontSize: 11, letterSpacing: 0.5, textAlign: 'center' }}>Chwazi Screenshot la</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleFinanceSubmit}
                  disabled={finSubmitDisabled}
                  className={`w-full flex items-center justify-center active:scale-95 transition-all${finSubmitDisabled ? '' : ' oz-glowPulse'}`}
                  style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', borderRadius: 18, paddingTop: 18, paddingBottom: 18, marginTop: 4, opacity: finSubmitDisabled ? 0.35 : 1 }}
                >
                  {financeLoading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="font-black italic uppercase text-white" style={{ fontSize: 13, letterSpacing: 1.5 }}>Egzekite Lòd {selectedFinanceService.name}</span>
                  }
                </button>

              </div>
            </div>
          );
        })()}
        {/* --- CARDS SECTION --- */}
        {activeTab === 'cards' && (
          <div className="oz-fadeUp px-5 lg:px-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {!virtualCard?.cardId ? (
              /* ===== NO CARD — CREATION FORM ===== */
              <div className="pt-0 lg:max-w-[700px] lg:mx-auto lg:py-10">
                <p className="font-black italic uppercase text-[24px] tracking-[1.5px] pt-6 pb-0 mb-6 text-white">Kat Visa</p>
                {/* Card image: borderRadius 0 per spec */}
                <div className="relative w-full mb-4" style={{ aspectRatio: '1.586', borderRadius: 0 }}>
                  <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" />
                </div>
                {/* Create form */}
                <div className="oz-glass-strong mb-4" style={{ borderRadius: 24, padding: 16 }}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-[14px] text-white">KREYE KAT VISA</p>
                    <span className="font-bold text-[10px] px-[10px] py-[3px] rounded-full" style={{ background: '#B8E832', color: '#000000' }}>GRATIS</span>
                  </div>
                  <p className="font-medium text-[12px] mb-4 leading-[18px]" style={{ color: '#FF7A00' }}>
                    Kreye kat VISA ou GRATIS — OZAMAPAY peye frè kreye a pou ou!
                  </p>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6 }}>Depo Inisyal (Min. $3 USD)</span>
                  <div className="flex items-center w-full rounded-2xl px-4 py-[12px] mb-4" style={{ background: glass.inputBg, border: `1px solid ${glass.border}` }}>
                    <span className="font-bold text-[16px] mr-[6px]" style={{ color: glass.textDim }}>$</span>
                    <input
                      type="number"
                      min="3"
                      value={cardCreateAmount}
                      onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setCardCreateAmount(val); }}
                      className="flex-1 outline-none font-bold text-[18px]"
                      style={{ background: 'transparent', color: colors.textPrimary }}
                      placeholder="3"
                    />
                    <span className="font-medium text-[13px]" style={{ color: glass.textDim }}>USD</span>
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
                          alert(toErrorMsg(errorData?.message, 'Erè pandan kreyasyon kat la.'));
                        }
                      } catch (err) {
                        alert('Sèvè a pa ka jwenn requete a.');
                      }
                    }}
                    className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] py-4 flex items-center justify-center gap-2 active:scale-95 transition-all oz-glowPulse"
                    style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
                  >
                    <Zap size={16} color="#FFFFFF" /> KREYE KAT GRATIS
                  </button>
                </div>
              </div>
            ) : virtualCard?.status === 'TERMINATED' ? (
              /* ===== TERMINATED CARD ===== */
              <div className="pt-0 lg:max-w-[700px] lg:mx-auto lg:py-10 oz-fadeUp">
                <p className="font-black italic uppercase text-[24px] tracking-[1.5px] pt-6 mb-6 text-white">Kat Visa</p>
                {/* Card image: dim + terminated overlay */}
                <div className="relative w-full mb-4" style={{ aspectRatio: '1.586', borderRadius: 0 }}>
                  <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" style={{ opacity: 0.4 }} />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <span className="font-bold text-[11px] uppercase tracking-[2px] text-white px-4 py-2 rounded-full" style={{ background: '#EF4444' }}>DEZAKTIVE</span>
                  </div>
                </div>
                {/* Terminated info card */}
                <div className="oz-glass mb-4" style={{ borderRadius: 24, padding: 24, borderColor: 'rgba(239,68,68,.35)' }}>
                  <div className="flex items-start gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,.12)' }}>
                      <X size={20} color="#EF4444" />
                    </div>
                    <div>
                      <p className="font-bold text-[13px] mb-1 text-white">Kat Dezaktive</p>
                      <p className="font-medium text-[12px] leading-[18px]" style={{ color: glass.textDim }}>
                        Kat ou a te dezaktive. Kreye yon nouvo kat Visa gratis kounye a.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVirtualCard(null)}
                    className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] py-4 flex items-center justify-center gap-2 active:scale-95 transition-all oz-glowPulse"
                    style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
                  >
                    <Zap size={16} color="#FFFFFF" /> KREYE NOUVO KAT
                  </button>
                </div>
              </div>
            ) : (
              /* ===== ACTIVE / FROZEN CARD ===== */
              <>
                {/* ── MOBILE LAYOUT ── */}
                <div className="lg:hidden animate-in fade-in duration-500" style={{ paddingTop: 'calc(63vw + 248px + env(safe-area-inset-top))' }}>

                  {/* FIXED TOP SECTION */}
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: glass.headerBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingTop: 'env(safe-area-inset-top)' }}>
                    {/* Page title */}
                    <p className="font-black italic uppercase text-[24px] tracking-[1.5px] px-5 pt-6 pb-0 text-white">Kat Visa</p>

                    {/* Card image: marginHorizontal 20, borderRadius 0 */}
                    <div className="mx-5 mt-2 mb-4 relative" style={{ aspectRatio: '1.586', borderRadius: 0, overflow: 'hidden' }}>
                      <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" style={virtualCard?.status === 'FROZEN' ? { filter: 'grayscale(0.4)' } : {}} />
                      {/* Overlay: paddingHorizontal 20, paddingVertical 18 */}
                      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '18px 20px' }}>
                        <div />
                        {/* Card number */}
                        <div>
                          <p className="font-medium text-[10px] mb-[2px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Card Number</p>
                          <button
                            onClick={() => { const num = showCardDetails && virtualCard?.cardNumber ? virtualCard.cardNumber : virtualCard?.cardId; navigator.clipboard.writeText(num || ''); alert('Nimewo kopye!'); }}
                            className="flex items-center gap-[6px]"
                          >
                            <p className="font-bold text-[15px] tracking-[2px]" style={{ color: '#FFFFFF' }}>
                              {showCardDetails && virtualCard?.cardNumber
                                ? virtualCard.cardNumber.replace(/(.{4})/g, '$1 ').trim()
                                : `${virtualCard?.cardId?.slice(0,4).toUpperCase()} •••• •••• ${virtualCard?.cardId?.slice(-4).toUpperCase()}`}
                            </p>
                            <Copy size={12} color="rgba(255,255,255,0.5)" />
                          </button>
                        </div>
                        {/* Bottom row: cardholder + VISA */}
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="font-medium text-[10px] mb-[1px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Cardholder</p>
                            <p className="font-bold text-[12px]" style={{ color: '#FFFFFF' }}>{showCardDetails ? (virtualCard?.cardName || 'OZAMA USER') : 'OZAMA USER'}</p>
                            <p className="font-medium text-[10px] mt-[5px] mb-[1px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Expires</p>
                            <p className="font-bold text-[12px]" style={{ color: '#FFFFFF' }}>{showCardDetails ? (virtualCard?.expiryDate || 'MM/AA') : 'MM/AA'}</p>
                          </div>
                          <p className="font-bold text-[18px] tracking-[4px]" style={{ color: 'rgba(255,255,255,0.3)' }}>VISA</p>
                        </div>
                      </div>
                      {/* Frozen dimmer */}
                      {virtualCard?.status === 'FROZEN' && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                          <Lock size={28} color="rgba(255,255,255,0.6)" />
                        </div>
                      )}
                    </div>

                    {/* Action buttons + balance */}
                    <div className="px-5">
                      {/* Action row */}
                      <div className="flex justify-between items-center mb-4">
                        {[
                          { key: 'info',     label: 'WÈ INFO',  isActive: showCardDetails },
                          { key: 'recharge', label: 'RECHARGE', isActive: false },
                          { key: 'copy',     label: 'KOPYE',    isActive: false },
                          { key: 'freeze',   label: 'BLOKE',    isActive: virtualCard?.status === 'FROZEN' },
                        ].map((btn) => (
                          <button
                            key={btn.key}
                            onClick={async () => {
                              if (btn.key === 'copy') { const num = showCardDetails && virtualCard?.cardNumber ? virtualCard.cardNumber : virtualCard?.cardId; navigator.clipboard.writeText(num || ''); alert('Nimewo kopye!'); return; }
                              if (btn.key === 'recharge') { setShowRechargeModal(true); return; }
                              if (btn.key === 'info') { if (showCardDetails) { setShowCardDetails(false); return; } fetchSecretDetails(); return; }
                              if (btn.key === 'freeze') {
                                try {
                                  const token = localStorage.getItem('token');
                                  const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                                  const endpoint = virtualCard?.status === 'FROZEN' ? 'unfreeze' : 'freeze';
                                  const res = await fetch(`${currentBackendUrl}/v1/cards/${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                                  const data = await res.json();
                                  if (res.ok) { setVirtualCard((prev: any) => ({ ...prev, status: endpoint === 'freeze' ? 'FROZEN' : 'ACTIVE' })); alert(endpoint === 'freeze' ? 'Kat bloke!' : 'Kat debloke!'); }
                                  else { alert(data.message || 'Erè'); }
                                } catch { alert('Erè koneksyon'); }
                              }
                            }}
                            className="flex flex-col items-center gap-[6px] flex-1"
                          >
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                              style={btn.isActive
                                ? { background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', border: '1.5px solid #FF7A00' }
                                : { background: glass.bg, border: `1.5px solid ${glass.border}`, backdropFilter: 'blur(12px)' }}
                            >
                              {btn.key === 'info' && secretDetailsLoading
                                ? <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: btn.isActive ? glass.textDimmer : '#FF7A00', borderTopColor: 'transparent' }} />
                                : btn.key === 'info' && showCardDetails
                                ? <EyeOff size={22} color="#FFFFFF" />
                                : btn.key === 'info'
                                ? <Eye size={22} color="#FF7A00" />
                                : btn.key === 'recharge'
                                ? <Zap size={22} color={btn.isActive ? '#FFFFFF' : '#FF7A00'} />
                                : btn.key === 'copy'
                                ? <Copy size={22} color={btn.isActive ? '#FFFFFF' : '#FF7A00'} />
                                : btn.key === 'freeze' && btn.isActive
                                ? <Unlock size={22} color="#FFFFFF" />
                                : <Lock size={22} color="#FF7A00" />
                              }
                            </div>
                            <p className="font-bold text-[8px] uppercase tracking-[1px] text-white">{btn.label}</p>
                          </button>
                        ))}
                      </div>
                      {/* Balance card */}
                      <div className="flex items-center justify-between rounded-[24px] px-6 py-4 mb-4" style={{ background: 'rgba(255,122,0,.1)', border: '1px solid rgba(255,122,0,.25)', backdropFilter: 'blur(16px)' }}>
                        <div>
                          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: '#FF7A00', display: 'block', marginBottom: 4 }}>Balans Kat</span>
                          <p>
                            <span className="font-bold text-[28px] text-white">${Number(virtualCard?.balance || 0).toFixed(2)}</span>
                            <span className="font-medium text-[14px]" style={{ color: glass.textDim }}> USD</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                          <Wallet2 size={22} color="#FFFFFF" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SCROLLABLE SECTION: details + billing + NFC */}
                  <div style={{ height: 'calc(100vh - 63vw - 248px - env(safe-area-inset-top))', overflowY: 'auto' }} className="pb-24">

                    {/* Card details panel */}
                    {showCardDetails && (
                      <div className="oz-glass mb-4" style={{ borderRadius: 24, padding: 16 }}>
                        <div className="flex justify-between items-center mb-4">
                          <p className="font-bold italic uppercase text-[12px] tracking-[1px] text-white">Detay Kat</p>
                          <button onClick={() => setShowCardDetails(false)}><EyeOff size={18} color={glass.textDimmer} /></button>
                        </div>
                        {secretDetailsLoading ? (
                          <div className="flex flex-col gap-1 animate-pulse">
                            <div className="h-[52px] rounded-[12px]" style={{ background: glass.bgStrong }} />
                            <div className="flex gap-1">
                              <div className="h-[52px] rounded-[12px] flex-1" style={{ background: glass.bgStrong }} />
                              <div className="h-[52px] rounded-[12px] flex-1" style={{ background: glass.bgStrong }} />
                            </div>
                            <div className="h-[52px] rounded-[12px]" style={{ background: glass.bgStrong }} />
                          </div>
                        ) : secretDetailsFailed ? (
                          <div className="flex flex-col items-center gap-3 py-4">
                            <p className="font-medium text-[13px] text-center" style={{ color: glass.textDim }}>Echèk chajman detay kat</p>
                            <button onClick={fetchSecretDetails} className="px-4 py-2 rounded-[12px] font-bold uppercase text-[10px] tracking-[1px] text-white active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>Eseye Ankò</button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="rounded-[12px] p-3" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Nimewo Konplè</span>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-[13px] truncate text-white">{virtualCard?.cardNumber?.replace(/(.{4})/g, '$1 ').trim() || '————'}</p>
                                <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardNumber || ''); alert('Nimewo kopye!'); }} className="flex-shrink-0"><Copy size={13} color={glass.textDimmer} /></button>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <div className="rounded-[12px] p-3 flex-1" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>CVV</span>
                                <p className="font-bold text-[20px] text-white">{virtualCard?.cvv || '———'}</p>
                              </div>
                              <div className="rounded-[12px] p-3 flex-1" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Ekspire</span>
                                <p className="font-bold text-[13px] text-white">{virtualCard?.expiryDate || '——/——'}</p>
                              </div>
                            </div>
                            <div className="rounded-[12px] p-3" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Nom sou Kat</span>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-[13px] truncate text-white">{virtualCard?.cardName || '————'}</p>
                                <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardName || ''); alert('Nom kopye!'); }} className="flex-shrink-0"><Copy size={13} color={glass.textDimmer} /></button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Billing address card */}
                    <div className="oz-glass mb-4" style={{ borderRadius: 24, padding: 16 }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center justify-center rounded-[12px]" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                          <Landmark size={14} color="#FFFFFF" />
                        </div>
                        <p className="font-bold italic uppercase text-[12px] tracking-[1px] text-white">Billing Address</p>
                      </div>
                      {([
                        { label: 'Street',  value: CARD_BILLING.street },
                        { label: 'City',    value: CARD_BILLING.city },
                        { label: 'State',   value: CARD_BILLING.state },
                        { label: 'ZIP',     value: CARD_BILLING.zip },
                        { label: 'Country', value: CARD_BILLING.country },
                      ] as const).map(({ label, value }, i, arr) => (
                        <div key={label} className="flex items-center justify-between" style={{ paddingTop: 10, paddingBottom: 10, borderBottom: i < arr.length - 1 ? `1px solid ${glass.borderSubtle}` : 'none' }}>
                          <div>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 2 }}>{label}</span>
                            <p className="font-bold text-[13px] text-white">{value}</p>
                          </div>
                          <button onClick={() => copyToClipboard(value)} className="flex items-center justify-center rounded-[12px] active:scale-90 transition-all" style={{ width: 32, height: 32, background: glass.inputBg }}>
                            <Copy size={13} color={glass.textDimmer} />
                          </button>
                        </div>
                      ))}
                      <div className="rounded-[12px] p-2 mt-2" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}>
                        <p className="font-bold text-[10px] leading-[15px]" style={{ color: '#EF4444' }}>
                          ⚠️ Itilize SÈLMAN adrès sa a lè yon sit mande billing address ou. Si ou mete yon lòt adrès, tranzaksyon ou ka rejte.
                        </p>
                      </div>
                    </div>

                    {/* NFC badge */}
                    <div className="oz-glass flex items-center gap-3 mb-4" style={{ borderRadius: 24, padding: 16, borderColor: 'rgba(255,122,0,.2)' }}>
                      <div className="flex items-center justify-center rounded-[12px] flex-shrink-0" style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                        <Smartphone size={18} color="#FFFFFF" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[13px] text-white">Google Pay & Apple Pay</p>
                        <p className="font-medium text-[11px] mt-[2px]" style={{ color: glass.textDim }}>Kat ou a sipòte NFC contactless</p>
                      </div>
                      <span style={{ background: 'rgba(255,122,0,.15)', border: '1px solid rgba(255,122,0,.35)', borderRadius: 20, padding: '3px 9px', fontWeight: 700, fontSize: 9, letterSpacing: '.1em', color: '#FF7A00', textTransform: 'uppercase' }}>AKTIF</span>
                    </div>

                  </div>
                </div>

                {/* ── DESKTOP LAYOUT ── */}
                <div className="hidden lg:block oz-fadeUp">
                  <div className="max-w-[1400px] mx-auto px-8 py-10">
                    <p className="font-black italic uppercase text-[24px] tracking-[1.5px] mb-6 text-white">Kat Visa</p>
                    <div className="flex gap-10 items-start">
                      {/* Left: card + actions */}
                      <div className="flex flex-col gap-5 flex-shrink-0" style={{ width: '420px' }}>
                        {/* Card image: borderRadius 0 */}
                        <div className="relative overflow-hidden" style={{ aspectRatio: '1.586', borderRadius: 0 }}>
                          <img src="/card.png" alt="OZAMA Card" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '18px 20px' }}>
                            <div />
                            <div>
                              <p className="font-medium text-[10px] mb-[2px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Card Number</p>
                              <button onClick={() => { const num = showCardDetails && virtualCard?.cardNumber ? virtualCard.cardNumber : virtualCard?.cardId; navigator.clipboard.writeText(num || ''); alert('Nimewo kopye!'); }} className="flex items-center gap-[6px]">
                                <p className="font-bold text-[15px] tracking-[2px]" style={{ color: '#FFFFFF' }}>
                                  {showCardDetails && virtualCard?.cardNumber ? virtualCard.cardNumber.replace(/(.{4})/g, '$1 ').trim() : `${virtualCard?.cardId?.slice(0,4).toUpperCase()} •••• •••• ${virtualCard?.cardId?.slice(-4).toUpperCase()}`}
                                </p>
                                <Copy size={12} color="rgba(255,255,255,0.5)" />
                              </button>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="font-medium text-[10px] mb-[1px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Cardholder</p>
                                <p className="font-bold text-[12px]" style={{ color: '#FFFFFF' }}>{showCardDetails ? (virtualCard?.cardName || 'OZAMA USER') : 'OZAMA USER'}</p>
                                <p className="font-medium text-[10px] mt-[5px] mb-[1px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Expires</p>
                                <p className="font-bold text-[12px]" style={{ color: '#FFFFFF' }}>{showCardDetails ? (virtualCard?.expiryDate || 'MM/AA') : 'MM/AA'}</p>
                              </div>
                              <p className="font-bold text-[18px] tracking-[4px]" style={{ color: 'rgba(255,255,255,0.3)' }}>VISA</p>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex gap-3">
                          {[
                            { key: 'info',     label: 'WÈ INFO',  isActive: showCardDetails },
                            { key: 'recharge', label: 'RECHARGE', isActive: false },
                            { key: 'copy',     label: 'KOPYE',    isActive: false },
                            { key: 'freeze',   label: 'BLOKE',    isActive: virtualCard?.status === 'FROZEN' },
                          ].map((btn) => (
                            <button key={btn.key} onClick={async () => {
                              if (btn.key === 'copy') { const num = showCardDetails && virtualCard?.cardNumber ? virtualCard.cardNumber : virtualCard?.cardId; navigator.clipboard.writeText(num || ''); alert('Nimewo kopye!'); return; }
                              if (btn.key === 'recharge') { setShowRechargeModal(true); return; }
                              if (btn.key === 'info') { if (showCardDetails) { setShowCardDetails(false); return; } fetchSecretDetails(); return; }
                              if (btn.key === 'freeze') {
                                try {
                                  const token = localStorage.getItem('token');
                                  const currentBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl;
                                  const endpoint = virtualCard?.status === 'FROZEN' ? 'unfreeze' : 'freeze';
                                  const res = await fetch(`${currentBackendUrl}/v1/cards/${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                                  const data = await res.json();
                                  if (res.ok) { setVirtualCard((prev: any) => ({ ...prev, status: endpoint === 'freeze' ? 'FROZEN' : 'ACTIVE' })); alert(endpoint === 'freeze' ? 'Kat bloke!' : 'Kat debloke!'); }
                                  else { alert(data.message || 'Erè'); }
                                } catch { alert('Erè koneksyon'); }
                              }
                            }} className="flex flex-col items-center gap-[6px] flex-1">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                                style={btn.isActive
                                  ? { background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', border: '1.5px solid #FF7A00' }
                                  : { background: glass.bg, border: `1.5px solid ${glass.border}`, backdropFilter: 'blur(12px)' }}>
                                {btn.key === 'info' && secretDetailsLoading ? <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF7A00', borderTopColor: 'transparent' }} />
                                : btn.key === 'info' && showCardDetails ? <EyeOff size={22} color="#FFFFFF" />
                                : btn.key === 'info' ? <Eye size={22} color="#FF7A00" />
                                : btn.key === 'recharge' ? <Zap size={22} color={btn.isActive ? '#FFFFFF' : '#FF7A00'} />
                                : btn.key === 'copy' ? <Copy size={22} color={btn.isActive ? '#FFFFFF' : '#FF7A00'} />
                                : btn.key === 'freeze' && btn.isActive ? <Unlock size={22} color="#FFFFFF" />
                                : <Lock size={22} color="#FF7A00" />}
                              </div>
                              <p className="font-bold text-[8px] uppercase tracking-[1px] text-white">{btn.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Right: balance + details + billing + NFC */}
                      <div className="flex-1 flex flex-col gap-4 min-w-0">
                        {/* Balance */}
                        <div className="flex items-center justify-between rounded-[24px] px-6 py-4" style={{ background: 'rgba(255,122,0,.1)', border: '1px solid rgba(255,122,0,.25)', backdropFilter: 'blur(16px)' }}>
                          <div>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: '#FF7A00', display: 'block', marginBottom: 4 }}>Balans Kat</span>
                            <p>
                              <span className="font-bold text-[28px] text-white">${Number(virtualCard?.balance || 0).toFixed(2)}</span>
                              <span className="font-medium text-[14px]" style={{ color: glass.textDim }}> USD</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                            <Wallet2 size={22} color="#FFFFFF" />
                          </div>
                        </div>
                        {/* Details panel */}
                        {showCardDetails && (
                          <div className="oz-glass" style={{ borderRadius: 24, padding: 16 }}>
                            <div className="flex justify-between items-center mb-4">
                              <p className="font-bold italic uppercase text-[12px] tracking-[1px] text-white">Detay Kat</p>
                              <button onClick={() => setShowCardDetails(false)}><EyeOff size={18} color={glass.textDimmer} /></button>
                            </div>
                            {secretDetailsLoading ? (
                              <div className="flex flex-col gap-1 animate-pulse">
                                <div className="h-[52px] rounded-[12px]" style={{ background: glass.bgStrong }} />
                                <div className="flex gap-1"><div className="h-[52px] rounded-[12px] flex-1" style={{ background: glass.bgStrong }} /><div className="h-[52px] rounded-[12px] flex-1" style={{ background: glass.bgStrong }} /></div>
                                <div className="h-[52px] rounded-[12px]" style={{ background: glass.bgStrong }} />
                              </div>
                            ) : secretDetailsFailed ? (
                              <div className="flex flex-col items-center gap-3 py-4">
                                <p className="font-medium text-[13px] text-center" style={{ color: glass.textDim }}>Echèk chajman detay kat</p>
                                <button onClick={fetchSecretDetails} className="px-4 py-2 rounded-[12px] font-bold uppercase text-[10px] tracking-[1px] text-white active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>Eseye Ankò</button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <div className="rounded-[12px] p-3" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Nimewo Konplè</span>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-[13px] truncate text-white">{virtualCard?.cardNumber?.replace(/(.{4})/g, '$1 ').trim() || '————'}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardNumber || ''); alert('Nimewo kopye!'); }} className="flex-shrink-0"><Copy size={13} color={glass.textDimmer} /></button>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <div className="rounded-[12px] p-3 flex-1" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                    <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>CVV</span>
                                    <p className="font-bold text-[20px] text-white">{virtualCard?.cvv || '———'}</p>
                                  </div>
                                  <div className="rounded-[12px] p-3 flex-1" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                    <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Ekspire</span>
                                    <p className="font-bold text-[13px] text-white">{virtualCard?.expiryDate || '——/——'}</p>
                                  </div>
                                </div>
                                <div className="rounded-[12px] p-3" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 3 }}>Nom sou Kat</span>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-[13px] truncate text-white">{virtualCard?.cardName || '————'}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(virtualCard?.cardName || ''); alert('Nom kopye!'); }} className="flex-shrink-0"><Copy size={13} color={glass.textDimmer} /></button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Billing address */}
                        <div className="oz-glass" style={{ borderRadius: 24, padding: 16 }}>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center rounded-[12px]" style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                              <Landmark size={14} color="#FFFFFF" />
                            </div>
                            <p className="font-bold italic uppercase text-[12px] tracking-[1px] text-white">Billing Address</p>
                          </div>
                          {([
                            { label: 'Street',  value: CARD_BILLING.street },
                            { label: 'City',    value: CARD_BILLING.city },
                            { label: 'State',   value: CARD_BILLING.state },
                            { label: 'ZIP',     value: CARD_BILLING.zip },
                            { label: 'Country', value: CARD_BILLING.country },
                          ] as const).map(({ label, value }, i, arr) => (
                            <div key={label} className="flex items-center justify-between" style={{ paddingTop: 10, paddingBottom: 10, borderBottom: i < arr.length - 1 ? `1px solid ${glass.borderSubtle}` : 'none' }}>
                              <div>
                                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 2 }}>{label}</span>
                                <p className="font-bold text-[13px] text-white">{value}</p>
                              </div>
                              <button onClick={() => copyToClipboard(value)} className="flex items-center justify-center rounded-[12px] active:scale-90 transition-all" style={{ width: 32, height: 32, background: glass.inputBg }}>
                                <Copy size={13} color={glass.textDimmer} />
                              </button>
                            </div>
                          ))}
                          <div className="rounded-[12px] p-2 mt-2" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}>
                            <p className="font-bold text-[10px] leading-[15px]" style={{ color: '#EF4444' }}>
                              ⚠️ Itilize SÈLMAN adrès sa a lè yon sit mande billing address ou. Si ou mete yon lòt adrès, tranzaksyon ou ka rejte.
                            </p>
                          </div>
                        </div>
                        {/* NFC badge */}
                        <div className="oz-glass flex items-center gap-3" style={{ borderRadius: 24, padding: 16, borderColor: 'rgba(255,122,0,.2)' }}>
                          <div className="flex items-center justify-center rounded-[12px] flex-shrink-0" style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                            <Smartphone size={18} color="#FFFFFF" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-[13px] text-white">Google Pay & Apple Pay</p>
                            <p className="font-medium text-[11px] mt-[2px]" style={{ color: glass.textDim }}>Kat ou a sipòte NFC contactless</p>
                          </div>
                          <span style={{ background: 'rgba(255,122,0,.15)', border: '1px solid rgba(255,122,0,.35)', borderRadius: 20, padding: '3px 9px', fontWeight: 700, fontSize: 9, letterSpacing: '.1em', color: '#FF7A00', textTransform: 'uppercase' }}>AKTIF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RECHARGE MODAL */}
                {showRechargeModal && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="w-full max-h-[90vh] overflow-y-auto oz-slideUp" style={{ background: glass.sheetBgStrong, borderTop: `1px solid ${glass.border}`, backdropFilter: 'blur(28px)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingLeft: 22, paddingRight: 22, paddingTop: 14, paddingBottom: 48 }}>
                      {/* Handle */}
                      <div className="mx-auto mb-5" style={{ width: 40, height: 4, background: glass.bg, borderRadius: 2 }} />
                      {/* Header */}
                      <div className="flex justify-between items-center mb-4">
                        <p className="font-bold italic uppercase text-[18px] tracking-[1px] text-white">Recharge Kat</p>
                        <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }}><X size={20} color={glass.textDim} /></button>
                      </div>
                      {/* Balance */}
                      <p className="font-medium text-[13px] mb-4" style={{ color: glass.textDim }}>
                        Balans aktyèl:{' '}
                        <span className="font-bold" style={{ color: '#FF7A00' }}>${Number(virtualCard?.balance || 0).toFixed(2)} USD</span>
                      </p>
                      {/* Input label */}
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6 }}>Montan (USD)</span>
                      <div className="flex items-center rounded-2xl mb-2" style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, padding: '12px 16px' }}>
                        <span className="font-bold text-[20px] mr-[6px]" style={{ color: '#FF7A00' }}>$</span>
                        <input
                          type="number"
                          min="1"
                          value={rechargeAmount}
                          onChange={(e) => { const val = e.target.value; if (Number(val) < 0) return; setRechargeAmount(val); }}
                          className="flex-1 outline-none font-bold text-[22px]"
                          style={{ background: 'transparent', color: colors.textPrimary }}
                          placeholder="0.00"
                          autoFocus
                        />
                        <span className="font-medium text-[14px]" style={{ color: glass.textDimmer }}>USD</span>
                      </div>
                      {/* Fee box */}
                      {rechargeAmount && Number(rechargeAmount) > 0 && (() => {
                        const amt = Number(rechargeAmount);
                        const serviceFee = 1.90 + amt * 0.019;
                        const ozamapayFee = Math.round(amt * 0.02 * 100) / 100;
                        const totalUsd = amt + serviceFee + ozamapayFee;
                        const totalHtg = Math.ceil(totalUsd * exchangeRate);
                        return (
                          <div className="rounded-2xl mb-4 flex flex-col" style={{ background: 'rgba(255,122,0,.08)', border: '1px solid rgba(255,122,0,.2)', padding: 14, gap: 5 }}>
                            <div className="flex justify-between items-center">
                              <p className="font-medium text-[11px]" style={{ color: glass.textDim }}>Montan recharge</p>
                              <p className="font-bold text-[12px] text-white">${amt.toFixed(2)} USD</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="font-medium text-[11px]" style={{ color: glass.textDim }}>Frè Sèvis: $1.90 + 1.9%</p>
                              <p className="font-bold text-[12px]" style={{ color: '#FF7A00' }}>+${serviceFee.toFixed(2)} USD</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="font-medium text-[11px]" style={{ color: glass.textDim }}>Frè OZAMAPAY: 2%</p>
                              <p className="font-bold text-[12px]" style={{ color: '#FF7A00' }}>+${ozamapayFee.toFixed(2)} USD</p>
                            </div>
                            <div style={{ height: 1, background: glass.borderSubtle, margin: '2px 0' }} />
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-[12px] text-white">Total USD</p>
                              <p className="font-bold text-[12px] text-white">${totalUsd.toFixed(2)} USD</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-[12px] text-white">Total HTG</p>
                              <p className="font-bold text-[16px] text-white">{totalHtg.toLocaleString()} HTG</p>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Quick amount chips */}
                      <div className="flex gap-2 mb-5">
                        {['5', '10', '20'].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setRechargeAmount(amt)}
                            className="flex-1 py-2 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
                            style={{
                              background: rechargeAmount === amt ? 'rgba(255,122,0,.15)' : glass.bg,
                              border: `1.5px solid ${rechargeAmount === amt ? 'rgba(255,122,0,.5)' : glass.border}`,
                              color: rechargeAmount === amt ? '#FF7A00' : glass.textDim,
                            }}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                      {/* Submit button */}
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
                            if (res.ok) { setShowRechargeModal(false); setRechargeAmount(''); fetchData(); }
                            else { alert(toErrorMsg(data.message, 'Erè recharge')); }
                          } catch { alert('Erè koneksyon'); }
                          finally { setRechargeLoading(false); }
                        }}
                        className="w-full rounded-2xl font-black italic uppercase text-[13px] text-white tracking-[2px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 oz-glowPulse"
                        style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', paddingTop: 18, paddingBottom: 18 }}
                      >
                        {rechargeLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ap trete...</> : 'RECHARGE KAT →'}
                      </button>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        )}

        {/* --- PROFILE SECTION --- */}
        {activeTab === 'profile' && (
          <div className="animate-in slide-in-from-bottom duration-700 pb-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {showKycForm ? (
              /* KYC FORM */
              <div className="animate-in zoom-in duration-300 lg:max-w-[700px] lg:mx-auto lg:py-10 lg:px-4">
                <div className="pb-4 mb-6">
                  <button onClick={() => setShowKycForm(false)} className="flex items-center gap-2 text-[#FF6B00] font-black italic uppercase text-[10px] tracking-widest mb-4">
                    <ChevronRight size={14} className="rotate-180" /> Anile / Tounen
                  </button>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">KYC Verification</h2>
                    <span className="text-[10px] font-black bg-orange-50 text-[#FF6B00] px-3 py-1 rounded-full border border-orange-100">Etap 1/2</span>
                  </div>
                  <p className="text-[9px] font-bold text-[var(--oz-text-sec)] uppercase tracking-widest mt-1">Mete enfòmasyon reyèl pou deboke limit lan</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Premye Non</label>
                      <input type="text" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="Eg: Ralph" value={kycData.firstName} onChange={(e) => setKycData({ ...kycData, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Siyati</label>
                      <input type="text" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="Eg: Greffin" value={kycData.lastName} onChange={(e) => setKycData({ ...kycData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Dat Nesans</label>
                      <input type="date" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" value={kycData.dateOfBirth} onChange={(e) => setKycData({ ...kycData, dateOfBirth: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Telefòn</label>
                      <input type="tel" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="50933333333" value={kycData.phoneNumber} onChange={(e) => setKycData({ ...kycData, phoneNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Adrès</label>
                    <input type="text" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="45, Rue Faubert" value={kycData.line1} onChange={(e) => setKycData({ ...kycData, line1: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Vil</label>
                      <input type="text" className="w-full p-3 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="Pétion-Ville" value={kycData.city} onChange={(e) => setKycData({ ...kycData, city: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Depatman</label>
                      <input type="text" className="w-full p-3 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="Ouest" value={kycData.state} onChange={(e) => setKycData({ ...kycData, state: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Zip</label>
                      <input type="text" className="w-full p-3 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="6110" value={kycData.zipCode} onChange={(e) => setKycData({ ...kycData, zipCode: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Kalite Dokiman</label>
                    <select value={kycData.idType} onChange={(e) => setKycData({ ...kycData, idType: e.target.value })} className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-black uppercase italic text-xs outline-none text-[var(--oz-text)] transition-colors">
                      <option value="NATIONAL_ID">CIN (Kat Elektoral)</option>
                      <option value="PASSPORT">Paspò (Passport)</option>
                      <option value="DRIVERS_LICENSE">Lisans Kondwi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Nimewo Dokiman</label>
                    <input type="text" className="w-full p-4 bg-[var(--oz-surface)] border border-[var(--oz-border)] focus:border-[#FF6B00] rounded-2xl font-bold outline-none text-[var(--oz-text)] text-xs transition-colors" placeholder="01-01-99-1990-00-00000" value={kycData.idNumber} onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Foto Pyès Idantite</label>
                      <button type="button" onClick={() => idCardInputRef.current?.click()} className="w-full p-5 rounded-2xl border-2 border-dashed border-[#FF6B00]/30 bg-orange-50/50 flex flex-col items-center gap-2 hover:bg-orange-50 transition-all">
                        <FileText size={22} className="text-[#FF6B00]" />
                        <span className="text-[8px] font-black uppercase italic text-[var(--oz-text-sec)] text-center">{idCardFile ? idCardFile.name : 'Chwazi foto pyès'}</span>
                      </button>
                      <input type="file" ref={idCardInputRef} hidden onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-[var(--oz-text-sec)] ml-1 tracking-widest">Selfie / Portrait</label>
                      <button type="button" onClick={() => userPhotoInputRef.current?.click()} className="w-full p-5 rounded-2xl border-2 border-dashed border-[#FF6B00]/30 bg-orange-50/50 flex flex-col items-center gap-2 hover:bg-orange-50 transition-all">
                        <Camera size={22} className="text-[#FF6B00]" />
                        <span className="text-[8px] font-black uppercase italic text-[var(--oz-text-sec)] text-center">{userPhotoFile ? userPhotoFile.name : 'Chwazi selfie'}</span>
                      </button>
                      <input type="file" ref={userPhotoInputRef} hidden onChange={(e) => setUserPhotoFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                    <Info size={18} className="text-[#FF6B00] shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-orange-800 uppercase leading-relaxed">
                      Sistèm lan ap debite <span className="text-[var(--oz-text)] font-black">3,375 HTG ($25 USD)</span> otomatikman pou frè verifikasyon.
                    </p>
                  </div>
                  <button onClick={handleKycSubmit} disabled={kycLoading} className="w-full bg-[#FF6B00] text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-lg text-xs transition-all active:scale-95 hover:bg-[#e66000] flex items-center justify-center gap-2 disabled:opacity-50">
                    {kycLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Peye $25 & Soumèt'}
                  </button>
                </div>
              </div>
            ) : (
              /* PROFILE VIEW */
              <div className="lg:max-w-[700px] lg:mx-auto">
                {/* ── HERO CARD — uses glass.innerDark so it adapts with the theme ── */}
                <div className="rounded-2xl p-4 mt-4 mb-4" style={{ background: glass.innerDark }}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-[72px] h-[72px] rounded-full object-cover" />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
                          <span className="text-white font-black" style={{ fontSize: 26, letterSpacing: 1 }}>{displayName.substring(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      <button
                        onClick={() => profilePhotoInputRef.current?.click()}
                        disabled={profilePhotoUploading}
                        className="absolute flex items-center justify-center rounded-full transition disabled:opacity-60"
                        style={{ width: 26, height: 26, bottom: -2, right: -2, backgroundColor: colors.accent, border: `2px solid ${glass.innerDark}` }}
                      >
                        {profilePhotoUploading
                          ? <div className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Camera size={11} className="text-white" />
                        }
                      </button>
                      <input ref={profilePhotoInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProfilePhotoUpload(f); }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditingProfile ? (
                        <div className="space-y-2">
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Non"
                            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold placeholder:text-white/30 outline-none focus:border-[#FF7A00] transition" />
                          <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Telefòn"
                            className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold placeholder:text-white/30 outline-none focus:border-[#FF7A00] transition" />
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleEditProfile} disabled={editProfileLoading}
                              className="flex-1 py-1.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider transition disabled:opacity-50"
                              style={{ backgroundColor: colors.accent }}>
                              {editProfileLoading ? '...' : 'Sove'}
                            </button>
                            <button onClick={() => setIsEditingProfile(false)}
                              className="flex-1 py-1.5 rounded-xl bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-wider transition">
                              Anile
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-white font-black italic uppercase leading-tight" style={{ fontSize: 17, letterSpacing: 0.5 }}>{displayName}</h3>
                            <button
                              onClick={() => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setIsEditingProfile(true); }}
                              className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-[#FF7A00] transition flex-shrink-0"
                            >
                              <Pencil size={10} />
                            </button>
                          </div>
                          {user?.email && <p className="text-[11px] mt-[3px] truncate" style={{ color: glass.textDimmer }}>{user.email}</p>}
                          <div className="flex flex-row gap-1.5 mt-1.5 flex-wrap">
                            {user?.kyc?.status === 'APPROVED' ? (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', letterSpacing: 0.5 }}>✓ Verifye</span>
                            ) : user?.kyc?.status === 'PENDING' ? (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', letterSpacing: 0.5 }}>⏳ Annatant</span>
                            ) : (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: glass.bg, border: `1px solid ${glass.border}`, color: glass.textDim, letterSpacing: 0.5 }}>Pa Verifye</span>
                            )}
                            {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED') && (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: accentMuted, border: `1px solid ${colors.accent}44`, color: colors.accent, letterSpacing: 0.5 }}>⚡ Ajan</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── STATS ROW ── */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 rounded-2xl border p-3 text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <p className="font-black italic uppercase text-[8px] mb-1" style={{ color: colors.textSecondary, letterSpacing: 1 }}>Balans</p>
                    <p className="font-black text-[13px]" style={{ color: colors.accent, letterSpacing: 0.5 }}>{(user?.wallet?.balance || 0).toLocaleString('fr-HT')}</p>
                    <p className="text-[8px] mt-0.5" style={{ color: colors.textSecondary }}>HTG</p>
                  </div>
                  <div className="flex-1 rounded-2xl border p-3 text-center flex flex-col items-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <p className="font-black italic uppercase text-[8px] mb-1" style={{ color: colors.textSecondary, letterSpacing: 1 }}>KYC</p>
                    <BadgeCheck size={22} color={user?.kyc?.status === 'APPROVED' ? colors.success : user?.kyc?.status === 'PENDING' ? '#f97316' : colors.border} />
                    <p className="font-black uppercase text-[8px] mt-0.5" style={{ letterSpacing: 0.5, color: user?.kyc?.status === 'APPROVED' ? colors.success : user?.kyc?.status === 'PENDING' ? '#f97316' : colors.textSecondary }}>
                      {user?.kyc?.status === 'APPROVED' ? 'OK' : user?.kyc?.status === 'PENDING' ? 'Pandan' : 'Non'}
                    </p>
                  </div>
                  <div className="flex-1 rounded-2xl border p-3 text-center flex flex-col items-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <p className="font-black italic uppercase text-[8px] mb-1" style={{ color: colors.textSecondary, letterSpacing: 1 }}>Wòl</p>
                    {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED')
                      ? <Briefcase size={22} color={colors.accent} />
                      : <User size={22} color={colors.textSecondary} />
                    }
                    <p className="font-black uppercase text-[8px] mt-0.5 truncate" style={{ letterSpacing: 0.5, color: colors.textSecondary }}>{user?.role ?? 'USER'}</p>
                  </div>
                </div>

                {/* ── MENU CARD ── */}
                <div className="rounded-2xl border overflow-hidden mb-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>

                  {/* Row 1 — Security & PIN */}
                  <button onClick={() => setShowSecurityCard(s => !s)}
                    className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                    style={{ borderColor: colors.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accentMuted, border: `1px solid ${colors.accent}33` }}>
                      <Shield size={18} color={colors.accent} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Sekirite &amp; PIN</p>
                      <p className="text-[10px]" style={{ color: colors.textSecondary }}>Chanje PIN ou</p>
                    </div>
                    {showSecurityCard ? <ChevronDown size={16} color={colors.textSecondary} /> : <ChevronRight size={16} color={colors.textSecondary} />}
                  </button>
                  {showSecurityCard && (
                    <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-black italic uppercase text-[11px]" style={{ color: colors.textPrimary, letterSpacing: 1 }}>KÒD PIN Sekirite</p>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full" style={{
                          backgroundColor: user?.transactionPin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: user?.transactionPin ? colors.success : colors.error,
                          letterSpacing: 0.5,
                        }}>{user?.transactionPin ? 'PIN Aktif' : 'San PIN'}</span>
                      </div>
                      <div className="flex items-center rounded-lg border mb-3" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                        <input
                          type={profilePinVisible ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••"
                          value={profilePinValue}
                          onChange={e => setProfilePinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="flex-1 bg-transparent outline-none font-black"
                          style={{ paddingLeft: 16, paddingRight: 8, paddingTop: 12, paddingBottom: 12, color: colors.textPrimary, fontSize: 18, letterSpacing: 6 }}
                        />
                        <button onClick={() => setProfilePinVisible(v => !v)} className="transition-opacity" style={{ paddingLeft: 8, paddingRight: 12, paddingTop: 12, paddingBottom: 12 }}>
                          {profilePinVisible ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                        </button>
                      </div>
                      <button onClick={handleSavePin} disabled={profilePinLoading}
                        className="w-full rounded-lg font-black uppercase disabled:opacity-50 transition-all active:scale-[0.98]"
                        style={{ backgroundColor: colors.accent, paddingTop: 12, paddingBottom: 12, color: '#FFFFFF', fontSize: 10, letterSpacing: 1.5 }}>
                        {profilePinLoading
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          : (user?.transactionPin ? 'Mete PIN lan Ajou' : 'Kreye PIN Sekirite Mwen')}
                      </button>
                    </div>
                  )}

                  {/* Row 2 — KYC */}
                  <button onClick={() => { if (user?.kyc?.status !== 'APPROVED') setShowKycForm(true); }}
                    className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                    style={{ borderColor: colors.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={
                      user?.kyc?.status === 'APPROVED'
                        ? { backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                        : { backgroundColor: accentMuted, border: `1px solid ${colors.accent}33` }
                    }>
                      <BadgeCheck size={18} color={user?.kyc?.status === 'APPROVED' ? colors.success : '#f97316'} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Verifikasyon KYC</p>
                      <p className="text-[10px]" style={{ color: colors.textSecondary }}>
                        {user?.kyc?.status === 'APPROVED' ? 'Verifye — Aksè Konplè' : user?.kyc?.status === 'PENDING' ? 'Anba revizyon...' : 'Pa Verifye'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {user?.kyc?.status === 'APPROVED' ? (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: colors.success }}>✓ Fèt</span>
                      ) : user?.kyc?.status === 'PENDING' ? (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }}>Annatant</span>
                      ) : (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.background, color: colors.textSecondary }}>$25</span>
                      )}
                      {user?.kyc?.status !== 'APPROVED' && <ChevronRight size={16} color={colors.textSecondary} />}
                    </div>
                  </button>

                  {/* Row 3 — Agent */}
                  {(user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN' || user?.agent?.status === 'ACTIVE' || user?.agent?.status === 'APPROVED') ? (
                    <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/agent-dashboard'; }}
                      className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                      style={{ borderColor: colors.border }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accentMuted, border: `1px solid ${colors.accent}33` }}>
                        <Briefcase size={18} color={colors.accent} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Tablo Ajan</p>
                        <p className="text-[10px]" style={{ color: colors.textSecondary }}>Jere kont ajan w lan</p>
                      </div>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </button>
                  ) : user?.agent?.status === 'PENDING' ? (
                    <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: colors.border }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <Briefcase size={18} color="#eab308" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Aplikasyon Ajan</p>
                        <p className="text-[10px]" style={{ color: '#f97316' }}>⏳ Demand ou an ap tann apwobasyon admin</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        if (user?.kyc?.status !== 'APPROVED') { showToast('Ou dwe gen KYC apwouve anvan ou ka vin yon Ajan.', 'error'); return; }
                        const token = localStorage.getItem('token');
                        try {
                          const res = await fetch(`${backendUrl}/agents/apply`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ businessName: `${user?.name || 'Ozama'} Agent` }),
                          });
                          const data = await res.json();
                          if (res.ok) { showToast('Aplikasyon w lan soumèt! Admin ap revize l. 🚀', 'success'); fetchData(); }
                          else showToast(data.message || 'Erè pandan aplikasyon an.', 'error');
                        } catch { showToast('Erè rezo. Verifye koneksyon ou.', 'error'); }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                      style={{ borderColor: colors.border }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accentMuted, border: `1px solid ${colors.accent}33` }}>
                        <Briefcase size={18} color={colors.accent} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Vin yon Ajan</p>
                        <p className="text-[10px]" style={{ color: colors.textSecondary }}>Aplike kounye a — Mande KYC Apwouve</p>
                      </div>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </button>
                  )}

                  {/* Row 3b — Business */}
                  {!myBusinesses?.owned?.length && (
                    <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/business/apply'; }}
                      className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                      style={{ borderColor: colors.border }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accentMuted, border: `1px solid ${colors.accent}33` }}>
                        <Briefcase size={18} color={colors.accent} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Vin yon Biznis</p>
                        <p className="text-[10px]" style={{ color: colors.textSecondary }}>Aplike kounye a — Mande KYC Apwouve</p>
                      </div>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </button>
                  )}

                  {/* Row 4 — Rates */}
                  <button onClick={() => setShowRates(r => !r)}
                    className="w-full flex items-center gap-3 px-4 py-4 border-b active:opacity-70 transition-all"
                    style={{ borderColor: colors.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <TrendingUp size={18} color="#3b82f6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Tarif &amp; Frè</p>
                      <p className="text-[10px]" style={{ color: colors.textSecondary }}>BRH, P2P, Topup, Retrè</p>
                    </div>
                    {showRates ? <ChevronDown size={16} color={colors.textSecondary} /> : <ChevronRight size={16} color={colors.textSecondary} />}
                  </button>
                  {showRates && (
                    <div className="px-4 pb-2 border-b" style={{ borderColor: colors.border }}>
                      {[
                        { label: 'Tarif BRH', value: `${exchangeRate} HTG`, green: true },
                        { label: 'Transfè P2P', value: '0%', green: true },
                        { label: 'Topup (Depo)', value: '6%', green: false },
                        { label: 'Retrè', value: '2%', green: false },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: colors.border }}>
                          <span className="font-black italic uppercase text-[10px]" style={{ color: colors.textSecondary, letterSpacing: 0.5 }}>{r.label}</span>
                          <span className="font-black text-[11px]" style={{ color: r.green ? colors.success : colors.textPrimary }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row 5 — Theme (inside menu card) */}
                  <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: colors.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                      {isDark ? <Moon size={18} color={colors.accent} /> : <Sun size={18} color={colors.accent} />}
                    </div>
                    <p className="font-black italic uppercase text-[12px] flex-1" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Mòd Eskran</p>
                    <button onClick={toggleTheme}
                      className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
                      style={{ backgroundColor: isDark ? colors.accent : colors.border }}>
                      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200"
                        style={{ backgroundColor: colors.surface, transform: isDark ? 'translateX(24px)' : 'translateX(0)' }} />
                    </button>
                  </div>

                  {/* Row 6 — Biometric (web placeholder) */}
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                      <Shield size={18} color={colors.accent} />
                    </div>
                    <div className="flex-1">
                      <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Biometri</p>
                      <p className="text-[10px]" style={{ color: colors.textSecondary }}>Disponib sou aplikasyon mobil</p>
                    </div>
                  </div>

                </div>

                {/* ── SUPPORT CARD ── */}
                <button onClick={() => { window.location.href = '/support'; }}
                  className="w-full rounded-2xl border flex items-center gap-3 px-4 py-4 mb-4 active:opacity-70 transition-all"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <HelpCircle size={18} color="#3b82f6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black italic uppercase text-[12px]" style={{ color: colors.textPrimary, letterSpacing: 0.5 }}>Sipò &amp; Èd</p>
                    <p className="text-[10px]" style={{ color: colors.textSecondary }}>Kontakte nou</p>
                  </div>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </button>

                {/* ── LOGOUT ── */}
                <button onClick={signOut}
                  className="w-full rounded-xl active:opacity-70 transition-all"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${colors.error}`, paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20 }}>
                  <span className="font-black italic uppercase text-[11px]" style={{ color: colors.error, letterSpacing: 1.5 }}>Dekonekte</span>
                </button>

              </div>
            )}
          </div>
        )}

      </div>

      {/* ── GIFT CARDS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'giftcards' && (() => {
        const gcIsRange = (p: any) =>
          p.denominationType === 'RANGE' || (p.senderFaceValue == null && p.minSenderDenomination != null);

        const gcStatusColor = (s: string) =>
          s === 'COMPLETED' ? '#22c55e' : (s === 'PROCESSING' || s === 'PENDING') ? '#FF7A00' : '#ef4444';

        const gcStatusLabel = (s: string) =>
          ({ COMPLETED: 'Konplete', PROCESSING: 'Ap trete', PENDING: 'Annatant', FAILED: 'Echwe' } as any)[s] ?? s;

        const handleBuyGift = async () => {
          if (!gcSelectedProduct) return;
          const unitPrice = parseFloat(gcBuyAmount);
          if (isNaN(unitPrice) || unitPrice <= 0) { showToast('Tanpri antre yon montan valid.', 'error'); return; }
          setGcOrderLoading(true);
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${backendUrl}/giftcards/order`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: gcSelectedProduct.productId, unitPrice }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.message || 'Erè pandan kòmand lan', 'error'); return; }
            setGcOrderResult(data);
            setGcSelectedProduct(null);
            const t = localStorage.getItem('token');
            if (t) fetch(`${backendUrl}/giftcards/orders`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json()).then(o => setGcOrders(Array.isArray(o) ? o : [])).catch(() => {});
            fetchData();
          } catch { showToast('Erè rezo', 'error'); }
          finally { setGcOrderLoading(false); }
        };

        const handleAirtimeTopup = async () => {
          if (!atSelectedOp) return;
          if (!atPhone.trim()) { showToast('Tanpri antre nimewo telefòn nan.', 'error'); return; }
          const amtNum = parseFloat(String(atAmount));
          if (isNaN(amtNum) || amtNum <= 0) { showToast('Tanpri antre yon montan valid.', 'error'); return; }
          setAtLoading(true);
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${backendUrl}/airtime/topup`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ operatorId: atSelectedOp.operatorId, amount: amtNum, phoneNumber: atPhone.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.message || 'Erè pandan rechaj la', 'error'); return; }
            setAtResult(data);
            setAtSelectedOp(null);
            const t = localStorage.getItem('token');
            if (t) fetch(`${backendUrl}/airtime/orders`, { headers: { Authorization: `Bearer ${t}` } })
              .then(r => r.json()).then(o => setAtOrders(Array.isArray(o) ? o : [])).catch(() => {});
            fetchData();
          } catch { showToast('Erè rezo', 'error'); }
          finally { setAtLoading(false); }
        };

        return (
          <div className="oz-fadeUp pb-2" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Page title */}
            <h1 className="font-black italic uppercase text-[24px] mt-6 mb-4 text-white" style={{ letterSpacing: 1.5 }}>
              Kado &amp; Kredi
            </h1>

            {/* Segmented control */}
            <div className="flex rounded-xl p-[3px] mb-4" style={{ background: glass.bg, border: `1px solid ${glass.border}` }}>
              <button
                onClick={() => setGcSection('gifts')}
                className="flex-1 py-[9px] rounded-[10px] font-black italic uppercase text-[11px] tracking-[0.04em] transition-all"
                style={gcSection === 'gifts'
                  ? { background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', color: '#fff' }
                  : { color: glass.textDimmer }}
              >
                Gift Cards
              </button>
              <button
                onClick={() => setGcSection('airtime')}
                className="flex-1 py-[9px] rounded-[10px] font-black italic uppercase text-[11px] tracking-[0.04em] transition-all"
                style={gcSection === 'airtime'
                  ? { background: 'linear-gradient(135deg,#FF7A00,#FF6B00)', color: '#fff' }
                  : { color: glass.textDimmer }}
              >
                Airtime
              </button>
            </div>

            {/* ── GIFT CARDS sub-tab ── */}
            {gcSection === 'gifts' && (
              <>
                {/* Purchase result card */}
                {gcOrderResult && (
                  <div className="oz-glass-strong rounded-3xl p-5 text-center mb-5">
                    <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255,122,0,.14)' }}>
                      <CheckCircle2 size={28} color="#FF7A00" />
                    </div>
                    <p className="font-black italic uppercase text-base tracking-tight text-white">{gcOrderResult.productName}</p>
                    <p className="text-sm mt-1" style={{ color: glass.textDim }}>${gcOrderResult.unitPrice} USD · {gcOrderResult.htgPaid} HTG</p>
                    {gcOrderResult.redeemCode ? (
                      <div className="mt-4 rounded-[12px] px-4 py-3" style={{ background: glass.bg, border: `1px solid ${glass.border}` }}>
                        <p className="font-black text-[#FF7A00] text-xl tracking-[0.1em] break-all">{gcOrderResult.redeemCode}</p>
                        <button onClick={() => copyToClipboard(gcOrderResult.redeemCode)} className="mt-3 flex items-center gap-2 mx-auto text-white px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest" style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}>
                          <Copy size={15} /> Kopye Kòd la
                        </button>
                      </div>
                    ) : (
                      <p className="font-bold text-sm mt-3" style={{ color: '#FF7A00' }}>Kòmand an pwosesis — w ap resevwa kòd la pa imel.</p>
                    )}
                    <button onClick={() => setGcOrderResult(null)} className="mt-4 text-sm underline" style={{ color: glass.textDimmer }}>Fèmen</button>
                  </div>
                )}

                {/* Products section title */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 10 }}>Pwodwi Disponib</span>

                {gcLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : gcProducts.length === 0 ? (
                  <div className="oz-glass rounded-2xl p-6 text-center mb-3">
                    <p className="italic text-[13px]" style={{ color: glass.textDimmer }}>Pa gen okenn pwodwi disponib kounye a.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {gcProducts.map((p: any) => (
                      <button
                        key={p.productId}
                        onClick={() => {
                          setGcSelectedProduct(p);
                          setGcBuyAmount(gcIsRange(p) ? String(p.minSenderDenomination ?? '') : String(p.senderFaceValue ?? ''));
                        }}
                        className="oz-glass rounded-2xl p-3 flex flex-col items-center active:scale-[0.97] transition-all"
                      >
                        {p.logoUrls?.[0] ? (
                          <img src={p.logoUrls[0]} alt={p.brand?.brandName ?? p.productName} className="w-full h-14 object-contain rounded-md mb-2" />
                        ) : (
                          <div className="w-full h-14 rounded-md mb-2" style={{ background: glass.bgStrong }} />
                        )}
                        <p className="font-black italic uppercase text-[10px] tracking-[0.03em] text-center leading-tight mb-0.5 truncate w-full text-white">
                          {p.brand?.brandName ?? p.productName}
                        </p>
                        <p className="font-black text-[12px]" style={{ color: '#FF7A00' }}>
                          {gcIsRange(p) ? `$${p.minSenderDenomination}–$${p.maxSenderDenomination}` : `$${p.senderFaceValue}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Gift card order history */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginTop: 24, marginBottom: 10 }}>Istorik Gift Cards</span>
                {gcOrders.length === 0 ? (
                  <div className="oz-glass rounded-2xl p-6 text-center mb-3">
                    <p className="italic text-[13px]" style={{ color: glass.textDimmer }}>Pa gen okenn achte poko.</p>
                  </div>
                ) : (
                  gcOrders.map((o: any) => (
                    <div key={o.id} className="oz-glass rounded-3xl p-4 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-black italic uppercase text-[12px] tracking-[0.03em] flex-1 mr-3 truncate text-white">{o.productName}</p>
                        <span className="text-[9px] font-black uppercase rounded-full px-2 py-0.5"
                          style={{ background: `${gcStatusColor(o.status)}22`, color: gcStatusColor(o.status) }}>
                          {gcStatusLabel(o.status)}
                        </span>
                      </div>
                      <p className="text-[11px] mb-1" style={{ color: glass.textDimmer }}>
                        ${parseFloat(o.unitPrice).toFixed(2)} · {parseFloat(o.htgPaid).toFixed(2)} HTG
                      </p>
                      {o.redeemCode && (
                        <div className="rounded-[10px] px-3 py-1.5 my-1.5 flex items-center justify-between" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                          <p className="font-black text-[#FF7A00] text-[14px] tracking-[0.1em]">{o.redeemCode}</p>
                          <button onClick={() => copyToClipboard(o.redeemCode)} className="text-[#FF7A00] ml-2"><Copy size={14} /></button>
                        </div>
                      )}
                      <p className="text-[10px] mt-1" style={{ color: glass.textDimmer }}>{formatTxDate(o.createdAt)}</p>
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── AIRTIME sub-tab ── */}
            {gcSection === 'airtime' && (
              <>
                {/* Airtime success card */}
                {atResult && (
                  <div className="oz-glass-strong rounded-3xl p-5 text-center mb-5">
                    <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(34,197,94,.14)' }}>
                      <CheckCircle2 size={28} color="#22C55E" />
                    </div>
                    <p className="font-black italic uppercase text-base text-white">Kredi Voye!</p>
                    <p className="text-sm mt-1" style={{ color: glass.textDim }}>{atResult.amount} HTG → +509 {atResult.phoneNumber}</p>
                    <p className="text-xs mt-0.5" style={{ color: glass.textDimmer }}>{atResult.operatorName}</p>
                    <div className="mt-4 rounded-2xl p-4" style={{ background: glass.bg, border: `1px solid ${glass.borderSubtle}` }}>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDimmer, display: 'block', marginBottom: 4 }}>Peye</span>
                      <p className="font-black text-xl text-white">{Number(atResult.htgPaid).toFixed(2)} HTG</p>
                    </div>
                    <button onClick={() => { setAtResult(null); setAtPhone(''); setAtAmount(null); }} className="mt-4 text-sm underline" style={{ color: glass.textDimmer }}>Fèmen</button>
                  </div>
                )}

                {/* Operators section title */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginBottom: 10 }}>Operatè</span>

                {atOpLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : atOperators.length === 0 ? (
                  <div className="oz-glass rounded-2xl p-6 text-center mb-3">
                    <p className="italic text-[13px]" style={{ color: glass.textDimmer }}>Pa gen okenn pwodwi disponib kounye a.</p>
                  </div>
                ) : (
                  atOperators.map((op: any) => (
                    <button
                      key={op.operatorId}
                      onClick={() => {
                        setAtSelectedOp(op);
                        setAtAmount(op.denominationType === 'FIXED' && op.localFixedAmounts?.length ? op.localFixedAmounts[0] : (op.minAmount ?? null));
                        setAtPhone('');
                      }}
                      className="oz-glass w-full flex items-center rounded-3xl p-4 mb-3 active:scale-[0.98] transition-all"
                    >
                      {op.logoUrls?.[0] ? (
                        <img src={op.logoUrls[0]} alt={op.name} className="w-11 h-11 rounded-lg object-contain mr-4 flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg mr-4 flex-shrink-0" style={{ background: glass.bgStrong }} />
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-black italic uppercase text-[12px] tracking-[0.03em] mb-0.5 text-white">{op.name}</p>
                        <p className="text-[11px]" style={{ color: glass.textDimmer }}>
                          {op.denominationType === 'FIXED' && op.localFixedAmounts?.length
                            ? op.localFixedAmounts.map((a: number) => `${a} HTG`).join(' · ')
                            : `${op.minAmount ?? 0}–${op.maxAmount ?? '?'} HTG`}
                        </p>
                      </div>
                      <span className="text-[22px] ml-3" style={{ color: glass.textDimmer }}>›</span>
                    </button>
                  ))
                )}

                {/* Airtime order history */}
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, color: glass.textDim, display: 'block', marginTop: 24, marginBottom: 10 }}>Istorik Airtime</span>
                {atOrdersLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : atOrders.length === 0 ? (
                  <div className="oz-glass rounded-2xl p-6 text-center mb-3">
                    <p className="italic text-[13px]" style={{ color: glass.textDimmer }}>Pa gen okenn achte poko.</p>
                  </div>
                ) : (
                  atOrders.map((o: any) => (
                    <div key={o.id} className="oz-glass rounded-3xl p-4 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-black italic uppercase text-[12px] tracking-[0.03em] flex-1 mr-3 truncate text-white">{o.operatorName}</p>
                        <span className="text-[9px] font-black uppercase rounded-full px-2 py-0.5"
                          style={{ background: `${gcStatusColor(o.status)}22`, color: gcStatusColor(o.status) }}>
                          {gcStatusLabel(o.status)}
                        </span>
                      </div>
                      <p className="text-[11px] mb-1" style={{ color: glass.textDimmer }}>
                        {parseFloat(o.amount).toFixed(2)} HTG → {o.phoneNumber}
                      </p>
                      <p className="text-[11px] mb-1" style={{ color: glass.textDimmer }}>
                        Debite: {parseFloat(o.htgPaid).toFixed(2)} HTG
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: glass.textDimmer }}>{formatTxDate(o.createdAt)}</p>
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── GIFT CARD BUY MODAL ── */}
            {gcSelectedProduct && (
              <div
                className="fixed inset-0 z-[60] flex items-end"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                onClick={() => !gcOrderLoading && setGcSelectedProduct(null)}
              >
                <div
                  className="w-full rounded-t-3xl p-6 pb-8 oz-slideUp"
                  style={{ background: glass.sheetBgStrong, borderTop: `1px solid ${glass.border}`, backdropFilter: 'blur(28px)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="mx-auto mb-5" style={{ width: 40, height: 4, background: glass.bg, borderRadius: 2 }} />
                  <p className="font-black italic uppercase text-[16px] tracking-[0.04em] mb-4 text-center text-white">
                    {gcSelectedProduct.brand?.brandName ?? gcSelectedProduct.productName}
                  </p>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6, marginTop: 12 }}>Montan ($USD)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-xl px-4 py-[13px] text-[15px] outline-none"
                    style={{
                      background: glass.inputBg,
                      border: `1px solid ${glass.border}`,
                      color: colors.textPrimary,
                      opacity: !gcIsRange(gcSelectedProduct) ? 0.6 : 1,
                    }}
                    value={gcBuyAmount}
                    onChange={e => setGcBuyAmount(e.target.value)}
                    readOnly={!gcIsRange(gcSelectedProduct)}
                  />
                  {gcIsRange(gcSelectedProduct) && (
                    <p className="text-[11px] mt-1" style={{ color: glass.textDimmer }}>
                      Min ${gcSelectedProduct.minSenderDenomination} — Max ${gcSelectedProduct.maxSenderDenomination}
                    </p>
                  )}
                  <button
                    onClick={handleBuyGift}
                    disabled={gcOrderLoading}
                    className="w-full py-4 text-white font-black uppercase rounded-2xl tracking-widest text-sm mt-6 active:scale-[0.98] transition-all disabled:opacity-40 oz-glowPulse"
                    style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
                  >
                    {gcOrderLoading ? 'Pwosesis...' : 'Achte'}
                  </button>
                  <button
                    onClick={() => { if (!gcOrderLoading) setGcSelectedProduct(null); }}
                    disabled={gcOrderLoading}
                    className="w-full py-4 font-black uppercase rounded-2xl tracking-widest text-sm mt-3 disabled:opacity-40"
                    style={{ background: glass.bg, border: `1px solid ${glass.border}`, color: glass.textDim }}
                  >
                    Anile
                  </button>
                </div>
              </div>
            )}

            {/* ── AIRTIME TOPUP MODAL ── */}
            {atSelectedOp && (
              <div
                className="fixed inset-0 z-[60] flex items-end"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                onClick={() => !atLoading && setAtSelectedOp(null)}
              >
                <div
                  className="w-full rounded-t-3xl p-6 pb-8 oz-slideUp"
                  style={{ background: glass.sheetBgStrong, borderTop: `1px solid ${glass.border}`, backdropFilter: 'blur(28px)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="mx-auto mb-5" style={{ width: 40, height: 4, background: glass.bg, borderRadius: 2 }} />
                  <p className="font-black italic uppercase text-[16px] tracking-[0.04em] mb-4 text-center text-white">
                    {atSelectedOp.name}
                  </p>

                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6, marginTop: 12 }}>Nimewo Telefòn</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="ex: 36001234"
                    value={atPhone}
                    onChange={e => setAtPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full rounded-xl px-4 py-[13px] text-[15px] outline-none placeholder:text-white/30"
                    style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary }}
                  />

                  <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 9, color: glass.textDim, display: 'block', marginBottom: 6, marginTop: 14 }}>Montan (HTG)</span>
                  {atSelectedOp.denominationType === 'FIXED' && atSelectedOp.localFixedAmounts?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {atSelectedOp.localFixedAmounts.map((a: number) => (
                        <button
                          key={a}
                          onClick={() => setAtAmount(a)}
                          className="rounded-xl px-4 py-2 text-[13px] font-bold transition-all active:scale-95"
                          style={atAmount === a
                            ? { background: 'rgba(255,122,0,.15)', border: '1.5px solid rgba(255,122,0,.5)', color: '#FF7A00' }
                            : { background: glass.bg, border: `1px solid ${glass.border}`, color: glass.textDim }}
                        >
                          {a} HTG
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={atAmount ?? ''}
                        onChange={e => setAtAmount(parseFloat(e.target.value) || null)}
                        className="w-full rounded-xl px-4 py-[13px] text-[15px] outline-none"
                        style={{ background: glass.inputBg, border: `1px solid ${glass.border}`, color: colors.textPrimary }}
                      />
                      <p className="text-[11px] mt-1" style={{ color: glass.textDimmer }}>
                        Min {atSelectedOp.minAmount} — Max {atSelectedOp.maxAmount} HTG
                      </p>
                    </>
                  )}

                  <button
                    onClick={handleAirtimeTopup}
                    disabled={atLoading}
                    className="w-full py-4 text-white font-black uppercase rounded-2xl tracking-widest text-sm mt-6 active:scale-[0.98] transition-all disabled:opacity-40 oz-glowPulse"
                    style={{ background: 'linear-gradient(135deg,#FF7A00,#FF6B00)' }}
                  >
                    {atLoading ? 'Pwosesis...' : 'Achte Kredi'}
                  </button>
                  <button
                    onClick={() => { if (!atLoading) setAtSelectedOp(null); }}
                    disabled={atLoading}
                    className="w-full py-4 font-black uppercase rounded-2xl tracking-widest text-sm mt-3 disabled:opacity-40"
                    style={{ background: glass.bg, border: `1px solid ${glass.border}`, color: glass.textDim }}
                  >
                    Anile
                  </button>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 z-40 flex-col" style={{ backgroundColor: colors.surface, borderRight: `1px solid ${colors.border}` }}>
        {/* Logo */}
        <div className="px-6 py-7" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <Image
            src="/logo.png"
            alt="OZAMAPAY"
            width={120}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          {[
            { id: 'home',      icon: <Home size={20} />,         label: 'Home' },
            { id: 'finance',   icon: <Landmark size={20} />,     label: 'Finance' },
            { id: 'cards',     icon: <CreditCard size={20} />,   label: 'Cards' },
            { id: 'giftcards', icon: <ShoppingCart size={20} />, label: 'Gifts' },
            { id: 'profile',   icon: <User size={20} />,         label: 'Profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedFinanceService(null); setShowKycForm(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-[#FF7A00]/10 text-[#FF7A00]'
                  : 'hover:bg-[var(--oz-surface)]'
              }`}
              style={activeTab !== item.id ? { color: colors.textSecondary } : {}}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
              )}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-5 flex items-center gap-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="w-9 h-9 rounded-2xl bg-[#FF7A00]/10 flex items-center justify-center text-[#FF7A00] font-black text-sm shrink-0">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: colors.textPrimary }}>{displayName}</p>
            <p className="text-[var(--oz-text-sec)] text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* BOTTOM NAVIGATION — floating pill */}
      <nav
        className="fixed z-50 lg:hidden flex items-center justify-around"
        style={{
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          left: 14, right: 14,
          height: 70,
          background: glass.sheetBg,
          backdropFilter: 'blur(26px)',
          WebkitBackdropFilter: 'blur(26px)',
          borderRadius: 26,
          border: `1px solid ${glass.borderSubtle}`,
          boxShadow: '0 8px 32px rgba(0,0,0,.45)',
        }}
      >
        {[
          { id: 'home',      icon: <Home size={20} />,         label: 'HOME' },
          { id: 'finance',   icon: <Landmark size={20} />,     label: 'FINANCE' },
          { id: 'cards',     icon: <CreditCard size={20} />,   label: 'CARDS' },
          { id: 'giftcards', icon: <ShoppingCart size={20} />, label: 'GIFTS' },
          { id: 'profile',   icon: <User size={20} />,         label: 'PROFILE' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedFinanceService(null); setShowKycForm(false); }}
              className="flex flex-col items-center justify-center transition-all active:scale-90"
              style={{ flex: 1, height: '100%', gap: 3 }}
            >
              {isActive ? (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'rgba(255,122,0,.15)', borderRadius: 16, padding: '6px 14px' }}>
                  <span style={{ color: '#FF7A00' }}>{item.icon}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', color: '#FF7A00', textTransform: 'uppercase' }}>{item.label}</span>
                </span>
              ) : (
                <>
                  <span style={{ color: glass.textDimmer }}>{item.icon}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', color: glass.textDimmer, textTransform: 'uppercase' }}>{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>
      
      <input type="file" ref={fileInputRef} hidden onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
      <input type="file" ref={financeFileInputRef} hidden onChange={(e) => setFinanceReceipt(e.target.files?.[0] || null)} />
    </main>
  );
}
