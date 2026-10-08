import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, User } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import AssetsPage from './pages/Assets';
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
// GESTÃO DE EMPRESAS (SUPER_ADMIN)
// ==========================================
const SuperAdminPage: React.FC = () => {
  const [tenants, setTenants] = useState([
    { id: 't-1', name: 'Portos e Caminhos de Ferro de Moçambique (CFM)', province: 'Maputo', activeAssets: 142, openOrders: 18, monthlyFuel: 1250000 },
    { id: 't-2', name: 'Petróleos de Moçambique (Petromoc)', province: 'Beira', activeAssets: 89, openOrders: 7, monthlyFuel: 940000 },
    { id: 't-3', name: 'mCel-TMCel Moçambique', province: 'Nampula', activeAssets: 56, openOrders: 12, monthlyFuel: 430000 },
    { id: 't-4', name: 'Cervejas de Moçambique (CDM)', province: 'Maputo', activeAssets: 110, openOrders: 9, monthlyFuel: 810000 }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Gestão de Empresas (Tenants)</h1>
          <p className="text-slate-400 text-xs mt-1">
            Painel administrativo global para ativação e controlo de frotas industriais em Moçambique.
          </p>
        </div>
        <button className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus size={16} />
          <span>Registar Nova Empresa</span>
        </button>
      </div>

      {/* Grid de Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium block">Total de Empresas</span>
          <span className="text-2xl font-bold text-white tracking-tight mt-1 block font-mono">4</span>
          <span className="text-[11px] text-slate-500 block mt-1">Presença nacional (Maputo, Beira, Nampula)</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium block">Ativos Monitorizados</span>
          <span className="text-2xl font-bold text-emerald-500 tracking-tight mt-1 block font-mono">397</span>
          <span className="text-[11px] text-slate-500 block mt-1">Camiões, geradores e empilhadoras</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium block">Ordens de Manutenção Ativas</span>
          <span className="text-2xl font-bold text-amber-500 tracking-tight mt-1 block font-mono">46</span>
          <span className="text-[11px] text-slate-500 block mt-1">Manutenção preditiva e preventiva</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium block">Faturação Estimada de Combustível</span>
          <span className="text-2xl font-bold text-blue-500 tracking-tight mt-1 block font-mono">
            {formatMZN(3430000)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Este mês (estimativa nacional)</span>
        </div>
      </div>

      {/* Tabela de Empresas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-semibold text-sm">Empresas Contratantes</span>
          <span className="text-xs text-slate-400">Total de 4 registadas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-4">Nome da Empresa</th>
                <th className="py-3 px-4">Delegação Principal</th>
                <th className="py-3 px-4 text-right">Ativos Totais</th>
                <th className="py-3 px-4 text-right">Ordens Abertas</th>
                <th className="py-3 px-4 text-right">Custo de Combustível</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-medium text-white">{tenant.name}</td>
                  <td className="py-3 px-4 text-slate-400">{tenant.province}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">{tenant.activeAssets}</td>
                  <td className="py-3 px-4 text-right font-mono text-amber-400">{tenant.openOrders}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">{formatMZN(tenant.monthlyFuel)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                      Ativa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ORDENS DE SERVIÇO
// ==========================================
const WorkOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState([
    { id: 'os-101', title: 'Troca de óleo e filtro de motor', asset: 'CAM-012', priority: 'Média', assignee: 'João Sitoe', date: 'Hoje', status: 'Em Execução' },
    { id: 'os-102', title: 'Reparação do alternador elétrico', asset: 'GER-004', priority: 'Alta', assignee: 'António Langa', date: 'Amanhã', status: 'Pendente' },
    { id: 'os-103', title: 'Substituição de pneus dianteiros', asset: 'CAM-035', priority: 'Baixa', assignee: 'Mateus Chite', date: '15 Out 2026', status: 'Concluída' },
    { id: 'os-104', title: 'Revisão geral do sistema hidráulico', asset: 'EMP-009', priority: 'Alta', assignee: 'João Sitoe', date: '18 Out 2026', status: 'Pendente' }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Ordens de Serviço (OS)</h1>
          <p className="text-slate-400 text-xs mt-1">
            Planeamento de manutenção corretiva e preventiva para o chão de fábrica moçambicano.
          </p>
        </div>
        <button className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus size={16} />
          <span>Nova Ordem de Serviço</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <span className="font-semibold text-sm">Trabalhos em Curso e Agendados</span>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 cursor-pointer hover:text-white flex items-center gap-1">
              <Filter size={12} />
              Filtrar Prioridade
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-950/30">
                <th className="py-3 px-4">Nº Ordem</th>
                <th className="py-3 px-4">Descrição do Serviço</th>
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Técnico Atribuído</th>
                <th className="py-3 px-4">Previsão</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">{order.id}</td>
                  <td className="py-3 px-4 font-medium text-white">{order.title}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 text-xs">{order.asset}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      order.priority === 'Alta'
                        ? 'bg-red-950/40 text-red-400'
                        : order.priority === 'Média'
                        ? 'bg-amber-950/40 text-amber-400'
                        : 'bg-blue-950/40 text-blue-400'
                    }`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{order.assignee}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{order.date}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                      order.status === 'Concluída'
                        ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                        : order.status === 'Em Execução'
                        ? 'bg-amber-950/30 text-amber-400 border-amber-500/20'
                        : 'bg-slate-850 text-slate-400 border-slate-700/50'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CONSUMO DE COMBUSTÍVEL
// ==========================================
const FuelPage: React.FC = () => {
  const [logs, setLogs] = useState([
    { id: 'f-1', date: 'Hoje às 08:30', asset: 'CAM-012', driver: 'António S.', station: 'Petromoc Maputo', qty: '180 Litros', cost: 13500 },
    { id: 'f-2', date: 'Ontem às 17:15', asset: 'CAM-035', driver: 'Lucas M.', station: 'Total Beira', qty: '220 Litros', cost: 16500 },
    { id: 'f-3', date: '06 Out 2026', asset: 'GER-004', driver: 'António S.', station: 'Galp Nampula', qty: '400 Litros', cost: 30000 },
    { id: 'f-4', date: '03 Out 2026', asset: 'EMP-009', driver: 'Daniel T.', station: 'Puma Matola', qty: '45 Litros', cost: 3375 }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Gestão de Combustível</h1>
          <p className="text-slate-400 text-xs mt-1">
            Controlo rigoroso de abastecimentos e cálculo de custos de operação.
          </p>
        </div>
        <button className="self-start md:self-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
          <Plus size={16} />
          <span>Registar Abastecimento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider mb-2">Preço de Referência em Moçambique</span>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
            <span className="text-slate-300 text-sm">Gasóleo (Diesel) / Litro</span>
            <span className="font-mono font-bold text-white text-sm">{formatMZN(75.00)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-300 text-sm">Gasolina / Litro</span>
            <span className="font-mono font-bold text-white text-sm">{formatMZN(86.25)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider mb-1">Média Mensal por Ativo</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">185,4 Litros</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Integração direta com postos Petromoc, Total, Galp e Engen para mitigação de desvios.
          </span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <span className="font-semibold text-sm">Histórico Recente de Abastecimentos</span>
          <span className="text-xs text-slate-400">Total de {logs.length} registados este mês</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-950/30">
                <th className="py-3 px-4">Data/Hora</th>
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4">Condutor/Operador</th>
                <th className="py-3 px-4">Posto de Abastecimento</th>
                <th className="py-3 px-4 text-right">Quantidade</th>
                <th className="py-3 px-4 text-right">Custo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="py-3 px-4 text-xs text-slate-400">{log.date}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">{log.asset}</td>
                  <td className="py-3 px-4 text-slate-300">{log.driver}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{log.station}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">{log.qty}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">{formatMZN(log.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Meu Perfil</h1>
        <p className="text-slate-400 text-xs mt-1">
          Informações técnicas e nível de autorização no CMMS.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="w-16 h-16 bg-slate-800 text-emerald-400 border border-slate-700 rounded-xl flex items-center justify-center font-bold text-2xl uppercase">
            {user.fullName.substring(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.fullName}</h2>
            <p className="text-slate-400 text-xs">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Empresa associada (Tenant)</span>
            <span className="text-sm text-slate-200 font-medium block mt-1">{user.tenantName || 'Avexas Global'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Código do Tenant</span>
            <span className="text-sm font-mono text-slate-400 block mt-1">{user.tenantId || 'tenant-001'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Nível de Autorização</span>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              {user.role}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Fuso Horário Técnico</span>
            <span className="text-sm text-slate-200 block mt-1">GMT+2 (Moçambique - Maputo)</span>
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
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
        <p className="text-slate-400 text-xs mt-1">
          Ajustes de preferências do utilizador e parâmetros operacionais do chão de fábrica.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-4">Notificações e Alertas</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="mt-1 accent-emerald-500 bg-slate-950 border border-slate-800 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Alertas de Combustível Baixo</span>
                <p className="text-xs text-slate-500 mt-0.5">Notificar quando o nível de diesel dos ativos cair abaixo de 20%.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="mt-1 accent-emerald-500 bg-slate-950 border border-slate-800 rounded" />
              <div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Vencimento de Ordens de Manutenção</span>
                <p className="text-xs text-slate-500 mt-0.5">Alertar 48h antes de vencer uma manutenção corretiva agendada.</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 mb-4">Unidades de Medida</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unidade de Distância / Odómetro</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white">
                <option>Quilómetros (km)</option>
                <option>Milhas (mi)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unidade de Combustível</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white">
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <p className="text-xs text-slate-400 animate-pulse">A verificar credenciais...</p>
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
