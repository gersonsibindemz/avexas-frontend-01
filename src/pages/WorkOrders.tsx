import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  Settings,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  GitCommit,
  Phone,
  UserCheck,
  Bell
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

interface Technician {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  cost_per_hour?: number;
  costPerHour?: number;
}

interface TimelineEvent {
  id: string;
  eventType: 'start' | 'pause' | 'resume' | 'complete' | string;
  event_type?: string;
  reason?: string;
  justification?: string;
  performed_by?: string;
  performedBy?: string;
  created_at: string;
  createdAt?: string;
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
  status: 'open' | 'in_progress' | 'waiting_parts' | 'paused' | 'blocked' | 'completed' | string;
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
  technician_id?: string;
  technicianId?: string;
  meter_at_service?: number;
  meterAtService?: number;
}

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de pesquisa e filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickTab, setQuickTab] = useState<'all' | 'my_tasks' | 'pending' | 'in_progress' | 'completed'>('all');

  // Estados de Notificações
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Toasts / Feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modais de Controle
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingOrderId, setEditingEditingOrderId] = useState<string | null>(null);

  // Modal Novo Técnico
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [techName, setTechName] = useState('');
  const [techSpecialty, setTechSpecialty] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techCostPerHour, setTechCostPerHour] = useState<number | ''>('');
  const [submittingTech, setSubmittingTech] = useState(false);

  // Drawer de Detalhes da OS (Cockpit de Campo)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerOrder, setSelectedDrawerOrder] = useState<WorkOrder | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Modal de Pausa / Interrupção Obrigatório
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('Aguardando Peças no Armazém');
  const [pauseJustification, setPauseJustification] = useState('');
  const [submittingPause, setSubmittingPause] = useState(false);

  // Modal de Conclusão / Fecho
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [partsCostMzn, setPartsCostMzn] = useState<number | ''>('');
  const [laborCostMzn, setLaborCostMzn] = useState<number | ''>('');
  const [downtimeHours, setDowntimeHours] = useState<number | ''>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  // Submissões de Formulários
  const [submittingForm, setSubmittingForm] = useState(false);

  // Campos de Criação / Edição de OS
  const [formAssetId, setFormAssetId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderType, setFormOrderType] = useState<'corrective' | 'preventive'>('corrective');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [formMeterAtService, setFormMeterAtService] = useState<number | ''>('');
  const [formTechnicianId, setFormTechnicianId] = useState('');

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

  // Carrega lista de ativos
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

  // Carrega técnicos cadastrados
  const fetchTechnicians = async () => {
    setLoadingTechs(true);
    try {
      const response = await api.get('/technicians');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.technicians || response.data?.data || [];
      setTechnicians(data);
    } catch (err) {
      console.error('Erro ao buscar técnicos:', err);
    } finally {
      setLoadingTechs(false);
    }
  };

  // Carrega linha do tempo de uma OS específica
  const fetchTimeline = async (orderId: string) => {
    setLoadingTimeline(true);
    try {
      const response = await api.get(`/work-orders/${orderId}/timeline`);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.timeline || response.data?.data || [];
      setTimeline(data);
    } catch (err) {
      console.error('Erro ao carregar linha do tempo:', err);
      // Fallback amigável se a rota de linha do tempo não tiver registros ou falhar
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Helper para identificar se a OS é atribuída ao utilizador logado (Mecânico/Técnico)
  const isAssignedToMe = (order: WorkOrder) => {
    if (!user) return false;
    
    // 1. Cruzamento direto por ID de técnico se bater com o ID do utilizador
    if (order.technician_id === user.id || order.technicianId === user.id) {
      return true;
    }
    
    // 2. Cruzamento por nome do técnico
    const tech = technicians.find(t => t.id === order.technician_id || t.id === order.technicianId);
    if (tech && tech.name.toLowerCase().trim() === user.fullName.toLowerCase().trim()) {
      return true;
    }
    
    // 3. Cruzamento direto pelo campo text 'assigned_to'
    const assignedName = order.assigned_to || order.assignedTo || '';
    if (assignedName.toLowerCase().trim() === user.fullName.toLowerCase().trim()) {
      return true;
    }
    
    return false;
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await api.get('/notifications');
      const data = Array.isArray(response.data) ? response.data : response.data?.notifications || response.data?.data || [];
      setNotifications(data);
    } catch (err) {
      console.warn('Endpoint /notifications não encontrado, gerando pendentes locais:', err);
      // Fallback: Gerar notificações virtuais a partir de ordens abertas atribuídas ao técnico atual
      const pendingOS = orders.filter(o => o.status === 'open' && isAssignedToMe(o));
      const fallbackNotes = pendingOS.map(os => ({
        id: `virtual-${os.id}`,
        title: `Nova OS Atribuída: ${os.wo_number || os.woNumber || `OS-${os.id.substring(0, 4)}`}`,
        message: os.title,
        order: os,
        createdAt: os.opened_at || os.openedAt || new Date().toISOString()
      }));
      setNotifications(fallbackNotes);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Atualiza as notificações assim que orders ou technicians forem carregados
  useEffect(() => {
    if (orders.length > 0) {
      const pendingOS = orders.filter(o => o.status === 'open' && isAssignedToMe(o));
      const fallbackNotes = pendingOS.map(os => ({
        id: `virtual-${os.id}`,
        title: `Nova OS Atribuída: ${os.wo_number || os.woNumber || `OS-${os.id.substring(0, 4)}`}`,
        message: os.title,
        order: os,
        createdAt: os.opened_at || os.openedAt || new Date().toISOString()
      }));
      setNotifications(fallbackNotes);
    }
  }, [orders, technicians]);

  useEffect(() => {
    fetchWorkOrders();
    fetchAssetsForDropdown();
    fetchTechnicians();
  }, []);

  // Sincroniza dados da OS no Drawer se a lista de ordens for recarregada
  useEffect(() => {
    if (selectedDrawerOrder) {
      const updated = orders.find(o => o.id === selectedDrawerOrder.id);
      if (updated) {
        setSelectedDrawerOrder(updated);
      }
    }
  }, [orders]);

  // Formatação de Moeda Metical Moçambicano (MZN)
  const formatMZN = (val?: number) => {
    const value = val ?? 0;
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
  };

  // Abre criação de OS
  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingEditingOrderId(null);
    setFormTitle('');
    setFormDescription('');
    setFormOrderType('corrective');
    setFormPriority('medium');
    setFormMeterAtService('');
    setFormTechnicianId('');
    if (assets.length > 0) {
      setFormAssetId(assets[0].id);
      setFormMeterAtService(assets[0].current_meter ?? assets[0].currentMeter ?? 0);
    } else {
      setFormAssetId('');
    }
    setIsFormModalOpen(true);
  };

  // Abre edição de OS
  const handleOpenEditModal = (order: WorkOrder, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // impede abrir o drawer ao clicar no botão editar
    }
    setFormMode('edit');
    setEditingEditingOrderId(order.id);
    setFormAssetId(order.asset_id || order.assetId || '');
    setFormTitle(order.title || '');
    setFormDescription(order.description || '');
    setFormOrderType((order.order_type || order.orderType || 'corrective') as any);
    setFormPriority((order.priority || 'medium') as any);
    setFormMeterAtService(order.meter_at_service ?? order.meterAtService ?? '');
    setFormTechnicianId(order.technician_id || order.technicianId || '');
    setIsFormModalOpen(true);
  };

  // Trata troca de ativo para herdar o odómetro/horímetro sugerido
  const handleAssetChange = (assetId: string) => {
    setFormAssetId(assetId);
    const selected = assets.find(a => a.id === assetId);
    if (selected) {
      setFormMeterAtService(selected.current_meter ?? selected.currentMeter ?? 0);
    }
  };

  // Cadastro de novo técnico rápido
  const handleCreateTechnicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim() || !techSpecialty.trim()) {
      alert('Nome e Especialidade são campos obrigatórios.');
      return;
    }

    setSubmittingTech(true);
    const payload = {
      name: techName,
      specialty: techSpecialty,
      phone: techPhone || undefined,
      costPerHour: techCostPerHour !== '' ? Number(techCostPerHour) : undefined,
      cost_per_hour: techCostPerHour !== '' ? Number(techCostPerHour) : undefined
    };

    try {
      const res = await api.post('/technicians', payload);
      const newTech = res.data?.technician || res.data?.data || res.data;
      
      // Feedback e recarga de técnicos
      setSuccessMessage(`Técnico "${techName}" cadastrado com sucesso!`);
      await fetchTechnicians();

      // Seleciona automaticamente o técnico criado no formulário de OS
      if (newTech && newTech.id) {
        setFormTechnicianId(newTech.id);
      }

      // Fecha modal rápido e limpa
      setIsTechModalOpen(false);
      setTechName('');
      setTechSpecialty('');
      setTechPhone('');
      setTechCostPerHour('');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao cadastrar técnico:', err);
      alert(err.response?.data?.message || err.message || 'Não foi possível cadastrar o técnico.');
    } finally {
      setSubmittingTech(false);
    }
  };

  // Submeter OS
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
      technicianId: formTechnicianId || undefined,
      technician_id: formTechnicianId || undefined,
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

  // Iniciar Serviço (Transição 'start')
  const handleStartService = async (order: WorkOrder) => {
    try {
      // Tenta submeter na rota de transições, com fallback para PATCH direto de status
      try {
        await api.post(`/work-orders/${order.id}/transitions`, { eventType: 'start' });
      } catch (err) {
        await api.patch(`/work-orders/${order.id}`, { status: 'in_progress' });
      }

      if (navigator.vibrate) navigator.vibrate(100);
      setSuccessMessage('Serviço iniciado! Status alterado para "Em Curso".');
      await fetchWorkOrders();
      fetchTimeline(order.id);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao iniciar serviço:', err);
      alert(err.response?.data?.message || err.message || 'Não foi possível iniciar o serviço.');
    }
  };

  // Abrir Modal de Pausa / Interrupção
  const handleOpenPauseModal = (order: WorkOrder) => {
    setSelectedDrawerOrder(order);
    setPauseReason('Aguardando Peças no Armazém');
    setPauseJustification('');
    setIsPauseModalOpen(true);
  };

  // Submeter Pausa / Interrupção (Transição 'pause' / 'waiting_parts')
  const handlePauseServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerOrder || !pauseJustification.trim()) {
      alert('A justificação detalhada é estritamente obrigatória.');
      return;
    }

    setSubmittingPause(true);
    const targetStatus = pauseReason === 'Aguardando Peças no Armazém' ? 'waiting_parts' : 'paused';

    try {
      try {
        await api.post(`/work-orders/${selectedDrawerOrder.id}/transitions`, {
          eventType: 'pause',
          reason: pauseReason,
          justification: pauseJustification
        });
      } catch (err) {
        // Fallback robusto para PATCH direto de status e descrição
        await api.patch(`/work-orders/${selectedDrawerOrder.id}`, {
          status: targetStatus,
          description: `${selectedDrawerOrder.description}\n\n[Pausa - ${pauseReason}]: ${pauseJustification}`
        });
      }

      if (navigator.vibrate) navigator.vibrate(100);
      setSuccessMessage(`Serviço interrompido! Motivo: ${pauseReason}`);
      setIsPauseModalOpen(false);
      await fetchWorkOrders();
      fetchTimeline(selectedDrawerOrder.id);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao pausar serviço:', err);
      alert(err.response?.data?.message || err.message || 'Não foi possível registrar a pausa.');
    } finally {
      setSubmittingPause(false);
    }
  };

  // Retomar Serviço (Transição 'resume')
  const handleResumeService = async (order: WorkOrder) => {
    try {
      try {
        await api.post(`/work-orders/${order.id}/transitions`, { eventType: 'resume' });
      } catch (err) {
        await api.patch(`/work-orders/${order.id}`, { status: 'in_progress' });
      }

      if (navigator.vibrate) navigator.vibrate(100);
      setSuccessMessage('Serviço retomado com sucesso!');
      await fetchWorkOrders();
      fetchTimeline(order.id);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao retomar serviço:', err);
      alert(err.response?.data?.message || err.message || 'Não foi possível retomar o serviço.');
    }
  };

  // Concluir Serviço (Ação Rápida de Fecho)
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
      resolutionNotes: resolutionNotes,
      resolution_notes: resolutionNotes,
      status: 'completed'
    };

    try {
      // Registra transição de fechamento se suportado, depois faz PATCH/PUT
      try {
        await api.post(`/work-orders/${selectedOrder.id}/transitions`, {
          eventType: 'complete',
          justification: resolutionNotes
        });
      } catch (err) {
        // Ignoramos se rota de transição não existir para fechamento
      }

      try {
        await api.patch(`/work-orders/${selectedOrder.id}/close`, payload);
      } catch (patchErr) {
        await api.patch(`/work-orders/${selectedOrder.id}`, payload);
      }
      
      if (navigator.vibrate) navigator.vibrate(120);
      setSuccessMessage(`OS ${selectedOrder.wo_number || selectedOrder.woNumber} encerrada com sucesso!`);
      setIsCloseModalOpen(false);
      setSelectedOrder(null);

      // Limpa formulário
      setPartsCostMzn('');
      setLaborCostMzn('');
      setDowntimeHours('');
      setResolutionNotes('');

      // Recarrega
      await fetchWorkOrders();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao fechar ordem de serviço:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao fechar a ordem de serviço.');
    } finally {
      setSubmittingClose(false);
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

  // Abre Drawer do Técnico
  const handleOpenDrawer = (order: WorkOrder) => {
    setSelectedDrawerOrder(order);
    setIsDrawerOpen(true);
    fetchTimeline(order.id);
  };

  // Renderização das badges de prioridade
  const renderPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/40 text-blue-400 border border-blue-500/20">
            Baixa
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Média
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
            Alta
          </span>
        );
      case 'urgent':
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/70 text-red-350 border border-red-500/40 animate-pulse">
            ⚠️ Urgente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-450 border border-slate-700">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-950/40 text-sky-400 border border-sky-500/20">
            Aberta
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20">
            Em Curso
          </span>
        );
      case 'waiting_parts':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-950/40 text-purple-400 border border-purple-500/20">
            Aguardar Peças
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-yellow-950/40 text-yellow-450 border border-yellow-500/20">
            Pausada
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-950/40 text-red-400 border border-red-500/20">
            Bloqueada
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
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
    
    // Quick Tab filter (Requisito 3)
    let matchesQuickTab = true;
    if (quickTab === 'my_tasks') {
      matchesQuickTab = isAssignedToMe(order) && order.status !== 'completed';
    } else if (quickTab === 'pending') {
      matchesQuickTab = order.status === 'open';
    } else if (quickTab === 'in_progress') {
      matchesQuickTab = order.status === 'in_progress';
    } else if (quickTab === 'completed') {
      matchesQuickTab = order.status === 'completed';
    }

    // Se a tab estiver em 'all', respeitamos o select de status filter
    const matchesStatus = quickTab !== 'all' 
      ? true 
      : (statusFilter === 'all' || order.status === statusFilter);

    return matchesSearch && matchesPriority && matchesQuickTab && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl shadow-2xl max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-white">Cockpit de Manutenção</span>
            <span className="text-xs text-slate-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Ordens de Serviço</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Cockpit móvel para acompanhamento de tarefas, transição de estados e linha do tempo de auditoria.
          </p>
        </div>
        <div className="flex gap-2 relative">
          
          {/* Sino de Notificações para Técnicos (Requisito 2) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsBellOpen(!isBellOpen);
                fetchNotifications();
              }}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer relative"
              title="Notificações de Tarefas Pendentes"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown Flutuante de Notificações */}
            {isBellOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                <div className="p-3.5 border-b border-slate-850 bg-slate-950/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell size={13} className="text-emerald-400" />
                    <span>Tarefas Atribuídas ({notifications.length})</span>
                  </span>
                  <button 
                    onClick={() => setIsBellOpen(false)}
                    className="text-[10px] text-slate-500 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-850/60 scrollbar-thin">
                  {loadingNotifications ? (
                    <div className="p-4 text-center">
                      <Loader2 size={16} className="animate-spin text-slate-500 mx-auto" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      Nenhuma tarefa pendente atribuída.
                    </div>
                  ) : (
                    notifications.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => {
                          const targetOrder = note.order || orders.find(o => o.id === note.orderId || o.id === note.order_id);
                          if (targetOrder) {
                            handleOpenDrawer(targetOrder);
                          }
                          setIsBellOpen(false);
                        }}
                        className="p-3 hover:bg-slate-850/60 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="text-[11px] font-bold text-white leading-tight flex items-center justify-between">
                          <span>{note.title}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {note.message}
                        </p>
                        <span className="text-[9px] text-slate-500 block font-mono">
                          {new Date(note.createdAt).toLocaleString('pt-MZ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start animate-fade-in">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-300 mb-0.5">Erro de Ligação</span>
            <span className="leading-relaxed block text-slate-300">{error}</span>
          </div>
        </div>
      )}

      {/* Filtros e Caixa de Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar por número, atividade, técnico, matrícula ou tag do ativo..."
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
            <option value="waiting_parts">Aguardando Peças</option>
            <option value="paused">Pausadas / Interrompidas</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>
      </div>

      {/* Abas/Filtros Rápidos no Topo (Requisito 3) */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none shrink-0 -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setQuickTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'all'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Todas ({orders.length})
        </button>
        <button
          onClick={() => setQuickTab('my_tasks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'my_tasks'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Minhas Tarefas ({orders.filter(isAssignedToMe).filter(o => o.status !== 'completed').length})
        </button>
        <button
          onClick={() => setQuickTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'pending'
              ? 'bg-sky-650 text-white border-sky-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Pendentes de Início ({orders.filter(o => o.status === 'open').length})
        </button>
        <button
          onClick={() => setQuickTab('in_progress')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'in_progress'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Em Andamento ({orders.filter(o => o.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setQuickTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Concluídas ({orders.filter(o => o.status === 'completed').length})
        </button>
      </div>

      {/* Grid de Ordens de Serviço (Tabelas/Cartões Reais) */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <Loader2 className="animate-spin text-emerald-500 mx-auto" size={32} />
          <p className="text-xs text-slate-400 mt-3 font-semibold">A carregar registos de ordens de serviço do CMMS...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl text-center py-20 px-4">
          <Briefcase size={36} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-250 font-bold text-sm">Nenhuma Ordem de Serviço Ativa</h3>
          <p className="text-slate-500 text-xs mt-1">Crie uma nova OS ou redefina os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
            Ordens Filtradas ({filteredOrders.length}) · Clique para abrir o cockpit de campo
          </span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const matchingAsset = assets.find(a => a.id === order.asset_id || a.id === order.assetId);
              const assetDisplay = matchingAsset 
                ? `${matchingAsset.code_tag || matchingAsset.codeTag} • ${matchingAsset.name}`
                : order.asset_name || order.asset?.name || 'Equipamento Geral';

              const priority = order.priority || 'medium';
              const isUrgent = priority === 'urgent' || priority === 'critical';
              const delayed = isDelayed(order);
              
              const matchingTech = technicians.find(t => t.id === order.technician_id || t.id === order.technicianId);
              const techDisplay = matchingTech ? matchingTech.name : (order.assigned_to || order.assignedTo || 'Pendente de Atribuição');

              const meterVal = order.meter_at_service ?? order.meterAtService;
              const meterUnit = matchingAsset?.meter_kind === 'odometer_km' || matchingAsset?.meterKind === 'odometer_km' ? 'km' : 'horas';

              return (
                <div
                  key={order.id}
                  onClick={() => handleOpenDrawer(order)}
                  className={`bg-slate-900 border rounded-2xl p-4 space-y-3.5 cursor-pointer hover:bg-slate-850 transition-all shadow-sm flex flex-col justify-between ${
                    isUrgent 
                      ? 'border-red-500/40 hover:border-red-500/70 shadow-md shadow-red-950/10 animate-pulse' 
                      : delayed 
                      ? 'border-amber-500/30 hover:border-amber-500/60' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-850/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-extrabold text-[10px] text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
                          {matchingAsset ? matchingAsset.code_tag || matchingAsset.codeTag : 'EQ-GERAL'}
                        </span>
                        <span className="font-mono font-bold text-[10px] text-emerald-400 bg-slate-950/50 px-1.5 py-0.5 rounded shrink-0">
                          {order.wo_number || order.woNumber || `OS-${order.id.substring(0, 4)}`}
                        </span>
                      </div>
                      <div className="flex gap-1.5 items-center shrink-0">
                        {delayed && (
                          <span className="bg-amber-950/40 text-amber-500 text-[9px] font-extrabold px-1.5 py-0.5 border border-amber-800/30 rounded animate-pulse">
                            Atraso
                          </span>
                        )}
                        {renderStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-white font-bold text-sm leading-snug truncate" title={order.title}>
                        {order.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <Activity size={10} className="text-slate-500 shrink-0" />
                        <span>Contador de Entrada:</span>
                        <span className="text-slate-200 font-bold">
                          {meterVal !== undefined ? `${meterVal.toLocaleString('pt-MZ')} ${meterUnit}` : 'Sem registo'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {order.description || 'Sem descrição detalhada.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-850/80 space-y-3 mt-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Técnico Encarregue</span>
                        <span className="text-slate-300 text-xs font-semibold block truncate max-w-[150px]">
                          {techDisplay}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderPriorityBadge(priority)}
                        <button
                          onClick={(e) => handleOpenEditModal(order, e)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer"
                          title="Editar Ficha"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Botões de Ação Direta no próprio cartão (Requisito 1) */}
                    <div className="pt-1.5 border-t border-slate-850/30" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'open' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartService(order);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Play size={12} className="fill-current shrink-0" />
                          <span>▶ Iniciar Serviço</span>
                        </button>
                      )}

                      {order.status === 'in_progress' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPauseModal(order);
                            }}
                            className="py-2 bg-amber-650 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <Pause size={12} className="shrink-0" />
                            <span>⏸ Pausar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setIsCloseModalOpen(true);
                            }}
                            className="py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span>✔ Concluir</span>
                          </button>
                        </div>
                      )}

                      {(order.status === 'waiting_parts' || order.status === 'paused' || order.status === 'blocked') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeService(order);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Play size={12} className="fill-current shrink-0" />
                          <span>▶ Retomar</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CRIAR OU EDITAR OS (COM TÉCNICOS INTEGRADOS)
          ========================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Wrench className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">
                  {formMode === 'create' ? 'Abrir Ordem de Serviço' : 'Editar Ficha da OS'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
              
              <div>
                <label htmlFor="formAsset" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Ativo / Equipamento Beneficiário *
                </label>
                <select
                  id="formAsset"
                  required
                  disabled={formMode === 'edit'}
                  value={formAssetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white cursor-pointer focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white cursor-pointer focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white cursor-pointer focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                
                {/* Atribuição de Técnicos com Atalho */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="formTech" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Técnico Atribuído
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTechModalOpen(true)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                    >
                      + Novo Técnico
                    </button>
                  </div>
                  <select
                    id="formTech"
                    value={formTechnicianId}
                    onChange={(e) => setFormTechnicianId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white cursor-pointer focus:outline-none"
                  >
                    <option value="">Selecione o Técnico...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} [{tech.specialty || 'Técnico'}]
                      </option>
                    ))}
                  </select>
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
                    <Loader2 size={14} className="animate-spin" />
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
          MODAL DE CADASTRO RÁPIDO: NOVO TÉCNICO
          ========================================== */}
      {isTechModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <UserCheck className="text-emerald-500" size={18} />
                <span className="font-bold text-sm text-white">Cadastrar Novo Técnico</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTechModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTechnicianSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="ex: Armando Sitoe"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Especialidade / Ofício *</label>
                <input
                  type="text"
                  required
                  value={techSpecialty}
                  onChange={(e) => setTechSpecialty(e.target.value)}
                  placeholder="ex: Mecânico Diesel, Hidráulico, Eletricista"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Telefone</label>
                  <input
                    type="text"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                    placeholder="ex: +258 84 123 4567"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Custo / Hora (MZN)</label>
                  <input
                    type="number"
                    value={techCostPerHour}
                    onChange={(e) => setTechCostPerHour(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 1500"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTechModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-450 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTech}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submittingTech ? <Loader2 size={13} className="animate-spin" /> : <span>Guardar Técnico</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          DRAWER / BOTTOM SHEET: COCKPIT DE EXECUÇÃO DE CAMPO
          ========================================== */}
      {isDrawerOpen && selectedDrawerOrder && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div 
            className="absolute inset-0" 
            onClick={() => {
              setIsDrawerOpen(false);
              setSelectedDrawerOrder(null);
            }} 
          />
          
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 animate-slide-up">
            
            {/* Header do Drawer */}
            <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/20 shrink-0">
              <div className="space-y-1">
                <span className="font-mono font-bold text-xs text-emerald-400 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800">
                  {selectedDrawerOrder.wo_number || selectedDrawerOrder.woNumber || 'ORDEM'}
                </span>
                <h2 className="text-base font-bold text-white leading-tight mt-1">{selectedDrawerOrder.title}</h2>
              </div>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setSelectedDrawerOrder(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Drawer (Rolagem) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              
              {/* Informações Básicas */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] font-bold block">Ativo Vinculado</span>
                    <span className="text-slate-200 font-mono font-bold block truncate">
                      {assets.find(a => a.id === selectedDrawerOrder.asset_id || a.id === selectedDrawerOrder.assetId)?.name || selectedDrawerOrder.asset_name || 'Equipamento Geral'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] font-bold block">Urgência da Manutenção</span>
                    <div className="mt-0.5">{renderPriorityBadge(selectedDrawerOrder.priority)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] font-bold block">Técnico Atribuído</span>
                    <span className="text-slate-200 font-semibold">
                      {technicians.find(t => t.id === selectedDrawerOrder.technician_id || t.id === selectedDrawerOrder.technicianId)?.name || selectedDrawerOrder.assigned_to || selectedDrawerOrder.assignedTo || 'Pendente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[9px] font-bold block">Estado Técnico Atual</span>
                    <div className="mt-0.5">{renderStatusBadge(selectedDrawerOrder.status)}</div>
                  </div>
                </div>

                {selectedDrawerOrder.description && (
                  <div className="pt-2.5 border-t border-slate-850">
                    <span className="text-slate-500 uppercase text-[9px] font-bold block mb-1">Descrição Técnico-Operacional</span>
                    <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{selectedDrawerOrder.description}</p>
                  </div>
                )}
              </div>

              {/* COCKPIT DE EXECUÇÃO DE CAMPO EM TEMPO REAL */}
              {selectedDrawerOrder.status !== 'completed' && (
                <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1.5">
                    <Activity size={14} />
                    <span>Cockpit de Execução de Campo</span>
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* SE STATUS = 'open' */}
                    {selectedDrawerOrder.status === 'open' && (
                      <button
                        onClick={() => handleStartService(selectedDrawerOrder)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
                      >
                        <Play size={16} />
                        <span>Iniciar Serviço</span>
                      </button>
                    )}

                    {/* SE STATUS = 'in_progress' */}
                    {selectedDrawerOrder.status === 'in_progress' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPauseModal(selectedDrawerOrder)}
                          className="py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Pause size={15} />
                          <span>Pausar Trabalho</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(selectedDrawerOrder);
                            setIsCloseModalOpen(true);
                          }}
                          className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-inner cursor-pointer"
                        >
                          <CheckCircle2 size={15} />
                          <span>Concluir Serviço</span>
                        </button>
                      </div>
                    )}

                    {/* SE STATUS = 'waiting_parts' ou 'paused' ou 'blocked' */}
                    {(selectedDrawerOrder.status === 'waiting_parts' || selectedDrawerOrder.status === 'paused' || selectedDrawerOrder.status === 'blocked') && (
                      <button
                        onClick={() => handleResumeService(selectedDrawerOrder)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-950/20 cursor-pointer"
                      >
                        <Play size={16} />
                        <span>Retomar Trabalho (Resume)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LINHA DO TEMPO DE AUDITORIA */}
              <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-850 pb-1.5">
                  Linha do Tempo de Auditoria (Timeline)
                </span>

                {loadingTimeline ? (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="animate-spin text-slate-500 mx-auto" />
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-[11px] text-slate-500 italic">Nenhum evento registrado nesta OS ainda.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-800 space-y-4">
                    {timeline.map((event) => {
                      const date = event.created_at || event.createdAt;
                      const type = event.eventType || event.event_type;
                      
                      let iconColor = 'bg-slate-800 text-slate-400';
                      if (type === 'start' || type === 'resume') iconColor = 'bg-emerald-950 text-emerald-400 border border-emerald-800/40';
                      if (type === 'pause') iconColor = 'bg-amber-950 text-amber-400 border border-amber-800/40';
                      if (type === 'complete') iconColor = 'bg-blue-950 text-blue-400 border border-blue-800/40';

                      return (
                        <div key={event.id} className="relative">
                          {/* Dot / Icon */}
                          <div className={`absolute -left-[35px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${iconColor}`}>
                            {type === 'start' || type === 'resume' ? <Play size={10} /> : type === 'pause' ? <Pause size={10} /> : <CheckCircle2 size={10} />}
                          </div>

                          <div className="space-y-0.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white capitalize">
                                {type === 'start' ? 'Serviço Iniciado' : type === 'pause' ? 'Serviço Pausado' : type === 'resume' ? 'Serviço Retomado' : 'Serviço Concluído'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {date ? new Date(date).toLocaleString('pt-MZ') : '---'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <span>Executado por: </span>
                              <span className="font-semibold text-slate-300">{event.performed_by || event.performedBy || 'Técnico de Campo'}</span>
                            </div>
                            {event.reason && (
                              <div className="text-[11px] font-bold text-amber-400/90 mt-0.5">
                                Motivo: {event.reason}
                              </div>
                            )}
                            {event.justification && (
                              <p className="text-[11px] text-slate-500 leading-relaxed italic bg-slate-950/20 p-1.5 rounded border border-slate-850/40 mt-1">
                                "{event.justification}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL OBRIGATÓRIO: PAUSA / INTERRUPÇÃO
          ========================================== */}
      {isPauseModalOpen && selectedDrawerOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2 text-amber-500">
                <Pause size={18} />
                <span className="font-bold text-sm text-white">Justificar Pausa de Serviço</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePauseServiceSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="pauseSelect" className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase">Motivo Padronizado *</label>
                <select
                  id="pauseSelect"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-white cursor-pointer focus:outline-none"
                >
                  <option value="Aguardando Peças no Armazém">Aguardando Peças no Armazém</option>
                  <option value="Corte de Energia / Gerador">Corte de Energia / Gerador</option>
                  <option value="Fim de Turno">Fim de Turno</option>
                  <option value="Prioridade Operacional / Emergência">Prioridade Operacional / Emergência</option>
                  <option value="Falta de Ferramenta Especial">Falta de Ferramenta Especial</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label htmlFor="pauseJust" className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase">Justificação Técnica Detalhada *</label>
                <textarea
                  id="pauseJust"
                  required
                  rows={3}
                  value={pauseJustification}
                  onChange={(e) => setPauseJustification(e.target.value)}
                  placeholder="Por favor, explique circunstancialmente o motivo da interrupção do trabalho..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-red-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPauseModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-450 text-xs font-semibold rounded-lg"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingPause || !pauseJustification.trim()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submittingPause ? <Loader2 size={13} className="animate-spin" /> : <span>Confirmar Pausa</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONCLUIR / FECHAR ORDEM DE SERVIÇO
          ========================================== */}
      {isCloseModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={18} />
                <h2 className="text-base font-bold text-white">Concluir Ordem de Serviço</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseOrderSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
              
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
                    <Loader2 size={14} className="animate-spin" />
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
