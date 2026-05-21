import { apiClient } from './api-client';

export const authService = {
  // 1. Tès rapid pou wè si backend lan ap reponn
  async healthCheck() {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // 2. Kreyasyon kont
  async register(userData: any) {
    const response = await apiClient.post('/auth/register', userData);
    if (response.data?.token) {
      localStorage.setItem('ozama_token', response.data.token);
    }
    return response.data;
  },

  // 3. Koneksyon
  async login(credentials: any) {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data?.token) {
      localStorage.setItem('ozama_token', response.data.token);
    }
    return response.data;
  },

  // 4. Rekipere pwofil moun ki konekte a
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // 5. Dekoneksyon
  logout() {
    localStorage.removeItem('ozama_token');
  }
};