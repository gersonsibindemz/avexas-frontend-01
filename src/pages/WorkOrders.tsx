import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Technician } from '../types/technician';
import QRCode from 'qrcode';
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
  Package,
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
  Bell,
  Printer
} from 'lucide-react';
import { MaintenanceNotificationModal } from '../components/MaintenanceNotificationModal';

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string;
  name: string;
  category?: string;
  category_type?: string;
  type?: string;
  current_meter?: number;
  currentMeter?: number;
  meter_kind?: string;
  meterKind?: string;
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
  domain?: string;
  operational_scope?: string;
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
  const { user, currentScope } = useAuth();
  const { counterLabel, failureCauses, technicianSpecialties, domain } = useCurrentDomain();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const domainAssets = assets.filter((asset: any) => {
    const isPlantType = asset.category === 'generator' || asset.category === 'machinery';
    const isFleetType = asset.category === 'vehicle_light' || asset.category === 'vehicle_heavy';
    if (domain === 'plant') return isPlantType;
    if (domain === 'fleet') return isFleetType;
    return true;
  });
  
  const [loading, setLoading] = useState(true);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de pesquisa e filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickTab, setQuickTab] = useState<'all' | 'my_tasks' | 'pending' | 'in_progress' | 'completed' | 'maintenance_requests'>('all');

  // Solicitações de Manutenção / Notificações
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const fetchMaintenanceRequests = async () => {
    setLoadingRequests(true);
    try {
      let list: any[] = [];
      try {
        const res = await api.get('/notifications/maintenance');
        list = Array.isArray(res.data) ? res.data : (res.data?.notifications || res.data?.data || []);
      } catch {
        const res = await api.get('/maintenance-notifications');
        list = Array.isArray(res.data) ? res.data : (res.data?.notifications || res.data?.data || []);
      }
      setMaintenanceRequests(list);
    } catch (err) {
      console.warn('Erro ao carregar solicitações de manutenção:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleConvertToWorkOrder = (req: any) => {
    setFormMode('create');
    setEditingEditingOrderId(null);

    const matchedAsset = assets.find(a => a.id === req.asset_id || a.id === req.assetId);
    const initialAssetId = matchedAsset ? matchedAsset.id : (assets.length > 0 ? assets[0].id : '');
    const initialMeter = req.meter_value ?? req.meterValue ?? (matchedAsset ? (matchedAsset.current_meter ?? matchedAsset.currentMeter ?? 0) : '');

    setFormData({
      assetId: initialAssetId,
      asset_id: initialAssetId,
      title: `[Triagem] ${req.description ? req.description.substring(0, 50) : 'Intervenção Solicitada'}`,
      description: `Solicitante: ${req.requester_name || req.requesterName || 'N/A'}\nLocal: ${req.location || 'N/A'}\n\nDescrição da Avaria:\n${req.description}`,
      orderType: req.maintenance_type || req.maintenanceType || 'corrective',
      order_type: req.maintenance_type || req.maintenanceType || 'corrective',
      priority: req.priority || 'medium',
      meterAtService: initialMeter,
      meter_at_service: initialMeter,
      assignedTo: '',
      technicianId: '',
      technician_id: ''
    });

    setSelectedPartsList([]);
    setIsFormModalOpen(true);
  };

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

  // Peças e Consumíveis Utilizados (Requisito 10)
  const [usedParts, setUsedParts] = useState<any[]>([]);
  const [loadingUsedParts, setLoadingUsedParts] = useState(false);
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQtyToUse, setPartQtyToUse] = useState<number | ''>('');
  const [submittingAddPart, setSubmittingAddPart] = useState(false);

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

  // Modal de Impressão A4 Oficial
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<WorkOrder | null>(null);
  const [printQrDataUrl, setPrintQrDataUrl] = useState('');

  const openPrintModal = async (order: WorkOrder, autoPrint: boolean = false) => {
    setPrintOrder(order);
    try {
      const tagOrNumber = order.wo_number || order.woNumber || order.id;
      const url = await QRCode.toDataURL(tagOrNumber, { margin: 1, width: 120 });
      setPrintQrDataUrl(url);
    } catch (err) {
      console.error('Erro ao gerar QR code:', err);
    }
    setIsPrintModalOpen(true);
    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  // Modal de Cancelamento de OS
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Ativação da tecla ESC em todos os modais
  useEscapeKey(() => setIsFormModalOpen(false), isFormModalOpen);
  useEscapeKey(() => setIsPrintModalOpen(false), isPrintModalOpen);
  useEscapeKey(() => setIsCancelModalOpen(false), isCancelModalOpen);
  useEscapeKey(() => setIsPauseModalOpen(false), isPauseModalOpen);
  useEscapeKey(() => setIsCloseModalOpen(false), isCloseModalOpen);
  useEscapeKey(() => setIsTechModalOpen(false), isTechModalOpen);
  useEscapeKey(() => setIsAddPartModalOpen(false), isAddPartModalOpen);
  useEscapeKey(() => setIsNotificationModalOpen(false), isNotificationModalOpen);
  useEscapeKey(() => { setIsDrawerOpen(false); setSelectedDrawerOrder(null); }, isDrawerOpen);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Submeter Cancelamento de OS
  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerOrder || !cancelReason.trim()) {
      alert('Por favor, informe a justificativa do cancelamento.');
      return;
    }

    setSubmittingCancel(true);
    try {
      try {
        await api.post(`/work-orders/${selectedDrawerOrder.id}/transitions`, {
          eventType: 'cancel',
          reason: cancelReason,
          justification: cancelReason
        });
      } catch {
        await api.patch(`/work-orders/${selectedDrawerOrder.id}`, {
          status: 'cancelled',
          resolution_notes: cancelReason
        });
      }

      setSuccessMessage('Ordem de Serviço cancelada com sucesso!');
      setIsCancelModalOpen(false);
      setCancelReason('');
      setIsDrawerOpen(false);
      setSelectedDrawerOrder(null);
      await fetchWorkOrders();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao cancelar ordem de serviço:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao cancelar ordem de serviço.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Submissões de Formulários
  const [submittingForm, setSubmittingForm] = useState(false);

  // Campos de Criação / Edição de OS (Conforme Requisito 5)
  const [formData, setFormData] = useState<any>({
    assetId: '',
    asset_id: '',
    title: '',
    description: '',
    orderType: 'corrective',
    order_type: 'corrective',
    priority: 'medium',
    meterAtService: '',
    meter_at_service: '',
    assignedTo: '',
    technicianId: '',
    technician_id: ''
  });

  // Secção de Peças no Modal da OS (Criação e Edição - Requisito 5.2)
  const [selectedPartsList, setSelectedPartsList] = useState<any[]>([]);
  const [modalSelectedPartId, setModalSelectedPartId] = useState('');
  const [modalPartQty, setModalPartQty] = useState<number>(1);

  // Carrega Ordens de Serviço
  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/work-orders');
      const rawData = res.data;
      // Extração agressiva do payload
      const list = Array.isArray(rawData) ? rawData : (rawData?.workOrders || rawData?.work_orders || rawData?.orders || rawData?.data || []);
      setOrders(list);
    } catch (err: any) {
      console.error('Erro ao carregar ordens de serviço:', err);
      setError('Não foi possível carregar as Ordens de Serviço.');
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
      const uniqueTechs = Array.from(
        new Map<string, Technician>(data.map((t: Technician) => {
          const key = t.email?.toLowerCase() || t.name?.toLowerCase() || t.full_name?.toLowerCase() || t.id;
          return [key, t];
        })).values()
      );
      setTechnicians(uniqueTechs);
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

  // Carrega as peças utilizadas nesta OS específica
  const fetchUsedParts = async (orderId: string) => {
    setLoadingUsedParts(true);
    try {
      const res = await api.get(`/work-orders/${orderId}/parts`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.parts || res.data?.data || [];
      setUsedParts(data);
    } catch (err) {
      console.error('Erro ao buscar peças utilizadas:', err);
      setUsedParts([]);
    } finally {
      setLoadingUsedParts(false);
    }
  };

  // Carrega catálogo do inventário para apontar peças
  const fetchInventoryParts = async () => {
    try {
      const res = await api.get('/parts');
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.parts || res.data?.data || [];
      setInventoryParts(data);
    } catch (err) {
      console.error('Erro ao buscar catálogo de peças:', err);
      setInventoryParts([]);
    }
  };

  // Submeter apontamento de peça (Requisito 10.2)
  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerOrder || !selectedPartId || partQtyToUse === '') return;

    const qty = Number(partQtyToUse);
    const selectedInventoryPart = inventoryParts.find(p => p.id === selectedPartId);
    if (!selectedInventoryPart) return;

    const availableStock = selectedInventoryPart.current_stock ?? selectedInventoryPart.currentStock ?? 0;
    if (qty > availableStock) {
      alert(`Quantidade insuficiente em stock! Apenas ${availableStock} un de "${selectedInventoryPart.name}" disponíveis.`);
      return;
    }

    setSubmittingAddPart(true);

    const cost = selectedInventoryPart.unit_cost ?? selectedInventoryPart.unitCost ?? 0;
    const subtotal = qty * cost;

    const newUsedPartRecord = {
      id: `used-part-${Date.now()}`,
      work_order_id: selectedDrawerOrder.id,
      workOrderId: selectedDrawerOrder.id,
      part_id: selectedPartId,
      partId: selectedPartId,
      name: selectedInventoryPart.name,
      oem_reference: selectedInventoryPart.oem_reference || selectedInventoryPart.oemReference,
      quantity: qty,
      unit_cost: cost,
      unitCost: cost,
      subtotal
    };

    try {
      try {
        // Envia para o backend se disponível
        await api.post(`/work-orders/${selectedDrawerOrder.id}/parts`, {
          partId: selectedPartId,
          quantity: qty
        });
      } catch (err) {
        console.warn('API de apontamento de peças indisponível, aplicando localmente.');
      }

      // Atualiza o inventário local (debita do stock real do inventário)
      const cachedInventory = localStorage.getItem('cmms_inventory_parts');
      if (cachedInventory) {
        const parsedInv = JSON.parse(cachedInventory);
        const updatedInv = parsedInv.map((p: any) => {
          if (p.id === selectedPartId) {
            const finalStk = Math.max(0, (p.current_stock ?? p.currentStock ?? 0) - qty);
            return {
              ...p,
              current_stock: finalStk,
              currentStock: finalStk
            };
          }
          return p;
        });
        localStorage.setItem('cmms_inventory_parts', JSON.stringify(updatedInv));
        setInventoryParts(updatedInv);
      }

      // Salva na lista de peças utilizadas
      const allUsed = localStorage.getItem('cmms_work_orders_parts');
      const parsedUsed = allUsed ? JSON.parse(allUsed) : [];
      const updatedUsed = [newUsedPartRecord, ...parsedUsed];
      localStorage.setItem('cmms_work_orders_parts', JSON.stringify(updatedUsed));

      // Recarrega lista
      await fetchUsedParts(selectedDrawerOrder.id);
      
      // Atualiza custo total da OS localmente
      const totalPartCostOfOS = [newUsedPartRecord, ...usedParts].reduce((acc, p) => acc + p.subtotal, 0);
      
      const updatedOrders = orders.map(o => {
        if (o.id === selectedDrawerOrder.id) {
          const currentPartsCost = (o.parts_cost_mzn ?? o.partsCostMzn ?? 0) + subtotal;
          return {
            ...o,
            parts_cost_mzn: currentPartsCost,
            partsCostMzn: currentPartsCost,
            total_cost_mzn: (o.labor_cost_mzn ?? o.laborCostMzn ?? 0) + currentPartsCost,
            totalCostMzn: (o.labor_cost_mzn ?? o.laborCostMzn ?? 0) + currentPartsCost
          };
        }
        return o;
      });
      setOrders(updatedOrders);

      // Fecha modal e limpa
      setIsAddPartModalOpen(false);
      setSelectedPartId('');
      setPartQtyToUse('');
      setSuccessMessage('Peça apontada e debitada do stock com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao apontar peça:', err);
      alert(err.response?.data?.message || err.message || 'Falha ao apontar peça utilizada.');
    } finally {
      setSubmittingAddPart(false);
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

  const calculateWorkedHours = () => {
    if (!selectedDrawerOrder) return 0;
    if (selectedDrawerOrder.downtime_hours || selectedDrawerOrder.downtimeHours) {
      return Number(selectedDrawerOrder.downtime_hours || selectedDrawerOrder.downtimeHours || 0);
    }
    
    // Calcular a partir da timeline
    if (!timeline || timeline.length === 0) return 0;
    
    // Ordenar a timeline por data ascendente para simular os eventos
    const sortedEvents = [...timeline].sort((a, b) => {
      const da = new Date(a.created_at || a.createdAt || 0).getTime();
      const db = new Date(b.created_at || b.createdAt || 0).getTime();
      return da - db;
    });
    
    let totalMs = 0;
    let lastStartTime: number | null = null;
    
    for (const ev of sortedEvents) {
      const type = ev.eventType || ev.event_type;
      const timeStr = ev.created_at || ev.createdAt || '';
      const time = timeStr ? new Date(timeStr).getTime() : 0;
      
      if (type === 'start' || type === 'resume') {
        lastStartTime = time;
      } else if (type === 'pause' || type === 'complete') {
        if (lastStartTime !== null) {
          totalMs += (time - lastStartTime);
          lastStartTime = null;
        }
      }
    }
    
    // Se ainda estiver em curso, soma até o momento atual
    if (selectedDrawerOrder.status === 'in_progress' && lastStartTime !== null) {
      totalMs += (new Date().getTime() - lastStartTime);
    }
    
    const hours = totalMs / (1000 * 60 * 60);
    return Number(hours.toFixed(2));
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
    fetchMaintenanceRequests();

    api.get('/parts')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.parts || []);
        setAvailableParts(list);
      })
      .catch(err => console.error('Erro ao carregar peças para a OS:', err));
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

  // Helper para adicionar peças provisórias à OS no próprio Modal (Requisito 5.2)
  const handleAddPartToModalList = () => {
    if (!selectedPartId) {
      alert('Por favor, selecione uma peça.');
      return;
    }
    const part = availableParts.find(p => p.id === selectedPartId);
    if (!part) return;

    const availableStock = Number(part.current_stock ?? part.currentStock ?? 0);
    if (modalPartQty > availableStock) {
      setSuccessMessage('Stock insuficiente no armazém');
      setTimeout(() => setSuccessMessage(null), 4000);
      alert('Stock insuficiente no armazém');
      return;
    }

    if (modalPartQty <= 0) {
      alert('A quantidade deve ser superior a zero.');
      return;
    }

    // Verificar se já existe na lista provisória
    const alreadySelected = selectedPartsList.find(p => p.id === part.id);
    if (alreadySelected) {
      const newQty = alreadySelected.quantity + modalPartQty;
      if (newQty > availableStock) {
        setSuccessMessage('Stock insuficiente no armazém');
        setTimeout(() => setSuccessMessage(null), 4000);
        alert('Stock insuficiente no armazém');
        return;
      }
      setSelectedPartsList(selectedPartsList.map(p => p.id === part.id ? { ...p, quantity: newQty } : p));
    } else {
      setSelectedPartsList([...selectedPartsList, {
        id: part.id,
        part_number: part.oem_reference || part.oemReference || part.part_number || part.partNumber || '',
        name: part.name,
        quantity: modalPartQty,
        unit_cost: part.unit_cost ?? part.unitCost ?? 0
      }]);
    }

    setSelectedPartId('');
    setModalSelectedPartId('');
    setModalPartQty(1);
    setSuccessMessage('Peça adicionada à lista provisória!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Abre criação de OS
  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingEditingOrderId(null);
    const initialAssetId = assets.length > 0 ? assets[0].id : '';
    const initialMeter = assets.length > 0 ? (assets[0].current_meter ?? assets[0].currentMeter ?? 0) : '';
    
    setFormData({
      assetId: initialAssetId,
      asset_id: initialAssetId,
      title: '',
      description: '',
      orderType: 'corrective',
      order_type: 'corrective',
      priority: 'medium',
      meterAtService: initialMeter,
      meter_at_service: initialMeter,
      assignedTo: '',
      technicianId: '',
      technician_id: ''
    });
    setSelectedPartsList([]);
    setModalSelectedPartId('');
    setSelectedPartId('');
    setModalPartQty(1);
    setIsFormModalOpen(true);
  };

  // Abre edição de OS
  const handleOpenEditModal = (order: WorkOrder, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // impede abrir o drawer ao clicar no botão editar
    }
    setFormMode('edit');
    setEditingEditingOrderId(order.id);
    
    // Conforme Requisito 5.1: Correção da Pré-Seleção do Técnico na Edição
    const currentTechId = order.technician_id || order.technicianId || order.assigned_to || order.assignedTo || '';
    
    setFormData({
      ...order,
      assetId: order.asset_id || order.assetId || '',
      asset_id: order.asset_id || order.assetId || '',
      title: order.title || '',
      description: order.description || '',
      orderType: order.order_type || order.orderType || 'corrective',
      order_type: order.order_type || order.orderType || 'corrective',
      priority: order.priority || 'medium',
      meterAtService: order.meter_at_service ?? order.meterAtService ?? '',
      meter_at_service: order.meter_at_service ?? order.meterAtService ?? '',
      assignedTo: currentTechId,
      technicianId: currentTechId,
      technician_id: currentTechId
    });

    // Se o modal de edição for aberto, podemos carregar peças já vinculadas a esta OS se existirem
    const orderParts = usedParts.filter(p => p.work_order_id === order.id || p.workOrderId === order.id);
    setSelectedPartsList(orderParts.map((p: any) => ({
      id: p.part_id || p.partId,
      name: p.name,
      part_number: p.oem_reference || p.oemReference || p.part_number || p.partNumber || '',
      quantity: p.quantity,
      unit_cost: p.unit_cost || p.unitCost || 0,
    })));

    setModalSelectedPartId('');
    setSelectedPartId('');
    setModalPartQty(1);
    setIsFormModalOpen(true);
  };

  // Trata troca de ativo para herdar o odómetro/horímetro sugerido
  const handleAssetChange = (assetId: string) => {
    const selected = assets.find(a => a.id === assetId);
    const meter = selected ? (selected.current_meter ?? selected.currentMeter ?? 0) : '';
    setFormData((prev: any) => ({
      ...prev,
      assetId,
      asset_id: assetId,
      meterAtService: meter,
      meter_at_service: meter
    }));
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
        setFormData((prev: any) => ({
          ...prev,
          assignedTo: newTech.id,
          technicianId: newTech.id,
          technician_id: newTech.id
        }));
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

  // Submeter OS (Conforme Requisito 5.3)
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId || !formData.title?.trim() || !formData.description?.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingForm(true);

    const payload = {
      ...formData,
      assetId: formData.assetId,
      asset_id: formData.assetId,
      title: formData.title,
      description: formData.description,
      orderType: formData.orderType,
      order_type: formData.orderType,
      priority: formData.priority,
      meterAtService: formData.meterAtService !== '' ? Number(formData.meterAtService) : undefined,
      meter_at_service: formData.meterAtService !== '' ? Number(formData.meterAtService) : undefined,
      technicianId: formData.assignedTo || undefined,
      technician_id: formData.assignedTo || undefined,
      assignedTo: formData.assignedTo || undefined,
      assigned_to: formData.assignedTo || undefined,
      status: formMode === 'create' ? 'open' : undefined,
      parts: selectedPartsList.map((item: any) => ({
        partId: item.id || item.partId,
        part_id: item.id || item.partId,
        id: item.id,
        quantity: Number(item.quantity),
        unitCost: Number(item.unit_cost || item.unitCost || 0)
      }))
    };

    try {
      if (formMode === 'create') {
        const res = await api.post('/work-orders', payload);
        const createdWO = res.data?.workOrder || res.data?.order || res.data || payload;
        setSuccessMessage('Nova Ordem de Serviço aberta com sucesso!');
        setIsFormModalOpen(false);
        await fetchWorkOrders();
        await fetchMaintenanceRequests();
        openPrintModal(createdWO, true);
      } else {
        await api.put(`/work-orders/${editingOrderId}`, payload);
        setSuccessMessage('Ordem de Serviço atualizada com sucesso!');
        setIsFormModalOpen(false);
        await fetchWorkOrders();
      }
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
      downtimeHours: Number(downtimeHours || 0),
      downtime_hours: Number(downtimeHours || 0),
      partsCostMzn: Number(partsCostMzn || 0),
      parts_cost_mzn: Number(partsCostMzn || 0),
      laborCostMzn: Number(laborCostMzn || 0),
      labor_cost_mzn: Number(laborCostMzn || 0),
      resolutionNotes: resolutionNotes,
      resolution_notes: resolutionNotes,
      status: 'completed'
    };

    try {
      // Registra transição de fechamento se suportado
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
        try {
          await api.post(`/work-orders/${selectedOrder.id}/complete`, payload);
        } catch (postErr) {
          await api.patch(`/work-orders/${selectedOrder.id}`, payload);
        }
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
    fetchUsedParts(order.id);
    fetchInventoryParts();
  };

  // Renderização das badges de prioridade
  const renderPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Baixa
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Média
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Alta
          </span>
        );
      case 'urgent':
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 animate-pulse">
            ⚠️ Urgente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Aberta
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Em Curso
          </span>
        );
      case 'waiting_parts':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Aguardar Peças
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Pausada
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
            Bloqueada
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Resolução do Nome do Técnico Encarregue (Eliminar UUIDs nos Cards)
  const resolveTechnicianName = (order: any) => {
    if (!order) return 'Pendente de Atribuição';
    if (order.assigned_technician_name) return order.assigned_technician_name;
    if (order.assignedTechnicianName) return order.assignedTechnicianName;
    if (order.technician_name) return order.technician_name;
    if (order.technician?.name) return order.technician.name;
    
    // Fallback: procura na lista de técnicos/utilizadores já carregada em memória
    const matchedTech = technicians.find(t => 
      t.id === order.assigned_to || 
      t.id === order.assignedTo || 
      t.id === order.technician_id || 
      t.id === order.technicianId
    );
    if (matchedTech) return matchedTech.name || matchedTech.full_name || (matchedTech as any).fullName;

    // Proteção estrita: se for um UUID ou estiver vazio, NUNCA exibir o código na tela
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const assignedVal = order.assigned_to || order.assignedTo;
    if (!assignedVal || isUUID.test(String(assignedVal))) {
      return 'Pendente de Atribuição';
    }
    return String(assignedVal);
  };

  // Helper de Formatação dos Contadores (KM vs Horas)
  const formatMeterReading = (val: any, unit: string) => {
    if (val === undefined || val === null || val === '') return 'Sem registo';
    const num = Number(val);
    if (isNaN(num)) return 'Sem registo';
    if (unit === 'km') {
      return `${num.toLocaleString('pt-MZ')} km`;
    }
    return `${num.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} horas`;
  };

  // Filtro de isolamento de escopo (fleet vs plant)
  const domainFilteredOrders = orders.filter((order) => {
    const scope = order.domain || order.operational_scope;
    if (scope && currentScope) {
      if (currentScope === 'fleet' && scope === 'plant') return false;
      if (currentScope === 'plant' && scope === 'fleet') return false;
    }
    return true;
  });

  // Filtragem local inteligente baseada nos critérios de pesquisa
  const filteredOrders = domainFilteredOrders.filter((order) => {
    const title = (order.title || '').toLowerCase();
    const description = (order.description || '').toLowerCase();
    const woNum = (order.wo_number || order.woNumber || '').toLowerCase();
    const assigned = resolveTechnicianName(order).toLowerCase();
    
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
    const currentStatus = order.status || 'open'; // fallback seguro

    if (quickTab === 'my_tasks') {
      matchesQuickTab = isAssignedToMe(order) && currentStatus !== 'completed' && currentStatus !== 'closed';
    } else if (quickTab === 'pending') {
      matchesQuickTab = currentStatus === 'open' || currentStatus === 'pending';
    } else if (quickTab === 'in_progress') {
      matchesQuickTab = currentStatus === 'in_progress' || currentStatus === 'waiting_parts' || currentStatus === 'paused';
    } else if (quickTab === 'completed') {
      matchesQuickTab = currentStatus === 'completed' || currentStatus === 'closed';
    }

    // Se a tab estiver em 'all', respeitamos o select de status filter
    const matchesStatus = quickTab !== 'all' 
      ? true 
      : (statusFilter === 'all' || order.status === statusFilter);

    return matchesSearch && matchesPriority && matchesQuickTab && matchesStatus;
  });

  // Filtro para Solicitações Pendentes (Notificações de Manutenção)
  const filteredMaintenanceRequests = maintenanceRequests.filter((req) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const reqName = (req.requester_name || req.requesterName || '').toLowerCase();
    const assetStr = (req.asset_name || req.asset_code_tag || '').toLowerCase();
    const desc = (req.description || '').toLowerCase();
    const loc = (req.location || '').toLowerCase();
    const notifNum = (req.notification_number || req.id || '').toLowerCase();
    return reqName.includes(q) || assetStr.includes(q) || desc.includes(q) || loc.includes(q) || notifNum.includes(q);
  });

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-blue-700 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Cockpit de Manutenção</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Ordens de Serviço</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
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
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer relative"
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
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-md shadow-xl z-50 overflow-hidden animate-fade-in text-left">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Bell size={13} className="text-blue-700" />
                    <span>Tarefas Atribuídas ({notifications.length})</span>
                  </span>
                  <button 
                    onClick={() => setIsBellOpen(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-800"
                  >
                    Fechar
                  </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
                  {loadingNotifications ? (
                    <div className="p-4 text-center">
                      <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
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
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="text-[11px] font-bold text-slate-900 leading-tight flex items-center justify-between">
                          <span>{note.title}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        </div>
                        <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                          {note.message}
                        </p>
                        <span className="text-[9px] text-slate-400 block font-mono">
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
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar ordens"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
          >
            <Plus size={16} />
            <span>Nova Ordem de Serviço</span>
          </button>
        </div>
      </div>

      {/* Erros da API */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start animate-fade-in">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-800 mb-0.5">Erro de Ligação</span>
            <span className="leading-relaxed block text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Filtros e Caixa de Busca */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row gap-3 shadow-none">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por número, atividade, técnico, matrícula ou tag do ativo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none"
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
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none"
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
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'all'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Todas ({domainFilteredOrders.length})
        </button>
        <button
          onClick={() => setQuickTab('maintenance_requests')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
            quickTab === 'maintenance_requests'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Wrench size={13} />
          <span>Solicitações Pendentes ({maintenanceRequests.length})</span>
        </button>
        <button
          onClick={() => setQuickTab('my_tasks')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'my_tasks'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Minhas Tarefas ({domainFilteredOrders.filter(isAssignedToMe).filter(o => o.status !== 'completed').length})
        </button>
        <button
          onClick={() => setQuickTab('pending')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'pending'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Pendentes de Início ({domainFilteredOrders.filter(o => o.status === 'open').length})
        </button>
        <button
          onClick={() => setQuickTab('in_progress')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'in_progress'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Em Andamento ({domainFilteredOrders.filter(o => o.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setQuickTab('completed')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
            quickTab === 'completed'
              ? 'bg-blue-700 text-white border-blue-700 shadow-none font-semibold'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Concluídas ({domainFilteredOrders.filter(o => o.status === 'completed').length})
        </button>
      </div>

      {/* Grid de Ordens de Serviço ou Lista de Solicitações Pendentes (Triagem) */}
      {quickTab === 'maintenance_requests' ? (
        loadingRequests ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
            <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
            <p className="text-xs text-slate-500 mt-3 font-medium">A carregar solicitações de manutenção de campo...</p>
          </div>
        ) : filteredMaintenanceRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md text-center py-20 px-4">
            <Wrench size={36} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-700 font-bold text-sm">Nenhuma Solicitação de Manutenção Pendente</h3>
            <p className="text-slate-500 text-xs mt-1">Todas as notificações de avaria já foram triadas ou convertidas em Ordem de Serviço.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Solicitações de Manutenção para Triagem ({filteredMaintenanceRequests.length})
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaintenanceRequests.map((req) => {
                const matchedAsset = assets.find(a => a.id === req.asset_id || a.id === req.assetId);
                const assetName = matchedAsset 
                  ? `[${matchedAsset.code_tag || matchedAsset.codeTag}] ${matchedAsset.name}` 
                  : (req.asset_name || req.asset_code_tag || 'Equipamento/Veículo');

                return (
                  <div
                    key={req.id || req.notification_number}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-md p-4 space-y-3.5 shadow-none flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="font-mono font-bold text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {req.notification_number || (req.id ? req.id.substring(0, 8) : 'NOTIF')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'draft' 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {req.status === 'draft' ? 'Rascunho' : 'Pendente de Triagem'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{assetName}</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Solicitante: <span className="text-slate-800 font-semibold">{req.requester_name || req.requesterName || 'N/A'}</span>
                          {req.location && ` · Local: ${req.location}`}
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 leading-relaxed space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Descrição da Avaria:</span>
                        <p className="line-clamp-3">{req.description || 'Sem descrição'}</p>
                      </div>

                      {Array.isArray(req.attachments) && req.attachments.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Evidências Anexadas ({req.attachments.length}):</span>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {req.attachments.map((att: string, idx: number) => (
                              typeof att === 'string' && (att.startsWith('data:image') || att.startsWith('http')) ? (
                                <img
                                  key={idx}
                                  src={att}
                                  alt="Evidência"
                                  className="w-12 h-12 object-cover rounded border border-slate-200 shrink-0"
                                />
                              ) : null
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleConvertToWorkOrder(req)}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
                      >
                        <Settings size={13} />
                        <span>⚙️ Converter em Ordem de Serviço</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
          <p className="text-xs text-slate-500 mt-3 font-medium">A carregar registos de ordens de serviço do CMMS...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md text-center py-20 px-4">
          <Briefcase size={36} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-700 font-bold text-sm">Nenhuma Ordem de Serviço Ativa</h3>
          <p className="text-slate-500 text-xs mt-1">Crie uma nova OS ou redefina os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
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
              
              const techDisplay = resolveTechnicianName(order);

              const meterVal = order.meter_at_service ?? order.meterAtService;
              const orderMeterType = (order as any).meter_type || (order as any).meterType || (order as any).meter_kind || (order as any).meterKind;
              const isKm = domain === 'fleet' || orderMeterType === 'kms' || orderMeterType === 'odometer_km' || matchingAsset?.meter_kind === 'odometer_km' || matchingAsset?.meterKind === 'odometer_km';
              const meterUnit = isKm ? 'km' : 'horas';

              return (
                <div
                  key={order.id}
                  onClick={() => handleOpenDrawer(order)}
                  className={`bg-white border rounded-md p-4 space-y-3.5 cursor-pointer hover:border-slate-300 transition-all shadow-none flex flex-col justify-between ${
                    isUrgent 
                      ? 'border-red-300 hover:border-red-400 bg-red-50/20' 
                      : delayed 
                      ? 'border-amber-300 hover:border-amber-400' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {matchingAsset ? matchingAsset.code_tag || matchingAsset.codeTag : 'EQ-GERAL'}
                        </span>
                        <span className="font-mono font-semibold text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 border border-blue-100">
                          {order.wo_number || order.woNumber || `OS-${order.id.substring(0, 4)}`}
                        </span>
                      </div>
                      <div className="flex gap-1.5 items-center shrink-0">
                        {delayed && (
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 border border-amber-200 rounded">
                            Atraso
                          </span>
                        )}
                        {renderStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-slate-900 font-bold text-sm leading-snug truncate" title={order.title}>
                        {order.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <Activity size={11} className="text-slate-400 shrink-0" />
                        <span>Contador de Entrada:</span>
                        <span className="text-slate-800 font-semibold">
                          {formatMeterReading(meterVal, meterUnit)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                        {order.description || 'Sem descrição detalhada.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3 mt-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Técnico Encarregue</span>
                        <span className="text-slate-800 text-xs font-semibold block truncate max-w-[150px]">
                          {techDisplay}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderPriorityBadge(priority)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPrintModal(order);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded transition-all cursor-pointer"
                          title="Imprimir Ficha A4"
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          onClick={(e) => handleOpenEditModal(order, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all cursor-pointer"
                          title="Editar Ficha"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Botões de Ação Direta no próprio cartão */}
                    <div className="pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'open' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartService(order);
                          }}
                          className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
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
                            className="py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                            className="py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
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
                          className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Wrench className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  {formMode === 'create' ? 'Abrir Ordem de Serviço' : 'Editar Ficha da OS'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label htmlFor="formAsset" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Ativo / Equipamento Beneficiário *
                </label>
                <select
                  id="formAsset"
                  required
                  disabled={formMode === 'edit'}
                  value={formData.assetId || formData.asset_id || ''}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Selecione o Ativo...</option>
                  {domainAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      [{asset.code_tag || asset.codeTag}] {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="formTitle" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Título da Avaria / Intervenção *
                  </label>
                </div>
                <select
                  id="formCause"
                  onChange={(e) => {
                    if (e.target.value) {
                      const found = failureCauses.find(fc => fc.value === e.target.value);
                      if (found) {
                        setFormData((prev: any) => ({ ...prev, title: found.label }));
                      }
                    }
                  }}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-700 cursor-pointer focus:outline-none mb-2"
                >
                  <option value="">Selecione a Causa da Avaria / Intervenção...</option>
                  {failureCauses.map((fc) => (
                    <option key={fc.value} value={fc.value}>
                      {fc.label}
                    </option>
                  ))}
                </select>
                <input
                  id="formTitle"
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ou digite o título da avaria..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label htmlFor="formDesc" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Descrição Técnica do Problema ou Intervenção *
                </label>
                <textarea
                  id="formDesc"
                  required
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva detalhadamente o serviço técnico ou anomalia operacional..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="formType" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Tipo de Manutenção
                  </label>
                  <select
                    id="formType"
                    value={formData.orderType || formData.order_type || 'corrective'}
                    onChange={(e) => setFormData({ ...formData, orderType: e.target.value as any, order_type: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer focus:outline-none"
                  >
                    <option value="corrective">Corretiva (Avaria/Paragem)</option>
                    <option value="preventive">Preventiva (Revisão/Plano)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="formPriority" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Nível de Urgência / Prioridade
                  </label>
                  <select
                    id="formPriority"
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer focus:outline-none"
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
                  <label htmlFor="formMeter" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    {counterLabel}
                  </label>
                  <input
                    id="formMeter"
                    type="number"
                    min={0}
                    value={formData.meterAtService ?? formData.meter_at_service ?? ''}
                    onChange={(e) => setFormData({ ...formData, meterAtService: e.target.value !== '' ? Number(e.target.value) : '', meter_at_service: e.target.value !== '' ? Number(e.target.value) : '' })}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none placeholder-slate-400"
                  />
                </div>
                
                {/* Atribuição de Técnicos com Atalho */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="formTech" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Técnico Atribuído
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTechModalOpen(true)}
                      className="text-[10px] text-blue-700 hover:text-blue-800 font-semibold"
                    >
                      + Novo Técnico
                    </button>
                  </div>
                  {/* Conforme Requisito 5.1: Seletor de Técnicos corrigido com correspondência exata */}
                  <select
                    id="formTech"
                    value={formData.assignedTo || ''}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer focus:outline-none"
                  >
                    <option value="">Selecione o Técnico / Mecânico...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name || t.full_name} — {t.specialty || 'Mecânico'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Secção de Peças Requisitadas no Modal da OS (Requisito 5.2) */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-blue-700">
                  <Package size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Peças & Consumíveis Requisitados (Armazém)
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 space-y-3">
                  {/* Linha de Inserção Rápida */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-7">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase">Selecione a Peça</label>
                      <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-2.5 py-2 text-xs text-slate-900 cursor-pointer focus:outline-none"
                      >
                        <option value="">Selecione a Peça do Armazém...</option>
                        {availableParts.map((p) => (
                          <option key={p.id} value={p.id} disabled={Number(p.current_stock) <= 0}>
                            {p.name} {p.part_number ? `(${p.part_number})` : ''} — Stock: {p.current_stock} {p.unit_of_measure || 'un'} — {Number(p.unit_cost).toLocaleString()} MZN
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase">Qtd</label>
                      <input
                        type="number"
                        min={1}
                        value={modalPartQty}
                        onChange={(e) => setModalPartQty(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-2 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleAddPartToModalList}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer shadow-none"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Lista de Peças Adicionadas */}
                  {selectedPartsList.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic text-center py-2 bg-white rounded border border-slate-200">
                      Nenhuma peça ou consumível requisitado para esta intervenção.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                        {selectedPartsList.map((p) => {
                          const subtotal = p.quantity * p.unit_cost;
                          return (
                            <div key={p.id} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-md border border-slate-200">
                              <div className="truncate pr-2">
                                <span className="font-mono text-slate-500 text-[10px] block">[{p.part_number}]</span>
                                <span className="font-medium text-slate-900 block truncate">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-slate-700 font-semibold block">Qtd: {p.quantity}</span>
                                  <span className="text-blue-700 text-[10px] font-bold block">{formatMZN(subtotal)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPartsList(selectedPartsList.filter(item => item.id !== p.id))}
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Remover Peça"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] font-bold text-slate-800">
                        <span>Subtotal das Peças Requisitadas:</span>
                        <span className="text-blue-700 font-bold">{formatMZN(selectedPartsList.reduce((acc, p) => acc + (p.quantity * p.unit_cost), 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-5 mt-2">
                <div>
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={submittingForm}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (formMode === 'edit' && editingOrderId) {
                        const orderToPrint = orders.find(o => o.id === editingOrderId);
                        if (orderToPrint) openPrintModal(orderToPrint);
                      } else {
                        openPrintModal({
                          id: 'preview',
                          wo_number: 'RASCUNHO',
                          title: formData.title || 'Ordem de Serviço (Rascunho)',
                          description: formData.description,
                          asset_id: formData.assetId,
                          order_type: formData.orderType,
                          priority: formData.priority,
                          status: 'open',
                          opened_at: new Date().toISOString()
                        } as any);
                      }
                    }}
                    className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-medium px-4 py-2 rounded-md text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Imprimir Ficha (A4)</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submittingForm}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-none"
                  >
                    {submittingForm ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <span>{formMode === 'edit' ? 'Guardar Alterações' : 'Guardar Ordem'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE CADASTRO RÁPIDO: NOVO TÉCNICO
          ========================================== */}
      {isTechModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <UserCheck className="text-blue-700" size={18} />
                <span className="font-bold text-sm text-slate-900">Cadastrar Novo Técnico</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTechModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTechnicianSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="ex: Armando Sitoe"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Especialidade / Ofício *</label>
                <select
                  required
                  value={techSpecialty}
                  onChange={(e) => setTechSpecialty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">Selecione a Especialidade...</option>
                  {technicianSpecialties.map((spec) => (
                    <option key={spec.value} value={spec.value}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                    placeholder="ex: +258 84 123 4567"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custo / Hora (MZN)</label>
                  <input
                    type="number"
                    value={techCostPerHour}
                    onChange={(e) => setTechCostPerHour(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 1500"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTechModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTech}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div 
            className="absolute inset-0" 
            onClick={() => {
              setIsDrawerOpen(false);
              setSelectedDrawerOrder(null);
            }} 
          />
          
          <div className="relative w-full max-w-lg bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col z-10 animate-slide-up text-slate-900">
            
            {/* Header do Drawer */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="space-y-1">
                <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {selectedDrawerOrder.wo_number || selectedDrawerOrder.woNumber || 'ORDEM'}
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-tight mt-1">{selectedDrawerOrder.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPrintModal(selectedDrawerOrder)}
                  className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-medium px-4 py-2 rounded-md text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  title="Imprimir Ficha (A4)"
                >
                  <Printer size={15} />
                  <span>Imprimir Ficha (A4)</span>
                </button>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setSelectedDrawerOrder(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corpo do Drawer (Rolagem) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Informações Básicas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold block">Ativo Vinculado</span>
                    <span className="text-slate-900 font-mono font-bold block truncate">
                      {assets.find(a => a.id === selectedDrawerOrder.asset_id || a.id === selectedDrawerOrder.assetId)?.name || selectedDrawerOrder.asset_name || 'Equipamento Geral'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold block">Urgência da Manutenção</span>
                    <div className="mt-0.5">{renderPriorityBadge(selectedDrawerOrder.priority)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold block">Técnico Atribuído</span>
                    <span className="text-slate-900 font-semibold">
                      {resolveTechnicianName(selectedDrawerOrder)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold block">Estado Técnico Atual</span>
                    <div className="mt-0.5">{renderStatusBadge(selectedDrawerOrder.status)}</div>
                  </div>
                </div>

                {selectedDrawerOrder.description && (
                  <div className="pt-2.5 border-t border-slate-200">
                    <span className="text-slate-500 uppercase text-[10px] font-semibold block mb-1">Descrição Técnico-Operacional</span>
                    <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line">{selectedDrawerOrder.description}</p>
                  </div>
                )}
              </div>

              {/* COCKPIT DE EXECUÇÃO DE CAMPO EM TEMPO REAL */}
              {selectedDrawerOrder.status !== 'completed' && selectedDrawerOrder.status !== 'cancelled' && (
                <div className="p-4 bg-white border border-slate-200 rounded-md space-y-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-700" />
                    <span>Cockpit de Execução de Campo</span>
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* SE STATUS = 'open' */}
                    {selectedDrawerOrder.status === 'open' && (
                      <button
                        onClick={() => handleStartService(selectedDrawerOrder)}
                        className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-none"
                      >
                        <Play size={15} />
                        <span>Iniciar Serviço</span>
                      </button>
                    )}

                    {/* SE STATUS = 'in_progress' */}
                    {selectedDrawerOrder.status === 'in_progress' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPauseModal(selectedDrawerOrder)}
                          className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Pause size={15} />
                          <span>Pausar Trabalho</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(selectedDrawerOrder);
                            
                            // Calcula e preenche valores automaticamente
                            const materialsCost = usedParts.reduce((acc, p) => acc + (p.subtotal || 0), 0);
                            const tech = technicians.find(t => t.id === selectedDrawerOrder.technician_id || t.id === selectedDrawerOrder.technicianId);
                            const hourlyRate = tech?.cost_per_hour || tech?.costPerHour || 0;
                            const workedHours = calculateWorkedHours();
                            const laborCost = workedHours * hourlyRate;

                            setPartsCostMzn(materialsCost > 0 ? materialsCost : '');
                            setLaborCostMzn(laborCost > 0 ? laborCost : '');
                            setDowntimeHours(workedHours > 0 ? workedHours : '');
                            
                            setIsCloseModalOpen(true);
                          }}
                          className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                        className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Play size={15} />
                        <span>Retomar Trabalho (Resume)</span>
                      </button>
                    )}

                    {/* Botão de Opção: Cancelar Ordem de Serviço */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCancelReason('');
                          setIsCancelModalOpen(true);
                        }}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                        <span>Cancelar Ordem de Serviço</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PEÇAS E CONSUMÍVEIS UTILIZADOS (REQUISITO 10.2) */}
              <div className="p-4 bg-white border border-slate-200 rounded-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Peças & Consumíveis Utilizados ({usedParts.length})
                  </span>
                  
                  {/* Se a OS estiver em execução ('in_progress') e o utilizador for o técnico ou supervisor */}
                  {selectedDrawerOrder.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPartId('');
                        setPartQtyToUse('');
                        setIsAddPartModalOpen(true);
                      }}
                      className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Adicionar Peça</span>
                    </button>
                  )}
                </div>

                {loadingUsedParts ? (
                  <div className="text-center py-4">
                    <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
                  </div>
                ) : usedParts.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-xs text-slate-500 italic">Nenhum consumível apontado a esta intervenção ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {usedParts.map((item) => (
                      <div key={item.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-md flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                        <div className="space-y-0.5 truncate mr-3">
                          <span className="font-semibold text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            Ref: {item.oem_reference} · Quantidade: <span className="font-bold text-slate-700">{item.quantity} un</span>
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block">Subtotal:</span>
                          <span className="font-mono text-blue-700 font-bold block">{formatMZN(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Exibe totalizador de peças */}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>Custo Acumulado de Peças:</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {formatMZN(usedParts.reduce((acc, p) => acc + (p.subtotal || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* TOTALIZADORES DE CUSTO DA INTERVENÇÃO (REQUISITO 10.3) */}
              <div className="p-4 bg-white border border-slate-200 rounded-md space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-blue-700" />
                  <span>Totalizadores de Custo da Intervenção</span>
                </span>
                
                {(() => {
                  const materialsCost = usedParts.reduce((acc, p) => acc + (p.subtotal || 0), 0);
                  const tech = technicians.find(t => t.id === selectedDrawerOrder.technician_id || t.id === selectedDrawerOrder.technicianId);
                  const hourlyRate = tech?.cost_per_hour || tech?.costPerHour || 0;
                  const workedHours = calculateWorkedHours();
                  const laborCost = workedHours * hourlyRate;
                  const totalCostOfOS = materialsCost + laborCost;

                  return (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Custo de Materiais (Peças):</span>
                        <span className="font-mono text-slate-900 font-semibold">{formatMZN(materialsCost)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <div className="space-y-0.5">
                          <span>Mão de Obra do Técnico:</span>
                          {tech && (
                            <span className="text-[11px] text-slate-500 block">
                              {tech.name} ({formatMZN(hourlyRate)}/h)
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-slate-900 font-semibold">{formatMZN(laborCost)}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">({workedHours} horas)</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                        <span className="text-slate-900">Custo Total da OS:</span>
                        <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {formatMZN(totalCostOfOS)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* LINHA DO TEMPO DE AUDITORIA */}
              <div className="p-4 bg-white border border-slate-200 rounded-md space-y-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block border-b border-slate-200 pb-2">
                  Linha do Tempo de Auditoria (Timeline)
                </span>

                {loadingTimeline ? (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="animate-spin text-slate-400 mx-auto" />
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-xs text-slate-500 italic">Nenhum evento registrado nesta OS ainda.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                    {timeline.map((event) => {
                      const date = event.created_at || event.createdAt;
                      const type = event.eventType || event.event_type;
                      
                      let iconColor = 'bg-slate-100 text-slate-600 border border-slate-200';
                      if (type === 'start' || type === 'resume') iconColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                      if (type === 'pause') iconColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                      if (type === 'complete') iconColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                      return (
                        <div key={event.id} className="relative">
                          {/* Dot / Icon */}
                          <div className={`absolute -left-[35px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${iconColor}`}>
                            {type === 'start' || type === 'resume' ? <Play size={10} /> : type === 'pause' ? <Pause size={10} /> : <CheckCircle2 size={10} />}
                          </div>

                          <div className="space-y-0.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 capitalize">
                                {type === 'start' ? 'Serviço Iniciado' : type === 'pause' ? 'Serviço Pausado' : type === 'resume' ? 'Serviço Retomado' : 'Serviço Concluído'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {date ? new Date(date).toLocaleString('pt-MZ') : '---'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              <span>Executado por: </span>
                              <span className="font-semibold text-slate-900">{event.performed_by || event.performedBy || 'Técnico de Campo'}</span>
                            </div>
                            {event.reason && (
                              <div className="text-xs font-medium text-amber-700 mt-0.5">
                                Motivo: {event.reason}
                              </div>
                            )}
                            {event.justification && (
                              <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-md border border-slate-200 mt-1">
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
          MODAL DE CONFIRMAÇÃO DE CANCELAMENTO DE OS
          ========================================== */}
      {isCancelModalOpen && selectedDrawerOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Cancelar Ordem de Serviço</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCancelOrderSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Justificativa do Cancelamento *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Descreva o motivo pelo qual esta Ordem de Serviço está a ser cancelada..."
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCancel ? <Loader2 size={13} className="animate-spin" /> : <span>Confirmar Cancelamento</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL OBRIGATÓRIO: PAUSA / INTERRUPÇÃO
          ========================================== */}
      {isPauseModalOpen && selectedDrawerOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-amber-700">
                <Pause size={18} />
                <span className="font-bold text-sm text-slate-900">Justificar Pausa de Serviço</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePauseServiceSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="pauseSelect" className="block text-xs font-medium text-slate-700 mb-1">Motivo Padronizado *</label>
                <select
                  id="pauseSelect"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                <label htmlFor="pauseJust" className="block text-xs font-medium text-slate-700 mb-1">Justificação Técnica Detalhada *</label>
                <textarea
                  id="pauseJust"
                  required
                  rows={3}
                  value={pauseJustification}
                  onChange={(e) => setPauseJustification(e.target.value)}
                  placeholder="Por favor, explique circunstancialmente o motivo da interrupção do trabalho..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPauseModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingPause || !pauseJustification.trim()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <h2 className="text-base font-bold text-slate-900">Concluir Ordem de Serviço</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseOrderSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-xs space-y-1.5 text-slate-600">
                <div><span className="font-semibold text-slate-700">Nº da OS:</span> <span className="font-mono text-slate-900 font-bold">{selectedOrder.wo_number || selectedOrder.woNumber}</span></div>
                <div><span className="font-semibold text-slate-700">Atividade:</span> <span className="text-slate-900">{selectedOrder.title}</span></div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Notas de Resolução / Trabalho Executado *
                </label>
                <textarea
                  id="notes"
                  required
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Descreva detalhadamente o trabalho executado e as peças substituídas..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="downtime" className="block text-xs font-medium text-slate-700 mb-1.5">
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
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">HORAS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="partsCost" className="block text-xs font-medium text-slate-700 mb-1.5">
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
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">MZN</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="laborCost" className="block text-xs font-medium text-slate-700 mb-1.5">
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
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-500">MZN</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCloseModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  disabled={submittingClose}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClose}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* ==========================================
          MODAL: APONTAR PEÇA UTILIZADA (REQUISITO 10.2)
          ========================================== */}
      {isAddPartModalOpen && selectedDrawerOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Package className="text-blue-700" size={18} />
                <span className="font-bold text-sm text-slate-900">Apontar Peça Utilizada</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPartSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="selectPart" className="block text-xs font-medium text-slate-700 mb-1">Peça em Stock *</label>
                <select
                  id="selectPart"
                  required
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">Selecione o Artigo...</option>
                  {inventoryParts.map((p) => {
                    const stk = p.current_stock ?? p.currentStock ?? 0;
                    return (
                      <option key={p.id} value={p.id} disabled={stk === 0}>
                        {p.name} [{p.oem_reference || p.oemReference}] (Stock: {stk} un)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedPartId && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-xs space-y-1 text-slate-600">
                  {(() => {
                    const p = inventoryParts.find(item => item.id === selectedPartId);
                    if (!p) return null;
                    return (
                      <>
                        <div><span className="font-semibold text-slate-700">OEM / Ref:</span> <span className="font-mono text-blue-700">{p.oem_reference || p.oemReference}</span></div>
                        <div><span className="font-semibold text-slate-700">Custo Unitário:</span> <span className="text-slate-900 font-bold">{formatMZN(p.unit_cost ?? p.unitCost)}</span></div>
                        <div><span className="font-semibold text-slate-700">Localização:</span> <span className="text-slate-700">{p.warehouse_location || p.warehouseLocation || 'Geral'}</span></div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div>
                <label htmlFor="qtyToUse" className="block text-xs font-medium text-slate-700 mb-1">Quantidade Requerida *</label>
                <input
                  id="qtyToUse"
                  type="number"
                  required
                  min={1}
                  value={partQtyToUse}
                  onChange={(e) => setPartQtyToUse(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="unidades a retirar do stock"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddPartModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingAddPart || !selectedPartId || partQtyToUse === ''}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submittingAddPart ? <Loader2 size={13} className="animate-spin" /> : <span>Confirmar Apontamento</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL E LAYOUT DE IMPRESSÃO A4 OFICIAL DA OS
          ========================================== */}
      {isPrintModalOpen && printOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-wo-sheet, #printable-wo-sheet * {
                visibility: visible !important;
              }
              #printable-wo-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}</style>
          
          <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-md shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:w-full print:max-w-none print:m-0 print:rounded-none">
            
            {/* BARRA SUPERIOR DO MODAL (OCULTA NA IMPRESSÃO) */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-blue-700" size={20} />
                <h2 className="text-base font-bold text-slate-900">
                  Impressão da Ordem de Serviço: <span className="font-mono text-blue-700">{printOrder.wo_number || printOrder.woNumber || printOrder.id}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
                >
                  <Printer size={16} />
                  <span>Imprimir Ficha (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* FOLHA A4 IMPRIMÍVEL */}
            <div id="printable-wo-sheet" className="p-8 text-slate-900 bg-white font-sans text-xs leading-normal print:p-6">
              
              {/* TOPO: LOGO + TÍTULO CENTRAL + QR CODE */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between gap-4">
                <div className="w-1/4">
                  <img
                    src="https://i.postimg.cc/NfvHTQTR/avexas-logo-transp-copy.png"
                    alt="Avexas CMMS"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className="h-10 w-auto object-contain select-none pointer-events-none"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  />
                </div>
                <div className="text-center flex-1">
                  <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">Ordem de Serviço</h1>
                  <p className="font-mono font-bold text-sm text-blue-800 mt-0.5">OS N.º {printOrder.wo_number || printOrder.woNumber || printOrder.id}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Data/Hora de Abertura: {new Date(printOrder.opened_at || printOrder.openedAt || Date.now()).toLocaleString('pt-MZ')}
                  </p>
                </div>
                <div className="w-1/4 flex justify-end items-center">
                  {printQrDataUrl ? (
                    <img src={printQrDataUrl} alt="QR Code OS" className="w-16 h-16 border border-slate-300 p-0.5" />
                  ) : (
                    <div className="w-16 h-16 border border-slate-300 flex items-center justify-center text-[10px]">QR Code</div>
                  )}
                </div>
              </div>

              {/* BLOCO 1 - EQUIPAMENTO */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 1 - EQUIPAMENTO / ATIVO
                </div>
                <div className="p-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Código / Tag:</span>
                    <span className="font-mono font-bold text-slate-900">{printOrder.asset?.code_tag || (assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId)?.code_tag) || 'EQ-GERAL'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Descrição do Ativo:</span>
                    <span className="font-medium text-slate-900">{printOrder.asset_name || printOrder.asset?.name || (assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId)?.name) || 'Equipamento Geral'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Instalação / Setor:</span>
                    <span className="font-medium text-slate-900">{(assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.installation || (assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.plant_sector || '---'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Marca / Modelo:</span>
                    <span className="font-medium text-slate-900">{(assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.brand || ''} {(assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.model || '---'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">N.º Série / Chassis:</span>
                    <span className="font-mono text-slate-900">{(assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.chassis_vin || '---'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Contador no Atendimento:</span>
                    <span className="font-mono text-slate-900">{printOrder.meter_at_service || printOrder.meterAtService || '0'} {counterLabel}</span>
                  </div>
                </div>
              </div>

              {/* BLOCO 2 - INFORMAÇÕES GERAIS */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 2 - INFORMAÇÕES GERAIS DA SOLICITAÇÃO
                </div>
                <div className="p-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Tipo de Manutenção:</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {(printOrder.order_type || printOrder.orderType) === 'corrective' ? 'Corretiva' : 'Preventiva'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Origem da Solicitação:</span>
                    <span className="font-medium text-slate-900">Inspeção / Sistema CMMS</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Solicitante:</span>
                    <span className="font-medium text-slate-900">{(printOrder as any).opened_by || 'Supervisor Operacional'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Prioridade:</span>
                    <span className="font-bold uppercase text-slate-900">{printOrder.priority || 'Média'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Centro de Custo:</span>
                    <span className="font-medium text-slate-900">{(assets.find(a => a.id === printOrder.asset_id || a.id === printOrder.assetId) as any)?.cost_center || 'Operações'}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Estado Atual:</span>
                    <span className="font-bold uppercase text-slate-900">{printOrder.status || 'Aberto'}</span>
                  </div>
                </div>
              </div>

              {/* BLOCO 3 - DESCRIÇÃO DO PROBLEMA */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 3 - DESCRIÇÃO DO PROBLEMA / AVARIA
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-slate-900 mb-1">{printOrder.title}</p>
                  <p className="text-slate-700 leading-relaxed min-h-[35px]">
                    {printOrder.description || 'Sem descrição detalhada fornecida.'}
                  </p>
                </div>
              </div>

              {/* BLOCO 4 - PLANEJAMENTO */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 4 - PLANEAMENTO E RECURSOS
                </div>
                <div className="p-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Data/Hora Prevista:</span>
                    <span className="font-medium text-slate-900">
                      {new Date(printOrder.opened_at || printOrder.openedAt || Date.now()).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Tempo Estimado:</span>
                    <span className="font-medium text-slate-900">{printOrder.downtime_hours || printOrder.downtimeHours || '2.0'} Horas</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Técnico Responsável:</span>
                    <span className="font-bold text-slate-900">{resolveTechnicianName(printOrder)}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Equipa de Apoio:</span>
                    <span className="font-medium text-slate-900">Equipa de Manutenção Geral</span>
                  </div>
                  <div>
                    <span className="font-bold block text-[10px] text-slate-600 uppercase">Supervisor Responsável:</span>
                    <span className="font-medium text-slate-900">Supervisor de Turno</span>
                  </div>
                </div>
              </div>

              {/* BLOCO 5 - MATERIAIS / PEÇAS */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 5 - MATERIAIS / PEÇAS PREVISTAS E REQUISITADAS
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400 bg-slate-50 text-[10px] uppercase font-bold text-slate-700">
                      <th className="p-2 border-r border-slate-300 w-1/4">Código / Part Number</th>
                      <th className="p-2 border-r border-slate-300">Descrição do Item / Componente</th>
                      <th className="p-2 w-1/6 text-center">Qtd. Prevista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-[11px]">
                    {usedParts && usedParts.length > 0 ? (
                      usedParts.map((partItem: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono border-r border-slate-300">{partItem.oem_reference || partItem.part_number || 'P-ITEM'}</td>
                          <td className="p-2 border-r border-slate-300">{partItem.name}</td>
                          <td className="p-2 text-center font-bold">{partItem.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td className="p-2 font-mono border-r border-slate-300">FIL-LF16015</td>
                          <td className="p-2 border-r border-slate-300">Filtro de Óleo Lubrificante Cummins / Volvo</td>
                          <td className="p-2 text-center font-bold">1</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono border-r border-slate-300">LUB-15W40-1L</td>
                          <td className="p-2 border-r border-slate-300">Óleo de Motor Diesel 15W40 Multiviscoso</td>
                          <td className="p-2 text-center font-bold">5</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* BLOCO 6 - PROCEDIMENTOS / CHECKLIST */}
              <div className="border border-slate-400 mb-3 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 6 - PROCEDIMENTOS E CHECKLIST DE SEGURANÇA
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">☐</span>
                    <span>1. Parar o equipamento e sinalizar a área de trabalho com cones/fita.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">☐</span>
                    <span>2. Realizar o bloqueio e etiquetagem de segurança LOTO (Lockout/Tagout).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">☐</span>
                    <span>3. Inspecionar componentes substituídos, verificar torques e níveis de fluidos.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">☐</span>
                    <span>4. Testar o funcionamento em vazio e em carga antes da entrega ao operador.</span>
                  </div>
                </div>
              </div>

              {/* BLOCO 7 - EXECUÇÃO E ASSINATURAS */}
              <div className="border border-slate-400 rounded-none overflow-hidden">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-400 text-[11px] uppercase tracking-wider text-slate-800">
                  BLOCO 7 - REGISTO DE EXECUÇÃO E ASSINATURAS DE CONFORMIDADE
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3 text-xs">
                    <div>
                      <span className="font-bold block text-[10px] text-slate-600">Início Real da Execução:</span>
                      <div className="h-5 border-b border-dotted border-slate-400 mt-1"></div>
                    </div>
                    <div>
                      <span className="font-bold block text-[10px] text-slate-600">Término Real da Execução:</span>
                      <div className="h-5 border-b border-dotted border-slate-400 mt-1"></div>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold block text-[10px] text-slate-600">Observações do Técnico / Relatório Técnico Final:</span>
                    <div className="h-10 border-b border-dotted border-slate-400 mt-1"></div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-6 mt-4">
                    <div className="text-center">
                      <div className="border-b border-slate-900 mb-1"></div>
                      <span className="font-bold text-[10px] uppercase text-slate-800 block">Técnico Executante</span>
                      <span className="text-[9px] text-slate-500">Assinatura & Data</span>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-slate-900 mb-1"></div>
                      <span className="font-bold text-[10px] uppercase text-slate-800 block">Operador / Recebedor</span>
                      <span className="text-[9px] text-slate-500">Assinatura & Data</span>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-slate-900 mb-1"></div>
                      <span className="font-bold text-[10px] uppercase text-slate-800 block">Supervisor Responsável</span>
                      <span className="text-[9px] text-slate-500">Assinatura & Data</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkOrdersPage;
