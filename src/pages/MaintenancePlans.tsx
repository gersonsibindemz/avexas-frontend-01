import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
import SecondaryView from '../components/SecondaryView';
import { triggerGlobalConfirm } from '../contexts/AlertContext';
import { dataCache } from '../services/dataCacheService';
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  Edit2,
  Trash2,
  Zap,
  CheckSquare,
  Search,
  Wrench,
  Clock,
  Layers,
  X,
  User,
  AlertCircle,
  Save,
  MoreVertical
} from 'lucide-react';
import { draftService, DraftItem } from '../services/draftService';
import { DraftConfirmModal } from '../components/DraftConfirmModal';
import { DraftBanner } from '../components/DraftBanner';
import { DraftsListView } from '../components/DraftsListView';

export interface Asset {
  id: string;
  code_tag?: string;
  codeTag?: string;
  name: string;
  category?: string;
  category_type?: string;
  domain?: string;
  meter_kind?: string;
  operational_scope?: string;
  operationalScope?: string;
}

export interface Technician {
  id: string;
  name?: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  specialty?: string;
  role?: string;
  operational_scope?: 'fleet' | 'plant' | 'both' | 'mixed';
}

export interface ChecklistItem {
  id: string;
  task: string;
}

export interface MaintenancePlan {
  id: string;
  code?: string;
  title: string;
  asset_id: string;
  asset_name?: string;
  assetName?: string;
  asset_code?: string;
  assetCode?: string;
  trigger_type: 'time' | 'meter' | 'both';
  triggerType?: 'time' | 'meter' | 'both';
  interval_days?: number;
  intervalDays?: number;
  interval_meter?: number;
  intervalMeter?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_technician_id?: string;
  assignedTechnicianId?: string;
  technician_name?: string;
  technicianName?: string;
  checklist_items?: string[] | ChecklistItem[];
  checklist?: ChecklistItem[];
  is_active?: boolean;
  isActive?: boolean;
  status?: 'active' | 'paused';
  next_due_date?: string;
  nextDueDate?: string;
  next_due_meter?: number;
  nextDueMeter?: number;
  created_at?: string;
}

export const MaintenancePlansPage: React.FC = () => {
  const { user, isTechnician, currentScope } = useAuth();
  const domainConfig = useCurrentDomain();
  const { domain } = domainConfig;

  // Escopo estrito aplicado ao tenant_admin / utilizador atual
  // Um tenant_admin tem sempre um escopo específico ('fleet' ou 'plant')
  const effectiveScope: 'fleet' | 'plant' = (
    user?.role === 'tenant_admin'
      ? (user?.operational_scope === 'plant' || user?.operationalScope === 'plant' || user?.tenant?.operational_scope === 'plant' || user?.tenant?.operationalScope === 'plant' ? 'plant' : 'fleet')
      : (currentScope || domain || 'fleet')
  );

  const isAssetInScope = (asset: any, scope: 'fleet' | 'plant'): boolean => {
    if (!asset) return false;
    // 1. Se tem domain explícito ('fleet' ou 'plant')
    if (asset.domain === 'fleet' || asset.domain === 'plant') {
      return asset.domain === scope;
    }

    // 2. Se tem operational_scope explícito ('fleet' ou 'plant')
    const opScope = asset.operational_scope || asset.operationalScope;
    if (opScope === 'fleet' || opScope === 'plant') {
      return opScope === scope;
    }

    // 3. Verificação estrita por categoria do equipamento
    const cat = String(asset.category || asset.asset_category || '').toLowerCase();
    const isPlantCategory =
      cat === 'generator' ||
      cat === 'machinery' ||
      cat === 'plant_equipment' ||
      cat.startsWith('plant') ||
      cat.includes('caldeira') ||
      cat.includes('motor') ||
      cat.includes('bomba');

    const isFleetCategory =
      cat === 'vehicle_light' ||
      cat === 'vehicle_heavy' ||
      cat.startsWith('vehicle') ||
      cat.startsWith('cat-') ||
      cat.includes('viatura') ||
      cat.includes('veiculo') ||
      cat.includes('camião') ||
      cat.includes('reboque');

    if (scope === 'plant') {
      return isPlantCategory || (!isFleetCategory && asset.meter_kind === 'hourmeter_hours');
    }
    return isFleetCategory || (!isPlantCategory && asset.meter_kind === 'odometer_km');
  };

  // Estados sem qualquer dado mockado
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => dataCache.get<MaintenancePlan[]>('maintenance_plans') || []);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState<boolean>(() => !dataCache.has('maintenance_plans'));
  const [loadingFormData, setLoadingFormData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros e Notificações
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);

  // Menu suspenso de ações por linha via Portal (Camada Superior z-[9999] conforme padrão do Inventário)
  const [activePlanForMenu, setActivePlanForMenu] = useState<MaintenancePlan | null>(null);
  const [planMenuPosition, setPlanMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const handleTogglePlanMenu = (e: React.MouseEvent<HTMLButtonElement>, plan: MaintenancePlan) => {
    e.stopPropagation();
    if (activePlanForMenu?.id === plan.id) {
      setActivePlanForMenu(null);
      setPlanMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUpward ? rect.top - menuHeight : rect.bottom + 4;
    const left = Math.max(10, rect.right - menuWidth);

    setActivePlanForMenu(plan);
    setPlanMenuPosition({ top, left });
  };

  useEffect(() => {
    if (!activePlanForMenu) return;
    const handleScrollOrResize = () => {
      setActivePlanForMenu(null);
      setPlanMenuPosition(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activePlanForMenu]);

  // Estados de Rascunho (Drafts)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [isDraftConfirmOpen, setIsDraftConfirmOpen] = useState(false);
  const [planDrafts, setPlanDrafts] = useState<DraftItem[]>([]);

  const loadDrafts = () => {
    const list = draftService.getDrafts('maintenance_plans', user?.tenantId || (user as any)?.tenant_id, user?.id);
    setPlanDrafts(list);
  };

  useEffect(() => {
    loadDrafts();
    const handleDraftsUpdated = (e: any) => {
      if (!e.detail || e.detail.module === 'maintenance_plans') {
        loadDrafts();
      }
    };
    window.addEventListener('cmms:drafts-updated', handleDraftsUpdated);
    return () => window.removeEventListener('cmms:drafts-updated', handleDraftsUpdated);
  }, [user]);

  const handleResumeDraft = (draft: DraftItem) => {
    const data = draft.data || {};
    setTitle(data.title || '');
    setAssetId(data.assetId || '');
    setTriggerType(data.triggerType || 'meter');
    setIntervalDays(data.intervalDays || 90);
    setIntervalMeter(data.intervalMeter || 10000);
    setPriority(data.priority || 'medium');
    setAssignedTechnicianId(data.assignedTechnicianId || '');
    if (data.checklist && Array.isArray(data.checklist)) {
      setChecklist(data.checklist);
    }
    setHasRestoredDraft(true);
    setDraftSavedAt(draft.timestamp);
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    draftService.deleteDraft('maintenance_plans', draftId, user?.tenantId || (user as any)?.tenant_id, user?.id);
    loadDrafts();
  };

  // Campos do Formulário
  const [title, setTitle] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [triggerType, setTriggerType] = useState<'time' | 'meter' | 'both'>('meter');
  const [intervalDays, setIntervalDays] = useState<number>(90);
  const [intervalMeter, setIntervalMeter] = useState<number>(10000);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Verificar nível de óleo e filtros principais' },
    { id: '2', task: 'Inspecionar componentes de segurança e aperto geral' }
  ]);
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  // 1. Consumo de dados reais da API (/maintenance-plans)
  const fetchPlans = async (force: boolean | unknown = false) => {
    const isForce = force === true;
    if (isForce) {
      dataCache.invalidate('maintenance_plans');
    }
    if (!dataCache.has('maintenance_plans') || isForce) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await api.get('/maintenance-plans');
      const data = Array.isArray(res.data)
        ? res.data
        : (res.data?.plans || res.data?.data || []);
      setPlans(data);
      dataCache.set('maintenance_plans', data);
    } catch (err: any) {
      console.error('Erro ao carregar planos preventivos:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataCache.has('maintenance_plans')) {
      fetchPlans();
    }
  }, []);

  // 2. Carrega dependências reais do Modal (Ativos e Técnicos)
  const loadModalDependencies = async (targetPlanAssetId?: string) => {
    setLoadingFormData(true);
    try {
      const [assetsRes, techsRes] = await Promise.allSettled([
        api.get('/assets'),
        api.get('/technicians')
      ]);

      if (assetsRes.status === 'fulfilled') {
        const aData = Array.isArray(assetsRes.value.data)
          ? assetsRes.value.data
          : (assetsRes.value.data?.assets || assetsRes.value.data?.data || []);
        
        // Filtrar estritamente apenas os ativos pertencentes ao operational_scope do tenant_admin
        // NUNCA misturar ativos de 2 operational_scope diferentes e NUNCA fazer fallback para todos os ativos!
        const domainAssets = aData.filter((a: any) => isAssetInScope(a, effectiveScope));
        setAssets(domainAssets);

        // Se o assetId selecionado não existir na lista filtrada, define o primeiro ativo válido
        const desiredAssetId = targetPlanAssetId || assetId;
        const existsInScope = domainAssets.some((a: any) => a.id === desiredAssetId);

        if (existsInScope) {
          setAssetId(desiredAssetId);
        } else {
          setAssetId(domainAssets.length > 0 ? domainAssets[0].id : '');
        }
      }

      if (techsRes.status === 'fulfilled') {
        const tData = Array.isArray(techsRes.value.data)
          ? techsRes.value.data
          : (techsRes.value.data?.technicians || techsRes.value.data?.data || []);
        const uniqueTechs = Array.from(
          new Map<string, Technician>(tData.map((t: Technician) => {
            const key = t.email?.toLowerCase() || t.name?.toLowerCase() || t.fullName?.toLowerCase() || t.full_name?.toLowerCase() || t.id;
            return [key, t];
          })).values()
        );
        // Filtrar técnicos pelo escopo operacional do tenant_admin
        const scopedTechs = uniqueTechs.filter((tech) =>
          !tech.operational_scope ||
          tech.operational_scope === 'both' ||
          tech.operational_scope === 'mixed' ||
          tech.operational_scope === effectiveScope
        );
        setTechnicians(scopedTechs);

        if (scopedTechs.length > 0 && (!assignedTechnicianId || !scopedTechs.some(t => t.id === assignedTechnicianId))) {
          setAssignedTechnicianId(scopedTechs[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do formulário:', err);
    } finally {
      setLoadingFormData(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    const draft = draftService.getDraft<any>('maintenance_plans', user?.tenantId || (user as any)?.tenant_id, user?.id);
    if (draft && draft.data) {
      setTitle(draft.data.title || '');
      setAssetId(draft.data.assetId || '');
      setTriggerType(draft.data.triggerType || 'meter');
      setIntervalDays(draft.data.intervalDays || 90);
      setIntervalMeter(draft.data.intervalMeter || 10000);
      setPriority(draft.data.priority || 'medium');
      setAssignedTechnicianId(draft.data.assignedTechnicianId || '');
      if (Array.isArray(draft.data.checklist)) {
        setChecklist(draft.data.checklist);
      }
      setHasRestoredDraft(true);
      setDraftSavedAt(draft.timestamp);
    } else {
      setTitle('');
      setTriggerType('meter');
      setIntervalDays(90);
      setIntervalMeter(10000);
      setPriority('medium');
      setChecklist([
        { id: '1', task: 'Verificar nível de óleo e filtros de substituição' },
        { id: '2', task: 'Inspeção técnica dos travões e fixações mecânicas' }
      ]);
      setHasRestoredDraft(false);
      setDraftSavedAt(null);
    }
    setIsModalOpen(true);
    loadModalDependencies();
  };

  const handleRequestCloseModal = () => {
    if (editingPlan) {
      setIsModalOpen(false);
      return;
    }
    const hasData = title.trim() !== '' || (checklist.length > 2 || (checklist.length > 0 && checklist[0].task !== 'Verificar nível de óleo e filtros de substituição'));
    if (hasData) {
      setIsDraftConfirmOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleSaveDraft = () => {
    const planTitle = title.trim() || 'Novo Plano Preventivo';
    const subtitle = `Gatilho: ${triggerType === 'both' ? 'Dias e Km' : triggerType === 'time' ? `${intervalDays} dias` : `${intervalMeter} km`}`;
    draftService.saveDraft('maintenance_plans', {
      title,
      assetId,
      triggerType,
      intervalDays,
      intervalMeter,
      priority,
      assignedTechnicianId,
      checklist
    }, user?.tenantId || (user as any)?.tenant_id, user?.id, { title: planTitle, subtitle });
    setIsDraftConfirmOpen(false);
    setIsModalOpen(false);
    loadDrafts();
    setSuccessMessage('Rascunho de plano preventivo guardado com sucesso na lista de rascunhos!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDiscardDraft = () => {
    draftService.clearDraft('maintenance_plans', user?.tenantId || (user as any)?.tenant_id, user?.id);
    setIsDraftConfirmOpen(false);
    setIsModalOpen(false);
    setHasRestoredDraft(false);
    loadDrafts();
  };

  const handleDiscardRestoredDraft = () => {
    draftService.clearDraft('maintenance_plans', user?.tenantId || (user as any)?.tenant_id, user?.id);
    setTitle('');
    setTriggerType('meter');
    setIntervalDays(90);
    setIntervalMeter(10000);
    setPriority('medium');
    setChecklist([
      { id: '1', task: 'Verificar nível de óleo e filtros de substituição' },
      { id: '2', task: 'Inspeção técnica dos travões e fixações mecânicas' }
    ]);
    setHasRestoredDraft(false);
  };

  // Tecla ESC com verificação de rascunhos
  useEscapeKey(handleRequestCloseModal, isModalOpen && !isDraftConfirmOpen);
  useEscapeKey(() => setIsDraftConfirmOpen(false), isDraftConfirmOpen);

  const handleOpenEditModal = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setTitle(plan.title || '');
    setAssetId(plan.asset_id || '');
    setTriggerType(plan.trigger_type || plan.triggerType || 'meter');
    setIntervalDays(plan.interval_days || plan.intervalDays || 90);
    setIntervalMeter(plan.interval_meter || plan.intervalMeter || 10000);
    setPriority(plan.priority || 'medium');
    setAssignedTechnicianId(plan.assigned_technician_id || plan.assignedTechnicianId || '');

    // Formatar checklist
    if (Array.isArray(plan.checklist)) {
      setChecklist(plan.checklist);
    } else if (Array.isArray(plan.checklist_items)) {
      const formatted = plan.checklist_items.map((item: any, idx) =>
        typeof item === 'string' ? { id: String(idx + 1), task: item } : item
      );
      setChecklist(formatted);
    } else {
      setChecklist([]);
    }

    setIsModalOpen(true);
    loadModalDependencies(plan.asset_id);
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setChecklist([
      ...checklist,
      { id: String(Date.now()), task: newTaskInput.trim() }
    ]);
    setNewTaskInput('');
  };

  const handleRemoveTask = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  // 3. Salvar Plano via API (POST / PUT /maintenance-plans)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assetId) return;

    const payload = {
      title,
      asset_id: assetId,
      domain: effectiveScope,
      trigger_type: triggerType,
      interval_days: Number(intervalDays),
      interval_meter: Number(intervalMeter),
      priority,
      assigned_technician_id: assignedTechnicianId || undefined,
      checklist_items: checklist.map(c => c.task)
    };

    try {
      if (editingPlan) {
        await api.put(`/maintenance-plans/${editingPlan.id}`, payload);
        setSuccessMessage('Plano preventivo atualizado com sucesso!');
      } else {
        await api.post('/maintenance-plans', payload);
        setSuccessMessage('Novo plano de manutenção preventivo criado com sucesso!');
      }
      draftService.clearDraft('maintenance_plans', user?.tenantId || (user as any)?.tenant_id, user?.id);
      setIsModalOpen(false);
      fetchPlans(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar plano preventivo:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao comunicar com a API ao guardar o plano.');
    }
  };

  // 4. Alternar Ativo/Pausado via API (PATCH /maintenance-plans/:id/toggle)
  const handleToggleActive = async (plan: MaintenancePlan) => {
    try {
      try {
        await api.patch(`/maintenance-plans/${plan.id}/toggle`);
      } catch {
        const currentActive = plan.is_active ?? plan.status === 'active';
        await api.patch(`/maintenance-plans/${plan.id}`, { is_active: !currentActive, status: !currentActive ? 'active' : 'paused' });
      }
      fetchPlans(true);
    } catch (err: any) {
      console.error('Erro ao alterar estado do plano:', err);
    }
  };

  // 5. Gerar OS Preventiva Imediata via API (POST /maintenance-plans/:id/generate-wo)
  const handleGenerateWO = async (plan: MaintenancePlan) => {
    try {
      try {
        await api.post(`/maintenance-plans/${plan.id}/generate-wo`);
      } catch {
        // Fallback direto via POST /work-orders
        await api.post('/work-orders', {
          title: `[Preventiva] ${plan.title}`,
          asset_id: plan.asset_id,
          type: 'preventive',
          priority: plan.priority || 'medium',
          description: `Ordem de Serviço Preventiva gerada a partir do plano ${plan.code || plan.id}.\n\nChecklist:\n` +
            (Array.isArray(plan.checklist)
              ? plan.checklist.map((c, i) => `${i + 1}. [ ] ${c.task}`).join('\n')
              : 'Verificação periódica')
        });
      }
      setSuccessMessage(`Ordem de Serviço Preventiva gerada com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao gerar Ordem de Serviço Preventiva:', err);
      alert('Erro ao gerar Ordem de Serviço na API.');
    }
  };

  // 6. Eliminar Plano via API (DELETE /maintenance-plans/:id)
  const handleDeletePlan = async (id: string) => {
    const confirmed = await triggerGlobalConfirm({
      title: 'Eliminar Plano Preventivo',
      message: 'Tem a certeza que deseja eliminar definitivamente este plano preventivo?',
      confirmText: 'Sim, Eliminar',
      cancelText: 'Cancelar',
      danger: true
    });
    if (!confirmed) return;
    try {
      await api.delete(`/maintenance-plans/${id}`);
      setSuccessMessage('Plano preventivo eliminado com sucesso.');
      fetchPlans(true);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao eliminar plano:', err);
      alert('Erro ao eliminar plano na API.');
    }
  };

  // Isolamento estrito de planos preventivos por escopo operacional (Frota vs Fábrica)
  const domainFilteredPlans = plans.filter((plan: any) => {
    const planScope = plan.domain || plan.operational_scope || plan.operationalScope;
    if (planScope === 'fleet' || planScope === 'plant') {
      return planScope === effectiveScope;
    }
    const cat = String(plan.asset_category || '').toLowerCase();
    if (cat) {
      if (effectiveScope === 'plant') {
        return cat === 'generator' || cat === 'machinery' || cat === 'plant_equipment' || cat.startsWith('plant');
      }
      return cat === 'vehicle_light' || cat === 'vehicle_heavy' || cat.startsWith('vehicle') || cat.startsWith('cat-');
    }
    return true;
  });

  // Indicadores do Topo Calculados em Tempo Real (Zero Números Fixos)
  const activePlansCount = domainFilteredPlans.filter(p => p.is_active ?? p.status === 'active').length;
  const pausedPlansCount = domainFilteredPlans.filter(p => (p.is_active === false) || p.status === 'paused').length;

  const upcomingCount = domainFilteredPlans.filter(p => {
    const isActive = p.is_active ?? p.status === 'active';
    const dueDate = p.next_due_date || p.nextDueDate;
    if (!dueDate || !isActive) return false;
    const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 15;
  }).length;

  // Filtros
  const filteredPlans = domainFilteredPlans.filter(plan => {
    const q = searchQuery.toLowerCase();
    const assetName = plan.asset_name || plan.assetName || '';
    const code = plan.code || '';

    const matchesSearch =
      !searchQuery ||
      plan.title.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      assetName.toLowerCase().includes(q);

    const isActive = plan.is_active ?? plan.status === 'active';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'paused' && !isActive);

    return matchesSearch && matchesStatus;
  });

  const availableTechnicians = technicians.filter((tech) =>
    !tech.operational_scope ||
    tech.operational_scope === 'both' ||
    tech.operational_scope === 'mixed' ||
    tech.operational_scope === effectiveScope
  );

  return (
    <div className="space-y-6">
      
      {/* TOAST DE SUCESSO */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-fade-in">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Operação Concluída</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Plano de Manutenção</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {!isTechnician && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
            >
              <Plus size={16} />
              <span>Novo Plano Preventivo</span>
            </button>
          )}
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS NO TOPO (3 CARDS CALCULADOS EM TEMPO REAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Planos Ativos</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : activePlansCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Revisões Próximas (15 dias)</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : upcomingCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
            <Pause size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Planos Pausados</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : pausedPlansCount}</span>
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar plano por código, título ou ativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
            >
              <option value="all">Todos os Estados</option>
              <option value="active">Ativos</option>
              <option value="paused">Pausados</option>
              <option value="drafts">Rascunhos Salvos ({planDrafts.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE PLANOS PREVENTIVOS OU LISTA DE RASCUNHOS */}
      {statusFilter === 'drafts' ? (
        <DraftsListView
          moduleName="Plano de Manutenção"
          drafts={planDrafts}
          onResumeDraft={handleResumeDraft}
          onDeleteDraft={handleDeleteDraft}
          onNewItem={() => handleOpenCreateModal()}
        />
      ) : (
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
            <p className="text-slate-500 text-xs mt-3">A carregar planos preventivos da API...</p>
          </div>
        ) : plans.length === 0 ? (
          /* ESTADO VAZIO REAL (EMPTY STATE) */
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
            <CalendarClock size={36} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">Nenhum Plano de Manutenção Preventiva</h3>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="text-slate-300 mx-auto" size={36} />
            <h3 className="text-sm font-semibold text-slate-800 mt-2">Nenhum plano encontrado</h3>
            <p className="text-slate-500 text-xs mt-1">
              Tente ajustar os critérios de pesquisa ou limpar os filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código & Título</th>
                  <th className="py-3 px-4">Ativo Alvo</th>
                  <th className="py-3 px-4">Periodicidade / Gatilho</th>
                  <th className="py-3 px-4">Checklist</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPlans.map((plan) => {
                  const isActive = plan.is_active ?? plan.status === 'active';
                  const tType = plan.trigger_type || plan.triggerType;
                  const intDays = plan.interval_days || plan.intervalDays;
                  const intMeter = plan.interval_meter || plan.intervalMeter;
                  const assetName = plan.asset_name || plan.assetName || 'Ativo Corporativo';
                  const assetCode = plan.asset_code || plan.assetCode || '';
                  const checklistCount = Array.isArray(plan.checklist)
                    ? plan.checklist.length
                    : Array.isArray(plan.checklist_items)
                    ? plan.checklist_items.length
                    : 0;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <span className="text-[10px] text-blue-700 font-mono font-bold block">{plan.code || `PLN-${plan.id.substring(0, 5)}`}</span>
                        <span className="text-xs text-slate-900 font-semibold">{plan.title}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{assetName}</span>
                        {assetCode && (
                          <span className="text-[10px] text-slate-500 font-mono">{assetCode}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {tType === 'time' && (
                          <span className="text-slate-700 font-medium block">A cada {intDays} dias</span>
                        )}
                        {tType === 'meter' && (
                          <span className="text-slate-700 font-medium block">A cada {intMeter?.toLocaleString('pt-MZ')} km/hrs</span>
                        )}
                        {tType === 'both' && (
                          <span className="text-slate-700 font-medium block">
                            {intDays} dias ou {intMeter?.toLocaleString('pt-MZ')} km
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          <CheckSquare size={12} />
                          <span>{checklistCount} itens</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <CheckCircle2 size={12} />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <Pause size={12} />
                            <span>Pausado</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePlanMenu(e, plan)}
                            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center border ${
                              activePlanForMenu?.id === plan.id
                                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent hover:border-slate-200'
                            }`}
                            title="Ações do Plano"
                            aria-label="Ações do Plano"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* CAMADA SECUNDÁRIA: CRIAÇÃO / EDIÇÃO DE PLANO PREVENTIVO */}
      <SecondaryView
        isOpen={isModalOpen}
        onClose={handleRequestCloseModal}
        title={editingPlan ? 'Editar Plano Preventivo' : 'Novo Plano de Manutenção Preventiva'}
        subtitle="Configuração de periodicidade, checklists e atribuição de técnicos"
        icon={<CalendarClock className="text-blue-700" size={20} />}
        maxWidth="max-w-3xl"
      >
        <div className="p-6">
          {hasRestoredDraft && (
            <div className="mb-4">
              <DraftBanner
                onDiscard={handleDiscardRestoredDraft}
                savedAt={draftSavedAt || undefined}
              />
            </div>
          )}
          <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              
              {loadingFormData ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin text-blue-700 mx-auto" size={24} />
                  <p className="text-slate-500 text-xs mt-2">A carregar ativos e técnicos...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Título do Plano Preventivo *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="ex: Revisão Periódica dos 10.000 Km ou Inspeção Trimestral"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {effectiveScope === 'fleet' ? 'Ativo / Viatura da Frota Alvo *' : 'Equipamento Fabril Alvo *'}
                      </label>
                      <select
                        required
                        value={assetId}
                        onChange={(e) => setAssetId(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="">
                          {assets.length === 0 ? 'Nenhum ativo registado neste escopo...' : 'Selecione o ativo...'}
                        </option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name} ({asset.code_tag || asset.codeTag || asset.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipo de Gatilho / Disparo *
                      </label>
                      <select
                        value={triggerType}
                        onChange={(e) => setTriggerType(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="meter">
                          {effectiveScope === 'fleet' ? 'Por Odómetro (Km)' : 'Por Horímetro (Horas)'}
                        </option>
                        <option value="time">Por Tempo (Dias / Calendário)</option>
                        <option value="both">Ambos (O que ocorrer primeiro)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(triggerType === 'time' || triggerType === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Intervalo de Tempo (Dias) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(Number(e.target.value))}
                          placeholder="ex: 90 (a cada 90 dias)"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    )}

                    {(triggerType === 'meter' || triggerType === 'both') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {effectiveScope === 'fleet' ? 'Intervalo de Odómetro (Km) *' : 'Intervalo de Horímetro (Horas) *'}
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={intervalMeter}
                          onChange={(e) => setIntervalMeter(Number(e.target.value))}
                          placeholder={effectiveScope === 'fleet' ? 'ex: 10000 (a cada 10.000 Km)' : 'ex: 500 (a cada 500 Horas)'}
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Prioridade da OS Gerada
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Técnico Responsável Recomendado
                      </label>
                      <select
                        value={assignedTechnicianId}
                        onChange={(e) => setAssignedTechnicianId(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="">Atribuição automática / Ninguém</option>
                        {availableTechnicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.fullName || tech.full_name || tech.email} ({tech.specialty || 'Geral'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CHECKLIST DINÂMICA DE INSPEÇÃO */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Checklist de Inspeção do Plano
                    </label>
                    
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Adicionar tarefa de inspeção (ex: Verificar aperto de terminais)..."
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTask();
                          }
                        }}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddTask}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                      {checklist.length === 0 ? (
                        <p className="text-slate-400 text-center py-2 text-[11px]">Nenhum item adicionado à checklist.</p>
                      ) : (
                        checklist.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
                            <span className="text-slate-800 text-[11px] font-medium">
                              {idx + 1}. {item.task}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTask(item.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* FOOTER DO MODAL */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestCloseModal}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {!editingPlan && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Salvar como rascunho para concluir depois"
                    >
                      <Save size={13} className="text-blue-700" />
                      <span>Salvar Rascunho</span>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loadingFormData}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-md text-xs cursor-pointer shadow-none"
                >
                  {editingPlan ? 'Atualizar Plano' : 'Criar Plano Preventivo'}
                </button>
              </div>
            </form>
        </div>
      </SecondaryView>

      {/* Modal de Confirmação para Salvar como Rascunho */}
      <DraftConfirmModal
        isOpen={isDraftConfirmOpen}
        moduleName="Plano de Manutenção Preventiva"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardDraft}
        onCancel={() => setIsDraftConfirmOpen(false)}
      />
      {/* Menu Flutuante de Ações Rápidas do Plano via Portal (Camada Mais Alta z-[9999]) */}
      {activePlanForMenu && planMenuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setActivePlanForMenu(null);
              setPlanMenuPosition(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${planMenuPosition.top}px`,
              left: `${planMenuPosition.left}px`,
            }}
            className="w-48 bg-white border border-slate-200 rounded-lg shadow-2xl z-[9999] py-1 divide-y divide-slate-100 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const target = activePlanForMenu;
                  setActivePlanForMenu(null);
                  setPlanMenuPosition(null);
                  handleGenerateWO(target);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Zap size={14} className="text-amber-600" />
                <span>Gerar OS Imediata</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = activePlanForMenu;
                  setActivePlanForMenu(null);
                  setPlanMenuPosition(null);
                  handleToggleActive(target);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                {(activePlanForMenu.is_active ?? activePlanForMenu.status === 'active') ? (
                  <>
                    <Pause size={14} className="text-slate-500" />
                    <span>Pausar Plano</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="text-emerald-600 fill-current" />
                    <span>Ativar Plano</span>
                  </>
                )}
              </button>
            </div>

            {!isTechnician && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = activePlanForMenu;
                    setActivePlanForMenu(null);
                    setPlanMenuPosition(null);
                    handleOpenEditModal(target);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Edit2 size={14} className="text-slate-400" />
                  <span>Editar Plano</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = activePlanForMenu;
                    setActivePlanForMenu(null);
                    setPlanMenuPosition(null);
                    handleDeletePlan(target.id);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  <span>Eliminar Plano</span>
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default MaintenancePlansPage;
