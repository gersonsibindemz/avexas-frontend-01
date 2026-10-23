import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, User } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { api } from './services/api';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import AssetsPage from './pages/Assets';
import WorkOrdersPage from './pages/WorkOrders';
import FuelPage from './pages/Fuel';
import SuperAdminPage from './pages/SuperAdmin';
import UsersPage from './pages/Users';
import InventoryPage from './pages/Inventory';
import TeamsPage from './pages/Teams';
import MaintenancePlansPage from './pages/MaintenancePlans';
import CompanyDetailsPage from './pages/CompanyDetails';
import ItLogsPage from './pages/ItLogs';
import {
  Building2,
  Truck,
  ClipboardList,
  Fuel,
  TrendingUp,
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Loader2,
  UploadCloud,
  Camera
} from 'lucide-react';

// Formatação de Moeda em Meticais Moçambicanos (MZN)
const formatMZN = (val: number) => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2
  }).format(val).replace('MTn', 'MZN').trim() + ' MZN';
};

// ==========================================
// PÁGINA DE PERFIL DO UTILIZADOR
// ==========================================
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs text-slate-600 font-medium animate-pulse">A verificar sessão...</p>
    </div>
  </div>
);

const ProfilePage: React.FC = () => {
  const { user, loading, setUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAvatar(user?.avatar_url || '');
  }, [user?.avatar_url]);

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const avatarUrl = response.data?.avatar_url || response.data?.user?.avatar_url;
      if (!avatarUrl) throw new Error('O servidor não devolveu o endereço da fotografia.');
      setAvatar(avatarUrl);
      setUser({ ...user, avatar_url: avatarUrl });
    } catch (err: any) {
      console.error('Erro ao atualizar fotografia do perfil:', err);
      alert(err.response?.data?.message || err.message || 'Não foi possível atualizar a fotografia.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Meu Perfil</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-6 shadow-none">
        <div className="flex items-center gap-5 border-b border-slate-100 pb-6">
          {/* Fotografia não clicável diretamente (Prompt 2 - Requisito 1) */}
          <div className="relative w-16 h-16 rounded-md overflow-hidden border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            {avatar ? (
              <img src={avatar} alt="Fotografia de perfil" className="w-16 h-16 rounded-md object-cover" />
            ) : (
              <span className="font-bold text-2xl uppercase">
                {user.fullName ? user.fullName.substring(0, 2) : 'US'}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{user.fullName || user.email}</h2>
            <p className="text-slate-500 text-xs">{user.email}</p>

            {/* Input escondido e Botão Explícito "Alterar" */}
            <div className="mt-2.5 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-md shadow-none flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploading ? <Loader2 size={13} className="animate-spin text-blue-700" /> : <Camera size={13} />}
                <span>Alterar</span>
              </button>
              {uploading && <span className="text-[11px] text-slate-500">A processar nova foto...</span>}
            </div>
          </div>
        </div>

        {/* Informações Pessoais do Utilizador (Sem dados da empresa - Prompt 2 Requisito 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Nível de Acesso (Cargo)</span>
            <span className="text-sm text-slate-900 font-semibold block mt-1 capitalize">
              {user.role === 'tenant_admin' ? 'Gestor de Contrato (Tenant Admin)' : user.role === 'super_admin' ? 'Super Administrador' : user.role === 'supervisor' ? 'Supervisor Operacional' : user.role === 'technician' ? 'Técnico de Manutenção' : 'Motorista / Operador'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Idioma & Região</span>
            <span className="text-sm text-slate-900 block mt-1">Português (Moçambique)</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Fuso Horário Técnico</span>
            <span className="text-sm text-slate-900 block mt-1">GMT+2 (Moçambique - Maputo)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ROTEAMENTO PRINCIPAL E PROTEÇÃO
// ==========================================
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiresSuperAdmin?: boolean }> = ({ children, requiresSuperAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiresSuperAdmin && user.role !== 'super_admin') {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};

// Componente Guard para redirecionar super_admin, technician e driver_operator ao tentar aceder a /app/dashboard
const DashboardGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }
  if (user?.role === 'driver_operator') {
    return <Navigate to="/app/assets" replace />;
  }
  if (user?.role === 'technician') {
    return <Navigate to="/app/work-orders" replace />;
  }

  return <DashboardPage />;
};

// Componente para gerir o redirecionamento dinâmico na rota raiz /
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }
  if (user.role === 'driver_operator') {
    return <Navigate to="/app/assets" replace />;
  }
  if (user.role === 'technician') {
    return <Navigate to="/app/work-orders" replace />;
  }

  return <Navigate to="/app/assets" replace />;
};

// Guard para proteger módulos de gestão contra driver_operator e technician
const ManagementGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'driver_operator') {
    return <Navigate to="/app/assets" replace />;
  }
  if (user.role === 'technician') {
    return <Navigate to="/app/work-orders" replace />;
  }

  return <>{children}</>;
};

// Guard específico para Ordens de Serviço (bloqueia driver_operator)
const WorkOrdersGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'driver_operator') {
    return <Navigate to="/app/assets" replace />;
  }

  return <WorkOrdersPage />;
};

// Componente para proteger estritamente o módulo de Gestão de Utilizadores para super_admin
const SuperAdminUsersGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (user?.role !== 'super_admin') {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <UsersPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Atalho direto para /users */}
            <Route path="/users" element={<Navigate to="/app/users" replace />} />

            {/* Rota Raiz Dinâmica */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Rotas de Aplicação Comum (Clientes/Gestores/Mecânicos) */}
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />
              <Route path="dashboard" element={<DashboardGuard />} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="work-orders" element={<WorkOrdersGuard />} />
              <Route path="teams" element={<ManagementGuard><TeamsPage /></ManagementGuard>} />
              <Route path="maintenance-plans" element={<ManagementGuard><MaintenancePlansPage /></ManagementGuard>} />
              <Route path="fuel" element={<ManagementGuard><FuelPage /></ManagementGuard>} />
              <Route path="inventory" element={<ManagementGuard><InventoryPage /></ManagementGuard>} />
              <Route path="users" element={<SuperAdminUsersGuard />} />
              <Route path="company" element={<ManagementGuard><CompanyDetailsPage /></ManagementGuard>} />
              <Route path="it-logs" element={<ManagementGuard><ItLogsPage /></ManagementGuard>} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<Navigate to="/app/dashboard" replace />} />
            </Route>

            {/* Rota Privada Super Admin */}
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute requiresSuperAdmin>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SuperAdminPage />} />
            </Route>

            {/* Rota de Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AlertProvider>
    </AuthProvider>
  );
}
