import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api, getApiErrorMessage, toFiniteNumber } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  ENERGY_TYPES,
  FLEET_CATEGORIES,
  PLANT_CATEGORIES,
  OWNERSHIP_TYPES,
  TRAILER_SUBTYPES,
  getSubtypesForType,
  toBackendCategory,
  isPlantCategoryCode,
  getCleanCategoryName,
  getCategoriesForScope,
  UI_CATEGORY_TO_BACKEND
} from '../config/fleetCategories';
import { SecondaryView } from '../components/SecondaryView';
import { TablePagination } from '../components/TablePagination';
import { CustomizeColumnsModal, ColumnDefinition } from '../components/CustomizeColumnsModal';
import { AssetDetailsModal } from '../components/AssetDetailsModal';
import { RegisterMaintenanceModal } from '../components/RegisterMaintenanceModal';
import { UpdateMeterModal } from '../components/UpdateMeterModal';
import { MaintenanceHistoryModal } from '../components/MaintenanceHistoryModal';
import { exportAssetsListToExcel, exportAssetTechSheetToExcel } from '../utils/excelExport';
import { Filter, ChevronDown } from 'lucide-react';
import { useAlert, triggerGlobalConfirm } from '../contexts/AlertContext';
import QRCode from 'qrcode';
import {
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Check,
  Search,
  X,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  Info,
  FileText,
  QrCode,
  Edit2,
  Trash2,
  MoreVertical,
  Download,
  Printer,
  UploadCloud,
  File,
  Eye,
  Trash,
  FileSpreadsheet,
  Link,
  Camera,
  Save,
  BarChart3,
  History,
  ShieldAlert,
  Layers,
  Truck
} from 'lucide-react';
import { draftService, DraftItem } from '../services/draftService';
import { DraftConfirmModal } from '../components/DraftConfirmModal';
import { DraftBanner } from '../components/DraftBanner';
import { DraftsListView } from '../components/DraftsListView';
import { combinationService, TrailerRole, CombinationHistoryEntry } from '../services/combinationService';
import { FleetOperationsReportModal } from '../components/FleetOperationsReportModal';
import { dataCache } from '../services/dataCacheService';

interface Document {
  id: string;
  title: string;
  document_type: string;
  documentType?: string;
  signed_url: string;
  signedUrl?: string;
  file_name?: string;
  fileName?: string;
  created_at: string;
}

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string;
  name: string;
  domain?: string;
  operational_scope?: string;
  operationalScope?: string;
  brand?: string;
  model: string;
  category: 'vehicle_light' | 'vehicle_heavy' | 'generator' | 'machinery' | string;
  asset_type?: string;
  assetType?: string;
  asset_subtype?: string;
  assetSubtype?: string;
  energy_type?: string;
  energyType?: string;
  ownership_type?: string;
  ownershipType?: string;
  axle_config?: number;
  axleConfig?: number;
  criticality_level?: 'A' | 'B' | 'C' | string;
  criticalityLevel?: string;
  current_meter?: number;
  currentMeter?: number;
  meter_kind?: 'odometer_km' | 'hourmeter_hours' | string;
  meterKind?: string;
  status: 'operational' | 'breakdown' | 'maintenance' | string;
  cost_center: string;
  costCenter?: string;
  manufacture_year?: number;
  manufactureYear?: number;
  
  // Detalhes Operacionais e de Conformidade adicionais
  license_plate?: string;
  licensePlate?: string;
  chassis_vin?: string;
  chassisVin?: string;
  engine_number?: string;
  engineNumber?: string;
  fuel_tank_capacity_liters?: number;
  fuelTankCapacityLiters?: number;
  
  plant_sector?: string;
  plantSector?: string;
  voltage_specs?: string;
  voltageSpecs?: string;
  power_kw_kva?: number;
  powerKwKva?: number;

  inatro_inspection_expiry?: string;
  inatroInspectionExpiry?: string;
  insurance_company?: string;
  insuranceCompany?: string;
  insurance_policy_number?: string;
  insurancePolicyNumber?: string;
  insurance_expiry?: string;
  insuranceExpiry?: string;

  innoq_calibration_expiry?: string;
  innoqCalibrationExpiry?: string;
  pressure_test_expiry?: string;
  pressureTestExpiry?: string;
  local_supplier_name?: string;
  localSupplierName?: string;
  warranty_expiry?: string;
  warrantyExpiry?: string;

  // Novos campos dos 7 passos
  qr_code?: string;
  qrCode?: string;
  photo_url?: string;
  photoUrl?: string;
  company?: string;
  department?: string;
  location?: string;
  responsible?: string;
  operator_driver?: string;
  notes?: string;
  operational_notes?: string;
  licenses_certificates_notes?: string;
  meter_unit?: string;
  meterUnit?: string;
  initial_km?: number;
  initialKm?: number;
  current_km?: number;
  currentKm?: number;
  initial_hour_meter?: number;
  initialHourMeter?: number;
  current_hour_meter?: number;
  currentHourMeter?: number;
  measurement_unit?: string;
  measurementUnit?: string;
  last_reading_date?: string;
  lastReadingDate?: string;
  expected_operating_hours?: number;
  expectedOperatingHours?: number;
  maintenance_plan_id?: string;
  maintenancePlanId?: string;
  maintenance_type?: string;
  maintenanceType?: string;
  maintenance_periodicity?: string;
  maintenancePeriodicity?: string;
  last_maintenance_date?: string;
  lastMaintenanceDate?: string;
  last_maintenance_meter?: number;
  lastMaintenanceMeter?: number;
  next_maintenance_date?: string;
  nextMaintenanceDate?: string;
  next_maintenance_meter?: number;
  nextMaintenanceMeter?: number;
  maintenance_notes?: string;
  maintenanceNotes?: string;
  general_condition?: string;
  generalCondition?: string;
}

interface DriverUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  operational_scope?: string;
}

interface AssetFormData {
  // Passo 1
  category: string;
  asset_type: string;
  custom_asset_type?: string;
  asset_subtype: string;
  custom_asset_subtype?: string;
  code_tag: string;
  license_plate: string;
  name: string;
  company: string;
  department: string;
  location: string;
  cost_center: string;
  status: string;
  criticality_level: string;
  responsible: string;
  operator_driver: string;
  qr_code: string;
  photo_url: string;
  notes: string;

  // Passo 2
  brand: string;
  model: string;
  manufacture_year: string;
  serial_number: string;
  chassis_vin: string;
  engine_number: string;
  color: string;

  // Passo 3
  energy_type: string;
  ownership_type: string;
  axle_config: string;
  plant_sector: string;
  voltage_specs: string;
  power_kw_kva: string;
  fuel_tank_capacity_liters: string;
  technical_specs: {
    engine_type: string;
    power: string;
    fuel: string;
    transmission: string;
    traction: string;
    axles: string;
    weight_load: string;
    payload_capacity: string;
    tank_capacity: string;
    consumption: string;
    tire_size: string;
    dimensions: string;
    other_specs: string;
  };

  // Passo 4
  initial_km: string;
  current_km: string;
  initial_hour_meter: string;
  current_hour_meter: string;
  measurement_unit: string;
  last_reading_date: string;
  shift: string;
  expected_operating_hours: string;
  initial_meter: string;
  current_meter: string;
  meter_unit: string;
  operational_notes: string;

  // Passo 5
  acquisition_date: string;
  operation_date: string;
  acquisition_value: string;
  currency: string;
  supplier: string;
  warranty_expiry: string;
  insurance_company: string;
  insurance_policy_number: string;
  insurance_expiry: string;
  inspection_expiry: string;
  licenses_certificates_notes: string;

  // Passo 6
  maintenance_plan_id: string;
  maintenance_type: string;
  maintenance_periodicity: string;
  last_maintenance_date: string;
  last_maintenance_meter: string;
  next_maintenance_date: string;
  next_maintenance_meter: string;
  maintenance_notes: string;

  // Passo 7
  safety_checks: {
    extinguisher_validity: string;
    warning_triangle: string;
    first_aid_kit: string;
    ppe: string;
    safety_devices: string;
    general_condition: string;
    safety_observations: string;
  };
}

const createInitialAssetFormData = (domain: string, categories: { value: string }[]): AssetFormData => ({
  category: '',
  asset_type: '',
  custom_asset_type: '',
  asset_subtype: '',
  custom_asset_subtype: '',
  code_tag: '',
  license_plate: '',
  name: '',
  company: '',
  department: '',
  location: '',
  cost_center: '',
  status: 'operational',
  criticality_level: 'B',
  responsible: '',
  operator_driver: '',
  qr_code: '',
  photo_url: '',
  notes: '',

  brand: '',
  model: '',
  manufacture_year: String(new Date().getFullYear()),
  serial_number: '',
  chassis_vin: '',
  engine_number: '',
  color: '',

  energy_type: 'Diesel',
  ownership_type: 'Próprio',
  axle_config: '',
  plant_sector: '',
  voltage_specs: '',
  power_kw_kva: '',
  fuel_tank_capacity_liters: '',
  technical_specs: {
    engine_type: '',
    power: '',
    fuel: 'Diesel',
    transmission: '',
    traction: '',
    axles: '',
    weight_load: '',
    payload_capacity: '',
    tank_capacity: '',
    consumption: '',
    tire_size: '',
    dimensions: '',
    other_specs: ''
  },

  initial_km: '0',
  current_km: '0',
  initial_hour_meter: '0',
  current_hour_meter: '0',
  measurement_unit: domain === 'plant' ? 'Horas' : 'Km',
  last_reading_date: '',
  shift: '',
  expected_operating_hours: '',
  initial_meter: '0',
  current_meter: '0',
  meter_unit: domain === 'plant' ? 'Horas' : 'Km',
  operational_notes: '',

  acquisition_date: '',
  operation_date: '',
  acquisition_value: '',
  currency: 'MZN',
  supplier: '',
  warranty_expiry: '',
  insurance_company: '',
  insurance_policy_number: '',
  insurance_expiry: '',
  inspection_expiry: '',
  licenses_certificates_notes: '',

  maintenance_plan_id: '',
  maintenance_type: 'Preventiva',
  maintenance_periodicity: 'Km',
  last_maintenance_date: '',
  last_maintenance_meter: '',
  next_maintenance_date: '',
  next_maintenance_meter: '',
  maintenance_notes: '',

  safety_checks: {
    extinguisher_validity: '',
    warning_triangle: '',
    first_aid_kit: '',
    ppe: '',
    safety_devices: '',
    general_condition: 'Bom',
    safety_observations: ''
  }
});

const ASSET_WIZARD_STEPS = [
  { id: 0, label: 'Identificação e dados gerais', shortLabel: 'Identificação' },
  { id: 1, label: 'Identificação do fabricante', shortLabel: 'Fabricante' },
  { id: 2, label: 'Características técnicas', shortLabel: 'Técnica' },
  { id: 3, label: 'Operação e medidores', shortLabel: 'Operação' },
  { id: 4, label: 'Conformidade, Aquisição e Documentos', shortLabel: 'Conformidade' },
  { id: 5, label: 'Manutenção', shortLabel: 'Manutenção' },
  { id: 6, label: 'Segurança e condições de utilização', shortLabel: 'Segurança' },
];

export const AssetsPage: React.FC = () => {
  const { user, isTechnician, isDriverOperator, isFleet, isPlant, isMixedScope, currentScope } = useAuth();
  const [scopeFilter, setScopeFilter] = useState<'all' | 'fleet' | 'plant'>('all');
  const domainConfig = useCurrentDomain();
  const { categories, complianceDocTypes, counterLabel, counterUnit, searchPlaceholder, domain, assetNamePlural } = domainConfig;
  const { showAlert } = useAlert();

  // Determina o escopo operacional efetivo para exibição de categorias
  const effectiveScope = isMixedScope
    ? (user?.role === 'supervisor' && user?.operational_scope ? user.operational_scope : 'mixed')
    : (user?.operational_scope || (isPlant ? 'plant' : domain));
  const scopeCategories = useMemo(() => getCategoriesForScope(effectiveScope), [effectiveScope]);

  const [assets, setAssets] = useState<Asset[]>(() => dataCache.get<Asset[]>('assets_list') || []);
  const [loading, setLoading] = useState<boolean>(() => !dataCache.has('assets_list'));
  const [error, setError] = useState<string | null>(null);

  // Filtros de Pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modais de Controle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalOpenMode] = useState<'create' | 'edit'>('create');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocAsset, setSelectedDocAsset] = useState<Asset | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrAsset, setSelectedQrAsset] = useState<Asset | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

  const [isCombinationsModalOpen, setIsCombinationsModalOpen] = useState(false);
  const [activeCombinations, setActiveCombinations] = useState<any[]>([]);
  const [combTab, setCombTab] = useState<'active' | 'create' | 'history'>('active');
  const [combCode, setCombCode] = useState('');
  const [combTruckId, setCombTruckId] = useState('');
  const [combTrailers, setCombTrailers] = useState<{ trailerId: string; role: TrailerRole }[]>([
    { trailerId: '', role: 'leader' }
  ]);
  const [allowOperationalOverride, setAllowOperationalOverride] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [combinationHistory, setCombinationHistory] = useState<CombinationHistoryEntry[]>([]);
  const [loadingCombinations, setLoadingCombinations] = useState(false);
  const [submittingCombination, setSubmittingCombination] = useState(false);
  const [combinationError, setCombinationError] = useState<string | null>(null);

  // Relatórios de Operação (Ativos & Conjuntos)
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedCombForReport, setSelectedCombForReport] = useState<string | null>(null);

  // Ativação da tecla ESC nos modais de Ativos
  useEscapeKey(() => setIsDocModalOpen(false), isDocModalOpen);
  useEscapeKey(() => setIsQrModalOpen(false), isQrModalOpen);
  useEscapeKey(() => setIsDeleteModalOpen(false), isDeleteModalOpen);
  useEscapeKey(() => setIsCombinationsModalOpen(false), isCombinationsModalOpen);
  useEscapeKey(() => setIsReportsModalOpen(false), isReportsModalOpen);

  // ==========================================
  // CONFIGURAÇÃO DE COLUNAS PERSONALIZÁVEIS
  // ==========================================
  const DEFAULT_ASSET_COLUMNS: ColumnDefinition[] = [
    { id: 'code_tag', label: 'Código / Tag', visible: true },
    { id: 'name', label: 'Ativo / Equipamento', visible: true },
    { id: 'category', label: 'Categoria', visible: true },
    { id: 'cost_center', label: 'Centro de Custo', visible: true },
    { id: 'criticality_level', label: 'Criticidade', visible: true },
    { id: 'status', label: 'Estado', visible: true },
    { id: 'license_plate', label: 'Placa / Identificação', visible: false },
    { id: 'brand_model', label: 'Marca / Modelo', visible: false },
    { id: 'location', label: 'Localização / Base', visible: false },
    { id: 'department', label: 'Departamento', visible: false },
    { id: 'current_meter', label: 'Medidor Atual', visible: false },
    { id: 'operator_driver', label: 'Operador / Motorista', visible: false },
    { id: 'responsible', label: 'Responsável', visible: false },
  ];

  const [tableColumns, setTableColumns] = useState<ColumnDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('avexas_assets_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao carregar colunas salvas:', e);
    }
    return DEFAULT_ASSET_COLUMNS;
  });

  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
  const handleApplyColumnLayout = (newCols: ColumnDefinition[]) => {
    setTableColumns(newCols);
    try {
      localStorage.setItem('avexas_assets_columns', JSON.stringify(newCols));
    } catch (e) {
      console.warn('Erro ao guardar colunas:', e);
    }
  };
  const handleResetColumnLayout = () => {
    setTableColumns(DEFAULT_ASSET_COLUMNS);
    try {
      localStorage.removeItem('avexas_assets_columns');
    } catch (e) {
      console.warn('Erro ao limpar colunas:', e);
    }
  };

  // ==========================================
  // FILTRAGEM DIRETA POR COLUNA
  // ==========================================
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // ==========================================
  // FERRAMENTAS DA LISTA (MENU SUSPENSO)
  // ==========================================
  const [isListToolsOpen, setIsListToolsOpen] = useState(false);
  const listToolsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (listToolsRef.current && !listToolsRef.current.contains(e.target as Node)) {
        setIsListToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ==========================================
  // PAGINAÇÃO DA TABELA (10, 20, 50 ITENS)
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ==========================================
  // MODAIS DAS 8 AÇÕES POR LINHA
  // ==========================================
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<Asset | null>(null);

  const [isRegisterMaintenanceOpen, setIsRegisterMaintenanceOpen] = useState(false);
  const [selectedMaintenanceAsset, setSelectedMaintenanceAsset] = useState<Asset | null>(null);

  const [isUpdateMeterOpen, setIsUpdateMeterOpen] = useState(false);
  const [selectedMeterAsset, setSelectedMeterAsset] = useState<Asset | null>(null);

  const [isMaintenanceHistoryOpen, setIsMaintenanceHistoryOpen] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<Asset | null>(null);

  // Permissão de acesso exclusivo a Ferramentas da Lista e Menu de Ações
  const canAccessListTools = user?.role === 'tenant_admin' || user?.role === 'supervisor' || user?.role === 'super_admin';
  const canAccessActionMenu = user?.role === 'tenant_admin' || user?.role === 'supervisor' || user?.role === 'super_admin';

  // Dropdown de Ações por Linha via Portal (Camada Superior z-[9999] conforme padrão do Inventário)
  const [activeAssetForMenu, setActiveAssetForMenu] = useState<Asset | null>(null);
  const [assetMenuPosition, setAssetMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const handleToggleAssetMenu = (e: React.MouseEvent<HTMLButtonElement>, asset: Asset) => {
    e.stopPropagation();
    if (activeAssetForMenu?.id === asset.id) {
      setActiveAssetForMenu(null);
      setAssetMenuPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUpward ? rect.top - menuHeight : rect.bottom + 4;
    const left = Math.max(10, rect.right - menuWidth);

    setActiveAssetForMenu(asset);
    setAssetMenuPosition({ top, left });
  };

  useEffect(() => {
    if (!activeAssetForMenu) return;
    const handleScrollOrResize = () => {
      setActiveAssetForMenu(null);
      setAssetMenuPosition(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeAssetForMenu]);

  // Toasts / Feedbacks
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Referência para renderização do QR Code
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Referência para o input de ficheiro de documentos adicionais
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================
  // ESTADOS PARA IMPORTAÇÃO EM LOTE (BATCH CSV)
  // ==========================================
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchDragActive, setBatchDragActive] = useState(false);
  const [parsedBatchData, setParsedBatchData] = useState<any[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================
  // ESTADO DO FORMULÁRIO DE ATIVOS (7 ABAS)
  // ==========================================
  const [activeTab, setActiveTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>(() => createInitialAssetFormData(domain, categories));
  const [maintenancePlans, setMaintenancePlans] = useState<{ id: string; title: string }[]>([]);
  const [maintenancePlansError, setMaintenancePlansError] = useState<string | null>(null);
  const selectedCategory = scopeCategories.find((cat) => cat.code === formData.category) ||
    [...FLEET_CATEGORIES, ...PLANT_CATEGORIES].find((cat) => cat.code === formData.category);

  // Lista de Operadores / Motoristas disponíveis no tenant e escopo atual
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  // Etapa 4: Documento Inicial
  const [wizardFile, setWizardFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // QR Code personalizado e Fotografia do Ativo
  const [customQrFile, setCustomQrFile] = useState<File | null>(null);
  const [customQrPreview, setCustomQrPreview] = useState<string | null>(null);
  const [assetPhotoFile, setAssetPhotoFile] = useState<File | null>(null);
  const [assetPhotoPreview, setAssetPhotoPreview] = useState<string | null>(null);

  // Estados de Rascunho (Drafts)
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [isDraftConfirmOpen, setIsDraftConfirmOpen] = useState(false);
  const [assetsViewMode, setAssetsViewMode] = useState<'active' | 'drafts'>('active');
  const [assetDrafts, setAssetDrafts] = useState<DraftItem[]>([]);

  const loadDrafts = () => {
    const list = draftService.getDrafts('assets', user?.tenantId || (user as any)?.tenant_id, user?.id);
    setAssetDrafts(list);
  };

  useEffect(() => {
    loadDrafts();
    const handleDraftsUpdated = (e: any) => {
      if (!e.detail || e.detail.module === 'assets') {
        loadDrafts();
      }
    };
    window.addEventListener('cmms:drafts-updated', handleDraftsUpdated);
    return () => window.removeEventListener('cmms:drafts-updated', handleDraftsUpdated);
  }, [user]);

  const handleResumeDraft = (draft: DraftItem) => {
    setFormData(draft.data);
    setActiveTab(draft.meta?.activeTab || 0);
    setHasRestoredDraft(true);
    setDraftSavedAt(draft.timestamp);
    setModalOpenMode('create');
    setIsModalOpen(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    draftService.deleteDraft('assets', draftId, user?.tenantId || (user as any)?.tenant_id, user?.id);
    loadDrafts();
  };

  // ==========================================
  // ESTADOS DE DOCUMENTAÇÃO ADICIONAL
  // ==========================================
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('tech_sheet');
  const [docTitle, setDocTitle] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // ==========================================
  // BUSCA DE DADOS
  // ==========================================
  const fetchAssets = async (force: boolean | unknown = false) => {
    const isForce = force === true;
    if (isForce) {
      dataCache.invalidate('assets_list');
    }
    if (!dataCache.has('assets_list') || isForce) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await api.get('/assets');
      const aData = Array.isArray(res.data) ? res.data : (res.data?.assets || res.data?.data || []);
      setAssets(aData);
      dataCache.set('assets_list', aData);
    } catch (err: any) {
      console.error('Erro ao buscar ativos:', err);
      if (err.response?.status === 403) {
        setError('Acesso ao módulo não autorizado ou sessão expirada. Por favor, termine a sessão e entre novamente.');
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          'Falha na comunicação com a API de ativos.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCombinations = async () => {
    setLoadingCombinations(true);
    setCombinationError(null);
    try {
      const response = await api.get('/fleet-combinations');
      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data?.combinations || data?.fleetCombinations || data?.fleet_combinations || data?.data?.combinations || data?.data || [];
      setActiveCombinations(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Erro ao carregar conjuntos rodoviários:', err);
      setCombinationError(err.response?.data?.message || err.message || 'Não foi possível carregar os conjuntos rodoviários.');
    } finally {
      setLoadingCombinations(false);
    }
  };

  const handleOpenCombinationsModal = () => {
    setIsCombinationsModalOpen(true);
    setCombTruckId('');
    setCombCode('');
    setCombTrailers([{ trailerId: '', role: 'leader' }]);
    setAllowOperationalOverride(false);
    setOverrideJustification('');
    setCombinationError(null);
    setCombTab('active');
    fetchCombinations();
    setCombinationHistory(combinationService.getHistory(user?.tenantId));
  };

  const handleAddTrailerSlot = () => {
    setCombTrailers((prev) => [
      ...prev,
      { trailerId: '', role: prev.length === 0 ? 'leader' : 'follower' }
    ]);
  };

  const handleRemoveTrailerSlot = (index: number) => {
    setCombTrailers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTrailerSlot = (index: number, field: 'trailerId' | 'role', value: string) => {
    setCombTrailers((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleCreateCombination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combCode.trim() || !combTruckId) {
      setCombinationError('Preencha o identificador do conjunto e selecione o veículo trator.');
      return;
    }

    // Validação de trelas
    const validTrailers = combTrailers.filter((t) => t.trailerId.trim() !== '');
    if (validTrailers.length === 0) {
      setCombinationError('Selecione pelo menos uma trela ou semirreboque para acoplar ao conjunto.');
      return;
    }

    // Impedir selecionar a mesma trela mais de uma vez no mesmo conjunto
    const trailerIds = validTrailers.map((t) => t.trailerId);
    if (new Set(trailerIds).size !== trailerIds.length) {
      setCombinationError('Não é permitido adicionar a mesma trela mais de uma vez no mesmo conjunto.');
      return;
    }

    // REGRA 4: Impedir que o camião trator esteja simultaneamente associado a dois conjuntos ativos
    const truckCheck = combinationService.checkTruckOccupied(combTruckId, activeCombinations);
    if (truckCheck.isOccupied && !allowOperationalOverride) {
      setCombinationError(`O veículo trator já se encontra associado ao conjunto ativo "${truckCheck.activeCombinationCode}". Desassocie-o primeiro ou valide a exceção operacional.`);
      return;
    }

    // REGRA 4: Impedir que a mesma trela esteja simultaneamente associada a dois conjuntos ativos
    for (const t of validTrailers) {
      const trailerCheck = combinationService.checkTrailerOccupied(t.trailerId, activeCombinations);
      if (trailerCheck.isOccupied && !allowOperationalOverride) {
        const trailerAsset = assets.find((a) => a.id === t.trailerId);
        const tag = trailerAsset?.code_tag || trailerAsset?.codeTag || 'Trela';
        setCombinationError(`A trela [${tag}] já está associada ao conjunto ativo "${trailerCheck.activeCombinationCode}". É proibido associar a mesma trela a dois conjuntos em simultâneo. Desassocie-a primeiro ou valide a exceção operacional.`);
        return;
      }
    }

    // Se houver exceção, justificação é obrigatória
    if (allowOperationalOverride && !overrideJustification.trim()) {
      setCombinationError('Para autorizar a transferência de ativos com exceção operacional, deve preencher a justificação formal obrigatória.');
      return;
    }

    setSubmittingCombination(true);
    setCombinationError(null);

    const leaderSlot = validTrailers.find((t) => t.role === 'leader') || validTrailers[0];
    const followerSlot = validTrailers.find((t) => t.role === 'follower');

    try {
      await api.post('/fleet-combinations', {
        combination_code: combCode.trim(),
        truck_id: combTruckId,
        leader_trailer_id: leaderSlot?.trailerId || undefined,
        follower_trailer_id: followerSlot?.trailerId || undefined,
        trailers: validTrailers.map((t, idx) => ({
          trailer_id: t.trailerId,
          role: t.role,
          order: idx + 1
        })),
        override_applied: allowOperationalOverride,
        override_justification: allowOperationalOverride ? overrideJustification.trim() : undefined
      });

      // REGRA 3: Registar auditoria de associação no histórico persistente com data, hora e utilizador
      combinationService.logEvent(user?.tenantId, {
        action: 'association',
        combinationCode: combCode.trim(),
        truckId: combTruckId,
        truckCodeTag: assets.find((a) => a.id === combTruckId)?.code_tag,
        truckName: assets.find((a) => a.id === combTruckId)?.name,
        trailers: validTrailers.map((t) => {
          const match = assets.find((a) => a.id === t.trailerId);
          return {
            id: t.trailerId,
            codeTag: match?.code_tag || match?.codeTag,
            name: match?.name,
            role: t.role,
            roleLabel: combinationService.getRoleLabel(t.role)
          };
        }),
        performedByUserId: user?.id,
        performedByUserName: user?.fullName || user?.email || 'Utilizador Responsável',
        performedByUserEmail: user?.email,
        reason: allowOperationalOverride ? `Exceção operacional validada: ${overrideJustification.trim()}` : undefined
      });

      setCombCode('');
      setCombTruckId('');
      setCombTrailers([{ trailerId: '', role: 'leader' }]);
      setAllowOperationalOverride(false);
      setOverrideJustification('');
      await fetchCombinations();
      setCombinationHistory(combinationService.getHistory(user?.tenantId));
      setCombTab('active');
      setSuccessMessage('Conjunto rodoviário criado e registado no histórico com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao criar conjunto rodoviário:', err);
      setCombinationError(err.response?.data?.message || err.message || 'Não foi possível criar o conjunto rodoviário.');
    } finally {
      setSubmittingCombination(false);
    }
  };

  const handleTerminateCombination = async (combinationId: string, combObj?: any) => {
    try {
      await api.patch(`/fleet-combinations/${combinationId}/terminate`);

      // REGRA 3: Registar desassociação no histórico de auditoria com data, hora e utilizador
      const comb = combObj || activeCombinations.find((c) => c.id === combinationId);
      const code = comb?.combination_code || comb?.combinationCode || 'CONJ';
      const truckId = comb?.truck_id || comb?.truckId || comb?.tractor_id;
      const leaderId = comb?.leader_trailer_id || comb?.leaderTrailerId;
      const followerId = comb?.follower_trailer_id || comb?.followerTrailerId;

      combinationService.logEvent(user?.tenantId, {
        action: 'disassociation',
        combinationId,
        combinationCode: code,
        truckId: truckId || '',
        truckCodeTag: assets.find((a) => a.id === truckId)?.code_tag,
        truckName: assets.find((a) => a.id === truckId)?.name,
        trailers: [
          ...(leaderId ? [{
            id: leaderId,
            codeTag: assets.find((a) => a.id === leaderId)?.code_tag,
            name: assets.find((a) => a.id === leaderId)?.name,
            role: 'leader' as TrailerRole,
            roleLabel: 'Líder (Leader)'
          }] : []),
          ...(followerId ? [{
            id: followerId,
            codeTag: assets.find((a) => a.id === followerId)?.code_tag,
            name: assets.find((a) => a.id === followerId)?.name,
            role: 'follower' as TrailerRole,
            roleLabel: 'Seguidora (Follower)'
          }] : [])
        ],
        performedByUserId: user?.id,
        performedByUserName: user?.fullName || user?.email || 'Utilizador Responsável',
        performedByUserEmail: user?.email,
        reason: 'Desassociação de conjunto operacional'
      });

      setActiveCombinations((previous) => previous.filter((combination) => combination.id !== combinationId));
      setCombinationHistory(combinationService.getHistory(user?.tenantId));
      setSuccessMessage(`Conjunto ${code} desassociado e registado no histórico com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao desassociar conjunto:', err);
      setCombinationError(err.response?.data?.message || err.message || 'Não foi possível desassociar o conjunto.');
    }
  };

  useEffect(() => {
    if (!dataCache.has('assets_list')) {
      fetchAssets();
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    let isCurrent = true;
    const fetchMaintenancePlans = async () => {
      setMaintenancePlansError(null);
      try {
        const response = await api.get('/maintenance-plans');
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.plans || response.data?.data || [];
        if (isCurrent) {
          setMaintenancePlans(data.map((plan: { id: string; title?: string }) => ({
            id: plan.id,
            title: plan.title || plan.id
          })));
        }
      } catch (err: any) {
        console.error('Erro ao carregar planos de manutenção:', err);
        if (isCurrent) {
          setMaintenancePlansError(err.response?.data?.message || err.message || 'Não foi possível carregar os planos de manutenção.');
        }
      }
    };

    fetchMaintenancePlans();

    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      setDriversError(null);
      try {
        const response = await api.get('/users', {
          params: {
            role: 'driver_operator'
          }
        });
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.users || response.data?.data || [];
        if (isCurrent) {
          setDrivers(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        console.error('Erro ao carregar operadores/motoristas:', err);
        if (isCurrent) {
          setDriversError(err.response?.data?.error || err.response?.data?.message || err.message || 'Não foi possível carregar a lista de operadores/motoristas.');
        }
      } finally {
        if (isCurrent) {
          setLoadingDrivers(false);
        }
      }
    };

    fetchDrivers();

    return () => {
      isCurrent = false;
    };
  }, [isModalOpen, domain]);

  // ==========================================
  // CARREGAR DOCUMENTOS DE UM ATIVO
  // ==========================================
  const loadDocuments = async (assetId: string) => {
    setDocLoading(true);
    try {
      const response = await api.get(`/assets/${assetId}/documents`);
      const docs = response.data?.documents || response.data || [];
      setDocuments(docs);
    } catch (err) {
      console.error('Erro ao obter documentos:', err);
    } finally {
      setDocLoading(false);
    }
  };

  // ==========================================
  // GERAÇÃO DE QR CODE (CANVAS)
  // ==========================================
  useEffect(() => {
    if (isQrModalOpen && selectedQrAsset && qrCanvasRef.current) {
      const valueToEncode = selectedQrAsset.qr_code || selectedQrAsset.qrCode || selectedQrAsset.id;
      QRCode.toCanvas(
        qrCanvasRef.current,
        valueToEncode,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#0f172a', // slate-900
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('Erro ao gerar QR Code:', err);
        }
      );
    }
  }, [isQrModalOpen, selectedQrAsset]);

  // Download do QR Code como PNG
  const handleDownloadQrCode = () => {
    if (qrCanvasRef.current && selectedQrAsset) {
      const url = qrCanvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode_ativo_${selectedQrAsset.code_tag || selectedQrAsset.id}.png`;
      link.click();
    }
  };

  // Imprimir Etiqueta
  const handlePrintLabel = () => {
    window.print();
  };

  // ==========================================
  // MANIPULAÇÃO DE ARQUIVOS (DRAG & DROP)
  // ==========================================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size <= 20 * 1024 * 1024) {
        setWizardFile(file);
      } else {
        alert('Tamanho limite de ficheiro excedido (máximo 20MB).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size <= 20 * 1024 * 1024) {
        setWizardFile(file);
      } else {
        alert('Tamanho limite de ficheiro excedido (máximo 20MB).');
      }
    }
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const updateFormField = <K extends keyof AssetFormData>(field: K, value: AssetFormData[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const updateTechnicalSpec = (field: keyof AssetFormData['technical_specs'], value: string) => {
    setFormData((previous) => ({
      ...previous,
      energy_type: field === 'fuel' ? value : previous.energy_type,
      technical_specs: { ...previous.technical_specs, [field]: value }
    }));
  };

  const updateSafetyCheck = (field: keyof AssetFormData['safety_checks'], value: string) => {
    setFormData((previous) => ({
      ...previous,
      safety_checks: { ...previous.safety_checks, [field]: value }
    }));
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        showAlert({ title: 'Ficheiro demasiado grande', message: 'A fotografia deve ter no máximo 15 MB.', type: 'warning' });
        return;
      }
      setAssetPhotoFile(file);
      const localPreview = URL.createObjectURL(file);
      setAssetPhotoPreview(localPreview);

      setUploadingPhoto(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('photo', file);
        const res = await api.post('/notifications/maintenance/upload-photo', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          updateFormField('photo_url', res.data.url);
        }
      } catch (err: any) {
        console.warn('Upload imediato para o storage falhou, ficheiro mantido localmente:', err);
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  // Regra de progressão obrigatória: verifica se todos os campos obrigatórios do passo atual estão preenchidos
  const isStepValid = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      const hasCategory = Boolean(formData.category?.trim());
      const hasType = Boolean(formData.asset_type?.trim()) && (formData.asset_type !== 'Outro tipo (especificar)' || Boolean(formData.custom_asset_type?.trim()));
      const hasPlate = Boolean(formData.license_plate?.trim());
      const hasStatus = Boolean(formData.status?.trim());
      const hasCriticality = Boolean(formData.criticality_level?.trim());
      return hasCategory && hasType && hasPlate && hasStatus && hasCriticality;
    }
    if (stepIndex === 1) {
      return Boolean(formData.brand?.trim() && formData.model?.trim());
    }
    return true;
  };

  const handleNextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isStepValid(activeTab)) {
      if (activeTab === 0) {
        showAlert({
          title: 'Campos Obrigatórios Pendentes',
          message: 'Preencha todos os campos obrigatórios do Passo 1: Categoria, Tipo de ativo, Placa/Identificação, Estado e Criticidade.',
          type: 'warning'
        });
      } else if (activeTab === 1) {
        showAlert({
          title: 'Campos Obrigatórios Pendentes',
          message: 'Preencha todos os campos obrigatórios do Passo 2: Fabricante / Marca e Modelo / Versão.',
          type: 'warning'
        });
      }
      return;
    }
    setActiveTab((tab) => Math.min(6, tab + 1));
  };

  const handleStepClick = (targetIndex: number) => {
    if (targetIndex > activeTab) {
      for (let i = activeTab; i < targetIndex; i++) {
        if (!isStepValid(i)) {
          if (i === 0) {
            showAlert({ title: 'Passo 1 Incompleto', message: 'Preencha os campos obrigatórios da Identificação antes de avançar.', type: 'warning' });
          } else if (i === 1) {
            showAlert({ title: 'Passo 2 Incompleto', message: 'Preencha os campos obrigatórios do Fabricante antes de avançar.', type: 'warning' });
          }
          return;
        }
      }
    }
    setActiveTab(targetIndex);
  };

  const validateForm = (): boolean => {
    // Passo 1 – Identificação e dados gerais
    if (!formData.category?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'A Categoria / Grupo do equipamento é obrigatória.', type: 'warning' });
      return false;
    }
    if (!formData.asset_type?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'O Tipo de ativo é obrigatório.', type: 'warning' });
      return false;
    }
    if (formData.asset_type === 'Outro tipo (especificar)' && !formData.custom_asset_type?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'Por favor, especifique o Tipo de ativo.', type: 'warning' });
      return false;
    }
    if (!formData.license_plate?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'A Placa / Identificação é obrigatória.', type: 'warning' });
      return false;
    }
    if (!formData.status?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'O Estado do equipamento é obrigatório.', type: 'warning' });
      return false;
    }
    if (!formData.criticality_level?.trim()) {
      setActiveTab(0);
      showAlert({ title: 'Campo Obrigatório', message: 'A Criticidade do equipamento é obrigatória.', type: 'warning' });
      return false;
    }

    // Passo 2 – Identificação do fabricante
    if (!formData.brand?.trim()) {
      setActiveTab(1);
      showAlert({ title: 'Campo Obrigatório', message: 'O Fabricante / Marca é obrigatório.', type: 'warning' });
      return false;
    }
    if (!formData.model?.trim()) {
      setActiveTab(1);
      showAlert({ title: 'Campo Obrigatório', message: 'O Modelo / Versão é obrigatório.', type: 'warning' });
      return false;
    }

    return true;
  };

  const handleCategoryChange = (nextCategory: string) => {
    const isPlant = isPlantCategoryCode(nextCategory);
    setFormData((previous) => ({
      ...previous,
      category: nextCategory,
      asset_type: '',
      custom_asset_type: '',
      asset_subtype: '',
      custom_asset_subtype: '',
      measurement_unit: isPlant ? 'Horas' : (previous.measurement_unit || 'Km'),
      meter_unit: isPlant ? 'Horas' : (previous.meter_unit || 'Km')
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const isVehicle = domain === 'fleet';
    const meterKind = isVehicle ? 'odometer_km' : 'hourmeter_hours';

    // ---------------------------------------------------------------
    // Validações/normalizações locais para não enviar dados que o
    // backend rejeita (400) ou que se perderiam em silêncio (NaN, etc).
    // ---------------------------------------------------------------
    // Eixos: backend exige inteiro >= 1 (ou ausente).
    const axleConfigRaw = toFiniteNumber(formData.axle_config);
    const axleConfig = axleConfigRaw !== undefined && Number.isInteger(axleConfigRaw) && axleConfigRaw >= 1
      ? axleConfigRaw
      : undefined;
    // Ano de fabrico: backend exige inteiro (ou ausente).
    const manufactureYearRaw = toFiniteNumber(formData.manufacture_year);
    const manufactureYear = manufactureYearRaw !== undefined && manufactureYearRaw >= 0
      ? Math.trunc(manufactureYearRaw)
      : undefined;
    // Capacidade do tanque e potência: números >= 0 (ou ausentes).
    const tankCapacityRaw = toFiniteNumber(formData.technical_specs.tank_capacity);
    const fuelTankCapacityLiters = tankCapacityRaw !== undefined && tankCapacityRaw >= 0
      ? tankCapacityRaw
      : undefined;
    const powerKwKvaRaw = toFiniteNumber(formData.power_kw_kva);
    const powerKwKva = powerKwKvaRaw !== undefined && powerKwKvaRaw >= 0 ? powerKwKvaRaw : undefined;
    // Valor de aquisição: backend exige número >= 0 (ou ausente).
    const acquisitionValueRaw = toFiniteNumber(formData.acquisition_value);
    const acquisitionValue = acquisitionValueRaw !== undefined && acquisitionValueRaw >= 0
      ? acquisitionValueRaw
      : undefined;
    // Contadores: backend exige número >= 0 (default 0).
    const initialMeter = Math.max(0, toFiniteNumber(formData.initial_meter) ?? 0);
    const currentMeter = Math.max(0, toFiniteNumber(formData.current_meter) ?? 0);
    // Estado: o backend só aceita operational | under_maintenance | breakdown | decommissioned.
    const status = formData.status === 'maintenance'
      ? 'under_maintenance'
      : formData.status || (modalMode === 'create' ? 'operational' : undefined);

    const finalAssetType = formData.asset_type === 'Outro tipo (especificar)' && formData.custom_asset_type?.trim()
      ? formData.custom_asset_type.trim()
      : formData.asset_type;

    const finalAssetSubtype = formData.asset_subtype === 'Outro (especificar)' && formData.custom_asset_subtype?.trim()
      ? formData.custom_asset_subtype.trim()
      : formData.asset_subtype;

    const effectiveDomain = isPlantCategoryCode(formData.category) ? 'plant' : 'fleet';
    const computedName = formData.name.trim() || `${formData.brand.trim()} ${formData.model.trim()}`.trim() || formData.license_plate.trim();

    const payload = {
      ...formData,
      domain: effectiveDomain,
      category: modalMode === 'create' ? toBackendCategory(formData.category, effectiveDomain) : undefined,
      code_tag: formData.code_tag.trim(),
      codeTag: formData.code_tag.trim(),
      name: computedName,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      license_plate: formData.license_plate.trim(),
      licensePlate: formData.license_plate.trim(),
      company: formData.company.trim() || undefined,
      department: formData.department.trim() || undefined,
      location: formData.location.trim() || undefined,
      cost_center: formData.cost_center.trim() || undefined,
      costCenter: formData.cost_center.trim() || undefined,
      responsible: formData.responsible.trim() || undefined,
      operator_name: formData.operator_driver || undefined,
      operatorName: formData.operator_driver || undefined,
      qr_code: formData.qr_code.trim() || undefined,
      photo_url: formData.photo_url || undefined,
      notes: formData.notes.trim() || undefined,
      asset_type: finalAssetType || undefined,
      assetType: finalAssetType || undefined,
      asset_subtype: finalAssetSubtype || undefined,
      assetSubtype: finalAssetSubtype || undefined,
      energy_type: formData.energy_type || formData.technical_specs?.fuel || 'Diesel',
      energyType: formData.energy_type || formData.technical_specs?.fuel || 'Diesel',
      ownership_type: formData.ownership_type,
      ownershipType: formData.ownership_type,
      axle_config: axleConfig,
      axleConfig,
      criticality_level: formData.criticality_level,
      criticalityLevel: formData.criticality_level,
      manufacture_year: manufactureYear,
      manufactureYear,
      meter_kind: effectiveDomain === 'plant' ? 'hourmeter_hours' : 'odometer_km',
      meterKind: effectiveDomain === 'plant' ? 'hourmeter_hours' : 'odometer_km',
      initial_meter: initialMeter,
      initialMeter,
      current_meter: currentMeter,
      currentMeter,
      initial_km: toFiniteNumber(formData.initial_km) ?? 0,
      initial_hour_meter: toFiniteNumber(formData.initial_hour_meter) ?? 0,
      measurement_unit: formData.measurement_unit || formData.meter_unit || (effectiveDomain === 'plant' ? 'Horas' : 'Km'),
      measurementUnit: formData.measurement_unit || formData.meter_unit || (effectiveDomain === 'plant' ? 'Horas' : 'Km'),
      meter_unit: formData.meter_unit || formData.measurement_unit || (effectiveDomain === 'plant' ? 'Horas' : 'Km'),
      meterUnit: formData.meter_unit || formData.measurement_unit || (effectiveDomain === 'plant' ? 'Horas' : 'Km'),
      operational_shift: formData.shift || undefined,
      operationalShift: formData.shift || undefined,
      last_reading_date: formData.last_reading_date || undefined,
      expected_operating_hours: toFiniteNumber(formData.expected_operating_hours),
      acquisition_date: formData.acquisition_date || undefined,
      operation_date: formData.operation_date || undefined,
      operation_start_date: formData.operation_date || undefined,
      operationStartDate: formData.operation_date || undefined,
      acquisition_value: acquisitionValue,
      acquisitionValue,
      currency: formData.currency || 'MZN',
      supplier: formData.supplier || undefined,
      local_supplier_name: formData.supplier || undefined,
      warranty_expiry: formData.warranty_expiry || undefined,
      insurance_company: formData.insurance_company || undefined,
      insurance_policy_number: formData.insurance_policy_number || undefined,
      insurance_expiry: formData.insurance_expiry || undefined,
      inspection_expiry: formData.inspection_expiry || undefined,
      inatro_inspection_expiry: effectiveDomain === 'fleet' ? formData.inspection_expiry || undefined : undefined,
      innoq_calibration_expiry: effectiveDomain === 'plant' ? formData.inspection_expiry || undefined : undefined,
      maintenance_plan_id: formData.maintenance_plan_id || undefined,
      maintenance_type: formData.maintenance_type || undefined,
      maintenance_periodicity: formData.maintenance_periodicity || undefined,
      last_maintenance_date: formData.last_maintenance_date || undefined,
      last_maintenance_meter: toFiniteNumber(formData.last_maintenance_meter),
      next_maintenance_date: formData.next_maintenance_date || undefined,
      next_maintenance_meter: toFiniteNumber(formData.next_maintenance_meter),
      maintenance_notes: formData.maintenance_notes || undefined,
      color_config: formData.color || undefined,
      chassis_vin: formData.chassis_vin.trim() || undefined,
      chassisVin: formData.chassis_vin.trim() || undefined,
      engine_number: formData.engine_number.trim() || undefined,
      engineNumber: formData.engine_number.trim() || undefined,
      fuel_tank_capacity_liters: fuelTankCapacityLiters,
      fuelTankCapacityLiters,
      plant_sector: formData.plant_sector.trim() || formData.location.trim() || undefined,
      plantSector: formData.plant_sector.trim() || formData.location.trim() || undefined,
      voltage_specs: formData.voltage_specs.trim() || undefined,
      voltageSpecs: formData.voltage_specs.trim() || undefined,
      power_kw_kva: powerKwKva,
      powerKwKva,
      status,
      technical_specs: formData.technical_specs,
      safety_checks: formData.safety_checks
    };

    try {
      let assetId = '';
      if (modalMode === 'create') {
        const res = await api.post('/assets', payload);
        const createdAsset = res.data?.asset || res.data?.data || res.data;
        assetId = createdAsset?.id;

        if (assetId && wizardFile) {
          const documentFormData = new FormData();
          documentFormData.append('file', wizardFile);
          documentFormData.append('documentType', 'tech_sheet');
          documentFormData.append('document_type', 'tech_sheet');
          documentFormData.append('title', wizardFile.name || 'Ficha Técnica Inicial');
          documentFormData.append('name', wizardFile.name || 'Ficha Técnica Inicial');

          try {
            await api.post(`/assets/${assetId}/documents`, documentFormData);
            showAlert({
              title: 'Ativo Cadastrado',
              message: 'Ativo cadastrado com sucesso no CMMS e ficha técnica inicial anexada!',
              type: 'success',
            });
          } catch (docErr) {
            console.error('Falha ao enviar documento inicial:', docErr);
            const docErrorMessage = getApiErrorMessage(docErr, 'Upload da ficha técnica não concluído.');
            showAlert({
              title: 'Ativo Criado (Ficha Pendente)',
              message: `Ativo cadastrado com sucesso! No entanto, o envio da ficha técnica inicial não foi concluído (${docErrorMessage}). Você pode reenviar o documento na lista de ativos a qualquer momento.`,
              type: 'warning',
            });
          }
        }

        // Upload de QR Code personalizado (se fornecido pelo utilizador)
        if (assetId && customQrFile) {
          try {
            const qrFormData = new FormData();
            qrFormData.append('file', customQrFile);
            qrFormData.append('documentType', 'qr_code');
            qrFormData.append('document_type', 'qr_code');
            qrFormData.append('title', 'QR Code / Etiqueta');
            qrFormData.append('name', customQrFile.name || 'qrcode.png');
            await api.post(`/assets/${assetId}/documents`, qrFormData);
          } catch (qrErr) {
            console.warn('Erro ao anexar QR code personalizado:', qrErr);
          }
        }

        // Upload da fotografia do ativo (se capturada ou carregada)
        if (assetId && assetPhotoFile) {
          try {
            const photoFormData = new FormData();
            photoFormData.append('file', assetPhotoFile);
            photoFormData.append('documentType', 'asset_photo');
            photoFormData.append('document_type', 'asset_photo');
            photoFormData.append('title', 'Fotografia do Ativo');
            photoFormData.append('name', assetPhotoFile.name || 'fotografia.jpg');
            await api.post(`/assets/${assetId}/documents`, photoFormData);
          } catch (photoErr) {
            console.warn('Erro ao anexar fotografia do ativo:', photoErr);
          }
        }

        showAlert({
          title: 'Ativo Cadastrado',
          message: 'Ativo cadastrado com sucesso no CMMS!',
          type: 'success',
        });
        setSuccessMessage('Ativo cadastrado com sucesso no CMMS!');
      } else {
        await api.put(`/assets/${editingAssetId}`, payload);
        showAlert({
          title: 'Ativo Atualizado',
          message: 'Dados do ativo corporativo atualizados com sucesso!',
          type: 'success',
        });
        setSuccessMessage('Dados do Ativo atualizados com sucesso!');
      }

      // Limpar rascunho persistido após submissão com sucesso
      draftService.clearDraft('assets', user?.tenantId || (user as any)?.tenant_id, user?.id);
      setIsModalOpen(false);
      resetWizardForm();
      await fetchAssets(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar ativo:', err);
      showAlert({
        title: 'Erro ao Salvar Ativo',
        message: getApiErrorMessage(err, 'Erro ao guardar dados do ativo.'),
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizardForm = () => {
    setActiveTab(0);
    setFormData(createInitialAssetFormData(domain, categories));
    setWizardFile(null);
    setIsDragActive(false);
    setEditingAssetId(null);
    setCustomQrFile(null);
    setCustomQrPreview(null);
    setAssetPhotoFile(null);
    setAssetPhotoPreview(null);
    setHasRestoredDraft(false);
    setDraftSavedAt(null);
  };

  const handleCustomQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomQrFile(file);
      setCustomQrPreview(URL.createObjectURL(file));
    }
  };

  const handleAssetPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssetPhotoFile(file);
      setAssetPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenCreateModal = () => {
    // Verificar se existe rascunho previamente salvo
    const draft = draftService.getDraft<AssetFormData>('assets', user?.tenantId || (user as any)?.tenant_id, user?.id);
    if (draft && draft.data) {
      setFormData(draft.data);
      setActiveTab(draft.meta?.activeTab || 0);
      setHasRestoredDraft(true);
      setDraftSavedAt(draft.timestamp);
    } else {
      resetWizardForm();
      setActiveTab(0);
      setHasRestoredDraft(false);
      setDraftSavedAt(null);
    }
    setCustomQrFile(null);
    setCustomQrPreview(null);
    setAssetPhotoFile(null);
    setAssetPhotoPreview(null);
    setModalOpenMode('create');
    setIsModalOpen(true);
  };

  const handleRequestCloseModal = () => {
    if (modalMode === 'edit') {
      setIsModalOpen(false);
      resetWizardForm();
      return;
    }

    const hasContent = draftService.hasMeaningfulContent(formData, [
      'category',
      'status',
      'criticality_level',
      'currency',
      'energy_type',
      'ownership_type',
      'meter_unit',
      'manufacture_year',
      'initial_meter',
      'current_meter'
    ]) || !!customQrFile || !!assetPhotoFile || !!wizardFile;

    if (hasContent) {
      setIsDraftConfirmOpen(true);
    } else {
      setIsModalOpen(false);
      resetWizardForm();
    }
  };

  const handleSaveDraft = () => {
    const title = formData.name?.trim() || formData.code_tag?.trim() || formData.license_plate?.trim() || 'Novo Ativo';
    const subtitle = [formData.brand, formData.model, formData.category].filter(Boolean).join(' · ');
    draftService.saveDraft('assets', formData, user?.tenantId || (user as any)?.tenant_id, user?.id, { title, subtitle, activeTab });
    setIsDraftConfirmOpen(false);
    setIsModalOpen(false);
    resetWizardForm();
    loadDrafts();
    showAlert({
      title: 'Rascunho Guardado',
      message: 'O rascunho do ativo foi guardado na lista de rascunhos. Poderá consultá-lo filtrando por "Rascunhos" a qualquer momento.',
      type: 'success'
    });
  };

  const handleDiscardDraft = () => {
    draftService.clearDraft('assets', user?.tenantId || (user as any)?.tenant_id, user?.id);
    setIsDraftConfirmOpen(false);
    setIsModalOpen(false);
    resetWizardForm();
    loadDrafts();
  };

  const handleDiscardRestoredDraft = () => {
    draftService.clearDraft('assets', user?.tenantId || (user as any)?.tenant_id, user?.id);
    resetWizardForm();
    loadDrafts();
    showAlert({
      title: 'Rascunho Eliminado',
      message: 'O rascunho foi descartado e o formulário limpo.',
      type: 'info'
    });
  };

  // Ativação da tecla ESC no modal de ativos com salvaguarda de rascunhos
  useEscapeKey(handleRequestCloseModal, isModalOpen && !isDraftConfirmOpen);
  useEscapeKey(() => setIsDraftConfirmOpen(false), isDraftConfirmOpen);

  const handleOpenEditModal = (asset: Asset) => {
    resetWizardForm();
    setModalOpenMode('edit');
    setEditingAssetId(asset.id);

    const assetData = asset as unknown as Record<string, unknown>;
    const read = (...keys: string[]): string => {
      const value = keys.map((key) => assetData[key]).find((item) => item !== undefined && item !== null);
      return value === undefined ? '' : String(value);
    };

    const initialCategory = asset.category || (domain === 'plant' ? PLANT_CATEGORIES[0].code : FLEET_CATEGORIES[0].code);
    const initialData = createInitialAssetFormData(domain, categories);
    const technicalSpecs = (assetData.technical_specs || {}) as Record<string, any>;
    const safetyChecks = (assetData.safety_checks || {}) as Record<string, any>;
    const currentAssetType = read('asset_type', 'assetType');
    const currentAssetSubtype = read('asset_subtype', 'assetSubtype');

    setFormData({
      ...initialData,
      category: initialCategory,
      asset_type: currentAssetType,
      custom_asset_type: '',
      asset_subtype: currentAssetSubtype,
      custom_asset_subtype: '',
      code_tag: read('code_tag', 'codeTag', 'equipment_code', 'equipmentCode'),
      license_plate: read('license_plate', 'licensePlate'),
      name: asset.name || '',
      company: read('company'),
      department: read('department'),
      location: read('location', 'plant_sector', 'plantSector'),
      cost_center: read('cost_center', 'costCenter'),
      status: read('status') || 'operational',
      criticality_level: read('criticality_level', 'criticalityLevel', 'criticality') || 'B',
      responsible: read('responsible'),
      operator_driver: read('operator_driver', 'operatorDriver', 'operator_name', 'operatorName'),
      qr_code: read('qr_code', 'qrCode'),
      photo_url: read('photo_url', 'photoUrl'),
      notes: read('notes', 'observations'),

      // Passo 2
      brand: asset.brand || read('manufacturer'),
      model: asset.model || read('model_version', 'modelVersion'),
      manufacture_year: read('manufacture_year', 'manufactureYear') || initialData.manufacture_year,
      serial_number: read('serial_number', 'serialNumber'),
      chassis_vin: read('chassis_vin', 'chassisVin', 'chassis_number', 'chassisNumber'),
      engine_number: read('engine_number', 'engineNumber'),
      color: read('color', 'color_config', 'colorConfig'),

      // Passo 3
      energy_type: read('energy_type', 'energyType') || technicalSpecs?.fuel || 'Diesel',
      ownership_type: read('ownership_type', 'ownershipType') || 'Próprio',
      axle_config: read('axle_config', 'axleConfig'),
      plant_sector: read('plant_sector', 'plantSector'),
      voltage_specs: read('voltage_specs', 'voltageSpecs'),
      power_kw_kva: read('power_kw_kva', 'powerKwKva') || technicalSpecs?.power || '',
      fuel_tank_capacity_liters: read('fuel_tank_capacity_liters', 'fuelTankCapacityLiters') || technicalSpecs?.tank_capacity || '',
      technical_specs: {
        engine_type: read('engine_type', 'engineType') || technicalSpecs?.engine_type || '',
        power: read('power_kw_kva', 'powerKwKva') || technicalSpecs?.power || '',
        fuel: technicalSpecs?.fuel || read('energy_type', 'energyType') || 'Diesel',
        transmission: technicalSpecs?.transmission || '',
        traction: technicalSpecs?.traction || '',
        axles: read('axle_config', 'axleConfig') || technicalSpecs?.axles || '',
        weight_load: technicalSpecs?.weight_load || '',
        payload_capacity: technicalSpecs?.payload_capacity || '',
        tank_capacity: read('fuel_tank_capacity_liters', 'fuelTankCapacityLiters') || technicalSpecs?.tank_capacity || '',
        consumption: technicalSpecs?.consumption || '',
        tire_size: technicalSpecs?.tire_size || '',
        dimensions: technicalSpecs?.dimensions || '',
        other_specs: technicalSpecs?.other_specs || ''
      },

      // Passo 4
      initial_km: read('initial_km', 'initialKm') || '0',
      current_km: read('current_km', 'currentKm') || '0',
      initial_hour_meter: read('initial_hour_meter', 'initialHourMeter') || '0',
      current_hour_meter: read('current_hour_meter', 'currentHourMeter') || '0',
      measurement_unit: read('measurement_unit', 'measurementUnit', 'meter_unit', 'meterUnit') || initialData.measurement_unit,
      last_reading_date: read('last_reading_date', 'lastReadingDate', 'last_meter_reading_date'),
      shift: read('shift', 'operational_shift', 'operationalShift'),
      expected_operating_hours: read('expected_operating_hours', 'expectedOperatingHours'),
      initial_meter: read('initial_meter', 'initialMeter') || '0',
      current_meter: read('current_meter', 'currentMeter') || '0',
      meter_unit: read('meter_unit', 'meterUnit', 'measurement_unit', 'measurementUnit') || initialData.meter_unit,
      operational_notes: read('operational_notes', 'operationalNotes'),

      // Passo 5
      acquisition_date: read('acquisition_date', 'acquisitionDate'),
      operation_date: read('operation_date', 'operationDate', 'operation_start_date', 'operationStartDate'),
      acquisition_value: read('acquisition_value', 'acquisitionValue'),
      currency: read('currency') || 'MZN',
      supplier: read('supplier', 'vendor_supplier', 'vendorSupplier', 'local_supplier_name', 'localSupplierName'),
      warranty_expiry: read('warranty_expiry', 'warrantyExpiry', 'warranty_until', 'warrantyUntil'),
      insurance_company: read('insurance_company', 'insuranceCompany'),
      insurance_policy_number: read('insurance_policy_number', 'insurancePolicyNumber'),
      insurance_expiry: read('insurance_expiry', 'insuranceExpiry'),
      inspection_expiry: read('inspection_expiry', 'inatro_inspection_expiry', 'innoq_calibration_expiry', 'inatroInspectionExpiry', 'innoqCalibrationExpiry'),
      licenses_certificates_notes: read('licenses_certificates_notes', 'licensesCertificatesNotes'),

      // Passo 6
      maintenance_plan_id: read('maintenance_plan_id', 'maintenancePlanId'),
      maintenance_type: read('maintenance_type', 'maintenanceType') || 'Preventiva',
      maintenance_periodicity: read('maintenance_periodicity', 'maintenancePeriodicity') || 'Km',
      last_maintenance_date: read('last_maintenance_date', 'lastMaintenanceDate'),
      last_maintenance_meter: read('last_maintenance_meter', 'lastMaintenanceMeter'),
      next_maintenance_date: read('next_maintenance_date', 'nextMaintenanceDate'),
      next_maintenance_meter: read('next_maintenance_meter', 'nextMaintenanceMeter'),
      maintenance_notes: read('maintenance_notes', 'maintenanceNotes'),

      // Passo 7
      safety_checks: {
        extinguisher_validity: read('extinguisher_validity', 'extinguisherValidity') || safetyChecks?.extinguisher_validity || '',
        warning_triangle: read('warning_triangle', 'warningTriangle') || safetyChecks?.warning_triangle || '',
        first_aid_kit: read('first_aid_kit', 'firstAidKit') || safetyChecks?.first_aid_kit || '',
        ppe: read('ppe', 'reflective_vest', 'reflectiveVest') || safetyChecks?.ppe || '',
        safety_devices: read('safety_devices', 'safetyDevices') || safetyChecks?.safety_devices || '',
        general_condition: read('general_condition', 'generalCondition') || safetyChecks?.general_condition || 'Bom',
        safety_observations: read('safety_observations', 'safetyObservations', 'observations') || safetyChecks?.safety_observations || ''
      }
    });

    if (read('photo_url', 'photoUrl')) {
      setAssetPhotoPreview(read('photo_url', 'photoUrl'));
    }

    setIsModalOpen(true);
  };

  // ==========================================
  // ADICIONAR DOCUMENTAÇÃO COMPLEMENTAR
  // ==========================================
  const handleAddAdditionalDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocAsset || !selectedFile || !docTitle.trim()) {
      showAlert({
        title: 'Dados Incompletos',
        message: 'Por favor, preencha o título e selecione um documento para anexar.',
        type: 'warning'
      });
      return;
    }

    setIsUploadingDoc(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', docTitle);
    formData.append('name', docTitle);
    formData.append('documentType', docType);
    formData.append('document_type', docType);

    try {
      await api.post(`/assets/${selectedDocAsset.id}/documents`, formData);
      showAlert({
        title: 'Documento Anexado',
        message: 'Documento anexado com sucesso ao ativo!',
        type: 'success'
      });
      setDocTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocuments(selectedDocAsset.id);
    } catch (err: any) {
      console.error('Erro ao fazer upload do documento:', err);
      showAlert({
        title: 'Erro de Upload',
        message: getApiErrorMessage(err, 'Falha ao fazer upload do documento.'),
        type: 'error'
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // ==========================================
  // SOFT-DELETE (ARQUIVAR ATIVO)
  // ==========================================
  const handleDeleteAsset = async () => {
    if (!deletingAsset) return;
    try {
      await api.delete(`/assets/${deletingAsset.id}`);
      setSuccessMessage(`Ativo "${deletingAsset.code_tag || deletingAsset.codeTag}" arquivado com sucesso.`);
      setIsDeleteModalOpen(false);
      setDeletingAsset(null);
      await fetchAssets(true);
      showAlert({
        title: 'Ativo Arquivado',
        message: `Ativo arquivado com sucesso no sistema.`,
        type: 'success'
      });
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao arquivar ativo:', err);
      showAlert({
        title: 'Erro ao Arquivar',
        message: getApiErrorMessage(err, 'Falha ao arquivar ativo.'),
        type: 'error'
      });
    }
  };

  // ==========================================
  // FUNÇÕES DE IMPORTAÇÃO EM LOTE (CSV)
  // ==========================================
  const handleDownloadCsvTemplate = () => {
    let csvContent = '';
    if (currentScope === 'plant') {
      const plantCat1 = categories.length > 0 ? categories[0].value : 'generator';
      const plantCat2 = categories.length > 1 ? categories[1].value : 'machinery';
      csvContent = `Nome,Categoria,Tag,Fabricante,Modelo,Ano,SetorFabril,Potencia,Voltagem,HorimetroInicial\n` +
        `Gerador de Emergência 250kVA,${plantCat1},G-001,Caterpillar,CAT-250,2022,Subestação Principal,250,380V,1200\n` +
        `Compressor de Ar Comprimido,${plantCat2},C-002,Atlas Copco,GA37,2021,Linha de Produção 1,45,400V,3400`;
    } else {
      const fleetCat1 = categories.length > 0 ? categories[0].value : 'vehicle_light';
      const fleetCat2 = categories.length > 1 ? categories[1].value : 'vehicle_heavy';
      csvContent = `Nome,Categoria,Tag,Marca,Modelo,Ano,Matricula,Chassis,OdometroInicial\n` +
        `Camionete Hilux 2.8 4x4,${fleetCat1},V-001,Toyota,Hilux,2022,ABC-123-MC,CH123456789,15000\n` +
        `Camião Basculante 15T,${fleetCat2},V-002,Volvo,FMX 440,2020,AFG-890-MC,CH987654321,85000`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_ativos_${currentScope || 'general'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvFile = (file: File) => {
    setBatchError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setBatchError('O ficheiro CSV selecionado está vazio.');
        setParsedBatchData([]);
        return;
      }

      const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        setBatchError('O ficheiro CSV deve conter a linha de cabeçalho e pelo menos um registo de ativo.');
        setParsedBatchData([]);
        return;
      }

      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

      const rows: any[] = [];
      let hasEmptyName = false;

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        const values = currentLine.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, string> = {};

        headers.forEach((header, index) => {
          rowObj[header] = values[index] || '';
        });

        const nomeValue = rowObj['Nome'] || rowObj['nome'] || rowObj['NOME'];
        if (!nomeValue || !nomeValue.trim()) {
          hasEmptyName = true;
        }

        rows.push(rowObj);
      }

      if (hasEmptyName) {
        setBatchError('Validação de Dados: Foram encontradas linhas sem o campo "Nome" preenchido. O campo Nome é obrigatório para todos os ativos.');
      }

      setParsedBatchData(rows);
    };

    reader.onerror = () => {
      setBatchError('Falha ao efetuar a leitura do ficheiro CSV.');
    };

    reader.readAsText(file);
  };

  const handleBatchFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setBatchError('Formato inválido. Por favor, carregue um ficheiro no formato CSV (.csv).');
      return;
    }
    setBatchFile(file);
    parseCsvFile(file);
  };

  const handleBatchDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragActive(true);
  };

  const handleBatchDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragActive(false);
  };

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBatchFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleBatchSubmit = async () => {
    if (parsedBatchData.length === 0) {
      setBatchError('Nenhum registo válido encontrado no ficheiro CSV para importar.');
      return;
    }

    const invalidIndex = parsedBatchData.findIndex(
      row => !(row.Nome || row.nome || row.NOME)?.trim()
    );

    if (invalidIndex !== -1) {
      setBatchError(`A linha ${invalidIndex + 1} possui o campo "Nome" em branco. Corrija o ficheiro antes de importar.`);
      return;
    }

    setBatchSubmitting(true);
    setBatchError(null);

    const assetsToImport = parsedBatchData.map((row) => {
      // Categoria normalizada para o conjunto aceite pelo backend (400 "Categoria inválida").
      const rawCategory = String(row.Categoria || row.categoria || '').trim();
      const category = toBackendCategory(rawCategory, domain);
      const isVehicle = currentScope === 'fleet'
        || category === 'vehicle_light'
        || category === 'vehicle_heavy';
      const meterKind = isVehicle ? 'odometer_km' : 'hourmeter_hours';
      // Números saneados: NaN rejeitaria o lote inteiro no backend.
      const manufactureYear = toFiniteNumber(row.Ano) ?? new Date().getFullYear();
      const currentMeter = Math.max(0, toFiniteNumber(
        row.OdometroInicial || row.HorimetroInicial || row.odometroinicial || row.horimetroinicial || row.currentMeter || row.current_meter,
      ) ?? 0);
      const powerKwKva = toFiniteNumber(row.Potencia || row.potencia);

      return {
        name: (row.Nome || row.nome || '').trim(),
        category: category || (isVehicle ? 'vehicle_light' : 'generator'),
        codeTag: (row.Tag || row.tag || row.codeTag || row.code_tag || '').trim() || undefined,
        code_tag: (row.Tag || row.tag || row.codeTag || row.code_tag || '').trim() || undefined,
        brand: (row.Marca || row.marca || row.Fabricante || row.fabricante || '').trim() || undefined,
        model: (row.Modelo || row.modelo || '').trim() || '',
        manufactureYear,
        manufacture_year: manufactureYear,
        costCenter: 'Sede / Geral',
        cost_center: 'Sede / Geral',
        meterKind,
        meter_kind: meterKind,
        currentMeter,
        current_meter: currentMeter,
        licensePlate: (row.Matricula || row.matricula || '').trim() || undefined,
        license_plate: (row.Matricula || row.matricula || '').trim() || undefined,
        chassisVin: (row.Chassis || row.chassis || '').trim() || undefined,
        chassis_vin: (row.Chassis || row.chassis || '').trim() || undefined,
        plantSector: (row.SetorFabril || row.setorfabril || '').trim() || undefined,
        plant_sector: (row.SetorFabril || row.setorfabril || '').trim() || undefined,
        powerKwKva,
        power_kw_kva: powerKwKva,
        voltageSpecs: (row.Voltagem || row.voltagem || '').trim() || undefined,
        voltage_specs: (row.Voltagem || row.voltagem || '').trim() || undefined,
        status: 'operational'
      };
    });

    try {
      const response = await api.post('/assets/bulk', { assets: assetsToImport });

      const count = assetsToImport.length;
      setSuccessMessage(`${count} ${count === 1 ? 'ativo importado' : 'ativos importados'} em lote com sucesso!`);
      
      setIsBatchImportModalOpen(false);
      setBatchFile(null);
      setParsedBatchData([]);
      setBatchError(null);

      await fetchAssets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao importar ativos em lote:', err);
      const errorDetail = err.response?.data?.message || err.response?.data?.error || err.message || 'Falha ao processar a importação em lote dos ativos na API.';
      setBatchError(errorDetail);
    } finally {
      setBatchSubmitting(false);
    }
  };

  // ==========================================
  // AUXILIARES DE RENDERIZAÇÃO
  // ==========================================
  const formatCategory = (cat: string) => {
    return getCleanCategoryName(cat) || cat || 'Não especificado';
  };

  const formatDocType = (type: string) => {
    switch (type) {
      case 'tech_sheet': return 'Ficha Técnica';
      case 'manual': return 'Manual Técnico';
      case 'diagram': return 'Diagrama Elétrico / Mecânico';
      case 'inspection_certificate': return 'Certificado de Inspeção (INATRO/INNOQ)';
      case 'insurance': return 'Apólice de Seguro';
      case 'asset_photo': return 'Fotografia do Ativo';
      default: return type;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Disponível
          </span>
        );
      case 'breakdown':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Avariado
          </span>
        );
      // O backend grava 'under_maintenance' (enum asset_status); 'maintenance'
      // é mantido para exibir corretamente registos legados.
      case 'under_maintenance':
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Em Oficina
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Filtragem dos ativos localmente
  const filteredAssets = assets.filter((asset) => {
    const code = (asset.code_tag || asset.codeTag || '').toLowerCase();
    const assetName = (asset.name || '').toLowerCase();
    const assetModel = (asset.model || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = code.includes(query) || assetName.includes(query) || assetModel.includes(query);
    // Compara sempre a categoria canónica (o backend guarda vehicle_light,
    // vehicle_heavy, machinery, plant_equipment ou generator) com o filtro
    // escolhido na UI (código CAT-xx ou valor canónico).
    const assetDomain = asset.domain || (isPlantCategoryCode(asset.category) ? 'plant' : 'fleet');
    const filterDomain = isPlantCategoryCode(categoryFilter) ? 'plant' : 'fleet';

    const matchesCategory = categoryFilter === 'all'
      || asset.category === categoryFilter
      || (categoryFilter.startsWith('CAT-') || categoryFilter.startsWith('PLANT-')
          ? asset.category === UI_CATEGORY_TO_BACKEND[categoryFilter] && assetDomain === filterDomain
          : assetDomain === filterDomain && toBackendCategory(asset.category, assetDomain) === toBackendCategory(categoryFilter, filterDomain));

    // Regras de isolamento e unificação de escopo operacional
    let matchesScope = true;
    if (user?.role === 'supervisor') {
      // supervisor: visualiza exclusivamente dentro do seu operational_scope atribuído
      if (user.operational_scope === 'mixed' || user.operational_scope === 'both' || !user.operational_scope) {
        matchesScope = true;
      } else {
        matchesScope = asset.domain === user.operational_scope || asset.operational_scope === user.operational_scope;
      }
    } else if (isMixedScope) {
      // Unificação da Vista de Frota e Fábrica: lista todo o material por padrão
      if (scopeFilter === 'fleet') {
        matchesScope = asset.domain === 'fleet' || asset.category === 'vehicle_light' || asset.category === 'vehicle_heavy';
      } else if (scopeFilter === 'plant') {
        matchesScope = asset.domain === 'plant' || asset.category === 'generator' || asset.category === 'machinery' || asset.category === 'plant_equipment';
      } else {
        matchesScope = true; // UNIFICADO!
      }
    } else {
      const assetScope = asset.domain === 'fleet' || asset.domain === 'plant' ? asset.domain : undefined;
      if (assetScope) {
        matchesScope = assetScope === currentScope;
      } else if (currentScope === 'plant') {
        matchesScope = asset.category !== 'vehicle_light' && asset.category !== 'vehicle_heavy';
      } else if (currentScope === 'fleet') {
        matchesScope = asset.category !== 'generator'
          && asset.category !== 'machinery'
          && asset.category !== 'plant_equipment';
      }
    }

    // Filtragem direta por coluna (em tempo real)
    for (const [colId, filterVal] of Object.entries(columnFilters)) {
      if (!filterVal || !filterVal.trim()) continue;
      const term = filterVal.trim().toLowerCase();
      let cellText = '';
      switch (colId) {
        case 'code_tag':
          cellText = (asset.code_tag || asset.codeTag || '').toLowerCase();
          break;
        case 'name':
          cellText = (asset.name || '').toLowerCase();
          break;
        case 'category':
          cellText = (formatCategory(asset.category) || '').toLowerCase();
          break;
        case 'license_plate':
          cellText = (asset.license_plate || asset.licensePlate || '').toLowerCase();
          break;
        case 'brand_model':
          cellText = `${asset.brand || ''} ${asset.model || ''}`.toLowerCase();
          break;
        case 'cost_center':
          cellText = (asset.cost_center || asset.costCenter || '').toLowerCase();
          break;
        case 'department':
          cellText = (asset.department || '').toLowerCase();
          break;
        case 'location':
          cellText = (asset.location || '').toLowerCase();
          break;
        case 'current_meter':
          cellText = String(asset.current_meter ?? asset.currentMeter ?? '').toLowerCase();
          break;
        case 'operator_driver':
          cellText = (asset.operator_driver || '').toLowerCase();
          break;
        case 'responsible':
          cellText = (asset.responsible || '').toLowerCase();
          break;
        case 'criticality_level':
          cellText = (asset.criticality_level || asset.criticalityLevel || '').toLowerCase();
          break;
        case 'status':
          cellText = (asset.status || '').toLowerCase();
          break;
        default:
          cellText = String((asset as any)[colId] || '').toLowerCase();
      }
      if (!cellText.includes(term)) return false;
    }

    return matchesSearch && matchesCategory && matchesScope;
  });

  const handleToggleAssetStatus = async (asset: Asset) => {
    const newStatus = asset.status === 'inactive' ? 'operational' : 'inactive';
    const label = newStatus === 'inactive' ? 'inativo' : 'operacional';
    try {
      await api.patch(`/assets/${asset.id}`, { status: newStatus });
      showAlert({
        title: 'Estado Atualizado',
        message: `Equipamento ${asset.code_tag || asset.name} marcado como ${label}.`,
        type: 'success',
      });
      fetchAssets(true);
    } catch (err: any) {
      console.error('Erro ao alternar status do ativo:', err);
      showAlert({
        title: 'Erro ao Atualizar',
        message: err.response?.data?.message || err.response?.data?.error || 'Não foi possível alterar o estado do ativo.',
        type: 'error',
      });
    }
  };

  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tractorAssets = assets.filter((asset) => {
    const type = (asset.asset_type || asset.assetType || '').toLowerCase();
    const cat = (asset.category || '').toLowerCase();
    return type.includes('trator') || type.includes('tractor') || cat === 'cat-03' || cat === 'vehicle_heavy' || type.includes('camião') || type.includes('cavalo');
  });
  const trailerAssets = assets.filter((asset) => {
    const categoryName = (asset.category || '').toLowerCase();
    const type = `${asset.asset_type || asset.assetType || ''} ${asset.asset_subtype || asset.assetSubtype || ''}`.toLowerCase();
    return asset.category === 'CAT-06' || categoryName.includes('reboque') || categoryName.includes('semirreboque') || /trela|reboque|semirreboque|dolly/.test(type);
  });

  const getCombinationAssetName = (assetId: string | undefined, nestedAsset: any) => {
    const matchedAsset = assets.find((asset) => asset.id === assetId);
    return nestedAsset?.name || nestedAsset?.code_tag || nestedAsset?.codeTag || matchedAsset?.name || matchedAsset?.code_tag || matchedAsset?.codeTag || assetId || '—';
  };

  const fieldClass = 'w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none';
  const renderInput = (
    label: string,
    field: Exclude<keyof AssetFormData, 'technical_specs' | 'safety_checks'>,
    type = 'text',
    placeholder = '',
    required = false
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
        {required && !label.includes('*') && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData[field]}
        placeholder={placeholder}
        onChange={(e) => updateFormField(field, e.target.value)}
        className={fieldClass}
      />
    </div>
  );
  const renderTechnicalInput = (
    label: string,
    field: keyof AssetFormData['technical_specs'],
    type = 'text',
    required = false
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
        {required && !label.includes('*') && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData.technical_specs[field]}
        onChange={(e) => updateTechnicalSpec(field, e.target.value)}
        className={fieldClass}
      />
    </div>
  );
  const renderSafetyInput = (label: string, field: keyof AssetFormData['safety_checks'], type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={formData.safety_checks[field] || ''}
        onChange={(e) => updateSafetyCheck(field, e.target.value)}
        className={fieldClass}
      />
    </div>
  );

  // Se for driver_operator, redireciona para a interface simplificada tátil
  if (isDriverOperator) {
    return (
      <DriverOperatorPortal assets={assets} fetchAssets={fetchAssets} loading={loading} />
    );
  }

  return (
    <div className="space-y-6 print:hidden">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-fade-in">
          <CheckCircle2 className="text-emerald-700 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Sucesso</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho da Página de Frota / Ativos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            {isMixedScope ? <Layers className="text-blue-700" size={24} /> : (domain === 'plant' ? <Wrench className="text-blue-700" size={24} /> : <Truck className="text-blue-700" size={24} />)}
            <span>
              {isMixedScope
                ? (user?.role === 'supervisor' ? (user.operational_scope === 'plant' ? 'Equipamentos Fabris' : 'Frota') : 'Ativos e Frotas (Vista Unificada)')
                : (domain === 'plant' ? 'Equipamentos Fabris' : 'Frota')}
            </span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Ferramentas da Lista (Exclusivo tenant_admin e supervisor) */}
          {canAccessListTools && (
            <div className="relative" ref={listToolsRef}>
              <button
                type="button"
                onClick={() => setIsListToolsOpen((prev) => !prev)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold py-2.5 px-3.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                title="Ferramentas da Lista"
              >
                <SlidersHorizontal size={14} className="text-slate-600" />
                <span>Ferramentas da Lista</span>
                <ChevronDown size={13} className={`text-slate-500 transition-transform ${isListToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Suspenso de Ferramentas da Lista */}
              {isListToolsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-30 py-2 divide-y divide-slate-100 text-xs text-left animate-in fade-in zoom-in-95 duration-100">
                  <div className="pb-1.5">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Exportação (Excel)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsListToolsOpen(false);
                        exportAssetsListToExcel(
                          filteredAssets,
                          `Ativos_Filtrados_${new Date().toISOString().split('T')[0]}`,
                          formatCategory
                        );
                        showAlert({
                          title: 'Exportação Concluída',
                          message: `${filteredAssets.length} registos filtrados exportados para Excel com sucesso.`,
                          type: 'success',
                        });
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span>Exportar lista filtrada ({filteredAssets.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsListToolsOpen(false);
                        exportAssetsListToExcel(
                          assets,
                          `Todos_Equipamentos_${new Date().toISOString().split('T')[0]}`,
                          formatCategory
                        );
                        showAlert({
                          title: 'Exportação Concluída',
                          message: `${assets.length} equipamentos exportados para Excel com sucesso.`,
                          type: 'success',
                        });
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet size={14} className="text-blue-600" />
                      <span>Exportar todos os equipamentos ({assets.length})</span>
                    </button>
                  </div>

                  <div className="pt-1.5">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Personalização
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsListToolsOpen(false);
                        setIsCustomizeColumnsOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <SlidersHorizontal size={14} className="text-slate-500" />
                      <span>Personalizar colunas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsListToolsOpen(false);
                        setShowColumnFilters((prev) => !prev);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <Filter size={14} className="text-slate-500" />
                      <span>{showColumnFilters ? 'Ocultar filtros por coluna' : 'Exibir filtros por coluna'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={fetchAssets}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {!isTechnician && !isDriverOperator && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
            >
              <Plus size={16} />
              <span>{domain === 'plant' ? 'Cadastrar Equipamento' : 'Cadastrar Ativo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tratamento de erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-800 mb-0.5">Erro na API</span>
            <span className="leading-relaxed block text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Caixa de Busca e Filtros */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row gap-3 shadow-none">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Filtro de Visão: Ativos Cadastrados vs Rascunhos Salvos */}
          <select
            value={assetsViewMode}
            onChange={(e) => setAssetsViewMode(e.target.value as 'active' | 'drafts')}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer font-semibold shadow-2xs"
          >
            <option value="active">Ativos Cadastrados ({filteredAssets.length})</option>
            <option value="drafts">Rascunhos Salvos ({assetDrafts.length})</option>
          </select>

          {/* Filtro de Âmbito Operacional para Empresas Mistas */}
          {isMixedScope && user?.role !== 'supervisor' && (
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | 'fleet' | 'plant')}
              className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">Âmbito: Todos (Frota + Fábrica)</option>
              <option value="fleet">Âmbito: Apenas Frota</option>
              <option value="plant">Âmbito: Apenas Fábrica</option>
            </select>
          )}

          {assetsViewMode === 'active' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {isMixedScope ? (
                <>
                  <optgroup label="Frota / Equipamentos Móveis">
                    {scopeCategories
                      .filter((c) => c.domain === 'fleet' || !isPlantCategoryCode(c.code))
                      .map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Fábrica / Equipamentos Fabris">
                    {scopeCategories
                      .filter((c) => c.domain === 'plant' || isPlantCategoryCode(c.code))
                      .map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                scopeCategories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))
              )}
            </select>
          )}
        </div>
      </div>

      {/* 1. Resumo Numérico no Topo da Página de Ativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total de Ativos
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {filteredAssets.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {assets.length !== filteredAssets.length ? `de ${assets.length} no total` : 'visíveis no momento'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Operacionais / Ativos
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {filteredAssets.filter((a) => a.status === 'operational' || a.status === 'active').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Em serviço normal</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Em Manutenção
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {filteredAssets.filter((a) => a.status === 'under_maintenance').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Na oficina / revisão</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avariados
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {filteredAssets.filter((a) => a.status === 'breakdown').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Paragens forçadas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-none">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Inativos / Abatidos
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {filteredAssets.filter((a) => a.status === 'inactive' || a.status === 'decommissioned').length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Fora de escala</span>
        </div>
      </div>

      {/* Exibição condicional: Rascunhos Salvos ou Tabela de Ativos Oficiais */}
      {assetsViewMode === 'drafts' ? (
        <DraftsListView
          moduleName={domain === 'plant' ? 'Equipamento' : 'Ativo'}
          drafts={assetDrafts}
          onResumeDraft={handleResumeDraft}
          onDeleteDraft={handleDeleteDraft}
          onNewItem={() => {
            resetWizardForm();
            setModalOpenMode('create');
            setIsModalOpen(true);
          }}
        />
      ) : (
      /* Tabela de Ativos com Ações Completas */
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2">
                <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <h3 className="text-sm font-semibold text-slate-900">Nenhum Ativo Encontrado</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-xs uppercase bg-slate-50">
                  {tableColumns.filter((c) => c.visible).map((col) => (
                    <th
                      key={col.id}
                      className={`py-3 px-4 font-semibold ${
                        col.id === 'criticality_level' || col.id === 'status' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                  {canAccessActionMenu && (
                    <th className="py-3 px-4 font-semibold text-center w-20">Ações</th>
                  )}
                </tr>

                {/* 3. Linha de Filtragem Direta por Coluna */}
                {showColumnFilters && (
                  <tr className="bg-slate-50/90 border-b border-slate-200">
                    {tableColumns.filter((c) => c.visible).map((col) => (
                      <th key={`filter-${col.id}`} className="py-2 px-3 font-normal">
                        <input
                          type="text"
                          placeholder="Filtrar..."
                          value={columnFilters[col.id] || ''}
                          onChange={(e) => {
                            setColumnFilters((prev) => ({ ...prev, [col.id]: e.target.value }));
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs font-normal"
                        />
                      </th>
                    ))}
                    {canAccessActionMenu && (
                      <th className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setColumnFilters({});
                            setCurrentPage(1);
                          }}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      </th>
                    )}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAssets.map((asset) => {
                  const tag = asset.code_tag || asset.codeTag || 'AUTO-TAG';
                  const level = asset.criticality_level || asset.criticalityLevel || 'B';
                  const visibleCols = tableColumns.filter((c) => c.visible);

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      {visibleCols.map((col) => {
                        switch (col.id) {
                          case 'code_tag':
                            return (
                              <td key={col.id} className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {/* Cor neutra estrita conforme regra 4b */}
                                  <span className="font-mono font-bold text-slate-900">{tag}</span>
                                  {isMixedScope && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                                      {asset.domain === 'plant' || asset.category === 'generator' || asset.category === 'machinery' || asset.category === 'plant_equipment' ? 'Fábrica' : 'Frota'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          case 'name':
                            return (
                              <td key={col.id} className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="text-slate-900 font-medium text-sm">{asset.name}</span>
                                  <span className="text-xs text-slate-500 mt-0.5">{asset.brand} {asset.model}</span>
                                </div>
                              </td>
                            );
                          case 'category':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {formatCategory(asset.category)}
                              </td>
                            );
                          case 'cost_center':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.cost_center || asset.costCenter || '—'}
                              </td>
                            );
                          case 'criticality_level':
                            return (
                              <td key={col.id} className="py-3 px-4 text-center">
                                {/* Cor neutra estrita conforme regra 4b */}
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                  Nível {level}
                                </span>
                              </td>
                            );
                          case 'status':
                            return (
                              <td key={col.id} className="py-3 px-4 text-center">
                                {/* Exceção única autorizada para cores na coluna Estado */}
                                {renderStatusBadge(asset.status)}
                              </td>
                            );
                          case 'license_plate':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-800 font-medium">
                                {asset.license_plate || asset.licensePlate || '—'}
                              </td>
                            );
                          case 'brand_model':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.brand} {asset.model}
                              </td>
                            );
                          case 'location':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.location || '—'}
                              </td>
                            );
                          case 'department':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.department || '—'}
                              </td>
                            );
                          case 'current_meter':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs font-mono text-slate-800">
                                {asset.current_meter ?? asset.currentMeter ?? '—'} {asset.meter_unit || 'Km'}
                              </td>
                            );
                          case 'operator_driver':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.operator_driver || '—'}
                              </td>
                            );
                          case 'responsible':
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {asset.responsible || '—'}
                              </td>
                            );
                          default:
                            return (
                              <td key={col.id} className="py-3 px-4 text-xs text-slate-700">
                                {String((asset as any)[col.id] || '—')}
                              </td>
                            );
                        }
                      })}

                      {canAccessActionMenu && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleAssetMenu(e, asset)}
                              className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center border ${
                                activeAssetForMenu?.id === asset.id
                                  ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent hover:border-slate-200'
                              }`}
                              title="Ações do Ativo"
                              aria-label="Ações do Ativo"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 4a. Paginação Padrão (10, 20, 50 itens por página) */}
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredAssets.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>
      )}

      {/* Camada Secundária: Cadastro e Edição da Ficha Técnica */}
      <SecondaryView
        isOpen={isModalOpen}
        onClose={handleRequestCloseModal}
        title={modalMode === 'create' ? 'Novo Equipamento' : 'Editar Equipamento'}
        subtitle="Ficha Técnica & Operacional do Equipamento"
        backLabel="Voltar para a Lista"
        icon={<Wrench size={18} />}
        maxWidthClass="max-w-5xl mx-auto"
      >
        <form
          onSubmit={handleSubmitForm}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeTab < 6) {
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                e.preventDefault();
                handleNextStep();
              }
            }
          }}
          className="space-y-6 pb-8"
        >
          {hasRestoredDraft && (
            <DraftBanner
              onDiscard={handleDiscardRestoredDraft}
              savedAt={draftSavedAt || undefined}
            />
          )}

          {/* Indicador e Numeração Elegante das Etapas */}
          <div className="border-b border-slate-200 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Etapa <strong className="text-slate-900 font-bold">{activeTab + 1}</strong> de {ASSET_WIZARD_STEPS.length}:
                </span>
                <span className="text-xs font-bold text-blue-700">
                  {ASSET_WIZARD_STEPS[activeTab].label}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {Math.round(((activeTab + 1) / ASSET_WIZARD_STEPS.length) * 100)}% concluído
              </span>
            </div>

            {/* Linha contínua e suave de progresso */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${((activeTab + 1) / ASSET_WIZARD_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Stepper com numeração moderna e agradável */}
            <nav role="tablist" aria-label="Etapas da ficha técnica" className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ASSET_WIZARD_STEPS.map((step, index) => {
                const isActive = activeTab === index;
                const isCompleted = activeTab > index;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleStepClick(index)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                        : isCompleted
                        ? 'text-slate-700 hover:bg-slate-50 border border-transparent font-medium'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:border-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check size={11} strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className="whitespace-nowrap hidden md:inline">
                      {step.label}
                    </span>
                    <span className="whitespace-nowrap md:hidden">
                      {step.shortLabel}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
            {(() => {
              const selectedCategoryObj = scopeCategories.find((c) => c.code === formData.category) ||
                [...FLEET_CATEGORIES, ...PLANT_CATEGORIES].find((c) => c.code === formData.category);

              const isPlantCat = isPlantCategoryCode(formData.category);
              const availableDriversForCategory = drivers.filter(drv => {
                if (isPlantCat) {
                  return drv.operational_scope === 'plant' || drv.operational_scope === 'mixed' || drv.operational_scope === 'both';
                }
                return drv.operational_scope === 'fleet' || drv.operational_scope === 'mixed' || drv.operational_scope === 'both' || !drv.operational_scope;
              });

              return (
                <div role="tabpanel" className="min-h-[280px]">
                  {/* PASSO 1: Identificação e dados gerais */}
                  {activeTab === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {formData.category === 'CAT-06' && (
                        <div className="md:col-span-3 p-3 bg-blue-50/90 border border-blue-200 rounded-md text-xs text-blue-900 flex items-start gap-2.5">
                          <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <strong className="block font-semibold text-blue-950">Regra Operacional para Trelas e Reboques:</strong>
                            <p className="leading-relaxed text-blue-900">
                              Cada trela ou semirreboque deve ser registada individualmente com o seu próprio código de ativo único, chassi e matrícula.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Categoria / Grupo (Obrigatório) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Categoria / Grupo <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.category}
                          disabled={modalMode === 'edit'}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className={fieldClass}
                          required
                        >
                          <option value="">Selecione uma categoria...</option>
                          {isMixedScope ? (
                            <>
                              <optgroup label="Frota / Equipamentos Móveis">
                                {scopeCategories
                                  .filter((item) => item.domain === 'fleet' || !isPlantCategoryCode(item.code))
                                  .map((item) => (
                                    <option key={item.code} value={item.code}>
                                      {item.name}
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="Fábrica / Equipamentos Fabris">
                                {scopeCategories
                                  .filter((item) => item.domain === 'plant' || isPlantCategoryCode(item.code))
                                  .map((item) => (
                                    <option key={item.code} value={item.code}>
                                      {item.name}
                                    </option>
                                  ))}
                              </optgroup>
                            </>
                          ) : (
                            scopeCategories.map((item) => (
                              <option key={item.code} value={item.code}>
                                {item.name}
                              </option>
                            ))
                          )}
                          {formData.category && !scopeCategories.some((item) => item.code === formData.category) && (
                            <option key={formData.category} value={formData.category}>
                              {getCleanCategoryName(formData.category)}
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Tipo de ativo (Obrigatório) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Tipo de ativo <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.asset_type}
                          onChange={(e) => {
                            updateFormField('asset_type', e.target.value);
                            if (e.target.value !== 'Outro tipo (especificar)') {
                              updateFormField('custom_asset_type', '');
                            }
                          }}
                          className={fieldClass}
                          required
                        >
                          <option value="">Selecione o tipo de ativo...</option>
                          {(() => {
                            const rawTypes = selectedCategoryObj?.types ?? [];
                            const baseTypes = rawTypes.filter(
                              (t) => {
                                const lower = t.trim().toLowerCase();
                                return lower !== 'outro tipo (especificar)' && lower !== 'outro (especificar)';
                              }
                            );
                            return (
                              <>
                                {baseTypes.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                                <option value="Outro tipo (especificar)">Outro tipo (especificar)</option>
                                {formData.asset_type &&
                                  !baseTypes.includes(formData.asset_type) &&
                                  formData.asset_type !== 'Outro tipo (especificar)' && (
                                    <option key={formData.asset_type} value={formData.asset_type}>{formData.asset_type}</option>
                                  )}
                              </>
                            );
                          })()}
                        </select>
                      </div>

                      {formData.asset_type === 'Outro tipo (especificar)' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Especificar tipo de ativo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Digite o tipo de ativo..."
                            value={formData.custom_asset_type || ''}
                            onChange={(e) => updateFormField('custom_asset_type', e.target.value)}
                            className={fieldClass}
                            required
                          />
                        </div>
                      )}

                      {/* Código do equipamento (Livre / Texto) */}
                      {renderInput('Código do equipamento', 'code_tag', 'text', 'ex: CAM-001, GER-01 (deixe vazio p/ automático)')}

                      {/* Placa / Identificação (Obrigatório) */}
                      {renderInput('Placa / Identificação', 'license_plate', 'text', 'ex: ABC 123 MC ou TAG-001', true)}

                      {/* Nome / Designação (Livre / Texto) */}
                      {renderInput('Nome / Designação', 'name', 'text', 'Designação ou apelido do equipamento')}

                      {/* Empresa / Unidade (Livre / Texto) */}
                      {renderInput('Empresa / Unidade', 'company', 'text', 'Empresa ou unidade proprietária')}

                      {/* Departamento / Área (Livre / Texto) */}
                      {renderInput('Departamento / Área', 'department', 'text', 'Área ou departamento de alocação')}

                      {/* Localização / Base (Livre / Texto) */}
                      {renderInput('Localização / Base', 'location', 'text', 'ex: Base Maputo, Fábrica Matola, Parque')}

                      {/* Centro de custo (Livre / Texto) */}
                      {renderInput('Centro de custo', 'cost_center', 'text', 'ex: CC-1020, LOG-01')}

                      {/* Estado (Obrigatório | Lista suspensa: Ativo, Inativo, Em Manutenção) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Estado <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => updateFormField('status', e.target.value)}
                          className={fieldClass}
                          required
                        >
                          <option value="operational">Ativo</option>
                          <option value="inactive">Inativo</option>
                          <option value="under_maintenance">Em Manutenção</option>
                        </select>
                      </div>

                      {/* Criticidade (Obrigatório | Lista suspensa: A - Alta, B - Média, C - Baixa) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Criticidade <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.criticality_level}
                          onChange={(e) => updateFormField('criticality_level', e.target.value)}
                          className={fieldClass}
                          required
                        >
                          <option value="A">A - Alta</option>
                          <option value="B">B - Média</option>
                          <option value="C">C - Baixa</option>
                        </select>
                      </div>

                      {/* Responsável (Livre / Texto) */}
                      {renderInput('Responsável', 'responsible', 'text', 'Pessoa ou gestor responsável')}

                      {/* Operador / Motorista (Livre | Lista suspensa com filtro dinâmico de escopo) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Operador / Motorista
                        </label>
                        <select
                          value={formData.operator_driver}
                          onChange={(e) => updateFormField('operator_driver', e.target.value)}
                          className={fieldClass}
                          disabled={loadingDrivers}
                        >
                          <option value="">
                            {loadingDrivers ? 'A carregar utilizadores...' : 'Selecione o operador ou motorista...'}
                          </option>
                          {availableDriversForCategory.map((drv) => (
                            <option key={drv.id} value={drv.full_name}>
                              {drv.full_name} ({drv.operational_scope === 'plant' ? 'Operador Fabril' : 'Motorista Frota'})
                            </option>
                          ))}
                          {formData.operator_driver && !availableDriversForCategory.some((d) => d.full_name === formData.operator_driver) && (
                            <option key={formData.operator_driver} value={formData.operator_driver}>
                              {formData.operator_driver} (atribuído)
                            </option>
                          )}
                        </select>
                      </div>

                      {/* QR Code / Etiqueta (Livre / Texto com texto orientador) */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <QrCode size={14} className="text-blue-700" />
                          <span>QR Code / Etiqueta</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Pode inserir o código ou referência da etiqueta QR do ativo"
                          value={formData.qr_code}
                          onChange={(e) => updateFormField('qr_code', e.target.value)}
                          className={fieldClass}
                        />
                        <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                          Pode inserir o código ou referência da etiqueta QR do ativo. Se o campo for deixado em branco, o sistema mantém a geração automática do QR Code; se for preenchido pelo utilizador, o sistema guarda e exibe para aquele ativo exclusivamente o código inserido.
                        </p>
                      </div>

                      {/* Fotografia do ativo (Livre | Seleção de ficheiro / Choose file com preview) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Camera size={14} className="text-blue-700" />
                          <span>Fotografia do ativo</span>
                        </label>
                        {formData.photo_url || assetPhotoPreview ? (
                          <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <img
                              src={formData.photo_url || assetPhotoPreview || ''}
                              alt="Foto do ativo"
                              className="w-12 h-12 object-cover rounded border border-slate-300 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-slate-800 block truncate">
                                Foto anexada
                              </span>
                              <span className="text-[10px] text-emerald-600 font-medium block">
                                Pronta para gravação
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                updateFormField('photo_url', '');
                                setAssetPhotoPreview(null);
                                setAssetPhotoFile(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Remover fotografia"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-dashed border-slate-300 rounded text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                              {uploadingPhoto ? (
                                <>
                                  <RefreshCw size={14} className="animate-spin text-blue-700" />
                                  <span>A enviar foto...</span>
                                </>
                              ) : (
                                <>
                                  <Camera size={14} className="text-blue-700" />
                                  <span>Selecionar foto do ativo</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                onChange={handlePhotoFileChange}
                                className="hidden"
                                disabled={uploadingPhoto}
                              />
                            </label>
                            <span className="text-[10px] text-slate-500 block">
                              Formatos JPG, PNG ou WebP.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Observações (Livre | Texto longo) */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
                        <textarea
                          rows={2}
                          value={formData.notes}
                          onChange={(e) => updateFormField('notes', e.target.value)}
                          placeholder="Observações e notas gerais sobre o ativo..."
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}

                  {/* PASSO 2: Identificação do fabricante */}
                  {activeTab === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderInput('Fabricante / Marca', 'brand', 'text', 'ex: Scania, Caterpillar, Atlas Copco', true)}
                      {renderInput('Modelo / Versão', 'model', 'text', 'ex: R450, 320D, GA 37', true)}
                      {renderInput('Ano de Fabrico', 'manufacture_year', 'number', 'ex: 2023')}
                      {renderInput('Número de série', 'serial_number', 'text', 'ex: SN-9874213')}
                      {renderInput('VIN / Número do chassis', 'chassis_vin', 'text', 'ex: 9BWZZZ...')}
                      {renderInput('Número do motor', 'engine_number', 'text', 'ex: D13K460')}
                      {renderInput('Cor / Configuração', 'color', 'text', 'ex: Branco polar, Amarelo')}
                    </div>
                  )}

                  {/* PASSO 3: Características técnicas */}
                  {activeTab === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {isPlantCat ? (
                        <>
                          {renderInput('Setor Fabril / Linha', 'plant_sector', 'text', 'ex: Linha de Enchimento, Moagem, Caldeiras')}
                          {renderInput('Tensão / Voltagem (V)', 'voltage_specs', 'text', 'ex: 380V Trifásico, 220V')}
                          {renderInput('Potência (kW / kVA)', 'power_kw_kva', 'number', 'ex: 75, 250')}
                          {renderTechnicalInput('Tipo de motor / Acionamento', 'engine_type')}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Combustível / Fonte de Energia</label>
                            <select
                              value={formData.energy_type}
                              onChange={(e) => {
                                updateFormField('energy_type', e.target.value);
                                updateTechnicalSpec('fuel', e.target.value);
                              }}
                              className={fieldClass}
                            >
                              {ENERGY_TYPES.map((energy) => (
                                <option key={energy} value={energy}>{energy}</option>
                              ))}
                            </select>
                          </div>
                          {renderTechnicalInput('Dimensões / Instalação', 'dimensions')}
                          {renderTechnicalInput('Peso total / Carga', 'weight_load')}
                        </>
                      ) : (
                        <>
                          {renderTechnicalInput('Tipo de motor / Motorização', 'engine_type')}
                          {renderTechnicalInput('Potência / Unidade', 'power')}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Combustível / Energia</label>
                            <select
                              value={formData.energy_type}
                              onChange={(e) => {
                                updateFormField('energy_type', e.target.value);
                                updateTechnicalSpec('fuel', e.target.value);
                              }}
                              className={fieldClass}
                            >
                              {ENERGY_TYPES.map((energy) => (
                                <option key={energy} value={energy}>{energy}</option>
                              ))}
                            </select>
                          </div>
                          {renderTechnicalInput('Transmissão', 'transmission')}
                          {renderTechnicalInput('Tração / Configuração de eixos', 'traction')}
                          {renderInput('N.º de eixos', 'axle_config', 'number', 'ex: 2, 3, 4')}
                          {renderTechnicalInput('Peso bruto / tara', 'weight_load')}
                          {renderTechnicalInput('Carga útil / Capacidade', 'payload_capacity')}
                          {renderInput('Capacidade do tanque (L)', 'fuel_tank_capacity_liters', 'number', 'ex: 300')}
                          {renderTechnicalInput('Consumo de referência', 'consumption')}
                          {renderTechnicalInput('Medida dos pneus', 'tire_size')}
                          {renderTechnicalInput('Dimensão / Configuração', 'dimensions')}
                        </>
                      )}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Outras especificações técnicas</label>
                        <textarea
                          rows={2}
                          value={formData.technical_specs.other_specs || ''}
                          onChange={(e) => updateTechnicalSpec('other_specs', e.target.value)}
                          placeholder="Detalhes mecânicos, elétricos, hidráulicos ou acessórios específicos..."
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}

                  {/* PASSO 4: Operação e medidores */}
                  {activeTab === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderInput('Quilometragem inicial', 'initial_km', 'number', '0')}
                      {renderInput('Quilometragem actual', 'current_km', 'number', '0')}
                      {renderInput('Horímetro inicial', 'initial_hour_meter', 'number', '0')}
                      {renderInput('Horímetro actual', 'current_hour_meter', 'number', '0')}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unidade de medida</label>
                        <select
                          value={formData.measurement_unit}
                          onChange={(e) => updateFormField('measurement_unit', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="Km">Km</option>
                          <option value="Horas">Horas</option>
                          <option value="Dias">Dias</option>
                          <option value="Semanas">Semanas</option>
                        </select>
                      </div>
                      {renderInput('Última leitura em', 'last_reading_date', 'date')}
                      {renderInput('Regime / Turno de operação', 'shift', 'text', 'ex: Diurno 8h, 2 Turnos 16h')}
                      {renderInput('Horas de operação previstas', 'expected_operating_hours', 'number', 'ex: 2000')}
                      {renderInput('Leitura actual do medidor', 'current_meter', 'number', '0')}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unidade do medidor</label>
                        <select
                          value={formData.meter_unit}
                          onChange={(e) => updateFormField('meter_unit', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="Km">Km</option>
                          <option value="Horas">Horas</option>
                          <option value="Dias">Dias</option>
                          <option value="Semanas">Semanas</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações operacionais</label>
                        <textarea
                          rows={2}
                          value={formData.operational_notes || ''}
                          onChange={(e) => updateFormField('operational_notes', e.target.value)}
                          placeholder="Regras de rodagem, limitações de carga, rotas ou postos de trabalho..."
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}

                  {/* PASSO 5: Conformidade, Aquisição e Documentos */}
                  {activeTab === 4 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderInput('Data de aquisição', 'acquisition_date', 'date')}
                      {renderInput('Data de início de operação', 'operation_date', 'date')}
                      {renderInput('Valor de aquisição', 'acquisition_value', 'number', '0.00')}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Moeda</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => updateFormField('currency', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="MZN">MZN (Metical)</option>
                          <option value="USD">USD (Dólar Americano)</option>
                          <option value="EUR">EUR (Euro)</option>
                          <option value="ZAR">ZAR (Rand)</option>
                        </select>
                      </div>
                      {renderInput('Fornecedor / Vendedor', 'supplier', 'text', 'ex: Entreposto, Barloworld')}
                      {renderInput('Garantia até', 'warranty_expiry', 'date')}
                      {renderInput('Validade do seguro', 'insurance_expiry', 'date')}
                      {renderInput('Próxima inspecção periódica', 'inspection_expiry', 'date')}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Outras licenças / certificados</label>
                        <textarea
                          rows={2}
                          value={formData.licenses_certificates_notes || ''}
                          onChange={(e) => updateFormField('licenses_certificates_notes', e.target.value)}
                          placeholder="Licenças de circulação, certificados de calibração INNOQ, licenças ambientais..."
                          className={fieldClass}
                        />
                      </div>
                      {modalMode === 'create' && (
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`md:col-span-3 rounded-md border-2 border-dashed p-4 transition-colors ${
                            isDragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Ficha técnica inicial ou documento comprovativo (opcional, até 20 MB)
                          </label>
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.png,.jpeg,.jpg,.webp"
                            className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold cursor-pointer"
                          />
                          {wizardFile && (
                            <p className="mt-1 text-xs text-blue-700 font-medium">
                              Ficheiro selecionado: {wizardFile.name} ({(wizardFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PASSO 6: Manutenção */}
                  {activeTab === 5 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Plano de manutenção associado
                        </label>
                        <select
                          value={formData.maintenance_plan_id}
                          onChange={(e) => updateFormField('maintenance_plan_id', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Sem plano associado</option>
                          {maintenancePlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                          ))}
                        </select>
                        {maintenancePlansError && (
                          <p role="alert" className="mt-1 text-xs text-red-600">{maintenancePlansError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de manutenção</label>
                        <select
                          value={formData.maintenance_type}
                          onChange={(e) => updateFormField('maintenance_type', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="Preventiva">Preventiva</option>
                          <option value="Preditiva">Preditiva</option>
                          <option value="Correctiva">Correctiva</option>
                          <option value="Inspecção">Inspecção</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Periodicidade / Unidade</label>
                        <select
                          value={formData.maintenance_periodicity}
                          onChange={(e) => updateFormField('maintenance_periodicity', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="Km">Km</option>
                          <option value="Horas">Horas</option>
                          <option value="Dias">Dias</option>
                          <option value="Semanas">Semanas</option>
                        </select>
                      </div>

                      {renderInput('Última manutenção - data', 'last_maintenance_date', 'date')}
                      {renderInput('Última manutenção – leitura', 'last_maintenance_meter', 'number', 'ex: 25000')}
                      {renderInput('Próxima manutenção prevista', 'next_maintenance_date', 'date')}
                      {renderInput('Próxima manutenção – leitura', 'next_maintenance_meter', 'number', 'ex: 35000')}

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notas de manutenção</label>
                        <textarea
                          rows={2}
                          value={formData.maintenance_notes || ''}
                          onChange={(e) => updateFormField('maintenance_notes', e.target.value)}
                          placeholder="Instruções de lubrificação, filtros, kits de revisão ou recomendações de oficina..."
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}

                  {/* PASSO 7: Segurança e condições de utilização */}
                  {activeTab === 6 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderSafetyInput('Extintor / validade', 'extinguisher_validity', 'text', 'ex: Válido até 12/2026')}
                      {renderSafetyInput('Triângulo / sinalização', 'warning_triangle', 'text', 'ex: 2 unidades conformes')}
                      {renderSafetyInput('Kit de primeiros socorros', 'first_aid_kit', 'text', 'ex: Completo e selado')}
                      {renderSafetyInput('Colete refletor / EPI', 'ppe', 'text', 'ex: 2 coletes + capacete')}
                      {renderSafetyInput('Dispositivos de segurança', 'safety_devices', 'text', 'ex: Alarme de marcha-atrás, cinto')}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Condição geral do ativo</label>
                        <select
                          value={formData.safety_checks.general_condition}
                          onChange={(e) => updateSafetyCheck('general_condition', e.target.value)}
                          className={fieldClass}
                        >
                          <option value="Bom">Bom</option>
                          <option value="Atenção Necessária">Atenção Necessária</option>
                          <option value="Deficiente">Deficiente</option>
                          <option value="Não Verificado">Não Verificado</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estado / Observações</label>
                        <textarea
                          rows={2}
                          value={formData.safety_checks.safety_observations || ''}
                          onChange={(e) => updateSafetyCheck('safety_observations', e.target.value)}
                          placeholder="Observações sobre o estado da cabine, cintos de segurança, iluminação, pneus ou travas..."
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

              <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-8">
                <button
                  key="btn-wizard-prev"
                  type="button"
                  onClick={() => setActiveTab((tab) => Math.max(0, tab - 1))}
                  disabled={activeTab === 0 || submitting}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <div className="flex gap-2.5">
                  <button
                    key="btn-wizard-cancel"
                    type="button"
                    onClick={handleRequestCloseModal}
                    disabled={submitting}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {modalMode === 'create' && (
                    <button
                      key="btn-wizard-draft"
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                      title="Salvar progresso como rascunho"
                    >
                      <Save size={13} className="text-blue-700" />
                      <span>Salvar Rascunho</span>
                    </button>
                  )}
                  {activeTab < 6 ? (
                    <button
                      key="btn-wizard-next"
                      type="button"
                      onClick={handleNextStep}
                      disabled={!isStepValid(activeTab)}
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Seguinte
                    </button>
                  ) : (
                    <button
                      key="btn-wizard-submit"
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-md text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>A guardar equipamento...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Guardar equipamento</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
        </SecondaryView>

      {/* ==========================================
          MODAL: GESTÃO DOCUMENTAL DO ATIVO
          ========================================== */}
      {/* Camada Secundária: Gestão Documental do Ativo */}
      <SecondaryView
        isOpen={isDocModalOpen && !!selectedDocAsset}
        onClose={() => {
          setIsDocModalOpen(false);
          setSelectedDocAsset(null);
          setSelectedFile(null);
          setDocTitle('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title={`Documentos: ${selectedDocAsset?.code_tag || selectedDocAsset?.codeTag || selectedDocAsset?.name}`}
        subtitle="Upload e consulta de fichas técnicas, apólices, manuais e certificados"
        backLabel="Voltar para Ativos"
        icon={<FileText size={18} />}
        maxWidthClass="max-w-4xl mx-auto"
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 md:p-8 space-y-6">
          {/* Formulário para Envio de Novo Documento */}
          <form onSubmit={handleAddAdditionalDocument} className="bg-slate-50 p-4 border border-slate-200 rounded-md space-y-3">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                  Adicionar Anexo de Manutenção / Conformidade
                </span>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Título *</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="ex: Manual do Operador, Apólice de Seguro 2026"
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Tipo *</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="tech_sheet">Ficha Técnica</option>
                      <option value="manual">Manual Técnico</option>
                      <option value="diagram">Diagrama Elétrico / Mecânico</option>
                      <option value="inspection_certificate">Certificado de Inspeção (INATRO/INNOQ)</option>
                      <option value="insurance">Apólice de Seguro</option>
                      <option value="asset_photo">Fotografia do Ativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase">Ficheiro (20MB max) *</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      required
                      accept=".pdf,.png,.jpeg,.jpg,.webp"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-700 file:cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingDoc || !selectedFile}
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-none"
                >
                  {isUploadingDoc ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>A carregar ficheiro...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={13} />
                      <span>Anexar Documento</span>
                    </>
                  )}
                </button>
              </form>

              {/* Lista de Documentos Atuais */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Documentação Arquivada ({documents.length})
                </span>

                {docLoading ? (
                  <div className="text-center py-6">
                    <Loader2 size={24} className="animate-spin text-slate-400 mx-auto" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6 border border-slate-200 border-dashed rounded-md bg-slate-50/50">
                    <p className="text-xs text-slate-500">Nenhum documento anexado a este ativo.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => {
                      const url = doc.signed_url || doc.signedUrl || '#';
                      return (
                        <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-md flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-2 flex-1 truncate mr-4">
                            <File size={16} className="text-blue-700 shrink-0" />
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 block truncate" title={doc.title}>
                                {doc.title}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {formatDocType(doc.document_type || doc.documentType || '')} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-MZ') : '---'}
                              </span>
                            </div>
                          </div>

                          {/* Abrir URL assinada */}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-[10px] font-medium flex items-center gap-1 shrink-0"
                          >
                            <Eye size={12} />
                            <span>Abrir</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
        </SecondaryView>

      {/* ==========================================
          MODAL: VISUALIZAÇÃO E IMPRESSÃO DE QR CODE
          ========================================== */}
      {/* Camada Secundária: Visualização e Impressão de QR Code */}
      <SecondaryView
        isOpen={isQrModalOpen && !!selectedQrAsset}
        onClose={() => {
          setIsQrModalOpen(false);
          setSelectedQrAsset(null);
        }}
        title={`Etiqueta QR Code: ${selectedQrAsset?.code_tag || selectedQrAsset?.codeTag || selectedQrAsset?.name}`}
        subtitle="Identificação para leitura e abertura rápida de ordens de serviço"
        backLabel="Voltar para Ativos"
        icon={<QrCode size={18} />}
        maxWidthClass="max-w-md mx-auto"
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 md:p-8 flex flex-col items-center text-center">
          {/* Cartão de Etiqueta com Borda Refinada */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center shadow-xs w-full max-w-[280px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">AVEXAS CMMS</span>
            
            {/* Canvas do QR Code */}
            <canvas ref={qrCanvasRef} className="mx-auto" />
            
            <div className="mt-4 text-slate-900">
              <span className="font-mono font-bold text-sm tracking-wide block uppercase text-slate-900">
                {selectedQrAsset?.code_tag || selectedQrAsset?.codeTag}
              </span>
              <span className="text-xs font-semibold block text-slate-700 truncate max-w-[220px] mt-1">
                {selectedQrAsset?.name}
              </span>
              <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
                {formatCategory(selectedQrAsset?.category || '')}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2.5 w-full max-w-[280px] pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={handleDownloadQrCode}
              className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download size={14} />
              <span>Descarregar PNG</span>
            </button>
            <button
              onClick={handlePrintLabel}
              className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </SecondaryView>

      {/* ==========================================
          MODAL: CONFIRMAÇÃO DE ARQUIVAMENTO (DELETE)
          ========================================== */}
      {/* Camada Secundária: Confirmação de Arquivamento */}
      <SecondaryView
        isOpen={isDeleteModalOpen && !!deletingAsset}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingAsset(null);
        }}
        title="Arquivar Ativo de Manutenção"
        subtitle="Confirmação de desativação do ativo no sistema"
        backLabel="Voltar para Ativos"
        icon={<AlertTriangle size={18} className="text-rose-600" />}
        maxWidthClass="max-w-lg mx-auto"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-5 shadow-xs">
          <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Confirmar Arquivamento</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Tem a certeza que deseja arquivar o ativo{' '}
              <span className="font-bold text-slate-900 font-mono">
                {deletingAsset?.code_tag || deletingAsset?.codeTag}
              </span>
              ? Esta ação moverá o equipamento para o histórico e o impedirá de abrir novas ordens de serviço.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingAsset(null);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteAsset}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-md transition-all shadow-xs cursor-pointer"
            >
              Confirmar Arquivamento
            </button>
          </div>
        </div>
      </SecondaryView>

      {/* ==========================================
          MODAL: IMPORTAÇÃO EM LOTE (CSV BATCH IMPORT)
          ========================================== */}
      {/* Camada Secundária: Importação de Ativos em Lote (CSV) */}
      <SecondaryView
        isOpen={isBatchImportModalOpen}
        onClose={() => setIsBatchImportModalOpen(false)}
        title="Importação de Ativos em Lote (CSV)"
        subtitle="Carregue uma folha de cálculo CSV com dados de ativos corporativos"
        backLabel="Voltar para Ativos"
        icon={<FileSpreadsheet size={18} />}
        maxWidthClass="max-w-3xl mx-auto"
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 md:p-8 space-y-6">
              
              {/* Seção 1: Instruções e Modelo */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-800 block">Modelo de Ficheiro CSV para {currentScope === 'plant' ? 'Equipamentos Fabris' : 'Frota'}</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {currentScope === 'plant'
                      ? 'O modelo contém colunas para Nome, Categoria (generator/machinery), Tag, Fabricante, Modelo, Ano, Setor, Potência, Voltagem e Horímetro.'
                      : 'O modelo contém colunas para Nome, Categoria (vehicle_light/vehicle_heavy), Tag, Marca, Modelo, Ano, Matrícula, Chassis e Odómetro.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium py-2 px-3 rounded-md flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Download size={14} className="text-slate-600" />
                  <span>Descarregar Modelo CSV</span>
                </button>
              </div>

              {/* Seção 2: Área Drag & Drop / Input de Ficheiro */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Carregar Ficheiro CSV *
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  ref={batchFileInputRef}
                  onChange={(e) => e.target.files && e.target.files[0] && handleBatchFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <div
                  onDragOver={handleBatchDragOver}
                  onDragLeave={handleBatchDragLeave}
                  onDrop={handleBatchDrop}
                  onClick={() => batchFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
                    batchDragActive
                      ? 'border-blue-600 bg-blue-50/50'
                      : batchFile
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
                  }`}
                >
                  <UploadCloud size={28} className={batchFile ? "text-emerald-600" : "text-slate-400"} />
                  {batchFile ? (
                    <div>
                      <p className="font-semibold text-slate-900">{batchFile.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{(batchFile.size / 1024).toFixed(1)} KB · Clique para alterar</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-700">Arraste e solte o seu ficheiro CSV aqui ou <span className="text-blue-700 underline">procure no computador</span></p>
                      <p className="text-[11px] text-slate-400 mt-1">Apenas ficheiros .csv com codificação UTF-8</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Exibição de Mensagem de Erro do Backend / Validação sem fechar o modal */}
              {batchError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-md flex gap-2.5 items-start animate-fade-in">
                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-red-900">Erro na Validação / Importação</span>
                    <span className="text-[11px] leading-relaxed block text-red-700 mt-0.5">{batchError}</span>
                  </div>
                </div>
              )}

              {/* Seção 3: Pré-Visualização das Primeiras Linhas */}
              {parsedBatchData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                      Pré-Visualização dos Dados ({Math.min(5, parsedBatchData.length)} de {parsedBatchData.length} registos)
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {parsedBatchData.length} {parsedBatchData.length === 1 ? 'ativo pronto' : 'ativos prontos'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-md overflow-x-auto max-h-48">
                    <table className="w-full text-left text-[11px] text-slate-700">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 border-r border-slate-200">#</th>
                          {Object.keys(parsedBatchData[0] || {}).map((col) => (
                            <th key={col} className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {parsedBatchData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 font-mono">
                            <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-500">{idx + 1}</td>
                            {Object.keys(parsedBatchData[0] || {}).map((col) => (
                              <td key={col} className="px-3 py-1.5 border-r border-slate-200 whitespace-nowrap truncate max-w-[150px]">
                                {row[col] || <span className="text-slate-300 italic">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Rodapé com Botões de Ação */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsBatchImportModalOpen(false);
                  setBatchFile(null);
                  setParsedBatchData([]);
                  setBatchError(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={batchSubmitting || parsedBatchData.length === 0}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors shadow-none flex items-center gap-2 cursor-pointer"
              >
                {batchSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>A Importar...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={14} />
                    <span>Importar {parsedBatchData.length > 0 ? `${parsedBatchData.length} Ativos` : 'Ativos'}</span>
                  </>
                )}
              </button>
            </div>
        </SecondaryView>

      {/* Camada Secundária: Gestão de Conjuntos (Camião + Trelas) */}
      <SecondaryView
        isOpen={isCombinationsModalOpen}
        onClose={() => setIsCombinationsModalOpen(false)}
        title="Gestão de Conjuntos Rodoviários (Camião + Trelas)"
        subtitle="Associação operacional flexível com histórico de auditoria e controle de ativos individuais"
        backLabel="Voltar para Ativos"
        icon={<Link size={18} />}
        maxWidthClass="max-w-5xl mx-auto"
      >
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden p-6 md:p-8 space-y-6">
          
          {/* Barra Superior de Navegação por Abas e Ações */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCombTab('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  combTab === 'active'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Conjuntos Ativos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  combTab === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {activeCombinations.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCombTab('create')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  combTab === 'create'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus size={13} />
                <span>Nova Associação</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCombTab('history');
                  setCombinationHistory(combinationService.getHistory(user?.tenantId));
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  combTab === 'history'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History size={13} />
                <span>Histórico de Auditoria</span>
                {combinationHistory.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    combTab === 'history' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {combinationHistory.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCombForReport('all');
                  setIsReportsModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                title="Consultar custos, manutenção, quilometragem e documentação consolidados"
              >
                <BarChart3 size={14} />
                <span>Relatórios de Operação</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchCombinations();
                  setCombinationHistory(combinationService.getHistory(user?.tenantId));
                }}
                disabled={loadingCombinations}
                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md cursor-pointer disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw size={14} className={loadingCombinations ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* TAB 1: CONJUNTOS ATIVOS */}
          {combTab === 'active' && (
            <div className="space-y-4">
              {loadingCombinations ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                  A carregar conjuntos rodoviários...
                </div>
              ) : activeCombinations.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 space-y-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <Link size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Nenhum conjunto rodoviário ativo</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Associe camiões tratores a uma ou mais trelas (simples, bitrem, rodotrem) para controle operacional e agregação de relatórios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCombTab('create')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                    <span>Criar Primeira Associação</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Código do Conjunto</th>
                        <th className="px-4 py-3">Camião Trator</th>
                        <th className="px-4 py-3">Composição de Trelas & Papéis</th>
                        <th className="px-4 py-3">Início</th>
                        <th className="px-4 py-3 text-right">Ações Operacionais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCombinations.map((combination) => {
                        const truckId = combination.truck_id || combination.truckId || combination.tractor_id || combination.tractorId;
                        const combinationId = combination.id || combination._id;
                        const startedAt = combination.started_at || combination.start_date || combination.created_at || combination.startedAt || combination.createdAt;

                        // Determina trelas e papéis
                        const hasDynamicTrailers = Array.isArray(combination.trailers) && combination.trailers.length > 0;
                        const leaderId = combination.leader_trailer_id || combination.leaderTrailerId || combination.leader_id || combination.leaderId;
                        const followerId = combination.follower_trailer_id || combination.followerTrailerId || combination.follower_id || combination.followerId;

                        return (
                          <tr key={combinationId || combination.combination_code || combination.combinationCode} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5 align-top">
                              <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {combination.combination_code || combination.combinationCode || combination.code || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-semibold text-slate-800">
                                {getCombinationAssetName(truckId, combination.truck || combination.tractor)}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {assets.find((a) => a.id === truckId)?.code_tag || 'Camião Trator'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 align-top">
                              <div className="space-y-1.5">
                                {hasDynamicTrailers ? (
                                  combination.trailers.map((t: any, idx: number) => {
                                    const tId = t.trailer_id || t.trailerId || t.id;
                                    const tAsset = assets.find((a) => a.id === tId) || t.trailer;
                                    const roleStr = t.role || (idx === 0 ? 'leader' : 'follower');
                                    return (
                                      <div key={idx} className="flex items-center gap-1.5">
                                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                          roleStr === 'leader'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : roleStr === 'follower'
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                          {combinationService.getRoleLabel(roleStr)}
                                        </span>
                                        <span className="text-xs text-slate-700 font-medium">
                                          {tAsset?.code_tag ? `[${tAsset.code_tag}] ` : ''}{tAsset?.name || tId}
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <>
                                    {leaderId && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                          Líder (Leader)
                                        </span>
                                        <span className="text-xs text-slate-700 font-medium">
                                          {getCombinationAssetName(leaderId, combination.leader_trailer || combination.leaderTrailer || combination.leader)}
                                        </span>
                                      </div>
                                    )}
                                    {followerId && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                          Seguidora (Follower)
                                        </span>
                                        <span className="text-xs text-slate-700 font-medium">
                                          {getCombinationAssetName(followerId, combination.follower_trailer || combination.followerTrailer || combination.follower)}
                                        </span>
                                      </div>
                                    )}
                                    {!leaderId && !followerId && (
                                      <span className="text-xs text-slate-400 italic">Sem trelas vinculadas</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 align-top text-slate-600">
                              {startedAt ? new Date(startedAt).toLocaleDateString('pt-MZ') : '—'}
                            </td>
                            <td className="px-4 py-3.5 align-top text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCombForReport(combinationId);
                                    setIsReportsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                                  title="Ver relatório de custos, manutenção e quilometragem"
                                >
                                  <BarChart3 size={12} />
                                  <span>Relatório</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => combinationId && handleTerminateCombination(combinationId, combination)}
                                  disabled={!combinationId}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                  title="Desassociar e registar término no histórico de auditoria"
                                >
                                  Desassociar (Terminar)
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

          {/* TAB 2: NOVA ASSOCIAÇÃO DINÂMICA */}
          {combTab === 'create' && (
            <form onSubmit={handleCreateCombination} className="space-y-6">
              
              {/* Nota de boas práticas operacionais */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" />
                  <span>Regra Operacional para Trelas e Conjuntos:</span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  Cada camião e cada trela possuem registo de equipamento individual e código de ativo único. O papel da trela (Líder / Seguidora) é uma associação operacional dinâmica e configurável, permitindo 1 trela simples, 2 trelas (Bitrem) ou mais (Rodotrem).
                </p>
              </div>

              {/* Bloco 1: Código e Camião Trator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="combinationCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Identificador / Código do Conjunto *
                  </label>
                  <input
                    id="combinationCode"
                    required
                    value={combCode}
                    onChange={(event) => setCombCode(event.target.value)}
                    placeholder="Ex: CONJ-001, BITREM-01"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Código de identificação operacional do conjunto rodoviário.</p>
                </div>

                <div>
                  <label htmlFor="combTruck" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Veículo Trator (Camião / Cavalo Mecânico) *
                  </label>
                  <select
                    id="combTruck"
                    required
                    value={combTruckId}
                    onChange={(event) => setCombTruckId(event.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Selecione o veículo trator...</option>
                    {tractorAssets.map((asset) => {
                      const occ = combinationService.checkTruckOccupied(asset.id, activeCombinations);
                      return (
                        <option key={asset.id} value={asset.id}>
                          {asset.code_tag || asset.codeTag || asset.name} - {asset.name}
                          {occ.isOccupied ? ` (Já em uso no conjunto ${occ.activeCombinationCode})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {combTruckId && combinationService.checkTruckOccupied(combTruckId, activeCombinations).isOccupied && (
                    <p className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      Este camião já está associado a outro conjunto ativo. Exceção operacional necessária.
                    </p>
                  )}
                </div>
              </div>

              {/* Bloco 2: Trelas e Papéis Operacionais (Regras 5 e 6) */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Trelas e Semirreboques Acoplados
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configure o papel de cada trela no conjunto rodoviário. O sistema suporta 1 ou mais trelas acopladas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTrailerSlot}
                    className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Adicionar Trela</span>
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {combTrailers.map((slot, index) => {
                    const occ = slot.trailerId ? combinationService.checkTrailerOccupied(slot.trailerId, activeCombinations) : { isOccupied: false };
                    return (
                      <div key={index} className="bg-white border border-slate-200 rounded-md p-3 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 uppercase">
                            Posição #{index + 1}
                          </span>
                          {combTrailers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTrailerSlot(index)}
                              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                              title="Remover esta trela"
                            >
                              <Trash2 size={12} />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-7">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Equipamento Trela / Reboque *
                            </label>
                            <select
                              required
                              value={slot.trailerId}
                              onChange={(e) => handleUpdateTrailerSlot(index, 'trailerId', e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                            >
                              <option value="">Selecione a trela...</option>
                              {trailerAssets.map((asset) => {
                                const trOcc = combinationService.checkTrailerOccupied(asset.id, activeCombinations);
                                return (
                                  <option key={asset.id} value={asset.id}>
                                    {asset.code_tag || asset.codeTag || asset.name} - {asset.name}
                                    {trOcc.isOccupied ? ` (Já no conjunto ${trOcc.activeCombinationCode})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                            {occ.isOccupied && (
                              <p className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                                <AlertTriangle size={11} />
                                Já associada ao conjunto ativo "{occ.activeCombinationCode}".
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-5">
                            {/* RÓTULO EXATO EXIGIDO PELA ESPECIFICAÇÃO */}
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Papel da trela no conjunto *
                            </label>
                            <select
                              required
                              value={slot.role}
                              onChange={(e) => handleUpdateTrailerSlot(index, 'role', e.target.value as TrailerRole)}
                              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer font-medium"
                            >
                              <option value="leader">Líder (Leader)</option>
                              <option value="follower">Seguidora (Follower)</option>
                              <option value="dolly">Dolly / Intermediária (Dolly / Intermediate)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bloco 3: Exceção Operacional Validada (Regra 4) */}
              {(combinationService.checkTruckOccupied(combTruckId, activeCombinations).isOccupied ||
                combTrailers.some((t) => t.trailerId && combinationService.checkTrailerOccupied(t.trailerId, activeCombinations).isOccupied)) && (
                <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase">
                        Autorização de Exceção Operacional Necessária
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Por regra, uma trela ou camião não pode estar simultaneamente em dois conjuntos ativos. Para transferir ou sobrepor este ativo, deve validar expressamente a exceção operacional com justificativa formal.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowOperationalOverride}
                        onChange={(e) => setAllowOperationalOverride(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        Autorizar exceção operacional e reatribuição de ativo em conjunto
                      </span>
                    </label>

                    {allowOperationalOverride && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-amber-900 mb-1">
                          Justificativa Operacional e Validação *
                        </label>
                        <textarea
                          required
                          value={overrideJustification}
                          onChange={(e) => setOverrideJustification(e.target.value)}
                          placeholder="Informe o motivo formal da exceção (ex: substituição emergencial de cavalo mecânico na rota X, autorizada pela gerência)..."
                          rows={2}
                          className="w-full bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-md p-2.5 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {combinationError && (
                <div role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span>{combinationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCombTab('active')}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCombination || !combCode.trim() || !combTruckId || combTrailers.every((t) => !t.trailerId)}
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-2 px-5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {submittingCombination && <Loader2 size={14} className="animate-spin" />}
                  <span>{submittingCombination ? 'A associar...' : 'Ativar e Registar Conjunto'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: HISTÓRICO DE AUDITORIA (REGRA 3) */}
          {combTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Histórico de Alterações e Associações
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Registo rastreável de todas as associações e desassociações com data, hora, utilizador responsável e composição.
                  </p>
                </div>
                {combinationHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await triggerGlobalConfirm({
                        title: 'Limpar Histórico',
                        message: 'Deseja limpar o histórico local de auditoria de combinações?',
                        confirmText: 'Limpar',
                        cancelText: 'Cancelar',
                        danger: true,
                      });
                      if (confirmed) {
                        combinationService.clearHistory(user?.tenantId);
                        setCombinationHistory([]);
                      }
                    }}
                    className="text-[11px] text-slate-500 hover:text-red-600 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Limpar histórico</span>
                  </button>
                )}
              </div>

              {combinationHistory.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 space-y-2">
                  <History size={24} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500">
                    Nenhum registo de alteração no histórico até ao momento. Todas as associações e desassociações efetuadas serão registradas aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-3">Data e Hora</th>
                        <th className="px-3.5 py-3">Operação</th>
                        <th className="px-3.5 py-3">Conjunto</th>
                        <th className="px-3.5 py-3">Camião Trator</th>
                        <th className="px-3.5 py-3">Trelas e Papéis</th>
                        <th className="px-3.5 py-3">Utilizador Responsável</th>
                        <th className="px-3.5 py-3">Observações / Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {combinationHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {new Date(item.timestamp).toLocaleString('pt-MZ', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {item.action === 'association' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Associação
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Desassociação
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-800">
                            {item.combinationCode}
                          </td>
                          <td className="px-3.5 py-3 text-slate-800">
                            {item.truckCodeTag ? `[${item.truckCodeTag}] ` : ''}{item.truckName || '—'}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="space-y-1">
                              {item.trailers.map((tr, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                                    tr.role === 'leader'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : tr.role === 'follower'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {tr.roleLabel || tr.role}
                                  </span>
                                  <span className="text-slate-700">
                                    {tr.codeTag ? `[${tr.codeTag}] ` : ''}{tr.name || tr.id}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-slate-800">{item.performedByUserName}</div>
                            {item.performedByUserEmail && (
                              <div className="text-[10px] text-slate-500">{item.performedByUserEmail}</div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-[11px] text-slate-600 max-w-xs truncate">
                            {item.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </SecondaryView>

      {/* Modal Operacional de Relatórios Consolidados (Regra 7) */}
      <FleetOperationsReportModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        activeCombinations={activeCombinations}
        assets={assets}
        preselectedCombinationId={selectedCombForReport}
      />

      {/* Modal de Confirmação para Salvar como Rascunho */}
      <DraftConfirmModal
        isOpen={isDraftConfirmOpen}
        moduleName={domain === 'plant' ? 'Equipamento' : 'Ativo'}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardDraft}
        onCancel={() => setIsDraftConfirmOpen(false)}
      />

      {/* 5. Menu Flutuante de Ações Rápidas do Ativo via Portal (Camada Mais Alta z-[9999])
          Exclusivo para tenant_admin e supervisor, exatamente 8 opções, sem ícones, vermelho apenas em Eliminar */}
      {canAccessActionMenu && activeAssetForMenu && assetMenuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setActiveAssetForMenu(null);
              setAssetMenuPosition(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${assetMenuPosition.top}px`,
              left: `${assetMenuPosition.left}px`,
            }}
            className="w-56 bg-white border border-slate-200 rounded-lg shadow-2xl z-[9999] py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                setSelectedDetailAsset(target);
                setIsDetailModalOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Ver ficha do equipamento
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                exportAssetTechSheetToExcel(target, formatCategory);
                showAlert({
                  title: 'Ficha Técnica Exportada',
                  message: `Ficha técnica em Excel de ${target.code_tag || target.name} gerada com sucesso.`,
                  type: 'success',
                });
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Baixar ficha técnica (Excel)
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                handleOpenEditModal(target);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Editar equipamento
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                setSelectedMaintenanceAsset(target);
                setIsRegisterMaintenanceOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Registar manutenção
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                setSelectedMeterAsset(target);
                setIsUpdateMeterOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Atualizar hodómetro/horímetro
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                setSelectedHistoryAsset(target);
                setIsMaintenanceHistoryOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Histórico de manutenção
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                handleToggleAssetStatus(target);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {activeAssetForMenu.status === 'inactive' ? 'Marcar como activo' : 'Marcar como inactivo'}
            </button>

            <button
              type="button"
              onClick={() => {
                const target = activeAssetForMenu;
                setActiveAssetForMenu(null);
                setAssetMenuPosition(null);
                setDeletingAsset(target);
                setIsDeleteModalOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-t border-slate-100"
            >
              Eliminar equipamento
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Modais de Suporte às 8 Ações e Personalização */}
      <CustomizeColumnsModal
        isOpen={isCustomizeColumnsOpen}
        onClose={() => setIsCustomizeColumnsOpen(false)}
        availableColumns={tableColumns}
        onApplyLayout={handleApplyColumnLayout}
        onResetDefault={handleResetColumnLayout}
      />

      <AssetDetailsModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailAsset(null);
        }}
        asset={selectedDetailAsset}
        formatCategory={formatCategory}
        onEdit={(asset) => handleOpenEditModal(asset)}
      />

      <RegisterMaintenanceModal
        isOpen={isRegisterMaintenanceOpen}
        onClose={() => {
          setIsRegisterMaintenanceOpen(false);
          setSelectedMaintenanceAsset(null);
        }}
        asset={selectedMaintenanceAsset}
        onSuccess={() => fetchAssets(true)}
      />

      <UpdateMeterModal
        isOpen={isUpdateMeterOpen}
        onClose={() => {
          setIsUpdateMeterOpen(false);
          setSelectedMeterAsset(null);
        }}
        asset={selectedMeterAsset}
        onSuccess={() => fetchAssets(true)}
      />

      <MaintenanceHistoryModal
        isOpen={isMaintenanceHistoryOpen}
        onClose={() => {
          setIsMaintenanceHistoryOpen(false);
          setSelectedHistoryAsset(null);
        }}
        asset={selectedHistoryAsset}
        onNewMaintenance={(asset) => {
          setSelectedMaintenanceAsset(asset);
          setIsRegisterMaintenanceOpen(true);
        }}
      />

    </div>
  );
};

// ==========================================
// PORTAL DO MOTORISTA / CONDUTOR / OPERADOR
// ==========================================
interface DriverOperatorPortalProps {
  assets: Asset[];
  fetchAssets: () => Promise<void>;
  loading: boolean;
}

const DriverOperatorPortal: React.FC<DriverOperatorPortalProps> = ({ assets, fetchAssets, loading }) => {
  const { user } = useAuth();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // Checklist State
  const [fluids, setFluids] = useState(false);
  const [brakes, setBrakes] = useState(false);
  const [lights, setLights] = useState(false);
  const [tires, setTires] = useState(false);
  const [safety, setSafety] = useState(false);
  const [checklistSuccess, setChecklistSuccess] = useState(false);

  // Anomaly State
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [anomalyTitle, setAnomalyTitle] = useState('');
  const [anomalyDesc, setAnomalyDesc] = useState('');
  const [anomalyPriority, setAnomalyPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [currentOdometer, setCurrentOdometer] = useState<number | ''>('');
  const [submittingAnomaly, setSubmittingAnomaly] = useState(false);
  const [anomalySuccess, setAnomalySuccess] = useState(false);

  // Fotografias da anomalia (integração obrigatória com Supabase Storage via backend)
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Identificação do escopo do operador (fabril vs frota)
  const isPlantOperator = user?.operational_scope === 'plant';
  const vehicles = assets.filter(a => {
    if (isPlantOperator) {
      return a.domain === 'plant' || a.category === 'generator' || a.category === 'machinery' || a.category === 'plant_equipment';
    }
    return a.category === 'vehicle_light' || a.category === 'vehicle_heavy' || a.category?.startsWith('vehicle') || FLEET_CATEGORIES.some((fleetCategory) => fleetCategory.code === a.category) || a.domain === 'fleet';
  });

  useEffect(() => {
    if (vehicles.length > 0 && !selectedAssetId) {
      setSelectedAssetId(vehicles[0].id);
      const m = vehicles[0].current_meter ?? vehicles[0].currentMeter ?? '';
      setCurrentOdometer(m);
    }
  }, [vehicles]);

  const handleSelectAsset = (id: string) => {
    setSelectedAssetId(id);
    const selected = vehicles.find(v => v.id === id);
    if (selected) {
      const m = selected.current_meter ?? selected.currentMeter ?? '';
      setCurrentOdometer(m);
    }
    setFluids(false);
    setBrakes(false);
    setLights(false);
    setTires(false);
    setSafety(false);
    setChecklistSuccess(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photoUrls.length + files.length > 5) {
      alert('Pode anexar no máximo 5 fotografias da ocorrência.');
      return;
    }

    setUploadingPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('photo', file);
        const res = await api.post('/notifications/maintenance/upload-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          uploaded.push(res.data.url);
        }
      }
      setPhotoUrls(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      console.error('Erro no upload de fotografia:', err);
      alert(err.response?.data?.error || err.message || 'Erro ao carregar fotografia da avaria.');
    } finally {
      setUploadingPhotos(false);
      if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    setChecklistSuccess(true);
    setTimeout(() => setChecklistSuccess(false), 5000);
  };

  // Submissão da anomalia / avaria pelo condutor/operador:
  // Notifica diretamente o supervisor e envia as fotos para o storage
  const handleAnomalySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !anomalyTitle.trim() || !anomalyDesc.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (photoUrls.length === 0) {
      alert('É obrigatório anexar pelo menos uma fotografia demonstrativa da avaria ou anomalia.');
      return;
    }

    setSubmittingAnomaly(true);
    const payload = {
      assetId: selectedAssetId,
      requesterName: user?.fullName || 'Condutor / Operador',
      problemDescription: `${anomalyTitle.trim()} - ${anomalyDesc.trim()}`,
      priority: anomalyPriority,
      maintenanceType: 'corrective',
      meterReading: currentOdometer !== '' ? Number(currentOdometer) : undefined,
      operationalStatus: anomalyPriority === 'urgent' ? 'stopped_unavailable' : 'operational_with_restriction',
      attachmentUrls: photoUrls,
      status: 'pending_triage'
    };

    try {
      await api.post('/notifications/maintenance', payload);
      setAnomalySuccess(true);
      setAnomalyTitle('');
      setAnomalyDesc('');
      setPhotoUrls([]);
      setTimeout(() => {
        setAnomalySuccess(false);
        setIsAnomalyModalOpen(false);
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao reportar anomalia:', err);
      alert(err.response?.data?.error || err.response?.data?.message || err.message || 'Erro ao comunicar avaria.');
    } finally {
      setSubmittingAnomaly(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedAssetId);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      
      {/* CARD BOAS-VINDAS */}
      <div className="bg-white border border-slate-200 rounded-md p-6 relative overflow-hidden shadow-sm animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center font-bold text-xl uppercase shrink-0">
            {user?.fullName.substring(0, 2).toUpperCase() || 'OP'}
          </div>
          <div>
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">{isPlantOperator ? 'CMMS Moçambique · Portal do Operador Fabril' : 'CMMS Moçambique · Portal do Condutor / Operador'}</span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">Olá, {user?.fullName}!</h1>
            <p className="text-slate-600 text-xs">Efetue vistorias de segurança e reporte avarias de campo rapidamente.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <RefreshCw className="animate-spin text-blue-700 mx-auto" size={24} />
          <p className="text-xs text-slate-500 mt-2 font-medium">A carregar viaturas e equipamentos operacionais...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500 shadow-sm">
          <AlertTriangle className="text-amber-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-semibold text-slate-800">Nenhum veículo ou equipamento fabril associado ao seu perfil.</p>
          <p className="text-[11px] text-slate-500 mt-1">Contacte o supervisor ou gestor para associar recursos ao seu escopo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SELETOR DE VIATURA */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              {isPlantOperator ? 'Selecione o Equipamento em Serviço:' : 'Selecione o Veículo em Serviço:'}
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => handleSelectAsset(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2.5 text-xs text-slate-900 focus:outline-none"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.code_tag || v.codeTag} - {v.name} ({v.license_plate || v.licensePlate || 'Sem Matrícula'})
                </option>
              ))}
            </select>

            {selectedVehicle && (
              <div className="mt-3 bg-slate-50 rounded-md p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Marca/Modelo:</span>
                  <span className="text-slate-800 font-semibold block mt-0.5">{selectedVehicle.brand} {selectedVehicle.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Matrícula:</span>
                  <span className="text-slate-900 font-mono font-semibold block mt-0.5">{selectedVehicle.license_plate || selectedVehicle.licensePlate || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contador Atual:</span>
                  <span className="text-slate-800 font-semibold block mt-0.5">{selectedVehicle.current_meter ?? selectedVehicle.currentMeter ?? 0} km</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estado Operacional:</span>
                  <span className="inline-flex mt-1 items-center px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    {selectedVehicle.status === 'operational' ? 'Operacional' : selectedVehicle.status === 'breakdown' ? 'Avariado' : 'Em Oficina'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CHECKLIST DIÁRIA DE SEGURANÇA */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4 shadow-sm relative">
            <div>
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-blue-700 shrink-0" size={16} />
                Inspeção Diária de Segurança (Checklist)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Marque todos os pontos regulamentares antes de iniciar o serviço.</p>
            </div>

            {checklistSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-emerald-700 text-xs text-center flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 size={16} />
                <span className="font-bold">Checklist guardado com sucesso! Boa viagem com segurança.</span>
              </div>
            ) : (
              <form onSubmit={handleChecklistSubmit} className="space-y-3 pt-2">
                <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={fluids}
                    onChange={(e) => setFluids(e.target.checked)}
                    className="accent-blue-700 bg-white border border-slate-300 rounded w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">Fluidos & Óleos</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Níveis de óleo de motor e água de refrigeração estão corretos e sem fugas visíveis.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={brakes}
                    onChange={(e) => setBrakes(e.target.checked)}
                    className="accent-blue-700 bg-white border border-slate-300 rounded w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">Travões / Sistema de Travagem</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Travão de pé e travão de estacionamento (mão) operam perfeitamente.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={lights}
                    onChange={(e) => setLights(e.target.checked)}
                    className="accent-blue-700 bg-white border border-slate-300 rounded w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">Iluminação & Sinalização</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Faróis médios/máximos, piscas direcionais, stops e luzes de emergência limpos e funcionais.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={tires}
                    onChange={(e) => setTires(e.target.checked)}
                    className="accent-blue-700 bg-white border border-slate-300 rounded w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">Pneus & Jantes</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Rastos em condições regulamentares, pressão correta e pneu suplente disponível.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={safety}
                    onChange={(e) => setSafety(e.target.checked)}
                    className="accent-blue-700 bg-white border border-slate-300 rounded w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 group-hover:text-slate-900">Equipamentos de Proteção</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Cintos de segurança operacionais, triângulo, colete refletor e extintor de incêndio carregado.</p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!fluids || !brakes || !lights || !tires || !safety}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-3 px-4 rounded-md transition-all shadow-none mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Validar Vistoria de Segurança
                </button>
              </form>
            )}
          </div>

          {/* BOTÃO DE ANOMALIA / AVARIA */}
          <div className="bg-red-50 border border-red-200 rounded-md p-5 space-y-3 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={16} />
                Reportar Avaria ou Anomalia Mecânica
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Detetou algum problema durante a condução? Abra imediatamente uma ocorrência para os técnicos.
              </p>
            </div>

            <button
              onClick={() => setIsAnomalyModalOpen(true)}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-medium py-2.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 shadow-none"
            >
              <AlertTriangle size={15} />
              <span>Reportar Anomalia Técnica</span>
            </button>
          </div>

        </div>
      )}

      {/* CAMADA SECUNDÁRIA: SUBMETER ANOMALIA */}
      <SecondaryView
        isOpen={isAnomalyModalOpen}
        onClose={() => setIsAnomalyModalOpen(false)}
        title="Reportar Ocorrência em Campo"
        subtitle="Comunicação de avaria com notificação direta ao supervisor e anexação de fotos"
        icon={<AlertTriangle size={18} className="text-red-600" />}
        maxWidth="max-w-2xl"
      >
        <div className="p-6">
          {anomalySuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center border border-emerald-200 mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Avaria Comunicada com Sucesso!</h4>
                <p className="text-xs text-slate-600 mt-1">O supervisor responsável foi notificado diretamente e as fotografias anexadas foram arquivadas.</p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setIsAnomalyModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAnomalySubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <span className="text-slate-500 font-semibold block">{isPlantOperator ? 'Equipamento Selecionado:' : 'Viatura Selecionada:'}</span>
                <span className="text-slate-900 font-bold font-mono mt-1 block">
                  {selectedVehicle?.code_tag || selectedVehicle?.codeTag} - {selectedVehicle?.name}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Título / Resumo da Avaria *
                </label>
                <input
                  type="text"
                  required
                  value={anomalyTitle}
                  onChange={(e) => setAnomalyTitle(e.target.value)}
                  placeholder="ex: Fuga de óleo sob o radiador"
                  className="w-full bg-white border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Descrição Detalhada do Problema *
                </label>
                <textarea
                  required
                  value={anomalyDesc}
                  onChange={(e) => setAnomalyDesc(e.target.value)}
                  rows={3}
                  placeholder="Descreva o comportamento do veículo, barulhos suspeitos ou luzes do painel acesas..."
                  className="w-full bg-white border border-slate-300 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Quilometragem Atual *
                  </label>
                  <input
                    type="number"
                    required
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="km atual"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Gravidade Indicada
                  </label>
                  <select
                    value={anomalyPriority}
                    onChange={(e) => setAnomalyPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="low">Baixa (Pode circular)</option>
                    <option value="medium">Média (Requer atenção)</option>
                    <option value="high">Alta (Intervenção urgente)</option>
                    <option value="urgent">Crítica (Imobilizar viatura)</option>
                  </select>
                </div>
              </div>

              {/* FOTOGRAFIAS OBRIGATÓRIAS DO PROBLEMA */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Camera size={14} className="text-red-600" />
                    <span>Fotografias do Problema Mecânico *</span>
                  </label>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    photoUrls.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {photoUrls.length === 0 ? 'Obrigatório anexar foto' : `${photoUrls.length}/5 fotos anexadas`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Tire fotografias nítidas da anomalia, peça danificada ou painel para que o supervisor possa avaliar a ocorrência.
                </p>

                {/* Previews das Fotos */}
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-slate-300 bg-slate-100 shadow-2xs">
                        <img src={url} alt={`Evidência ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                          title="Remover fotografia"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão de Upload com suporte a Câmera */}
                {photoUrls.length < 5 && (
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="file"
                      ref={photoFileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      multiple
                      className="hidden"
                      id="operator-anomaly-photo-input"
                      disabled={uploadingPhotos}
                    />
                    <label
                      htmlFor="operator-anomaly-photo-input"
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md text-xs font-semibold border border-dashed transition-all cursor-pointer ${
                        uploadingPhotos
                          ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                          : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700'
                      }`}
                    >
                      {uploadingPhotos ? (
                        <>
                          <RefreshCw size={14} className="animate-spin text-red-600" />
                          <span>A enviar imagem para o storage...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={15} />
                          <span>{photoUrls.length === 0 ? 'Tirar Foto / Carregar da Galeria' : 'Adicionar Mais Fotografias'}</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAnomalyModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAnomaly || uploadingPhotos || photoUrls.length === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md text-xs font-medium transition-colors shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingAnomaly ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      <span>A comunicar avaria...</span>
                    </>
                  ) : (
                    <span>Comunicar Avaria ao Supervisor</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </SecondaryView>

    </div>
  );
};

export default AssetsPage;
