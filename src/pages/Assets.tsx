import React, { useState, useEffect, useRef } from 'react';
import { api, getApiErrorMessage, toFiniteNumber } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { ENERGY_TYPES, FLEET_CATEGORIES, OWNERSHIP_TYPES, TRAILER_SUBTYPES, getSubtypesForType, toBackendCategory } from '../config/fleetCategories';
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
  SlidersHorizontal,
  Info,
  FileText,
  QrCode,
  Edit2,
  Trash2,
  Download,
  Printer,
  UploadCloud,
  File,
  Eye,
  Trash,
  FileSpreadsheet,
  Link
} from 'lucide-react';

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
}

interface DriverUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  operational_scope?: string;
}

interface AssetFormData {
  category: string;
  asset_type: string;
  custom_asset_type?: string;
  asset_subtype: string;
  custom_asset_subtype?: string;
  code_tag: string;
  name: string;
  company: string;
  department: string;
  cost_center: string;
  status: string;
  criticality_level: string;
  operator_driver: string;
  brand: string;
  model: string;
  manufacture_year: string;
  serial_number: string;
  license_plate: string;
  chassis_vin: string;
  engine_number: string;
  color: string;
  energy_type: string;
  ownership_type: string;
  axle_config: string;
  plant_sector: string;
  voltage_specs: string;
  power_kw_kva: string;
  initial_meter: string;
  current_meter: string;
  meter_unit: string;
  shift: string;
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
  maintenance_plan_id: string;
  maintenance_type: string;
  maintenance_periodicity: string;
  technical_specs: {
    engine_type: string;
    power: string;
    fuel: string;
    transmission: string;
    traction: string;
    axles: string;
    weight_load: string;
    tank_capacity: string;
    consumption: string;
    tire_size: string;
  };
  safety_checks: {
    extinguisher_validity: string;
    warning_triangle: string;
    first_aid_kit: string;
    ppe: string;
    general_condition: string;
  };
}

const createInitialAssetFormData = (domain: string, categories: { value: string }[]): AssetFormData => ({
  category: domain === 'fleet' ? FLEET_CATEGORIES[0].code : categories[0]?.value || 'vehicle_light',
  asset_type: '',
  custom_asset_type: '',
  asset_subtype: '',
  custom_asset_subtype: '',
  code_tag: '',
  name: '',
  company: '',
  department: '',
  cost_center: '',
  status: 'operational',
  criticality_level: 'B',
  operator_driver: '',
  brand: '',
  model: '',
  manufacture_year: String(new Date().getFullYear()),
  serial_number: '',
  license_plate: '',
  chassis_vin: '',
  engine_number: '',
  color: '',
  energy_type: 'Diesel',
  ownership_type: 'Próprio',
  axle_config: '',
  plant_sector: '',
  voltage_specs: '',
  power_kw_kva: '',
  initial_meter: '0',
  current_meter: '0',
  meter_unit: domain === 'fleet' ? 'km' : 'h',
  shift: '',
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
  maintenance_plan_id: '',
  maintenance_type: '',
  maintenance_periodicity: '',
  technical_specs: {
    engine_type: '',
    power: '',
    fuel: 'Diesel',
    transmission: '',
    traction: '',
    axles: '',
    weight_load: '',
    tank_capacity: '',
    consumption: '',
    tire_size: ''
  },
  safety_checks: {
    extinguisher_validity: '',
    warning_triangle: '',
    first_aid_kit: '',
    ppe: '',
    general_condition: ''
  }
});

export const AssetsPage: React.FC = () => {
  const { user, isTechnician, isDriverOperator, isFleet, isPlant, currentScope } = useAuth();
  const domainConfig = useCurrentDomain();
  const { categories, complianceDocTypes, counterLabel, counterUnit, searchPlaceholder, domain, assetNamePlural } = domainConfig;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [combTruckId, setCombTruckId] = useState('');
  const [combCode, setCombCode] = useState('');
  const [combLeaderId, setCombLeaderId] = useState('');
  const [combFollowerId, setCombFollowerId] = useState('');
  const [loadingCombinations, setLoadingCombinations] = useState(false);
  const [submittingCombination, setSubmittingCombination] = useState(false);
  const [combinationError, setCombinationError] = useState<string | null>(null);

  // Ativação da tecla ESC nos modais de Ativos
  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
  useEscapeKey(() => setIsDocModalOpen(false), isDocModalOpen);
  useEscapeKey(() => setIsQrModalOpen(false), isQrModalOpen);
  useEscapeKey(() => setIsDeleteModalOpen(false), isDeleteModalOpen);
  useEscapeKey(() => setIsCombinationsModalOpen(false), isCombinationsModalOpen);

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
  const selectedFleetCategory = FLEET_CATEGORIES.find((fleetCategory) => fleetCategory.code === formData.category);

  // Lista de Operadores / Motoristas disponíveis no tenant e escopo atual
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  // Etapa 4: Documento Inicial
  const [wizardFile, setWizardFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

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
  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/assets');
      const aData = Array.isArray(res.data) ? res.data : (res.data?.assets || res.data?.data || []);
      setAssets(aData);
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
    setCombLeaderId('');
    setCombFollowerId('');
    fetchCombinations();
  };

  const handleCreateCombination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combCode.trim() || !combTruckId || !combLeaderId) {
      setCombinationError('Preencha o código, o camião trator e a trela líder.');
      return;
    }

    setSubmittingCombination(true);
    setCombinationError(null);
    try {
      await api.post('/fleet-combinations', {
        combination_code: combCode.trim(),
        truck_id: combTruckId,
        leader_trailer_id: combLeaderId,
        follower_trailer_id: combFollowerId || undefined
      });
      setCombCode('');
      setCombTruckId('');
      setCombLeaderId('');
      setCombFollowerId('');
      await fetchCombinations();
      setSuccessMessage('Conjunto rodoviário criado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao criar conjunto rodoviário:', err);
      setCombinationError(err.response?.data?.message || err.message || 'Não foi possível criar o conjunto rodoviário.');
    } finally {
      setSubmittingCombination(false);
    }
  };

  const handleTerminateCombination = async (combinationId: string) => {
    try {
      await api.patch(`/fleet-combinations/${combinationId}/terminate`);
      setActiveCombinations((previous) => previous.filter((combination) => combination.id !== combinationId));
      setSuccessMessage('Conjunto desassociado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao desassociar conjunto:', err);
      setCombinationError(err.response?.data?.message || err.message || 'Não foi possível desassociar o conjunto.');
    }
  };

  useEffect(() => {
    fetchAssets();
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
            role: 'driver_operator',
            operational_scope: domain
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
      const valueToEncode = selectedQrAsset.id;
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

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setActiveTab(0);
      alert('O Nome do Ativo é obrigatório.');
      return false;
    }
    if (!formData.cost_center.trim()) {
      setActiveTab(0);
      alert('O Centro de Custo é obrigatório.');
      return false;
    }
    if (!formData.model.trim()) {
      setActiveTab(1);
      alert('O Modelo é obrigatório.');
      return false;
    }
    if (domain === 'fleet' && !formData.asset_type.trim()) {
      setActiveTab(0);
      alert('O Tipo de Equipamento é obrigatório.');
      return false;
    }
    if (domain === 'fleet' && formData.asset_type === 'Outro tipo (especificar)' && !formData.custom_asset_type?.trim()) {
      setActiveTab(0);
      alert('Por favor, especifique o Tipo de Equipamento.');
      return false;
    }
    if (formData.asset_subtype === 'Outro (especificar)' && !formData.custom_asset_subtype?.trim()) {
      setActiveTab(0);
      alert('Por favor, especifique o Subtipo / Configuração.');
      return false;
    }
    return true;
  };

  const handleCategoryChange = (nextCategory: string) => {
    setFormData((previous) => ({
      ...previous,
      category: nextCategory,
      asset_type: '',
      custom_asset_type: '',
      asset_subtype: '',
      custom_asset_subtype: ''
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

    const payload = {
      ...formData,
      // Categoria convertida para o conjunto canónico aceite pelo backend.
      // Na edição o campo é bloqueado no formulário, por isso nunca é reenviado
      // (evita que a categoria original seja corrompida/normalizada indevidamente).
      category: modalMode === 'create' ? toBackendCategory(formData.category, domain) : undefined,
      codeTag: formData.code_tag,
      assetType: finalAssetType || undefined,
      asset_subtype: finalAssetSubtype || undefined,
      assetSubtype: finalAssetSubtype || undefined,
      energy_type: formData.technical_specs.fuel || formData.energy_type,
      energyType: formData.technical_specs.fuel || formData.energy_type,
      ownership_type: formData.ownership_type,
      ownershipType: formData.ownership_type,
      axle_config: axleConfig,
      axleConfig,
      criticalityLevel: formData.criticality_level,
      manufacture_year: manufactureYear,
      manufactureYear,
      costCenter: formData.cost_center,
      meter_kind: meterKind,
      meterKind,
      initial_meter: initialMeter,
      current_meter: currentMeter,
      currentMeter,
      // Campos do formulário mapeados para as colunas padrão do backend
      // (sem este mapeamento eram simplesmente ignorados no servidor).
      measurement_unit: formData.meter_unit || undefined,
      measurementUnit: formData.meter_unit || undefined,
      operational_shift: formData.shift || undefined,
      operationalShift: formData.shift || undefined,
      operation_start_date: formData.operation_date || undefined,
      operationStartDate: formData.operation_date || undefined,
      operator_name: formData.operator_driver || undefined,
      operatorName: formData.operator_driver || undefined,
      color_config: formData.color || undefined,
      acquisition_value: acquisitionValue,
      acquisitionValue,
      licensePlate: formData.license_plate,
      chassisVin: formData.chassis_vin,
      engineNumber: formData.engine_number,
      fuel_tank_capacity_liters: fuelTankCapacityLiters,
      fuelTankCapacityLiters,
      plantSector: formData.plant_sector,
      voltageSpecs: formData.voltage_specs,
      power_kw_kva: powerKwKva,
      powerKwKva,
      inatro_inspection_expiry: isVehicle ? formData.inspection_expiry || undefined : undefined,
      inatroInspectionExpiry: isVehicle ? formData.inspection_expiry || undefined : undefined,
      innoq_calibration_expiry: !isVehicle ? formData.inspection_expiry || undefined : undefined,
      innoqCalibrationExpiry: !isVehicle ? formData.inspection_expiry || undefined : undefined,
      insuranceCompany: formData.insurance_company,
      insurancePolicyNumber: formData.insurance_policy_number,
      warrantyExpiry: formData.warranty_expiry,
      local_supplier_name: formData.supplier || undefined,
      localSupplierName: formData.supplier || undefined,
      status
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
          documentFormData.append('title', 'Ficha Técnica Inicial');

          try {
            await api.post(`/assets/${assetId}/documents`, documentFormData);
          } catch (docErr) {
            console.error('Falha ao enviar documento inicial:', docErr);
            alert('Ativo cadastrado com sucesso, mas o upload da ficha falhou. Você pode reenviar o documento na lista.');
          }
        }
        setSuccessMessage('Ativo cadastrado com sucesso no CMMS!');
      } else {
        await api.put(`/assets/${editingAssetId}`, payload);
        setSuccessMessage('Dados do Ativo atualizados com sucesso!');
      }

      setIsModalOpen(false);
      resetWizardForm();
      await fetchAssets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar ativo:', err);
      alert(getApiErrorMessage(err, 'Erro ao guardar dados do ativo.'));
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
  };

  const handleOpenEditModal = (asset: Asset) => {
    resetWizardForm();
    setModalOpenMode('edit');
    setEditingAssetId(asset.id);

    const assetData = asset as unknown as Record<string, unknown>;
    const read = (...keys: string[]): string => {
      const value = keys.map((key) => assetData[key]).find((item) => item !== undefined && item !== null);
      return value === undefined ? '' : String(value);
    };
    // Categoria inicial da edição: mantém o código de UI quando existir opção
    // correspondente; caso contrário preserva o valor canónico vindo do backend
    // (o <select> é bloqueado na edição e o valor nunca é reenviado ao servidor).
    const knownUiCategory = FLEET_CATEGORIES.some((fleetCategory) => fleetCategory.code === asset.category)
      || categories.some((item) => item.value === asset.category);
    const initialCategory = knownUiCategory
      ? asset.category || ''
      : asset.category === 'vehicle_heavy'
        ? 'CAT-03'
        : asset.category === 'vehicle_light'
          ? 'CAT-01'
          : asset.category
            || (domain === 'fleet'
              ? FLEET_CATEGORIES[0].code
              : categories[0]?.value || 'vehicle_light');
    const initialData = createInitialAssetFormData(domain, categories);
    const technicalSpecs = assetData.technical_specs as AssetFormData['technical_specs'] | undefined;
    const safetyChecks = assetData.safety_checks as AssetFormData['safety_checks'] | undefined;
    const currentAssetType = read('asset_type', 'assetType');
    const currentAssetSubtype = read('asset_subtype', 'assetSubtype');

    setFormData({
      ...initialData,
      category: initialCategory,
      asset_type: currentAssetType,
      custom_asset_type: '',
      asset_subtype: currentAssetSubtype,
      custom_asset_subtype: '',
      code_tag: read('code_tag', 'codeTag'),
      name: asset.name || '',
      company: read('company'),
      department: read('department'),
      cost_center: read('cost_center', 'costCenter'),
      status: read('status') || 'operational',
      criticality_level: read('criticality_level', 'criticalityLevel') || 'B',
      operator_driver: read('operator_driver', 'operatorDriver', 'operator_name', 'operatorName'),
      brand: asset.brand || '',
      model: asset.model || '',
      manufacture_year: read('manufacture_year', 'manufactureYear') || initialData.manufacture_year,
      serial_number: read('serial_number', 'serialNumber'),
      license_plate: read('license_plate', 'licensePlate'),
      chassis_vin: read('chassis_vin', 'chassisVin'),
      engine_number: read('engine_number', 'engineNumber'),
      color: read('color', 'color_config', 'colorConfig'),
      energy_type: read('energy_type', 'energyType') || 'Diesel',
      ownership_type: read('ownership_type', 'ownershipType') || 'Próprio',
      axle_config: read('axle_config', 'axleConfig'),
      plant_sector: read('plant_sector', 'plantSector'),
      voltage_specs: read('voltage_specs', 'voltageSpecs'),
      power_kw_kva: read('power_kw_kva', 'powerKwKva'),
      initial_meter: read('initial_meter', 'initialMeter') || '0',
      current_meter: read('current_meter', 'currentMeter') || '0',
      meter_unit: read('meter_unit', 'meterUnit', 'measurement_unit', 'measurementUnit') || initialData.meter_unit,
      shift: read('shift', 'operational_shift', 'operationalShift'),
      acquisition_date: read('acquisition_date', 'acquisitionDate'),
      operation_date: read('operation_date', 'operationDate', 'operation_start_date', 'operationStartDate'),
      acquisition_value: read('acquisition_value', 'acquisitionValue'),
      currency: read('currency') || 'MZN',
      supplier: read('supplier', 'local_supplier_name', 'localSupplierName'),
      warranty_expiry: read('warranty_expiry', 'warrantyExpiry'),
      insurance_company: read('insurance_company', 'insuranceCompany'),
      insurance_policy_number: read('insurance_policy_number', 'insurancePolicyNumber'),
      insurance_expiry: read('insurance_expiry', 'insuranceExpiry'),
      inspection_expiry: read(
        'inspection_expiry',
        domain === 'fleet' ? 'inatro_inspection_expiry' : 'innoq_calibration_expiry',
        domain === 'fleet' ? 'inatroInspectionExpiry' : 'innoqCalibrationExpiry'
      ) || read('pressure_test_expiry', 'pressureTestExpiry'),
      maintenance_plan_id: read('maintenance_plan_id', 'maintenancePlanId'),
      maintenance_type: read('maintenance_type', 'maintenanceType'),
      maintenance_periodicity: read('maintenance_periodicity', 'maintenancePeriodicity'),
      technical_specs: {
        ...initialData.technical_specs,
        ...technicalSpecs,
        fuel: technicalSpecs?.fuel || read('energy_type', 'energyType') || initialData.technical_specs.fuel
      },
      safety_checks: {
        ...initialData.safety_checks,
        ...safetyChecks,
        warning_triangle: safetyChecks?.warning_triangle === undefined
          ? initialData.safety_checks.warning_triangle
          : String(safetyChecks.warning_triangle),
        first_aid_kit: safetyChecks?.first_aid_kit === undefined
          ? initialData.safety_checks.first_aid_kit
          : String(safetyChecks.first_aid_kit)
      }
    });

    setIsModalOpen(true);
  };

  // ==========================================
  // ADICIONAR DOCUMENTAÇÃO COMPLEMENTAR
  // ==========================================
  const handleAddAdditionalDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocAsset || !selectedFile || !docTitle.trim()) {
      alert('Preencha o título e selecione um documento.');
      return;
    }

    setIsUploadingDoc(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', docTitle);
    formData.append('documentType', docType);

    try {
      // Execute o post diretamente com a instância api sem cabeçalho manual de Content-Type
      await api.post(`/assets/${selectedDocAsset.id}/documents`, formData);
      alert('Documento anexado com sucesso!');
      setDocTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // atualize a listagem chamando api.get
      await loadDocuments(selectedDocAsset.id);
    } catch (err: any) {
      console.error('Erro ao fazer upload do documento:', err);
      alert(err.response?.data?.message || err.message || 'Falha ao fazer upload do documento.');
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
      await fetchAssets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao arquivar ativo:', err);
      alert(err.response?.data?.message || err.message || 'Falha ao arquivar ativo.');
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
    const fleetCategory = FLEET_CATEGORIES.find((item) => item.code === cat);
    if (fleetCategory) return `${fleetCategory.code} - ${fleetCategory.name}`;

    switch (cat) {
      case 'vehicle_light':
        return 'Veículo Ligeiro';
      case 'vehicle_heavy':
        return 'Frota Pesada';
      case 'generator':
        return 'Gerador Industrial';
      case 'machinery':
        return 'Maquinaria / Chão Fábrica';
      case 'plant_equipment':
        return 'Equipamento de Chão de Fábrica';
      default:
        return cat || 'Não especificado';
    }
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
    const matchesCategory = categoryFilter === 'all'
      || toBackendCategory(asset.category, domain) === toBackendCategory(categoryFilter, domain);

    // Filtro baseado no escopo ativo ('fleet' ou 'plant').
    // Prioriza o domínio gravado no backend (coluna domain) e usa a categoria
    // apenas como fallback para registos antigos sem domínio.
    let matchesScope = true;
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

    return matchesSearch && matchesCategory && matchesScope;
  });

  const tractorAssets = assets.filter((asset) => {
    const type = (asset.asset_type || asset.assetType || '').toLowerCase();
    return type === 'camião trator' || type === 'caminhao trator' || asset.category === 'vehicle_heavy';
  });
  const trailerAssets = assets.filter((asset) => {
    const categoryName = asset.category.toLowerCase();
    const type = `${asset.asset_type || asset.assetType || ''} ${asset.asset_subtype || asset.assetSubtype || ''}`.toLowerCase();
    return asset.category === 'CAT-06' || categoryName.includes('reboque') || categoryName.includes('semirreboque') || /trela|reboque|semirreboque|dolly/.test(type);
  });

  const getCombinationAssetName = (assetId: string | undefined, nestedAsset: any) => {
    const matchedAsset = assets.find((asset) => asset.id === assetId);
    return nestedAsset?.name || nestedAsset?.code_tag || nestedAsset?.codeTag || matchedAsset?.name || matchedAsset?.code_tag || matchedAsset?.codeTag || assetId || '—';
  };

  const fieldClass = 'w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none';
  const renderInput = (label: string, field: Exclude<keyof AssetFormData, 'technical_specs' | 'safety_checks'>, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={formData[field]} placeholder={placeholder} onChange={(e) => updateFormField(field, e.target.value)} className={fieldClass} />
    </div>
  );
  const renderTechnicalInput = (label: string, field: keyof AssetFormData['technical_specs'], type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={formData.technical_specs[field]} onChange={(e) => updateTechnicalSpec(field, e.target.value)} className={fieldClass} />
    </div>
  );
  const renderSafetyInput = (label: string, field: keyof AssetFormData['safety_checks'], type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={formData.safety_checks[field]} onChange={(e) => updateSafetyCheck(field, e.target.value)} className={fieldClass} />
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
            {domain === 'plant' && <Wrench className="text-blue-700" size={24} />}
            <span>{domain === 'plant' ? 'Equipamentos Fabris' : 'Frota'}</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {domain === 'plant'
              ? 'Registo e controlo de equipamentos industriais, geradores e maquinaria de chão de fábrica.'
              : 'Registo e controlo operacional de viaturas ligeiras, pesadas e frotas de transporte.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAssets}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {!isTechnician && !isDriverOperator && (
            <>
              {domain === 'fleet' && (
                <>
                  <button
                    onClick={() => {
                      setBatchFile(null);
                      setParsedBatchData([]);
                      setBatchError(null);
                      setIsBatchImportModalOpen(true);
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
                  >
                    <FileSpreadsheet size={16} className="text-slate-500" />
                    <span>Importar em Lote</span>
                  </button>
                  <button
                    onClick={() => {
                      resetWizardForm();
                      setModalOpenMode('create');
                      setActiveTab(0);
                      setIsModalOpen(true);
                    }}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
                  >
                    <Plus size={16} />
                    <span>Cadastrar Ativo</span>
                  </button>
                </>
              )}
            </>
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
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {domain === 'fleet'
              ? FLEET_CATEGORIES.map((fleetCategory) => (
                  <option key={fleetCategory.code} value={fleetCategory.code}>
                    {fleetCategory.code} - {fleetCategory.name}
                  </option>
                ))
              : categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* Tabela de Ativos com Ações Completas */}
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
            <p className="text-slate-500 text-xs mt-1">
              {(user?.operational_scope || user?.tenant?.operational_scope || domain) === 'plant' 
                ? 'Registe equipamentos fabris para iniciar.' 
                : 'Registe viaturas e frotas para iniciar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-xs uppercase bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Código / Tag</th>
                  <th className="py-3 px-4 font-semibold">Ativo / Equipamento</th>
                  <th className="py-3 px-4 font-semibold">Categoria</th>
                  <th className="py-3 px-4 font-semibold">Centro de Custo</th>
                  <th className="py-3 px-4 font-semibold text-center">Criticidade</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => {
                  const tag = asset.code_tag || asset.codeTag || 'AUTO-TAG';
                  const level = asset.criticality_level || asset.criticalityLevel || 'B';
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{tag}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-medium text-sm">{asset.name}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{asset.brand} {asset.model}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatCategory(asset.category)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {asset.cost_center || asset.costCenter}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          level === 'A' 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : level === 'B' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          Nível {level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(asset.status)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Gestão Documental */}
                          <button
                            onClick={() => {
                              setSelectedDocAsset(asset);
                              setIsDocModalOpen(true);
                              loadDocuments(asset.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            title="Documentos do Ativo"
                          >
                            <FileText size={15} />
                          </button>
                          
                          {/* QR Code */}
                          <button
                            onClick={() => {
                              setSelectedQrAsset(asset);
                              setIsQrModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            title="Código QR / Etiqueta"
                          >
                            <QrCode size={15} />
                          </button>

                          {/* Editar */}
                          {!isTechnician && !isDriverOperator && (
                            <button
                              onClick={() => handleOpenEditModal(asset)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                              title="Editar Ativo"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {/* Arquivar / Delete */}
                          {!isTechnician && !isDriverOperator && (
                            <button
                              onClick={() => {
                                setDeletingAsset(asset);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Arquivar Ativo"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {/* Modal de cadastro e edição da ficha técnica */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Cadastrar Novo Ativo' : 'Editar Ativo Corporativo'}
                </h2>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Fechar formulário" className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div role="tablist" aria-label="Blocos da ficha técnica" className="px-4 py-3 border-b border-slate-200 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white">
              {['Identificação', 'Fabricante', 'Características Técnicas', 'Operação & Medidores', 'Conformidade & Aquisição', 'Manutenção', 'Segurança'].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === index}
                  onClick={() => setActiveTab(index)}
                  className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === index ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span className="mr-1.5 opacity-75">{index + 1}</span>{tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 flex-1 overflow-y-auto scrollbar-thin">
              <div role="tabpanel" className="min-h-[280px]">
                {activeTab === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria *</label>
                      {domain === 'fleet' ? (
                        <select value={formData.category} disabled={modalMode === 'edit'} onChange={(e) => handleCategoryChange(e.target.value)} className={fieldClass}>
                          {FLEET_CATEGORIES.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}
                          {/* Categoria canónica vinda do backend sem código de UI equivalente */}
                          {formData.category && !FLEET_CATEGORIES.some((item) => item.code === formData.category) && (
                            <option key={formData.category} value={formData.category}>{formatCategory(formData.category)}</option>
                          )}
                        </select>
                      ) : (
                        <select value={formData.category} disabled={modalMode === 'edit'} onChange={(e) => handleCategoryChange(e.target.value)} className={fieldClass}>
                          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          {formData.category && !categories.some((item) => item.value === formData.category) && (
                            <option key={formData.category} value={formData.category}>{formatCategory(formData.category)}</option>
                          )}
                        </select>
                      )}
                    </div>
                    {domain === 'fleet' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de equipamento *</label>
                          <select
                            value={formData.asset_type}
                            onChange={(e) => {
                              updateFormField('asset_type', e.target.value);
                              if (e.target.value !== 'Outro tipo (especificar)') {
                                updateFormField('custom_asset_type', '');
                              }
                            }}
                            className={fieldClass}
                          >
                            <option value="">Selecione um tipo...</option>
                            {selectedFleetCategory?.types.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            {/* Tipo gravado no backend sem correspondência na lista da categoria atual */}
                            {formData.asset_type && !(selectedFleetCategory?.types ?? []).includes(formData.asset_type) && (
                              <option key={formData.asset_type} value={formData.asset_type}>{formData.asset_type}</option>
                            )}
                          </select>
                        </div>
                        {formData.asset_type === 'Outro tipo (especificar)' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especificar tipo de equipamento *</label>
                            <input
                              type="text"
                              placeholder="Digite o tipo do equipamento..."
                              value={formData.custom_asset_type || ''}
                              onChange={(e) => updateFormField('custom_asset_type', e.target.value)}
                              className={fieldClass}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {(() => {
                      const availableSubtypes = getSubtypesForType(formData.category, formData.asset_type);
                      if (availableSubtypes.length === 0 && !formData.asset_subtype) return null;
                      return (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subtipo / Configuração</label>
                            <select
                              value={formData.asset_subtype}
                              onChange={(e) => {
                                updateFormField('asset_subtype', e.target.value);
                                if (e.target.value !== 'Outro (especificar)') {
                                  updateFormField('custom_asset_subtype', '');
                                }
                              }}
                              className={fieldClass}
                            >
                              <option value="">Selecione um subtipo...</option>
                              {availableSubtypes.map((subtype) => (
                                <option key={subtype} value={subtype}>{subtype}</option>
                              ))}
                              {formData.asset_subtype && !availableSubtypes.includes(formData.asset_subtype) && (
                                <option key={formData.asset_subtype} value={formData.asset_subtype}>{formData.asset_subtype}</option>
                              )}
                            </select>
                          </div>
                          {formData.asset_subtype === 'Outro (especificar)' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especificar subtipo / configuração *</label>
                              <input
                                type="text"
                                placeholder="Digite o subtipo..."
                                value={formData.custom_asset_subtype || ''}
                                onChange={(e) => updateFormField('custom_asset_subtype', e.target.value)}
                                className={fieldClass}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {renderInput('Código do ativo', 'code_tag', 'text', 'Gerado automaticamente se vazio')}
                    {renderInput('Nome / Designação *', 'name', 'text', 'Nome do equipamento')}
                    {renderInput('Empresa', 'company')}
                    {renderInput('Departamento', 'department')}
                    {renderInput('Centro de custo *', 'cost_center')}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado</label>
                      <select value={formData.status} onChange={(e) => updateFormField('status', e.target.value)} className={fieldClass}>
                        <option value="operational">Operacional</option><option value="under_maintenance">Em manutenção</option><option value="breakdown">Avariado</option><option value="decommissioned">Abatido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Criticidade</label>
                      <select value={formData.criticality_level} onChange={(e) => updateFormField('criticality_level', e.target.value)} className={fieldClass}>
                        <option value="A">A - Alta</option><option value="B">B - Média</option><option value="C">C - Baixa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {domain === 'fleet' ? 'Motorista / Condutor' : 'Operador do Equipamento'}
                      </label>
                      <select
                        value={formData.operator_driver}
                        onChange={(e) => updateFormField('operator_driver', e.target.value)}
                        className={fieldClass}
                        disabled={loadingDrivers}
                      >
                        <option value="">
                          {loadingDrivers ? 'A carregar lista de utilizadores...' : 'Selecione o operador / motorista...'}
                        </option>
                        {drivers.map((drv) => (
                          <option key={drv.id} value={drv.full_name}>
                            {drv.full_name} {drv.email ? `(${drv.email})` : ''}
                          </option>
                        ))}
                        {/* Se o ativo já tinha um operador gravado e ele não consta na lista filtrada */}
                        {formData.operator_driver && !drivers.some((drv) => drv.full_name === formData.operator_driver) && (
                          <option key={formData.operator_driver} value={formData.operator_driver}>
                            {formData.operator_driver} (atribuído atualmente)
                          </option>
                        )}
                      </select>
                      {driversError && (
                        <p className="mt-1 text-[11px] text-amber-600">{driversError}</p>
                      )}
                      {!loadingDrivers && drivers.length === 0 && !driversError && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Nenhum utilizador com função de {domain === 'fleet' ? 'motorista' : 'operador'} registado no escopo {domain}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 1 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderInput('Marca', 'brand')}
                  {renderInput('Modelo *', 'model')}
                  {renderInput('Ano de fabrico', 'manufacture_year', 'number')}
                  {renderInput('Nº de série', 'serial_number')}
                  {renderInput('Chassis / VIN', 'chassis_vin')}
                  {renderInput('Nº do motor', 'engine_number')}
                  {renderInput('Cor', 'color')}
                  {renderInput('Matrícula / Identificação', 'license_plate')}
                </div>}

                {activeTab === 2 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderTechnicalInput('Motor', 'engine_type')}
                  {renderTechnicalInput('Potência', 'power')}
                  {renderTechnicalInput('Combustível', 'fuel')}
                  {renderTechnicalInput('Transmissão', 'transmission')}
                  {renderTechnicalInput('Tração', 'traction')}
                  {renderTechnicalInput('Eixos', 'axles')}
                  {renderTechnicalInput('Peso / Carga', 'weight_load')}
                  {renderTechnicalInput('Capacidade do tanque', 'tank_capacity', 'number')}
                  {renderTechnicalInput('Consumo', 'consumption')}
                  {renderTechnicalInput('Pneus', 'tire_size')}
                  {domain === 'plant' && <>
                    {renderInput('Setor fabril', 'plant_sector')}
                    {renderInput('Especificação de tensão', 'voltage_specs')}
                    {renderInput('Potência (kW/kVA)', 'power_kw_kva', 'number')}
                  </>}
                </div>}

                {activeTab === 3 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderInput(`Medidor inicial (${formData.meter_unit})`, 'initial_meter', 'number')}
                  {renderInput(`Medidor atual (${formData.meter_unit})`, 'current_meter', 'number')}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade de medida</label>
                    <select value={formData.meter_unit} onChange={(e) => updateFormField('meter_unit', e.target.value)} className={fieldClass}>
                      <option value="km">Quilómetros (km)</option><option value="h">Horas (h)</option>
                    </select>
                  </div>
                  {renderInput('Turno', 'shift')}
                </div>}

                {activeTab === 4 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderInput('Data de aquisição', 'acquisition_date', 'date')}
                  {renderInput('Data de entrada em operação', 'operation_date', 'date')}
                  {renderInput('Valor de aquisição', 'acquisition_value', 'number')}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Moeda</label>
                    <select value={formData.currency} onChange={(e) => updateFormField('currency', e.target.value)} className={fieldClass}>
                      {['MZN', 'USD', 'EUR', 'ZAR'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </div>
                  {renderInput('Fornecedor', 'supplier')}
                  {renderInput('Validade da garantia', 'warranty_expiry', 'date')}
                  {renderInput('Seguradora', 'insurance_company')}
                  {renderInput('Nº da apólice', 'insurance_policy_number')}
                  {renderInput('Validade do seguro', 'insurance_expiry', 'date')}
                  {renderInput('Validade da inspeção / calibração', 'inspection_expiry', 'date')}
                  {modalMode === 'create' && <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`md:col-span-3 rounded-md border-2 border-dashed p-4 ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ficha técnica inicial (opcional, até 20 MB)</label>
                    <input type="file" onChange={handleFileChange} accept=".pdf,.png,.jpeg,.jpg,.webp" className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold" />
                    {wizardFile && <p className="mt-1 text-xs text-blue-700">{wizardFile.name} ({(wizardFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
                  </div>}
                </div>}

                {activeTab === 5 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plano de manutenção associado</label>
                    <select value={formData.maintenance_plan_id} onChange={(e) => updateFormField('maintenance_plan_id', e.target.value)} className={fieldClass}>
                      <option value="">Sem plano associado</option>
                      {maintenancePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
                    </select>
                    {maintenancePlansError && <p role="alert" className="mt-1 text-xs text-red-700">{maintenancePlansError}</p>}
                  </div>
                  {renderInput('Tipo de manutenção', 'maintenance_type')}
                  {renderInput('Periodicidade', 'maintenance_periodicity')}
                </div>}

                {activeTab === 6 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderSafetyInput('Validade do extintor', 'extinguisher_validity', 'date')}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Triângulo de sinalização</label>
                    <select value={formData.safety_checks.warning_triangle} onChange={(e) => updateSafetyCheck('warning_triangle', e.target.value)} className={fieldClass}>
                      <option value="">Selecione...</option><option value="true">Disponível</option><option value="false">Em falta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kit de primeiros socorros</label>
                    <select value={formData.safety_checks.first_aid_kit} onChange={(e) => updateSafetyCheck('first_aid_kit', e.target.value)} className={fieldClass}>
                      <option value="">Selecione...</option><option value="true">Disponível</option><option value="false">Em falta</option>
                    </select>
                  </div>
                  {renderSafetyInput('EPIs', 'ppe')}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Condição geral</label>
                    <select value={formData.safety_checks.general_condition} onChange={(e) => updateSafetyCheck('general_condition', e.target.value)} className={fieldClass}>
                      <option value="">Selecione...</option><option value="good">Boa</option><option value="fair">Regular</option><option value="poor">Deficiente</option>
                    </select>
                  </div>
                </div>}
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-5 mt-6">
                <button type="button" onClick={() => setActiveTab((tab) => Math.max(0, tab - 1))} disabled={activeTab === 0 || submitting} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium disabled:opacity-40">
                  Anterior
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium">Cancelar</button>
                  {activeTab < 6 ? (
                    <button type="button" onClick={() => setActiveTab((tab) => Math.min(6, tab + 1))} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium">Seguinte</button>
                  ) : (
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                      {submitting ? <><Loader2 size={14} className="animate-spin" />A processar...</> : modalMode === 'create' ? 'Cadastrar Ativo' : 'Atualizar Ativo'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: GESTÃO DOCUMENTAL DO ATIVO
          ========================================== */}
      {isDocModalOpen && selectedDocAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-md shadow-xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  Documentos: {selectedDocAsset.code_tag || selectedDocAsset.codeTag}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsDocModalOpen(false);
                  setSelectedDocAsset(null);
                  setSelectedFile(null);
                  setDocTitle('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-thin">
              
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
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: VISUALIZAÇÃO E IMPRESSÃO DE QR CODE
          ========================================== */}
      {isQrModalOpen && selectedQrAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in print:bg-white print:text-black">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden flex flex-col print:border-none print:shadow-none print:bg-white">
            
            {/* Header (Escondido na impressão) */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <QrCode className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">Etiqueta QR Code</h2>
              </div>
              <button
                onClick={() => {
                  setIsQrModalOpen(false);
                  setSelectedQrAsset(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo / Etiqueta Imprimível */}
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 print:p-0 print:text-black">
              
              {/* Cartão de Etiqueta com Borda Refinada */}
              <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col items-center shadow-sm w-full max-w-[260px] print:shadow-none print:border-2 print:border-black">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 print:text-black">AVEXAS CMMS</span>
                
                {/* Canvas do QR Code */}
                <canvas ref={qrCanvasRef} className="mx-auto" />
                
                <div className="mt-3 text-slate-900 print:text-black">
                  <span className="font-mono font-bold text-sm tracking-wide block uppercase text-slate-900">
                    {selectedQrAsset.code_tag || selectedQrAsset.codeTag}
                  </span>
                  <span className="text-xs font-semibold block text-slate-700 truncate max-w-[200px] mt-0.5">
                    {selectedQrAsset.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
                    {formatCategory(selectedQrAsset.category)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação (Escondidos na impressão) */}
              <div className="flex gap-2 w-full pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={handleDownloadQrCode}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>PNG</span>
                </button>
                <button
                  onClick={handlePrintLabel}
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMAÇÃO DE ARQUIVAMENTO (DELETE)
          ========================================== */}
      {isDeleteModalOpen && deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl p-6 space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-md flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Arquivar Ativo de Manutenção</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Tem a certeza que deseja arquivar o ativo <span className="font-bold text-slate-900 font-mono">{deletingAsset.code_tag || deletingAsset.codeTag}</span>? 
                Esta ação moverá o equipamento para o histórico e o impedirá de abrir novas ordens de serviço.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingAsset(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAsset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-medium rounded-md transition-all shadow-none"
              >
                Confirmar Arquivamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: IMPORTAÇÃO EM LOTE (CSV BATCH IMPORT)
          ========================================== */}
      {isBatchImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-blue-700" size={18} />
                <h3 className="text-sm font-bold text-slate-900">Importação de Ativos em Lote (CSV)</h3>
              </div>
              <button
                onClick={() => setIsBatchImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal (Rolável) */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              
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

          </div>
        </div>
      )}

      {isCombinationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white border border-slate-200 w-full max-w-5xl rounded-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Link className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">Gestão de Conjuntos (Camião + Trelas)</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCombinationsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar gestão de conjuntos"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <form onSubmit={handleCreateCombination} className="border border-slate-200 rounded-md p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Nova Associação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="combinationCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Identificador do Conjunto *
                    </label>
                    <input
                      id="combinationCode"
                      required
                      value={combCode}
                      onChange={(event) => setCombCode(event.target.value)}
                      placeholder="Ex: CONJ-001"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="combTruck" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Veículo Trator *
                    </label>
                    <select
                      id="combTruck"
                      required
                      value={combTruckId}
                      onChange={(event) => setCombTruckId(event.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="">Selecione o camião trator...</option>
                      {tractorAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.code_tag || asset.codeTag || asset.name} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="combLeader" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Trela Líder *
                    </label>
                    <select
                      id="combLeader"
                      required
                      value={combLeaderId}
                      onChange={(event) => {
                        setCombLeaderId(event.target.value);
                        if (event.target.value === combFollowerId) setCombFollowerId('');
                      }}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="">Selecione a trela líder...</option>
                      {trailerAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.code_tag || asset.codeTag || asset.name} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="combFollower" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Trela Seguidora (Opcional)
                    </label>
                    <select
                      id="combFollower"
                      value={combFollowerId}
                      onChange={(event) => setCombFollowerId(event.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="">Sem trela seguidora</option>
                      {trailerAssets.filter((asset) => asset.id !== combLeaderId).map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.code_tag || asset.codeTag || asset.name} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {combinationError && (
                  <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2.5">
                    {combinationError}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingCombination || !combCode.trim() || !combTruckId || !combLeaderId}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingCombination && <Loader2 size={14} className="animate-spin" />}
                    <span>{submittingCombination ? 'A criar...' : 'Criar Conjunto'}</span>
                  </button>
                </div>
              </form>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Conjuntos Ativos ({activeCombinations.length})
                  </h3>
                  <button
                    type="button"
                    onClick={fetchCombinations}
                    disabled={loadingCombinations}
                    className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md cursor-pointer disabled:opacity-50"
                    title="Atualizar conjuntos"
                  >
                    <RefreshCw size={14} className={loadingCombinations ? 'animate-spin' : ''} />
                  </button>
                </div>
                {loadingCombinations ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    A carregar conjuntos...
                  </div>
                ) : activeCombinations.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-300 rounded-md text-xs text-slate-500">
                    Não existem conjuntos ativos.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Código</th>
                          <th className="px-3 py-2.5">Camião Trator</th>
                          <th className="px-3 py-2.5">Trela Líder</th>
                          <th className="px-3 py-2.5">Trela Seguidora</th>
                          <th className="px-3 py-2.5">Data de Início</th>
                          <th className="px-3 py-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCombinations.map((combination) => {
                          const truckId = combination.truck_id || combination.truckId || combination.tractor_id || combination.tractorId;
                          const leaderId = combination.leader_trailer_id || combination.leaderTrailerId || combination.leader_id || combination.leaderId;
                          const followerId = combination.follower_trailer_id || combination.followerTrailerId || combination.follower_id || combination.followerId;
                          const combinationId = combination.id || combination._id;
                          const startedAt = combination.started_at || combination.start_date || combination.created_at || combination.startedAt || combination.createdAt;

                          return (
                            <tr key={combinationId || combination.combination_code || combination.combinationCode}>
                              <td className="px-3 py-3 font-mono font-semibold text-blue-700">{combination.combination_code || combination.combinationCode || combination.code || '—'}</td>
                              <td className="px-3 py-3 text-slate-700">{getCombinationAssetName(truckId, combination.truck || combination.tractor)}</td>
                              <td className="px-3 py-3 text-slate-700">{getCombinationAssetName(leaderId, combination.leader_trailer || combination.leaderTrailer || combination.leader)}</td>
                              <td className="px-3 py-3 text-slate-700">{getCombinationAssetName(followerId, combination.follower_trailer || combination.followerTrailer || combination.follower)}</td>
                              <td className="px-3 py-3 text-slate-600">{startedAt ? new Date(startedAt).toLocaleDateString('pt-MZ') : '—'}</td>
                              <td className="px-3 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => combinationId && handleTerminateCombination(combinationId)}
                                  disabled={!combinationId}
                                  className="px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  Desassociar (Terminar)
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

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
  const [anomalyPriority, setAnomalyPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [currentOdometer, setCurrentOdometer] = useState<number | ''>('');
  const [submittingAnomaly, setSubmittingAnomaly] = useState(false);
  const [anomalySuccess, setAnomalySuccess] = useState(false);

  // Filter out non-vehicles for drivers
  const vehicles = assets.filter(a => a.category === 'vehicle_light' || a.category === 'vehicle_heavy' || a.category?.startsWith('vehicle') || FLEET_CATEGORIES.some((fleetCategory) => fleetCategory.code === a.category));

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
    // reset checklist
    setFluids(false);
    setBrakes(false);
    setLights(false);
    setTires(false);
    setSafety(false);
    setChecklistSuccess(false);
  };

  const handleChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    setChecklistSuccess(true);
    setTimeout(() => setChecklistSuccess(false), 5000);
  };

  const handleAnomalySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !anomalyTitle.trim() || !anomalyDesc.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingAnomaly(true);
    const payload = {
      assetId: selectedAssetId,
      asset_id: selectedAssetId,
      title: anomalyTitle,
      description: anomalyDesc,
      orderType: 'corrective',
      order_type: 'corrective',
      priority: anomalyPriority,
      meterAtService: currentOdometer !== '' ? Number(currentOdometer) : undefined,
      meter_at_service: currentOdometer !== '' ? Number(currentOdometer) : undefined,
      status: 'open'
    };

    try {
      await api.post('/work-orders', payload);
      setAnomalySuccess(true);
      setAnomalyTitle('');
      setAnomalyDesc('');
      setTimeout(() => {
        setAnomalySuccess(false);
        setIsAnomalyModalOpen(false);
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao submeter anomalia:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao submeter anomalia.');
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
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">CMMS Moçambique · Portal do Condutor</span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">Olá, {user?.fullName}!</h1>
            <p className="text-slate-600 text-xs">Efetue vistorias de segurança e reporte avarias de campo rapidamente.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <RefreshCw className="animate-spin text-blue-700 mx-auto" size={24} />
          <p className="text-xs text-slate-500 mt-2 font-medium">A carregar viaturas corporativas...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500 shadow-sm">
          <AlertTriangle className="text-amber-500 mx-auto mb-2" size={24} />
          <p className="text-xs font-semibold text-slate-800">Nenhuma viatura disponível para o seu utilizador.</p>
          <p className="text-[11px] text-slate-500 mt-1">Contacte o supervisor ou gestor para associar viaturas ao seu escopo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SELETOR DE VIATURA */}
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Selecione a Viatura em Serviço:
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

      {/* MODAL DE SUBMETER ANOMALIA */}
      {isAnomalyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-md shadow-xl overflow-hidden flex flex-col relative">

            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                Reportar Ocorrência em Campo
              </h3>
              <button
                onClick={() => setIsAnomalyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {anomalySuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center border border-emerald-200 mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Ocorrência Registada!</h4>
                  <p className="text-xs text-slate-600 mt-1">A equipa de manutenção foi notificada e uma OS Corretiva foi aberta.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAnomalySubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Viatura Selecionada:</span>
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
                    disabled={submittingAnomaly}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md text-xs font-medium transition-colors shadow-none flex items-center gap-1.5 cursor-pointer"
                  >
                    {submittingAnomaly ? (
                      <>
                        <RefreshCw className="animate-spin" size={13} />
                        <span>A reportar...</span>
                      </>
                    ) : (
                      <span>Submeter Ocorrência</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AssetsPage;
