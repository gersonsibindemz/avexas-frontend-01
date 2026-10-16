import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
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
  ChevronRight,
  ChevronLeft,
  File,
  Eye,
  Trash,
  FileSpreadsheet
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
  brand?: string;
  model: string;
  category: 'vehicle_light' | 'vehicle_heavy' | 'generator' | 'machinery' | string;
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

  // Ativação da tecla ESC nos modais de Ativos
  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
  useEscapeKey(() => setIsDocModalOpen(false), isDocModalOpen);
  useEscapeKey(() => setIsQrModalOpen(false), isQrModalOpen);
  useEscapeKey(() => setIsDeleteModalOpen(false), isDeleteModalOpen);

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
  // ESTADOS DO FORMULÁRIO MULTI-STEP (4 ETAPAS)
  // ==========================================
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Etapa 1: Identificação
  const [category, setCategory] = useState<'vehicle_light' | 'vehicle_heavy' | 'generator' | 'machinery'>('vehicle_light');
  const [name, setName] = useState('');
  const [codeTag, setCodeTag] = useState('');
  const [criticalityLevel, setCriticalityLevel] = useState<'A' | 'B' | 'C'>('B');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number>(new Date().getFullYear());
  const [costCenter, setCostCenter] = useState('');
  const [installation, setInstallation] = useState('');

  // Etapa 2: Operação
  // Se Veículo
  const [licensePlate, setLicensePlate] = useState('');
  const [chassisVin, setChassisVin] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [fuelTankCapacityLiters, setFuelTankCapacityLiters] = useState<number | ''>('');
  // Se Industrial
  const [plantSector, setPlantSector] = useState('');
  const [voltageSpecs, setVoltageSpecs] = useState('');
  const [powerKwKva, setPowerKwKva] = useState<number | ''>('');
  // Medidor Comum
  const [currentMeter, setCurrentMeter] = useState<number>(0);

  // Etapa 3: Conformidade Moçambique
  // Se Veículo (INATRO e Seguro)
  const [inatroInspectionExpiry, setInatroInspectionExpiry] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  // Se Industrial (INNOQ e Teste Caldeira)
  const [innoqCalibrationExpiry, setInnoqCalibrationExpiry] = useState('');
  const [pressureTestExpiry, setPressureTestExpiry] = useState('');
  const [localSupplierName, setLocalSupplierName] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');

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
      const response = await api.get('/assets');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.assets || response.data?.data || [];
      setAssets(data);
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

  useEffect(() => {
    fetchAssets();
  }, []);

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

  // ==========================================
  // VALIDAÇÕES POR ETAPA
  // ==========================================
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!name.trim()) {
        alert('O Nome do Ativo é obrigatório.');
        return false;
      }
      if (!costCenter.trim()) {
        alert('O Centro de Custo/Província é obrigatório.');
        return false;
      }
      if (!model.trim()) {
        alert('O Modelo é obrigatório.');
        return false;
      }
    }
    // Etapa 2 e 3 são condicionais e possuem defaults, validação flexível de tipo
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // ==========================================
  // SUBMISSÃO MULTI-STEP (CRIAR E EDITAR)
  // ==========================================
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) return;

    setSubmitting(true);

    const isVehicle = category === 'vehicle_light' || category === 'vehicle_heavy';
    const meterKind = isVehicle ? 'odometer_km' : 'hourmeter_hours';

    // Construção do Payload completo mapeado para garantir conformidade
    const payload: any = {
      name,
      category,
      codeTag,
      code_tag: codeTag || undefined,
      criticalityLevel,
      criticality_level: criticalityLevel,
      brand,
      model,
      manufactureYear: Number(manufactureYear),
      manufacture_year: Number(manufactureYear),
      costCenter,
      cost_center: costCenter,
      meterKind,
      meter_kind: meterKind,
      currentMeter: Number(currentMeter),
      current_meter: Number(currentMeter),
      status: modalMode === 'create' ? 'operational' : undefined, // padrão ao criar
    };

    if (isVehicle) {
      payload.licensePlate = licensePlate;
      payload.license_plate = licensePlate;
      payload.chassisVin = chassisVin;
      payload.chassis_vin = chassisVin;
      payload.engineNumber = engineNumber;
      payload.engine_number = engineNumber;
      payload.fuelTankCapacityLiters = fuelTankCapacityLiters ? Number(fuelTankCapacityLiters) : undefined;
      payload.fuel_tank_capacity_liters = fuelTankCapacityLiters ? Number(fuelTankCapacityLiters) : undefined;

      payload.inatroInspectionExpiry = inatroInspectionExpiry || undefined;
      payload.inatro_inspection_expiry = inatroInspectionExpiry || undefined;
      payload.insuranceCompany = insuranceCompany || undefined;
      payload.insurance_company = insuranceCompany || undefined;
      payload.insurancePolicyNumber = insurancePolicyNumber || undefined;
      payload.insurance_policy_number = insurancePolicyNumber || undefined;
      payload.insuranceExpiry = insuranceExpiry || undefined;
      payload.insurance_expiry = insuranceExpiry || undefined;
    } else {
      payload.plantSector = plantSector;
      payload.plant_sector = plantSector;
      payload.voltageSpecs = voltageSpecs;
      payload.voltage_specs = voltageSpecs;
      payload.powerKwKva = powerKwKva ? Number(powerKwKva) : undefined;
      payload.power_kw_kva = powerKwKva ? Number(powerKwKva) : undefined;

      payload.innoqCalibrationExpiry = innoqCalibrationExpiry || undefined;
      payload.innoq_calibration_expiry = innoqCalibrationExpiry || undefined;
      payload.pressureTestExpiry = pressureTestExpiry || undefined;
      payload.pressure_test_expiry = pressureTestExpiry || undefined;
      payload.localSupplierName = localSupplierName || undefined;
      payload.local_supplier_name = localSupplierName || undefined;
      payload.warrantyExpiry = warrantyExpiry || undefined;
      payload.warranty_expiry = warrantyExpiry || undefined;
    }

    try {
      let assetId = '';
      if (modalMode === 'create') {
        // PASSO A: POST real
        const res = await api.post('/assets', payload);
        const createdAsset = res.data?.asset || res.data?.data || res.data;
        assetId = createdAsset.id;

        // PASSO B: Envio do ficheiro se selecionado
        if (assetId && wizardFile) {
          const formData = new FormData();
          formData.append('file', wizardFile);
          formData.append('documentType', 'tech_sheet');
          formData.append('title', 'Ficha Técnica Inicial');

          try {
            // NUNCA defina o cabeçalho 'Content-Type' manualmente em chamadas multipart
            await api.post(`/assets/${assetId}/documents`, formData);
          } catch (docErr) {
            console.error('Falha ao enviar documento inicial:', docErr);
            alert('Ativo cadastrado com sucesso, mas o upload da ficha falhou. Você pode reenviar o documento na lista.');
          }
        }
        setSuccessMessage('Ativo cadastrado com sucesso no CMMS!');
      } else {
        // EDIÇÃO: PUT real
        await api.put(`/assets/${editingAssetId}`, payload);
        setSuccessMessage('Dados do Ativo atualizados com sucesso!');
      }

      // PASSO C: Fechar modal e recarregar
      setIsModalOpen(false);
      resetWizardForm();
      await fetchAssets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar ativo:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar dados do ativo.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizardForm = () => {
    setCurrentStep(1);
    setName('');
    setCategory((categories[0]?.value as any) || 'vehicle_light');
    setCodeTag('');
    setCriticalityLevel('B');
    setBrand('');
    setModel('');
    setManufactureYear(new Date().getFullYear());
    setCostCenter('');
    setInstallation('');
    setLicensePlate('');
    setChassisVin('');
    setEngineNumber('');
    setFuelTankCapacityLiters('');
    setPlantSector('');
    setVoltageSpecs('');
    setPowerKwKva('');
    setCurrentMeter(0);
    setInatroInspectionExpiry('');
    setInsuranceCompany('');
    setInsurancePolicyNumber('');
    setInsuranceExpiry('');
    setInnoqCalibrationExpiry('');
    setPressureTestExpiry('');
    setLocalSupplierName('');
    setWarrantyExpiry('');
    setWizardFile(null);
    setEditingAssetId(null);
  };

  // preenche formulário para edição
  const handleOpenEditModal = (asset: Asset) => {
    resetWizardForm();
    setModalOpenMode('edit');
    setEditingAssetId(asset.id);

    setCategory((asset.category as any) || 'vehicle_light');
    setName(asset.name || '');
    setCodeTag(asset.code_tag || asset.codeTag || '');
    setCriticalityLevel((asset.criticality_level as any) || (asset.criticalityLevel as any) || 'B');
    setBrand(asset.brand || '');
    setModel(asset.model || '');
    setManufactureYear(asset.manufacture_year || asset.manufactureYear || new Date().getFullYear());
    setCostCenter(asset.cost_center || asset.costCenter || '');
    setInstallation((asset as any).installation || asset.plant_sector || asset.plantSector || '');

    // Etapa 2 e 3
    setLicensePlate(asset.license_plate || asset.licensePlate || '');
    setChassisVin(asset.chassis_vin || asset.chassisVin || '');
    setEngineNumber(asset.engine_number || asset.engineNumber || '');
    setFuelTankCapacityLiters(asset.fuel_tank_capacity_liters ?? asset.fuelTankCapacityLiters ?? '');
    setPlantSector(asset.plant_sector || asset.plantSector || '');
    setVoltageSpecs(asset.voltage_specs || asset.voltageSpecs || '');
    setPowerKwKva(asset.power_kw_kva ?? asset.powerKwKva ?? '');
    setCurrentMeter(asset.current_meter ?? asset.currentMeter ?? 0);

    setInatroInspectionExpiry(asset.inatro_inspection_expiry || asset.inatroInspectionExpiry || '');
    setInsuranceCompany(asset.insurance_company || asset.insuranceCompany || '');
    setInsurancePolicyNumber(asset.insurance_policy_number || asset.insurancePolicyNumber || '');
    setInsuranceExpiry(asset.insurance_expiry || asset.insuranceExpiry || '');

    setInnoqCalibrationExpiry(asset.innoq_calibration_expiry || asset.innoqCalibrationExpiry || '');
    setPressureTestExpiry(asset.pressure_test_expiry || asset.pressureTestExpiry || '');
    setLocalSupplierName(asset.local_supplier_name || asset.localSupplierName || '');
    setWarrantyExpiry(asset.warranty_expiry || asset.warrantyExpiry || '');

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
      const isVehicle = currentScope === 'fleet' || row.Categoria === 'vehicle_light' || row.Categoria === 'vehicle_heavy' || row.categoria === 'vehicle_light' || row.categoria === 'vehicle_heavy';
      const cat = row.Categoria || row.categoria || (isVehicle ? 'vehicle_light' : 'generator');
      const meterKind = isVehicle ? 'odometer_km' : 'hourmeter_hours';

      return {
        name: (row.Nome || row.nome || '').trim(),
        category: cat,
        codeTag: (row.Tag || row.tag || row.codeTag || row.code_tag || '').trim() || undefined,
        code_tag: (row.Tag || row.tag || row.codeTag || row.code_tag || '').trim() || undefined,
        brand: (row.Marca || row.marca || row.Fabricante || row.fabricante || '').trim() || undefined,
        model: (row.Modelo || row.modelo || '').trim() || '',
        manufactureYear: row.Ano ? Number(row.Ano) : new Date().getFullYear(),
        manufacture_year: row.Ano ? Number(row.Ano) : new Date().getFullYear(),
        costCenter: 'Sede / Geral',
        cost_center: 'Sede / Geral',
        meterKind,
        meter_kind: meterKind,
        currentMeter: Number(row.OdometroInicial || row.HorimetroInicial || row.odometroinicial || row.horimetroinicial || row.currentMeter || row.current_meter || 0),
        current_meter: Number(row.OdometroInicial || row.HorimetroInicial || row.odometroinicial || row.horimetroinicial || row.currentMeter || row.current_meter || 0),
        licensePlate: (row.Matricula || row.matricula || '').trim() || undefined,
        license_plate: (row.Matricula || row.matricula || '').trim() || undefined,
        chassisVin: (row.Chassis || row.chassis || '').trim() || undefined,
        chassis_vin: (row.Chassis || row.chassis || '').trim() || undefined,
        plantSector: (row.SetorFabril || row.setorfabril || '').trim() || undefined,
        plant_sector: (row.SetorFabril || row.setorfabril || '').trim() || undefined,
        powerKwKva: row.Potencia || row.potencia ? Number(row.Potencia || row.potencia) : undefined,
        power_kw_kva: row.Potencia || row.potencia ? Number(row.Potencia || row.potencia) : undefined,
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
    switch (cat) {
      case 'vehicle_light':
        return 'Veículo Ligeiro';
      case 'vehicle_heavy':
        return 'Frota Pesada';
      case 'generator':
        return 'Gerador Industrial';
      case 'machinery':
        return 'Maquinaria / Chão Fábrica';
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
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;

    // Filtro baseado no escopo ativo ('fleet' ou 'plant')
    const isAssetPlantType = asset.category === 'generator' || asset.category === 'machinery';
    const isAssetFleetType = asset.category === 'vehicle_light' || asset.category === 'vehicle_heavy';
    
    let matchesScope = true;
    if (currentScope === 'plant') {
      matchesScope = isAssetPlantType;
    } else if (currentScope === 'fleet') {
      matchesScope = isAssetFleetType;
    }

    return matchesSearch && matchesCategory && matchesScope;
  });

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

      {/* Barra de Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={16} className="animate-spin text-slate-400" />
            <span>A carregar...</span>
          </div>
        ) : <div />}
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
                  setIsModalOpen(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
              >
                <Plus size={16} />
                <span>Cadastrar Ativo</span>
              </button>
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
            {categories.map((c) => (
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

      {/* ==========================================
          MODAL: ASSISTENTE DE CADASTRO (4 ETAPAS)
          ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-md shadow-xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Cadastrar Novo Ativo' : 'Editar Ativo Corporativo'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Indicador de Passos */}
            <div className="bg-slate-50/60 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[11px] ${
                  currentStep >= 1 ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-300 text-slate-400'
                }`}>1</span>
                <span className={currentStep >= 1 ? 'text-slate-900' : 'text-slate-400'}>Identificação</span>
              </div>
              <ChevronRight size={14} className="text-slate-400" />
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[11px] ${
                  currentStep >= 2 ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-300 text-slate-400'
                }`}>2</span>
                <span className={currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'}>Operação</span>
              </div>
              <ChevronRight size={14} className="text-slate-400" />
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[11px] ${
                  currentStep >= 3 ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-300 text-slate-400'
                }`}>3</span>
                <span className={currentStep >= 3 ? 'text-slate-900' : 'text-slate-400'}>Conformidade</span>
              </div>
              {modalMode === 'create' && (
                <>
                  <ChevronRight size={14} className="text-slate-400" />
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[11px] ${
                      currentStep >= 4 ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-300 text-slate-400'
                    }`}>4</span>
                    <span className={currentStep >= 4 ? 'text-slate-900' : 'text-slate-400'}>Anexos</span>
                  </div>
                </>
              )}
            </div>

            {/* Formulário Wizard */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin">
              
              {/* ETAPA 1: IDENTIFICAÇÃO */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Categoria de Ativo *
                      </label>
                      <select
                        value={category}
                        disabled={modalMode === 'edit'} // Categoria fixa na edição
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Tag / Código do Ativo
                      </label>
                      <input
                        type="text"
                        value={codeTag}
                        onChange={(e) => setCodeTag(e.target.value)}
                        placeholder="Deixe vazio para gerar automaticamente"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Nome / Designação do Ativo *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={domain === 'fleet' ? "ex: Camião Volvo FMX Basculante" : "ex: Gerador Cummins 500kVA ou Extrusora N2"}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="ex: Volvo, Cummins"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Modelo *
                      </label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="ex: FMX 460 ou C500"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Ano de Fabrico
                      </label>
                      <input
                        type="number"
                        value={manufactureYear}
                        onChange={(e) => setManufactureYear(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Centro de Custo *
                      </label>
                      <input
                        type="text"
                        required
                        value={costCenter}
                        onChange={(e) => setCostCenter(e.target.value)}
                        placeholder="ex: CC-01, Operações"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Instalação / Província
                      </label>
                      <input
                        type="text"
                        value={installation}
                        onChange={(e) => setInstallation(e.target.value)}
                        placeholder="ex: Maputo, Manica, Sofala"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Nível de Criticidade
                    </label>
                    <select
                      value={criticalityLevel}
                      onChange={(e) => setCriticalityLevel(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    >
                      <option value="A">A - Alta</option>
                      <option value="B">B - Média</option>
                      <option value="C">C - Baixa</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ETAPA 2: OPERAÇÃO (Condicional) */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {domain === 'fleet' ? (
                    /* CAMPOS PARA VEÍCULOS (FROTA) */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Matrícula / Registro *
                          </label>
                          <input
                            type="text"
                            required
                            value={licensePlate}
                            onChange={(e) => setLicensePlate(e.target.value)}
                            placeholder="ex: MM-10-24"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Número de Chassis (VIN)
                          </label>
                          <input
                            type="text"
                            value={chassisVin}
                            onChange={(e) => setChassisVin(e.target.value)}
                            placeholder="ex: 938Y498HF8..."
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Número do Motor
                          </label>
                          <input
                            type="text"
                            value={engineNumber}
                            onChange={(e) => setEngineNumber(e.target.value)}
                            placeholder="ex: D13K460"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Capacidade do Depósito (Litros)
                          </label>
                          <input
                            type="number"
                            value={fuelTankCapacityLiters}
                            onChange={(e) => setFuelTankCapacityLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="ex: 300"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          {counterLabel} *
                        </label>
                        <input
                          type="number"
                          required
                          value={currentMeter === 0 ? '' : currentMeter}
                          onChange={(e) => setCurrentMeter(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    /* CAMPOS PARA GERADORES E MAQUINARIA (FABRIL) */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Setor Fabril / Área *
                          </label>
                          <input
                            type="text"
                            required
                            value={plantSector}
                            onChange={(e) => setPlantSector(e.target.value)}
                            placeholder="ex: Moagem, Embalamento, Linha 2"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Especificações Elétricas (Voltagem)
                          </label>
                          <input
                            type="text"
                            value={voltageSpecs}
                            onChange={(e) => setVoltageSpecs(e.target.value)}
                            placeholder="ex: 380V / 3 Fases"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          Potência Estimada (kW / kVA)
                        </label>
                        <input
                          type="number"
                          value={powerKwKva}
                          onChange={(e) => setPowerKwKva(e.target.value !== '' ? Number(e.target.value) : '')}
                          placeholder="ex: 150"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                          {counterLabel} *
                        </label>
                        <input
                          type="number"
                          required
                          value={currentMeter === 0 ? '' : currentMeter}
                          onChange={(e) => setCurrentMeter(e.target.value === '' ? 0 : Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ETAPA 3: CONFORMIDADE */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {domain === 'fleet' ? (
                    /* CONFORMIDADE DE TRÂNSITO (FROTA) */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Validade da Inspeção
                          </label>
                          <input
                            type="date"
                            value={inatroInspectionExpiry}
                            onChange={(e) => setInatroInspectionExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Validade da Garantia
                          </label>
                          <input
                            type="date"
                            value={warrantyExpiry}
                            onChange={(e) => setWarrantyExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Validade do Seguro
                          </label>
                          <input
                            type="date"
                            value={insuranceExpiry}
                            onChange={(e) => setInsuranceExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* CONFORMIDADE INDUSTRIAL INNOQ / PRESSÃO (FABRIL) */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Validade Calibração INNOQ
                          </label>
                          <input
                            type="date"
                            value={innoqCalibrationExpiry}
                            onChange={(e) => setInnoqCalibrationExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Validade Teste Pressão/Caldeira
                          </label>
                          <input
                            type="date"
                            value={pressureTestExpiry}
                            onChange={(e) => setPressureTestExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Fornecedor Local Moçambicano
                          </label>
                          <input
                            type="text"
                            value={localSupplierName}
                            onChange={(e) => setLocalSupplierName(e.target.value)}
                            placeholder="ex: Barloworld Moçambique"
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            Fim da Garantia
                          </label>
                          <input
                            type="date"
                            value={warrantyExpiry}
                            onChange={(e) => setWarrantyExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ETAPA 4: ANEXOS DOCUMENTAIS (Apenas na criação) */}
              {currentStep === 4 && modalMode === 'create' && (
                <div className="space-y-4">
                  <span className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                    Carregar Ficha Técnica Inicial (PDF, PNG ou JPEG até 20MB)
                  </span>

                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-md p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                      isDragActive 
                        ? 'border-blue-600 bg-blue-50/50' 
                        : wizardFile 
                        ? 'border-blue-500 bg-blue-50/20' 
                        : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="file"
                      id="wizard-file"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpeg,.jpg,.webp"
                      className="hidden"
                    />
                    <label htmlFor="wizard-file" className="cursor-pointer flex flex-col items-center gap-2">
                      <UploadCloud size={36} className="text-slate-400 group-hover:text-slate-600" />
                      {wizardFile ? (
                        <div className="text-xs font-medium text-blue-700">
                          Ficheiro selecionado: <span className="font-mono underline">{wizardFile.name}</span>
                          <p className="text-[10px] text-slate-500 mt-1">({(wizardFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">
                          Arrastar e largar ficheiro aqui ou <span className="text-blue-700 font-semibold underline">procurar</span>
                          <p className="text-[10px] text-slate-400 mt-1">PDF, JPEG, PNG ou WebP de até 20MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Botões do Assistente */}
              <div className="flex justify-between items-center border-t border-slate-200 pt-5 mt-2">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={submitting}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft size={14} />
                      <span>Anterior</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-all"
                  >
                    Cancelar
                  </button>

                  {/* Verifica se deve mostrar botão "Avançar" ou "Submeter" */}
                  {((modalMode === 'create' && currentStep < 4) || (modalMode === 'edit' && currentStep < 3)) ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-none"
                    >
                      <span>Seguinte</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-none"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>A processar...</span>
                        </>
                      ) : (
                        <span>{modalMode === 'create' ? 'Finalizar Registo' : 'Atualizar Ativo'}</span>
                      )}
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
  const vehicles = assets.filter(a => a.category === 'vehicle_light' || a.category === 'vehicle_heavy' || a.category?.startsWith('vehicle'));

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
