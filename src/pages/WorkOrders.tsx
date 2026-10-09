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
  Briefcase,
  User,
  Activity,
  Edit2,
  Eye,
  Settings
} from 'lucide-react';

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string;
  name: string;
  current_meter?: number;
  currentMeter?: number;
  meter_kind?: string;
  meterKind?: string;
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
  order_type?: 'corrective' | 'preventive' | string;
  orderType?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  status: 'open' | 'in_progress' | 'waiting_parts' | 'completed' | string;
  total_cost_mzn?: number;
  totalCostMzn?: number;
  parts_cost_mzn?: number;
  partsCostMzn?: number;
  labor_cost_mzn?: number;
  laborCostMzn?: number;
  downtime_hours?: number;
  downtimeHours?: number;
  resolution_notes?: string;
  resolutionNotes?: string;
  opened_at: string;
  openedAt?: string;
  assigned_to?: string;
  assignedTo?: string;
  meter_at_service?: number;
  meterAtService?: number;
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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingOrderId, setEditingEditingOrderId] = useState<string | null>(null);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  // Submissões de Formulários
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Campos de Criação / Edição
  const [formAssetId, setFormAssetId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderType, setFormOrderType] = useState<'corrective' | 'preventive'>('corrective');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [formMeterAtService, setFormMeterAtService] = useState<number | ''>('');
  const [formAssignedTo, setFormAssignedTo] = useState('');

  // Campos de Fecho (Conclusão)
  const [partsCostMzn, setPartsCostMzn] = useState<number | ''>('');
  const [laborCostMzn, setLaborCostMzn] = useState<number | ''>('');
  const [downtimeHours, setDowntimeHours] = useState<number | ''>('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Carrega Ordens de Serviço Reais
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
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
  };

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingEditingOrderId(null);
    setFormTitle('');
    setFormDescription('');
    setFormOrderType('corrective');
    setFormPriority('medium');
    setFormMeterAtService('');
    setFormAssignedTo('');
    if (assets.length > 0) {
      setFormAssetId(assets[0].id);
      setFormMeterAtService(assets[0].current_meter ?? assets[0].currentMeter ?? 0);
    } else {
      setFormAssetId('');
    }
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (order: WorkOrder) => {
    setFormMode('edit');
    setEditingEditingOrderId(order.id);
    setFormAssetId(order.asset_id || order.assetId || '');
    setFormTitle(order.title || '');
    setFormDescription(order.description || '');
    setFormOrderType((order.order_type || order.orderType || 'corrective') as any);
    setFormPriority((order.priority || 'medium') as any);
    setFormMeterAtService(order.meter_at_service ?? order.meterAtService ?? '');
    setFormAssignedTo(order.assigned_to || order.assignedTo || '');
    setIsFormModalOpen(true);
  };

  // Escuta seletor de ativo para preencher odómetro/horímetro sugerido
  const handleAssetChange = (assetId: string) => {
    setFormAssetId(assetId);
    const selected = assets.find(a => a.id === assetId);
    if (selected) {
      setFormMeterAtService(selected.current_meter ?? selected.currentMeter ?? 0);
    }
  };

  // Submeter Criação ou Edição
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId || !formTitle.trim() || !formDescription.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingForm(true);

    const payload = {
      assetId: formAssetId,
      asset_id: formAssetId,
      title: formTitle,
      description: formDescription,
      orderType: formOrderType,
      order_type: formOrderType,
      priority: formPriority,
      meterAtService: formMeterAtService !== '' ? Number(formMeterAtService) : undefined,
      meter_at_service: formMeterAtService !== '' ? Number(formMeterAtService) : undefined,
      assignedTo: formAssignedTo || undefined,
      assigned_to: formAssignedTo || undefined,
      status: formMode === 'create' ? 'open' : undefined
    };

    try {
      if (formMode === 'create') {
        await api.post('/work-orders', payload);
        setSuccessMessage('Nova Ordem de Serviço aberta com sucesso!');
      } else {
        await api.put(`/work-orders/${editingOrderId}`, payload);
        setSuccessMessage('Ordem de Serviço atualizada com sucesso!');
      }

      setIsFormModalOpen(false);
      await fetchWorkOrders();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao guardar ordem de serviço:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar ordem de serviço.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Submeter Fecho (Conclusão) da Ordem de Serviço
  const handleCloseOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingClose(true);

    const payload = {
      partsCostMzn: partsCostMzn !== '' ? Number(partsCostMzn) : 0,
      parts_cost_mzn: partsCostMzn !== '' ? Number(partsCostMzn) : 0,
      laborCostMzn: laborCostMzn !== '' ? Number(laborCostMzn) : 0,
      labor_cost_mzn: laborCostMzn !== '' ? Number(laborCostMzn) : 0,
      downtimeHours: downtimeHours !== '' ? Number(downtimeHours) : 0,
      downtime_hours: downtimeHours !== '' ? Number(downtimeHours) : 0,
      resolutionNotes: resolutionNotes || undefined,
      resolution_notes: resolutionNotes || undefined,
      status: 'completed'
    };

    try {
      // Tenta fechar usando a rota específica do backend ou via PUT genérico
      try {
        await api.patch(`/work-orders/${selectedOrder.id}/close`, payload);
      } catch (patchErr) {
        // Fallback para PUT geral de encerramento
        await api.put(`/work-orders/${selectedOrder.id}`, payload);
      }
      
      setSuccessMessage(`OS ${selectedOrder.wo_number || selectedOrder.woNumber} concluída com sucesso!`);
      setIsCloseModalOpen(false);
      setSelectedOrder(null);

      // Limpa os custos e notas
      setPartsCostMzn('');
      setLaborCostMzn('');
      setDowntimeHours('');
      setResolutionNotes('');

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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-950/40 text-blue-400 border border-blue-500/20">
            Baixa
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Média
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
            Alta
          </span>
        );
      case 'urgent':
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-950/60 text-red-300 border border-red-500/40 animate-pulse">
            ⚠️ Urgente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-950/40 text-sky-400 border border-sky-500/20">
            Aberta
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Em Curso
          </span>
        );
      case 'waiting_parts':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-950/40 text-purple-450 border border-purple-500/20">
            Aguardar Peças
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Detetar se a ordem de serviço está em atraso (Aberta ou Em Curso e com mais de 3 dias de criação)
  const isDelayed = (order: WorkOrder) => {
    if (order.status === 'completed') return false;
    const openedDate = new Date(order.opened_at || order.openedAt || '');
    const diffTime = Math.abs(new Date().getTime() - openedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  };

  // Filtragem local inteligente baseada nos critérios de pesquisa
  const filteredOrders = orders.filter((order) => {
    const title = (order.title || '').toLowerCase();
    const description = (order.description || '').toLowerCase();
    const woNum = (order.wo_number || order.woNumber || '').toLowerCase();
    const assigned = (order.assigned_to || order.assignedTo || '').toLowerCase();
    
    const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
    const assetString = matchingAsset 
      ? `${matchingAsset.code_tag || matchingAsset.codeTag} ${matchingAsset.name}`.toLowerCase()
      : `${order.asset?.code_tag || ''} ${order.asset_name || order.asset?.name || ''}`.toLowerCase();
    
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      title.includes(query) || 
      description.includes(query) ||
      assetString.includes(query) || 
      woNum.includes(query) ||
      assigned.includes(query);

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
            <span className="font-bold block text-sm text-white">Gestão de Ordens de Serviço</span>
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
            Gestão operacional e planeamento com verificação de conformidade INATRO/INNOQ e controle de downtime.
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
            onClick={handleOpenCreateModal}
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
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar por nº OS, título, técnico, matrícula ou tag do ativo..."
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
            <option value="urgent">Urgente</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="open">Abertas</option>
            <option value="in_progress">Em Curso</option>
            <option value="waiting_parts">Aguardar Peças</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>
      </div>

      {/* Listagem / Cartões de OS com Layout Responsivo */}
      {loading ? (
        /* SKELETON */
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse"></div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-4 items-center py-3 border-b border-slate-800/45">
              <div className="h-6 bg-slate-800 rounded w-12 animate-pulse"></div>
              <div className="h-6 bg-slate-800 rounded flex-1 animate-pulse"></div>
              <div className="h-6 bg-slate-800 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl text-center py-16 px-4">
          <div className="w-12 h-12 bg-slate-800 text-slate-500 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Nenhuma Ordem de Serviço Encontrada</h3>
          <p className="text-slate-500 text-xs mt-1">Nenhum registo de OS encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        /* CARDS / TABLE VIEW RESPONSIVE */
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {/* Visualização de Cartões para Mobile */}
          {filteredOrders.map((order) => {
            const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
            const assetDisplay = matchingAsset 
              ? `${matchingAsset.code_tag || matchingAsset.codeTag} • ${matchingAsset.name}`
              : order.asset_name || 'Equipamento Geral';

            const priority = order.priority || 'medium';
            const isUrgent = priority === 'urgent' || priority === 'critical';
            const delayed = isDelayed(order);

            return (
              <div 
                key={order.id} 
                className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-all ${
                  isUrgent 
                    ? 'border-red-500/40 shadow-md shadow-red-950/20' 
                    : delayed 
                    ? 'border-amber-600/30' 
                    : 'border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-400 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800">
                    {order.wo_number || order.woNumber || `OS-${order.id.substring(0, 4)}`}
                  </span>
                  <div className="flex gap-1">
                    {delayed && (
                      <span className="bg-amber-950/40 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 border border-amber-800/30 rounded animate-pulse">
                        Em Atraso
                      </span>
                    )}
                    {renderStatusBadge(order.status)}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-white font-bold text-sm leading-snug">{order.title}</h4>
                  <p className="text-slate-400 text-xs line-clamp-2">{order.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-850 flex flex-col gap-1.5 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] font-bold block">Ativo Beneficiário</span>
                    <span className="font-mono font-semibold text-slate-200">{assetDisplay}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-bold block">Técnico Atribuído</span>
                      <span className="text-slate-300 font-medium">{order.assigned_to || order.assignedTo || 'Pendente'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[9px] font-bold block">Urgência</span>
                      <div className="mt-0.5">{renderPriorityBadge(priority)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-850 flex justify-end gap-2">
                  {/* Editar */}
                  {order.status !== 'completed' && (
                    <button
                      onClick={() => handleOpenEditModal(order)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                      title="Editar Ordem"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {/* Fechar OS */}
                  {order.status !== 'completed' ? (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsCloseModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Concluir OS
                    </button>
                  ) : (
                    <div className="text-right text-xs text-slate-500 font-semibold flex flex-col">
                      <span>Custo de Fecho:</span>
                      <span className="font-mono">{formatMZN(order.total_cost_mzn ?? order.totalCostMzn)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualização de Tabela para Desktop */}
      {!loading && filteredOrders.length > 0 && (
        <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Nº Ordem</th>
                  <th className="py-3.5 px-4 font-semibold">Serviço / Atividade</th>
                  <th className="py-3.5 px-4 font-semibold">Ativo Associado</th>
                  <th className="py-3.5 px-4 font-semibold">Prioridade</th>
                  <th className="py-3.5 px-4 font-semibold">Técnico</th>
                  <th className="py-3.5 px-4 font-semibold">Abertura</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Custo Total</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/65">
                {filteredOrders.map((order) => {
                  const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
                  const assetDisplay = matchingAsset 
                    ? `${matchingAsset.code_tag || matchingAsset.codeTag} • ${matchingAsset.name}`
                    : order.asset_name || 'Equipamento Geral';

                  const priority = order.priority || 'medium';
                  const isUrgent = priority === 'urgent' || priority === 'critical';
                  const delayed = isDelayed(order);
                  const openedDate = order.opened_at || order.openedAt;

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-slate-800/10 transition-colors duration-150 ${
                        isUrgent ? 'bg-red-950/5 border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        {order.wo_number || order.woNumber || `OS-${order.id.substring(0, 4)}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm leading-5 flex items-center gap-1.5">
                            {order.title}
                            {delayed && (
                              <span className="bg-amber-950/40 text-amber-500 text-[10px] font-extrabold px-1.5 py-0.5 border border-amber-800/30 rounded animate-pulse">
                                Em Atraso
                              </span>
                            )}
                          </span>
                          {order.description && (
                            <span className="text-xs text-slate-500 leading-4 mt-0.5 truncate max-w-xs">
                              {order.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-emerald-400 text-xs font-bold leading-5">
                          {assetDisplay}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(priority)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {order.assigned_to || order.assignedTo || 'Sem Técnico'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {openedDate ? new Date(openedDate).toLocaleDateString('pt-MZ') : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 font-bold">
                        {formatMZN(order.total_cost_mzn ?? order.totalCostMzn)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(order.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {order.status !== 'completed' && (
                            <button
                              onClick={() => handleOpenEditModal(order)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                              title="Editar OS"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {order.status !== 'completed' ? (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsCloseModalOpen(true);
                              }}
                              className="text-[11px] bg-emerald-950/60 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              Fechar OS
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Concluída</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CRIAR OU EDITAR ORDEM DE SERVIÇO
          ========================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Wrench className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">
                  {formMode === 'create' ? 'Criar Ordem de Serviço' : 'Editar Ordem de Serviço'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              
              <div>
                <label htmlFor="formAsset" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Ativo / Equipamento Beneficiário *
                </label>
                <select
                  id="formAsset"
                  required
                  disabled={formMode === 'edit'} // Ativo fixo na edição
                  value={formAssetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">Selecione o Ativo...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      [{asset.code_tag || asset.codeTag}] {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="formTitle" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Título da Avaria / Intervenção *
                </label>
                <input
                  id="formTitle"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ex: Fuga de óleo no pistão hidráulico ou ruído mecânico"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="formDesc" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Descrição Técnica do Problema ou Intervenção *
                </label>
                <textarea
                  id="formDesc"
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva detalhadamente o serviço técnico ou anomalia operacional..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="formType" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Tipo de Manutenção
                  </label>
                  <select
                    id="formType"
                    value={formOrderType}
                    onChange={(e) => setFormOrderType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="corrective">Corretiva (Avaria/Paragem)</option>
                    <option value="preventive">Preventiva (Revisão/Plano)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="formPriority" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Nível de Urgência / Prioridade
                  </label>
                  <select
                    id="formPriority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente (Imediato)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="formMeter" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Contador no Momento (km/h)
                  </label>
                  <input
                    id="formMeter"
                    type="number"
                    min={0}
                    value={formMeterAtService}
                    onChange={(e) => setFormMeterAtService(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="formAssigned" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Técnico / Mecânico Atribuído
                  </label>
                  <input
                    id="formAssigned"
                    type="text"
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value)}
                    placeholder="ex: Armando Sitoe"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submittingForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingForm ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>A guardar...</span>
                    </>
                  ) : (
                    <span>Guardar Ordem</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONCLUIR / FECHAR ORDEM DE SERVIÇO (Ação Rápida de Fecho)
          ========================================== */}
      {isCloseModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} />
                <h2 className="text-base font-bold text-white">Concluir Ordem de Serviço</h2>
              </div>
              <button
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseOrderSubmit} className="p-6 space-y-4">
              
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-xs space-y-1.5 text-slate-400">
                <div><span className="font-semibold text-slate-350">Nº da OS:</span> <span className="font-mono text-white font-bold">{selectedOrder.wo_number || selectedOrder.woNumber}</span></div>
                <div><span className="font-semibold text-slate-350">Atividade:</span> <span className="text-slate-200">{selectedOrder.title}</span></div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Notas de Resolução / Trabalho Executado *
                </label>
                <textarea
                  id="notes"
                  required
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Descreva detalhadamente o trabalho executado e as peças substituídas..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="downtime" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Downtime / Horas de Paragem do Ativo *
                </label>
                <div className="relative">
                  <input
                    id="downtime"
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={downtimeHours}
                    onChange={(e) => setDowntimeHours(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 4.5"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">HORAS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="partsCost" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Custo de Peças (MZN)
                  </label>
                  <div className="relative">
                    <input
                      id="partsCost"
                      type="number"
                      min={0}
                      value={partsCostMzn}
                      onChange={(e) => setPartsCostMzn(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="ex: 15000"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">MZN</span>
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
                      value={laborCostMzn}
                      onChange={(e) => setLaborCostMzn(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="ex: 4500"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">MZN</span>
                  </div>
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
