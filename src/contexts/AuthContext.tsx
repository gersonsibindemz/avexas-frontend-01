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
  operational_scope?: 'fleet' | 'plant' | 'both' | 'mixed';
  operationalScope?: 'fleet' | 'plant' | 'both' | 'mixed';
  isSuspended?: boolean;
  suspensionReason?: string;
  isActive?: boolean;
  is_active?: boolean;
  tenant?: {
    id: string;
    name: string;
    max_users?: number;
    maxUsers?: number;
    operational_scope?: 'fleet' | 'plant' | 'both' | 'mixed';
    operationalScope?: 'fleet' | 'plant' | 'both' | 'mixed';
  };
}

const decodeJwtPayload = (token?: string | null): Record<string, any> => {
  try {
    const encodedPayload = token?.split('.')[1];
    if (!encodedPayload) return {};
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
};

const normalizeUser = (userData: any, token?: string | null): User => {
  const tokenClaims = decodeJwtPayload(token);
  const claims = tokenClaims.user || tokenClaims;
  const active = toOptionalBoolean(
    userData.isActive ?? userData.is_active ?? claims.isActive ?? claims.is_active ?? tokenClaims.isActive ?? tokenClaims.is_active
  );
  const suspended = toOptionalBoolean(
    userData.isSuspended ?? userData.is_suspended ?? claims.isSuspended ?? claims.is_suspended ?? claims.suspended ?? tokenClaims.isSuspended ?? tokenClaims.is_suspended ?? tokenClaims.suspended
  ) ?? (active === false ? true : undefined);
  const suspensionReason = userData.suspensionReason ?? userData.suspension_reason ?? claims.suspensionReason ?? claims.suspension_reason ?? tokenClaims.suspensionReason ?? tokenClaims.suspension_reason;

  return {
    ...userData,
    isSuspended: suspended,
    suspensionReason: typeof suspensionReason === 'string' ? suspensionReason : undefined,
    isActive: active,
    is_active: active
  };
};

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
    try {
      const response = await api.get('/auth/me');
      const rawUserData = response.data?.user || response.data;
      const token = sessionStorage.getItem('cmms_auth_token') || localStorage.getItem('cmms_auth_token');
      const userData = rawUserData ? normalizeUser(rawUserData, token) : null;
      if (userData && (userData.id || userData.email) && userData.role) {
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
      fetchProfile();
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
      
      const token = response.data?.token || response.data?.accessToken;
      if (token) {
        sessionStorage.setItem('cmms_auth_token', token);
        localStorage.setItem('cmms_auth_token', token);
      }

      const rawUserData = response.data?.user || response.data;
      
      if (!rawUserData || !rawUserData.id || !rawUserData.role) {
        throw new Error('Servidor retornou dados de utilizador inválidos.');
      }

      const userData = normalizeUser(rawUserData, token);
      
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
      localStorage.removeItem('cmms_auth_token');
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

export const useSuspensionGuard = () => {
  const { user } = useAuth();
  const isSuspended = Boolean(user?.isSuspended || user?.isActive === false || user?.is_active === false);

  const checkSuspension = () => {
    if (!isSuspended) return false;
    alert(`Conta Suspensa. O seu acesso foi limitado a modo de leitura. Motivo: ${user?.suspensionReason || 'Contacte a administração.'}`);
    return true;
  };

  const handleActionClick = (actionFn: () => void | Promise<unknown>) => {
    if (checkSuspension()) return;
    void actionFn();
  };

  return { checkSuspension, handleActionClick, isSuspended };
};
