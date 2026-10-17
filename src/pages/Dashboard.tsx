import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FLEET_CATEGORIES } from '../config/fleetCategories';
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

import { useEscapeKey } from '../hooks/useEscapeKey';

const formatMZN = (val: number) => {
  const formatted = (val || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${formatted} MZN`;
};

const fleetCategoryCodes = new Set(FLEET_CATEGORIES.map((category) => category.code));
const isFleetCategory = (category: unknown) =>
  typeof category === 'string' && (
    category === 'vehicle_light' ||
    category === 'vehicle_heavy' ||
    category.startsWith('vehicle') ||
    fleetCategoryCodes.has(category)
  );
const isPlantCategory = (category: unknown) =>
  category === 'generator' || category === 'machinery' || category === 'plant';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentScope } = useAuth();
  const isPlant = currentScope === 'plant';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [assetsRes, woRes, fuelRes, partsRes] = await Promise.allSettled([
        api.get('/assets'),
        api.get('/work-orders'),
        api.get('/fuel'),
        api.get('/parts')
      ]);

      // Desempacotamento seguro
      const rawAssets = assetsRes.status === 'fulfilled' ? (Array.isArray(assetsRes.value.data) ? assetsRes.value.data : assetsRes.value.data?.assets || assetsRes.value.data?.data || []) : [];
      const rawWo = woRes.status === 'fulfilled' ? (Array.isArray(woRes.value.data) ? woRes.value.data : woRes.value.data?.workOrders || woRes.value.data?.work_orders || woRes.value.data?.data || []) : [];
      const rawFuel = fuelRes.status === 'fulfilled' ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : fuelRes.value.data?.fuelLogs || fuelRes.value.data?.data || []) : [];
      const rawParts = partsRes.status === 'fulfilled' ? (Array.isArray(partsRes.value.data) ? partsRes.value.data : partsRes.value.data?.parts || partsRes.value.data?.data || []) : [];

      // Filtragem estrita pelo currentScope do Dashboard:
      const assetsList = rawAssets.filter((asset: any) => {
        const scope = asset.domain || asset.operational_scope || asset.operationalScope;
        if (scope === 'plant' || scope === 'fleet') return scope === currentScope;
        if (currentScope === 'plant') return !isFleetCategory(asset.category);
        return !isPlantCategory(asset.category);
      });

      const woList = rawWo.filter((order: any) => {
        const matchingAsset = rawAssets.find((asset: any) =>
          asset.id === (order.asset_id || order.assetId || order.asset?.id)
        );
        const scope = order.domain || order.operational_scope || order.asset_category ||
          matchingAsset?.domain || matchingAsset?.operational_scope || matchingAsset?.operationalScope || matchingAsset?.category;
        if (!scope) return true;
        if (scope === 'plant' || scope === 'fleet') return scope === currentScope;
        if (currentScope === 'plant') return !isFleetCategory(scope);
        return !isPlantCategory(scope);
      });

      const fuelList = rawFuel; // Combustível aplica-se quase sempre a frotas, mantemos o total.

      const totalAssets = assetsList.length;
      const opAssets = assetsList.filter((asset: any) => asset.status === 'operational').length;
      const maintAssets = assetsList.filter((asset: any) => asset.status === 'maintenance' || asset.status === 'breakdown').length;

      const pendingWo = woList.filter((order: any) => order.status === 'open' || order.status === 'pending' || !order.status).length;
      const inProgWo = woList.filter((order: any) => order.status === 'in_progress' || order.status === 'waiting_parts' || order.status === 'paused').length;

      const totalOpCost = woList.reduce((acc: number, order: any) => acc + Number(order.total_cost_mzn || order.totalCostMzn || 0), 0) + fuelList.reduce((acc: number, fuel: any) => acc + Number(fuel.total_cost_mzn || fuel.totalCostMzn || 0), 0);
      const downtime = woList.reduce((acc: number, order: any) => acc + Number(order.downtime_hours || order.downtimeHours || 0), 0);

      setStats({
        assets: { total: totalAssets, operational: opAssets, maintenance: maintAssets },
        workOrders: {
          pending: pendingWo,
          in_progress: inProgWo,
          total_month_cost_mzn: totalOpCost,
          total_downtime_hours: downtime
        },
        inventory: {
          lowStockCount: rawParts.filter((part: any) => (part.current_stock ?? part.currentStock ?? 0) <= (part.min_stock ?? part.minStock ?? 5)).length
        },
        compliance: {
          expiringCount: 0
        },
        recentWorkOrders: woList.slice(0, 5)
      });
    } catch (err) {
      console.error('Erro ao calcular estatísticas locais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentScope]);

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
            {isPlant ? 'Monitorização do Chão de Fábrica e Equipamentos Industriais' : 'Monitorização de Frota e Manutenção de Viaturas'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-md border border-slate-300 transition-colors text-xs font-medium flex items-center gap-2 shadow-none cursor-pointer disabled:opacity-50"
            title="Atualizar Indicadores"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#0066FF]' : ''} />
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* LINHA SUPERIOR - 4 CARDS DE KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* KPI 1: DISPONIBILIDADE OPERACIONAL & ATIVOS */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidade</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {availabilityRate}%
            </div>

            {/* Badges de Ativos Operacionais vs Imobilizados */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {opAssets} operacionais
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {totalAssets - opAssets} imobilizados
              </span>
            </div>
          </div>

          <Link to="/app/assets" className="text-[11px] text-[#0066FF] hover:underline font-semibold flex items-center gap-1">
            Gerir parque de ativos <ArrowRight size={12} />
          </Link>
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

      {/* SECÇÃO CENTRAL - ORDENS CRÍTICAS & INTERVENÇÕES RECENTES */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-none space-y-4">
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
            A carregar intervenções recentes do servidor...
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
                      <td className="py-3 px-3 font-medium text-slate-800 max-w-[200px] truncate">
                        {assetName}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getPriorityBadge(order.priority)}`}>
                          {order.priority || 'média'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
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

    </div>
  );
};

export default DashboardPage;
