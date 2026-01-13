import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api } from '../services/api';

// Interface do usuário
interface User {
  id: number;
  name: string;
  email: string;
  role: 'Administrador' | 'Gerente' | 'Vendedor';
  status: 'Ativo' | 'Inativo';
}

// Interface do contexto de autenticação
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Criar contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider do contexto de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verificar se usuário está logado ao carregar a aplicação
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Usar apenas API real
      const response = await api.getMe();
      if (response.success && response.data) {
        setUser(response.data);
        // Garantir que o token esteja configurado na API (correção para race condition)
        if (token) api.setToken(token);
      } else {
        // Token inválido, remover
        localStorage.removeItem('auth_token');
        api.removeToken();
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
      localStorage.removeItem('auth_token');
      api.removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 useAuth: Iniciando login para', email);

      // Usar apenas API real
      const response = await api.login(email, password);
      console.log('🔐 useAuth: Resposta da API:', response);

      if (response.success && response.data) {
        console.log('🔐 useAuth: Login bem-sucedido via API, dados do usuário:', response.data.user);
        setUser(response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Email ou senha incorretos'
        };
      }
    } catch (error) {
      console.error('🔐 useAuth: Erro durante login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Fazer logout na API real
      await api.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
      api.removeToken();
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
