import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Clock,
  Briefcase
} from 'lucide-react';

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string;
  name: string;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  woNumber?: string;
  title: string;
  description?: string;
  asset_id: string;
  assetId?: string;
  asset_name?: string;
  asset?: {
    code_tag?: string;
    name?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  status: 'open' | 'in_progress' | 'completed' | string;
  total_cost_mzn?: number;
  totalCostMzn?: number;
  opened_at: string;
  openedAt?: string;
}

export const WorkOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de pesquisa e filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Toasts / Mensagens de feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modais de Controle
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  // Submissões de Formulários
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Campos de Criação
  const [createAssetId, setCreateAssetId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createOrderType, setCreateOrderType] = useState<'corrective' | 'preventive'>('corrective');
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [createMeterAtService, setCreateMeterAtService] = useState<number>(0);

  // Campos de Fecho (Conclusão)
  const [partsCostMzn, setPartsCostMzn] = useState<number>(0);
  const [laborCostMzn, setLaborCostMzn] = useState<number>(0);
  const [downtimeHours, setDowntimeHours] = useState<number>(0);

  // Carrega Ordens de Serviço
  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/work-orders');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.workOrders || response.data?.data || [];
      setOrders(data);
    } catch (err: any) {
      console.error('Erro ao carregar ordens de serviço:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Não foi possível ligar ao servidor para carregar as Ordens de Serviço.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Carrega lista de ativos para os dropdowns
  const fetchAssetsForDropdown = async () => {
    try {
      const response = await api.get('/assets');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.assets || response.data?.data || [];
      setAssets(data);
      if (data.length > 0) {
        setCreateAssetId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dropdown de ativos:', err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchAssetsForDropdown();
  }, []);

  // Formatação de Moeda Metical Moçambicano (MZN)
  const formatMZN = (val?: number) => {
    const value = val ?? 0;
    return new Intl.NumberFormat('pt-MZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' MZN';
  };

  // Submeter Criação de Ordem de Serviço
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAssetId || !createTitle || !createDescription) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingCreate(true);
    
    // Payload em ambos os formatos snake_case e camelCase para maior compatibilidade
    const payload = {
      assetId: createAssetId,
      asset_id: createAssetId,
      title: createTitle,
      description: createDescription,
      orderType: createOrderType,
      order_type: createOrderType,
      priority: createPriority,
      meterAtService: Number(createMeterAtService),
      meter_at_service: Number(createMeterAtService),
      status: 'open'
    };

    try {
      await api.post('/work-orders', payload);
      setSuccessMessage('Nova Ordem de Serviço aberta com sucesso!');
      setIsCreateModalOpen(false);

      // Limpa os campos
      setCreateTitle('');
      setCreateDescription('');
      setCreateOrderType('corrective');
      setCreatePriority('medium');
      setCreateMeterAtService(0);

      // Atualiza lista
      await fetchWorkOrders();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao criar ordem de serviço:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar ordem de serviço.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submeter Fecho (Conclusão) da Ordem de Serviço
  const handleCloseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingClose(true);

    const payload = {
      partsCostMzn: Number(partsCostMzn),
      parts_cost_mzn: Number(partsCostMzn),
      laborCostMzn: Number(laborCostMzn),
      labor_cost_mzn: Number(laborCostMzn),
      downtimeHours: Number(downtimeHours),
      downtime_hours: Number(downtimeHours)
    };

    try {
      await api.patch(`/work-orders/${selectedOrder.id}/close`, payload);
      setSuccessMessage(`OS ${selectedOrder.wo_number || selectedOrder.woNumber} encerrada com sucesso!`);
      setIsCloseModalOpen(false);
      setSelectedOrder(null);

      // Limpa os custos
      setPartsCostMzn(0);
      setLaborCostMzn(0);
      setDowntimeHours(0);

      // Recarrega a tabela
      await fetchWorkOrders();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao fechar ordem de serviço:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao encerrar a ordem de serviço.');
    } finally {
      setSubmittingClose(false);
    }
  };

  // Renderização das badges de prioridade
  const renderPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-950/40 text-blue-400 border border-blue-500/20">
            Baixa
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Média
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
            Alta
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-950/60 text-red-300 border border-red-500/40 animate-pulse">
            ⚠️ Crítica
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {prio}
          </span>
        );
    }
  };

  // Renderização das badges de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-950/40 text-sky-400 border border-sky-500/20">
            Aberta
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Em Curso
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Filtragem local inteligente
  const filteredOrders = orders.filter((order) => {
    const title = (order.title || '').toLowerCase();
    const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
    const assetString = matchingAsset 
      ? `${matchingAsset.code_tag || matchingAsset.codeTag} ${matchingAsset.name}`.toLowerCase()
      : `${order.asset?.code_tag || ''} ${order.asset_name || order.asset?.name || ''}`.toLowerCase();
    const woNum = (order.wo_number || order.woNumber || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      title.includes(query) || 
      assetString.includes(query) || 
      woNum.includes(query);

    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl shadow-2xl max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-white">Atualização de Manutenção</span>
            <span className="text-xs text-slate-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Título e Botão de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Ordens de Serviço</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Planeamento de manutenção corretiva e preventiva com controle de custos em Meticais.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchWorkOrders}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar ordens"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              fetchAssetsForDropdown();
              setIsCreateModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus size={16} />
            <span>Nova Ordem de Serviço</span>
          </button>
        </div>
      </div>

      {/* Erros da API */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-300 mb-0.5">Erro no Módulo de OS</span>
            <span className="leading-relaxed block text-slate-300">{error}</span>
          </div>
          <button 
            onClick={fetchWorkOrders}
            className="text-[11px] font-bold bg-red-900/30 hover:bg-red-900/50 px-2.5 py-1 rounded border border-red-800/40 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Filtros e Caixa de Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar por título, equipamento, matrícula ou nº OS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="open">Aberta</option>
            <option value="in_progress">Em Curso</option>
            <option value="completed">Concluída</option>
          </select>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          /* SKELETON */
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-slate-800 rounded w-16 animate-pulse"></div>
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2 border-b border-slate-800/20">
                <div className="h-6 bg-slate-800 rounded w-10 animate-pulse"></div>
                <div className="h-6 bg-slate-800 rounded flex-1 animate-pulse"></div>
                <div className="h-6 bg-slate-800 rounded w-20 animate-pulse"></div>
                <div className="h-6 bg-slate-800 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-800 text-slate-500 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Nenhuma Ordem de Serviço Encontrada</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Não há registros correspondentes aos filtros de prioridade ou pesquisa aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Nº Ordem</th>
                  <th className="py-3.5 px-4 font-semibold">Serviço / Atividade</th>
                  <th className="py-3.5 px-4 font-semibold">Ativo Associado</th>
                  <th className="py-3.5 px-4 font-semibold">Prioridade</th>
                  <th className="py-3.5 px-4 font-semibold">Abertura</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Custo Total</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
                  
                  let assetDisplay = 'Equipamento Geral';
                  if (matchingAsset) {
                    assetDisplay = `${matchingAsset.code_tag || matchingAsset.codeTag} • ${matchingAsset.name}`;
                  } else if (order.asset?.code_tag && (order.asset?.name || order.asset_name)) {
                    assetDisplay = `${order.asset.code_tag} • ${order.asset.name || order.asset_name}`;
                  } else if (order.asset_name) {
                    assetDisplay = order.asset_name;
                  }

                  const openedDate = order.opened_at || order.openedAt;
                  const totalCost = order.total_cost_mzn ?? order.totalCostMzn ?? 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/20 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {order.wo_number || order.woNumber || `OS-${order.id.substring(0, 4)}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm leading-5">{order.title}</span>
                          {order.description && (
                            <span className="text-xs text-slate-500 leading-4 mt-0.5 truncate max-w-xs">
                              {order.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-emerald-400 text-xs font-bold leading-5">
                            {assetDisplay}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(order.priority)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {openedDate ? new Date(openedDate).toLocaleDateString('pt-MZ') : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 font-semibold">
                        {formatMZN(totalCost)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(order.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {order.status !== 'completed' ? (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsCloseModalOpen(true);
                            }}
                            className="text-[11px] bg-emerald-950/60 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            Fechar OS
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">---</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: NOVA ORDEM DE SERVIÇO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Wrench className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">Criar Ordem de Serviço</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              
              <div>
                <label htmlFor="modalAsset" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Ativo / Equipamento Beneficiário *
                </label>
                <select
                  id="modalAsset"
                  required
                  value={createAssetId}
                  onChange={(e) => setCreateAssetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {assets.length === 0 ? (
                    <option value="">A carregar ativos...</option>
                  ) : (
                    assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        [{asset.code_tag || asset.codeTag}] {asset.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="modalTitle" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Título da Atividade de Manutenção *
                </label>
                <input
                  id="modalTitle"
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="ex: Substituição de Pastilhas de Travão"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="modalDesc" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Descrição Técnica do Problema ou Plano *
                </label>
                <textarea
                  id="modalDesc"
                  required
                  rows={3}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Descreva detalhadamente o serviço técnico a ser executado..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modalType" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Tipo de Manutenção
                  </label>
                  <select
                    id="modalType"
                    value={createOrderType}
                    onChange={(e) => setCreateOrderType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="corrective">Corretiva (Avaria/Paragem)</option>
                    <option value="preventive">Preventiva (Revisão/Plano)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="modalPriority" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Nível de Urgência / Prioridade
                  </label>
                  <select
                    id="modalPriority"
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica (Urgente)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="modalMeter" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Medição do Medidor no Serviço (km ou horas)
                </label>
                <input
                  id="modalMeter"
                  type="number"
                  min={0}
                  value={createMeterAtService}
                  onChange={(e) => setCreateMeterAtService(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>A registar...</span>
                    </>
                  ) : (
                    <span>Abrir Ordem</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FECHAR / CONCLUIR ORDEM DE SERVIÇO */}
      {isCloseModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} />
                <h2 className="text-base font-bold text-white">
                  Fechar OS: {selectedOrder.wo_number || selectedOrder.woNumber}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseOrder} className="p-6 space-y-4">
              
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-xs space-y-1 text-slate-400">
                <div><span className="font-semibold text-slate-300">Atividade:</span> {selectedOrder.title}</div>
                <div><span className="font-semibold text-slate-300">Ativo:</span> {selectedOrder.asset_name || selectedOrder.asset?.name || 'Equipamento'}</div>
              </div>

              <div>
                <label htmlFor="partsCost" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Custo de Peças (MZN)
                </label>
                <div className="relative">
                  <input
                    id="partsCost"
                    type="number"
                    min={0}
                    required
                    value={partsCostMzn}
                    onChange={(e) => setPartsCostMzn(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[11px] font-bold text-slate-500">MZN</span>
                </div>
              </div>

              <div>
                <label htmlFor="laborCost" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Custo de Mão de Obra (MZN)
                </label>
                <div className="relative">
                  <input
                    id="laborCost"
                    type="number"
                    min={0}
                    required
                    value={laborCostMzn}
                    onChange={(e) => setLaborCostMzn(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[11px] font-bold text-slate-500">MZN</span>
                </div>
              </div>

              <div>
                <label htmlFor="downtime" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Horas de Paragem do Ativo (Downtime)
                </label>
                <div className="relative">
                  <input
                    id="downtime"
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={downtimeHours}
                    onChange={(e) => setDowntimeHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[11px] font-bold text-slate-500">HORAS</span>
                </div>
              </div>

              {/* Botões do Modal de Encerramento */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCloseModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  disabled={submittingClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingClose ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>A fechar...</span>
                    </>
                  ) : (
                    <span>Concluir Ordem</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkOrdersPage;
