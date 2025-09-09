import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Configuração global do axios
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Função para persistir dados do usuário
const persistUserData = (token, user) => {
  if (!token || !user) return;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

// Função para limpar dados do usuário
const clearUserData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Função para recuperar dados do usuário
const getUserData = () => {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      return { token: null, user: null };
    }

    const user = JSON.parse(userStr);
    return { token, user };
  } catch (error) {
    console.error('Erro ao recuperar dados do usuário:', error);
    clearUserData();
    return { token: null, user: null };
  }
};

// Interceptor para adicionar token em todas as requisições
axios.interceptors.request.use((config) => {
  const { token } = getUserData();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useAuthStore = create((set) => {
  const { token, user } = getUserData();
  
  return {
    user,
    token,
    isAuthenticated: !!token && !!user,

    register: async (username, email, password) => {
      try {
        console.log('Iniciando registro:', { username, email });
        
        const response = await axios.post('/auth/register', {
          username,
          email,
          password
        });

        console.log('Resposta do registro:', response.data);

        const { token, user } = response.data;
        
        if (token && user) {
          persistUserData(token, user);
          set({
            token,
            isAuthenticated: true,
            user
          });
        }

        return { 
          success: true, 
          data: response.data 
        };
      } catch (error) {
        console.error('Erro detalhado no registro:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });

        return { 
          success: false, 
          error: error.response?.data?.message || 'Erro ao criar conta' 
        };
      }
    },

    login: async (email, password) => {
      try {
        console.log('Iniciando login:', { email });

        const response = await axios.post('/auth/login', {
          email,
          password
        });

        console.log('Resposta do login:', response.data);

        const { token, user } = response.data;
        
        if (!token || !user) {
          throw new Error('Resposta inválida do servidor');
        }

        persistUserData(token, user);
        
        set({
          token,
          isAuthenticated: true,
          user
        });

        return { success: true };
      } catch (error) {
        console.error('Erro detalhado no login:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });

        return { 
          success: false, 
          error: error.response?.data?.message || 'Credenciais inválidas' 
        };
      }
    },

    logout: () => {
      clearUserData();
      set({
        token: null,
        isAuthenticated: false,
        user: null
      });
    }
  };
});