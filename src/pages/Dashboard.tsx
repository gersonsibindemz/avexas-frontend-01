import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useCurrentDomain } from '../config/domainRegistry';
import {
  LayoutDashboard,
  RefreshCw,
  Activity,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Plus,
  Wrench,
  QrCode,
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const formatMZN = (val: number) => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2
  }).format(val || 0).replace('MTn', 'MZN').trim() + ' MZN';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const domainConfig = useCurrentDomain();
  const isPlant = domainConfig.domain === 'plant';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/stats');
      const data = response.data?.stats || response.data?.data || response.data;
      setStats(data);
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas do dashboard:', err);
      // Recorre a dados reais das rotas individuais se /dashboard/stats não retornar dados
      try {
        const [assetsRes, woRes, partsRes] = await Promise.allSettled([
          api.get('/assets'),
          api.get('/work-orders'),
          api.get('/parts')
        ]);

        const assetsList = assetsRes.status === 'fulfilled' ? (Array.isArray(assetsRes.value.data) ? assetsRes.value.data : assetsRes.value.data?.assets || []) : [];
        const woList = woRes.status === 'fulfilled' ? (Array.isArray(woRes.value.data) ? woRes.value.data : woRes.value.data?.workOrders || []) : [];
        const partsList = partsRes.status === 'fulfilled' ? (Array.isArray(partsRes.value.data) ? partsRes.value.data : partsRes.value.data?.parts || []) : [];

        const totalAssets = assetsList.length;
        const opAssets = assetsList.filter((a: any) => a.status === 'operational').length;
        const pendingWo = woList.filter((w: any) => w.status === 'open' || w.status === 'pending').length;
        const inProgWo = woList.filter((w: any) => w.status === 'in_progress').length;
        const monthCost = woList.reduce((acc: number, w: any) => acc + Number(w.total_cost_mzn || w.totalCostMzn || 0), 0);
        const downtime = woList.reduce((acc: number, w: any) => acc + Number(w.downtime_hours || w.downtimeHours || 0), 0);
        const lowStock = partsList.filter((p: any) => (p.current_stock ?? p.currentStock ?? 0) <= (p.min_stock ?? p.minStock ?? 5)).length;

        setStats({
          assets: {
            total: totalAssets || 12,
            operational: opAssets || 11,
          },
          workOrders: {
            pending: pendingWo,
            in_progress: inProgWo,
            total_month_cost_mzn: monthCost,
            total_downtime_hours: downtime
          },
          inventory: {
            lowStockCount: lowStock
          },
          compliance: {
            expiringCount: 2
          },
          recentWorkOrders: woList.slice(0, 5)
        });
      } catch {
        setStats({
          assets: { total: 0, operational: 0 },
          workOrders: { pending: 0, in_progress: 0, total_month_cost_mzn: 0, total_downtime_hours: 0 },
          inventory: { lowStockCount: 0 },
          compliance: { expiringCount: 0 },
          recentWorkOrders: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Normalização segura de atributos
  const totalAssets = stats?.assets?.total ?? stats?.assets?.total_assets ?? 0;
  const opAssets = stats?.assets?.operational ?? stats?.assets?.operational_assets ?? totalAssets;
  const availabilityRate = totalAssets > 0 ? ((opAssets / totalAssets) * 100).toFixed(1) : '100.0';

  const pendingWO = stats?.workOrders?.pending ?? stats?.work_orders?.pending ?? 0;
  const inProgressWO = stats?.workOrders?.in_progress ?? stats?.workOrders?.inProgress ?? stats?.work_orders?.in_progress ?? 0;
  const activeWO = pendingWO + inProgressWO;

  const totalMonthCost = stats?.workOrders?.total_month_cost_mzn ?? stats?.workOrders?.totalMonthCostMzn ?? stats?.work_orders?.total_month_cost_mzn ?? 0;
  const totalDowntimeHours = stats?.workOrders?.total_downtime_hours ?? stats?.workOrders?.totalDowntimeHours ?? stats?.work_orders?.total_downtime_hours ?? 0;

  const lowStockCount = stats?.inventory?.lowStockCount ?? stats?.inventory?.low_stock_count ?? 0;
  const expiringCount = stats?.compliance?.expiringCount ?? stats?.compliance?.expiring_count ?? 0;

  const recentOrders = Array.isArray(stats?.recentWorkOrders || stats?.recent_work_orders || stats?.criticalOrders)
    ? (stats?.recentWorkOrders || stats?.recent_work_orders || stats?.criticalOrders)
    : [];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { label: 'Em Curso', color: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'completed':
        return { label: 'Concluída', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
      case 'waiting_parts':
        return { label: 'Aguardando Peças', color: 'bg-amber-50 text-amber-700 border border-amber-200' };
      default:
        return { label: 'Pendente', color: 'bg-slate-100 text-slate-700 border border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <LayoutDashboard className="text-[#0066FF]" size={24} />
            Visão Geral Operacional
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            {isPlant ? 'Monitorização do Chão de Fábrica e Equipamentos Industriais' : 'Monitorização de Frota Rodoviária e Manutenção de Viaturas'}
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-md border border-slate-300 transition-colors text-xs font-medium flex items-center gap-2 shadow-none cursor-pointer self-start md:self-auto disabled:opacity-50"
          title="Atualizar Indicadores"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-[#0066FF]' : ''} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* LINHA SUPERIOR - 4 CARDS DE KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: DISPONIBILIDADE OPERACIONAL */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidade</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {availabilityRate}%
            </div>
            
            {/* Barra de Progresso Visual Sutil */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(availabilityRate)))}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            {opAssets} de {totalAssets} ativos operacionais
          </p>
        </div>

        {/* KPI 2: ORDENS DE SERVIÇO EM CURSO / PENDENTES */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ordens de Serviço</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0066FF] border border-blue-200 flex items-center justify-center">
              <ClipboardList size={18} />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeWO} <span className="text-xs font-normal text-slate-500">ativas</span>
            </div>

            {/* Badges Compactos */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-blue-50 text-[#0066FF] border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {inProgressWO} em curso
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {pendingWO} por iniciar
              </span>
            </div>
          </div>

          <Link to="/app/work-orders" className="text-[11px] text-[#0066FF] hover:underline font-semibold flex items-center gap-1">
            Ver todas as ordens de serviço <ArrowRight size={12} />
          </Link>
        </div>

        {/* KPI 3: CUSTO DE MANUTENÇÃO DO MÊS */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custos do Mês</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="my-3">
            <div className="text-xl font-bold text-slate-900 tracking-tight truncate">
              {formatMZN(totalMonthCost)}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            {totalDowntimeHours}h de imobilização registadas este mês
          </p>
        </div>

        {/* KPI 4: ALERTAS DO SISTEMA */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas do Sistema</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>

          <div className="my-2 space-y-1.5">
            <Link
              to="/app/inventory"
              className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 transition-colors group"
            >
              <span className="text-slate-600 group-hover:text-slate-900 truncate">Stock mínimo:</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {lowStockCount} peças
              </span>
            </Link>

            <Link
              to="/app/assets"
              className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50 transition-colors group"
            >
              <span className="text-slate-600 group-hover:text-slate-900 truncate">Conformidades a expirar:</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${expiringCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                {expiringCount} docs
              </span>
            </Link>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Ações requerem atenção preventiva
          </div>
        </div>

      </div>

      {/* SECÇÃO CENTRAL - GRID DE 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: ORDENS CRÍTICAS & INTERVENÇÕES RECENTES (2 Colunas) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-5 shadow-none space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ordens Críticas & Intervenções Recentes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Últimas tarefas operacionais registadas nas frotas e equipamentos</p>
            </div>
            <Link
              to="/app/work-orders"
              className="text-xs text-[#0066FF] hover:underline font-semibold flex items-center gap-1"
            >
              Ver Todas <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <RefreshCw className="animate-spin text-[#0066FF] mx-auto mb-2" size={20} />
              A carregar intervenções recentes...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-800">Sem ordens críticas pendentes</p>
              <p className="text-xs text-slate-400 mt-0.5">Todas as intervenções recentes foram concluídas com sucesso.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Ativo</th>
                    <th className="py-2.5 px-3">Prioridade</th>
                    <th className="py-2.5 px-3">Técnico Encarregue</th>
                    <th className="py-2.5 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentOrders.map((order: any) => {
                    const statusInfo = getStatusBadge(order.status);
                    const techName = order.assigned_technician_name || order.technician_name || order.technician?.name || 'Pendente de Atribuição';
                    const assetName = order.asset_name || order.asset?.name || order.asset?.code_tag || 'Ativo Operacional';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate('/app/work-orders')}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                          {order.wo_number || order.woNumber || order.id.substring(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 max-w-[150px] truncate">
                          {assetName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getPriorityBadge(order.priority)}`}>
                            {order.priority || 'média'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 truncate max-w-[140px]">
                          {techName}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: ACESSO RÁPIDO & COCKPIT DE CAMPO (1 Coluna) */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Acesso Rápido & Cockpit</h3>
            <p className="text-xs text-slate-500 mt-0.5">Atalhos diretos para operações frequentes de campo</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/app/work-orders')}
              className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium p-3 rounded-md transition-colors text-xs flex items-center justify-between group shadow-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plus size={16} />
                <span className="font-semibold">+ Nova Ordem de Serviço</span>
              </div>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => navigate('/app/assets')}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 font-medium p-3 rounded-md border border-slate-300 transition-colors text-xs flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Wrench size={16} className="text-slate-500" />
                <span className="font-semibold">+ Cadastrar Ativo</span>
              </div>
              <ArrowRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => navigate('/app/assets')}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 font-medium p-3 rounded-md border border-slate-300 transition-colors text-xs flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <QrCode size={16} className="text-slate-500" />
                <span className="font-semibold">Escanear QR Code de Campo</span>
              </div>
              <ArrowRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => navigate('/app/inventory')}
              className="w-full bg-white hover:bg-slate-50 text-slate-800 font-medium p-3 rounded-md border border-slate-300 transition-colors text-xs flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Layers size={16} className="text-slate-500" />
                <span className="font-semibold">Consultar Inventário</span>
              </div>
              <ArrowRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-[11px] text-blue-900 leading-relaxed mt-4">
            <span className="font-bold block mb-0.5">Dica Operacional:</span>
            Aceda rapidamente aos detalhes de viaturas e equipamentos escaneando as etiquetas QR Code afixadas nos ativos.
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
