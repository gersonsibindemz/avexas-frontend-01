import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type UserRole = 'super_admin' | 'tenant_admin' | 'supervisor' | 'technician' | 'driver_operator';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tenantName: string;
  tenantId: string;
  operational_scope?: 'fleet' | 'plant' | 'both';
  tenant?: {
    id: string;
    name: string;
    max_users?: number;
    maxUsers?: number;
    operational_scope?: 'fleet' | 'plant' | 'both';
    operationalScope?: 'fleet' | 'plant' | 'both';
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isSupervisor: boolean;
  isTechnician: boolean;
  isDriverOperator: boolean;
  isFleet: boolean;
  isPlant: boolean;
  currentScope: 'fleet' | 'plant';
  setCurrentScope: React.Dispatch<React.SetStateAction<'fleet' | 'plant'>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScope, setCurrentScope] = useState<'fleet' | 'plant'>('fleet');

  const fetchProfile = async () => {
    const token = sessionStorage.getItem('cmms_auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const userData = response.data?.user || response.data;
      if (userData && userData.id && userData.role) {
        setUser(userData);
        // Inicializar o escopo padrão do utilizador
        const scope = userData.operational_scope || userData.tenant?.operational_scope || userData.tenant?.operationalScope;
        if (scope === 'plant') {
          setCurrentScope('plant');
        } else {
          setCurrentScope('fleet');
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleWindowFocus = () => {
      if (sessionStorage.getItem('cmms_auth_token')) {
        fetchProfile();
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const scope = user.operational_scope || user.tenant?.operational_scope || user.tenant?.operationalScope;
      if (scope === 'plant') {
        setCurrentScope('plant');
      } else if (scope === 'fleet') {
        setCurrentScope('fleet');
      }
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data?.token) {
        sessionStorage.setItem('cmms_auth_token', response.data.token);
      } else if (response.data?.accessToken) {
        sessionStorage.setItem('cmms_auth_token', response.data.accessToken);
      }

      const userData = response.data?.user || response.data;
      
      if (!userData || !userData.id || !userData.role) {
        throw new Error('Servidor retornou dados de utilizador inválidos.');
      }
      
      setUser(userData);
      const scope = userData.operational_scope || userData.tenant?.operational_scope || userData.tenant?.operationalScope;
      if (scope === 'plant') {
        setCurrentScope('plant');
      } else {
        setCurrentScope('fleet');
      }

      return userData;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Erro ao efetuar login.';
      throw new Error(errorMsg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout').catch(() => {});
    } catch (err) {
      console.error('Erro ao efetuar logout no servidor', err);
    } finally {
      sessionStorage.removeItem('cmms_auth_token');
      setUser(null);
      setLoading(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isTenantAdmin = user?.role === 'tenant_admin';
  const isSupervisor = user?.role === 'supervisor';
  const isTechnician = user?.role === 'technician';
  const isDriverOperator = user?.role === 'driver_operator';

  const isFleet = currentScope === 'fleet';
  const isPlant = currentScope === 'plant';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        login,
        setUser,
        isSuperAdmin,
        isTenantAdmin,
        isSupervisor,
        isTechnician,
        isDriverOperator,
        isFleet,
        isPlant,
        currentScope,
        setCurrentScope
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
