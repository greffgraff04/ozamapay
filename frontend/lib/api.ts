import axios from 'axios';

const api = axios.create({
  // Ranplase sa ak IP VPS ou a oswa api.ozamapay.com si DNS la fin pwopaje
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', 
});

// Sa ap ajoute Token JWT ou a otomatikman nan chak requèt
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ozama_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;