import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:10000';


const TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // Sa enpòtan anpil pou n bypass CORS ak Next.js
});

// Ti entèsèptè pou otomatikman pase Token si nou sove l nan localStorage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ozama_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Jesyon erè jeneral ak sekirite ? pou evite Next.js "stale" oswa "crash"
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.error('❌ API Error Details:', {
        url: error?.config?.url || 'Unknown URL',
        status: error?.response?.status || 'No Status',
        data: error?.response?.data || error?.message || 'No Data',
      });
    }
    return Promise.reject(error);
  }
);