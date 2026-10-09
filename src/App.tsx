import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, User } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import AssetsPage from './pages/Assets';
import WorkOrdersPage from './pages/WorkOrders';
import FuelPage from './pages/Fuel';
import SuperAdminPage from './pages/SuperAdmin';
import UsersPage from './pages/Users';
import InventoryPage from './pages/Inventory';
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
  EyeOff
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
const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Meu Perfil</h1>
        <p className="text-slate-500 text-xs mt-1">
          Informações técnicas e nível de autorização no CMMS.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-6 shadow-none">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center font-bold text-2xl uppercase">
            {user.fullName.substring(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.fullName}</h2>
            <p className="text-slate-500 text-xs">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Empresa associada (Tenant)</span>
            <span className="text-sm text-slate-900 font-medium block mt-1">{user.tenantName || 'Avexas Global'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Código do Tenant</span>
            <span className="text-sm font-mono text-slate-700 block mt-1">{user.tenantId || 'tenant-001'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Nível de Autorização</span>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {user.role}
            </span>
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
// CONFIGURAÇÕES DO SISTEMA
// ==========================================
const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500 text-xs mt-1">
          Ajustes de preferências do utilizador e parâmetros operacionais do chão de fábrica.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-6 shadow-none">
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Notificações e Alertas</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="mt-1 accent-blue-700 bg-white border border-slate-300 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors">Alertas de Combustível Baixo</span>
                <p className="text-xs text-slate-500 mt-0.5">Notificar quando o nível de diesel dos ativos cair abaixo de 20%.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="mt-1 accent-blue-700 bg-white border border-slate-300 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors">Vencimento de Ordens de Manutenção</span>
                <p className="text-xs text-slate-500 mt-0.5">Alertar 48h antes de vencer uma manutenção corretiva agendada.</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Unidades de Medida</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unidade de Distância / Odómetro</label>
              <select className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900">
                <option>Quilómetros (km)</option>
                <option>Milhas (mi)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unidade de Combustível</label>
              <select className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900">
                <option>Litros (L)</option>
                <option>Galões (gal)</option>
              </select>
            </div>
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900">
        <p className="text-xs text-slate-600 font-medium animate-pulse">A verificar credenciais...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiresSuperAdmin && user.role !== 'super_admin') {
    return <Navigate to="/app/assets" replace />;
  }

  if (!requiresSuperAdmin && user.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Privadas e com Layout */}
          <Route path="/" element={<Navigate to="/app/assets" replace />} />
          
          {/* Rotas de Aplicação Comum (Clientes/Gestores/Mecânicos) */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/assets" replace />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="fuel" element={<FuelPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
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
    </AuthProvider>
  );
}
