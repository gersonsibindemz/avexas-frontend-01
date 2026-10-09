import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import {
  X,
  QrCode,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  File,
  Eye,
  Wrench,
  Gauge,
  Activity,
  ArrowRight,
  UploadCloud,
  ChevronRight,
  Shield,
  HelpCircle,
  Clock,
  Car,
  Settings
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  
  // Detalhes adicionais
  license_plate?: string;
  licensePlate?: string;
  plant_sector?: string;
  plantSector?: string;
  voltage_specs?: string;
  voltageSpecs?: string;
  power_kw_kva?: number;
  powerKwKva?: number;

  inatro_inspection_expiry?: string;
  inatroInspectionExpiry?: string;
  innoq_calibration_expiry?: string;
  innoqCalibrationExpiry?: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  documentType?: string;
  signed_url: string;
  signedUrl?: string;
  created_at: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Formulários de Campo
  const [meterValue, setMeterValue] = useState<number | ''>('');
  const [submittingMeter, setSubmittingMeter] = useState(false);
  const [meterSuccess, setMeterSuccess] = useState(false);
  
  const [reportIssue, setReportIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setReportIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [issueMeterAtService, setIssueMeterAtService] = useState<number | ''>('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-viewport";

  // Inicialização e Liberação da Câmera
  useEffect(() => {
    if (!isOpen) return;

    // Reinicia os estados de ativo escaneado ao abrir
    setActiveAsset(null);
    setDocuments([]);
    setScannerError(null);
    setMeterValue('');
    setMeterSuccess(false);
    setReportIssue(false);
    setIssueTitle('');
    setReportIssueDescription('');
    setIssuePriority('medium');
    setIssueMeterAtService('');
    setIssueSuccess(false);

    // Pequeno atraso para garantir que o contêiner DOM esteja montado
    const timer = setTimeout(() => {
      startCamera();
    }, 400);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const html5Qrcode = new Html5Qrcode(scannerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const minEdge = Math.min(width, height);
            const boxSize = Math.floor(minEdge * 0.7);
            return { width: boxSize, height: boxSize };
          }
        },
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      console.error("Erro ao iniciar câmera:", err);
      if (err.toString().includes("NotAllowedError") || err.toString().includes("Permission denied")) {
        setScannerError("Permissão de acesso à câmara foi negada. Por favor, ative as permissões nas configurações do navegador para escanear etiquetas.");
      } else {
        setScannerError("Não foi possível aceder à câmara traseira ou nenhuma câmara foi encontrada.");
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Erro ao parar câmera:", err);
      }
    }
    scannerRef.current = null;
  };

  const onScanSuccess = async (decodedText: string) => {
    // 1. Vibração tátil leve (se disponível)
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // 2. Para a câmera imediatamente para evitar múltiplos scans
    await stopCamera();

    // 3. Carrega o ativo escaneado
    loadAssetData(decodedText);
  };

  const onScanFailure = () => {
    // Ignoramos erros de frame individual para não poluir o console
  };

  const loadAssetData = async (assetId: string) => {
    setLoadingAsset(true);
    setScannerError(null);
    try {
      // Faz a requisição segura para obter o ativo pelo ID ou CodeTag
      const res = await api.get(`/assets/${encodeURIComponent(assetId)}`);
      const asset = res.data?.asset || res.data?.data || res.data;
      
      if (!asset || !asset.id) {
        throw new Error("Equipamento ou viatura não cadastrada no CMMS.");
      }

      setActiveAsset(asset);
      setMeterValue(asset.current_meter ?? asset.currentMeter ?? 0);
      setIssueMeterAtService(asset.current_meter ?? asset.currentMeter ?? 0);
      setIssuePriority('medium');
      setIssueTitle('');
      
      // Carrega os documentos desse ativo
      loadAssetDocs(asset.id);
    } catch (err: any) {
      console.error("Erro ao buscar ativo escaneado:", err);
      setScannerError(
        err.response?.data?.message || 
        err.message || 
        "Código QR lido com sucesso, mas o ativo correspondente não foi encontrado na base de dados real."
      );
      // Reinicia câmera para tentar novamente
      setTimeout(() => {
        if (isOpen && !activeAsset) {
          startCamera();
        }
      }, 5000);
    } finally {
      setLoadingAsset(false);
    }
  };

  const loadAssetDocs = async (id: string) => {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/assets/${id}/documents`);
      const docs = res.data?.documents || res.data || [];
      setDocuments(docs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Enviar leitura do contador
  const handleUpdateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset || meterValue === '') return;

    const current = activeAsset.current_meter ?? activeAsset.currentMeter ?? 0;
    if (Number(meterValue) < current) {
      alert(`O novo valor não pode ser menor do que o registo atual (${current}).`);
      return;
    }

    setSubmittingMeter(true);
    try {
      await api.patch(`/assets/${activeAsset.id}/meter`, {
        meterValue: Number(meterValue)
      });
      setMeterSuccess(true);
      
      // Atualiza o ativo local
      setActiveAsset(prev => {
        if (!prev) return null;
        return {
          ...prev,
          current_meter: Number(meterValue),
          currentMeter: Number(meterValue)
        };
      });
      
      setTimeout(() => setMeterSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao atualizar medidor:", err);
      alert(err.response?.data?.message || err.message || "Erro ao atualizar o contador no servidor.");
    } finally {
      setSubmittingMeter(false);
    }
  };

  // Reportar Avaria (Criar Ordem de Serviço Corretiva)
  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset || !issueTitle.trim() || !issueDescription.trim() || issueMeterAtService === '') return;

    setSubmittingIssue(true);
    try {
      const payload = {
        assetId: activeAsset.id,
        asset_id: activeAsset.id,
        title: issueTitle,
        description: issueDescription,
        orderType: 'corrective',
        order_type: 'corrective',
        priority: issuePriority,
        meterAtService: Number(issueMeterAtService),
        meter_at_service: Number(issueMeterAtService),
        status: 'open'
      };

      await api.post('/work-orders', payload);
      setIssueSuccess(true);
      setIssueTitle('');
      setReportIssueDescription('');
      
      setTimeout(() => {
        setIssueSuccess(false);
        setReportIssue(false);
      }, 3000);
    } catch (err: any) {
      console.error("Erro ao reportar avaria:", err);
      alert(err.response?.data?.message || err.message || "Erro ao criar ordem de serviço corretiva.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  if (!isOpen) return null;

  const isVehicle = activeAsset && (activeAsset.category === 'vehicle_light' || activeAsset.category === 'vehicle_heavy');
  const level = activeAsset?.criticality_level || activeAsset?.criticalityLevel || 'B';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header do Scanner */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <QrCode className="text-blue-700" size={20} />
            <span className="font-bold text-sm text-slate-900">Leitor de QR Code Móvel</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* MODO A: ESCANEANDO (Sem ativo selecionado) */}
          {!activeAsset && !loadingAsset && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              
              {/* Moldura do Leitor QR */}
              <div className="relative w-72 h-72 border border-slate-300 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center">
                
                {/* Visualizador HTML5-QRCode */}
                <div id={scannerId} className="w-full h-full object-cover"></div>

                {/* Laser de Scan de Campo */}
                {!scannerError && (
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-600 shadow-md shadow-blue-500/50 animate-laser-scanning z-10 pointer-events-none"></div>
                )}

                {/* Cantos Iluminados (Moldura Tecnológica) */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-blue-700 rounded-tl-sm pointer-events-none z-10"></div>
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-blue-700 rounded-tr-sm pointer-events-none z-10"></div>
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-blue-700 rounded-bl-sm pointer-events-none z-10"></div>
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-blue-700 rounded-br-sm pointer-events-none z-10"></div>
              </div>

              {/* Mensagem orientadora */}
              <div className="text-center px-4 max-w-sm">
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Aponte a câmara do telemóvel para a etiqueta QR Code colada na viatura ou gerador.
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  Abertura automática de ficha técnica
                </p>
              </div>

              {/* Tratamento de Erros de Permissão ou Scanner */}
              {scannerError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start max-w-sm">
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold block text-red-800">Falha no Scanner</span>
                    <span className="leading-relaxed block text-red-700">{scannerError}</span>
                    <button
                      onClick={startCamera}
                      className="mt-2 text-xs font-medium bg-white text-red-700 px-2 py-1 rounded-md border border-red-300 hover:bg-red-50 cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO B: CARREGANDO DETALHES DO ATIVO */}
          {loadingAsset && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="animate-spin text-blue-700" size={36} />
              <p className="text-xs text-slate-500 font-medium tracking-wide">A carregar detalhes de campo do ativo...</p>
            </div>
          )}

          {/* MODO C: PAINEL DE AÇÃO RÁPIDA DE CAMPO (Ativo Identificado!) */}
          {activeAsset && (
            <div className="space-y-4 animate-slide-up">
              
              {/* Header de Identificação do Ativo */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono font-bold text-xs text-blue-700 block tracking-wider uppercase">
                    {activeAsset.code_tag || activeAsset.codeTag}
                  </span>
                  <h3 className="text-slate-900 font-bold text-base leading-tight">{activeAsset.name}</h3>
                  <span className="text-xs text-slate-600 block mt-0.5">{activeAsset.brand} {activeAsset.model}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                    level === 'A' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : level === 'B' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    Criticidade {level}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase">
                    {isVehicle ? "Frota de Campo" : "Equipamento Industrial"}
                  </span>
                </div>
              </div>

              {/* Detalhes Técnicos e de Conformidade */}
              <div className="bg-white border border-slate-200 p-4 rounded-md space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block border-b border-slate-200 pb-2">
                  Ficha Operacional & Conformidade
                </span>
                
                {isVehicle ? (
                  /* INFORMAÇÕES DE VIATURA */
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Matrícula</span>
                      <span className="text-slate-900 font-mono font-bold">{activeAsset.license_plate || activeAsset.licensePlate || '---'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Odómetro Atual</span>
                      <span className="text-slate-900 font-bold">{(activeAsset.current_meter ?? activeAsset.currentMeter ?? 0).toLocaleString('pt-MZ')} km</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Validade Inspeção INATRO</span>
                      <span className="text-slate-900 font-medium flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-blue-700" />
                        {activeAsset.inatro_inspection_expiry || activeAsset.inatroInspectionExpiry 
                          ? new Date(activeAsset.inatro_inspection_expiry || activeAsset.inatroInspectionExpiry || '').toLocaleDateString('pt-MZ') 
                          : 'Pendente de Certificado'}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* INFORMAÇÕES DE MAQUINARIA/GERADOR */
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Setor da Planta</span>
                      <span className="text-slate-900 font-medium">{activeAsset.plant_sector || activeAsset.plantSector || 'Não especificado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Horímetro Atual</span>
                      <span className="text-slate-900 font-bold">{(activeAsset.current_meter ?? activeAsset.currentMeter ?? 0).toLocaleString('pt-MZ')} horas</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Tensão / Potência</span>
                      <span className="text-slate-900 font-mono font-bold">
                        {activeAsset.voltage_specs || activeAsset.voltageSpecs || '---'} / {activeAsset.power_kw_kva || activeAsset.powerKwKva || '---'} kW
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px] font-semibold">Calibração INNOQ</span>
                      <span className="text-slate-900 font-medium flex items-center gap-1">
                        <Clock size={12} className="text-blue-700" />
                        {activeAsset.innoq_calibration_expiry || activeAsset.innoqCalibrationExpiry 
                          ? new Date(activeAsset.innoq_calibration_expiry || activeAsset.innoqCalibrationExpiry || '').toLocaleDateString('pt-MZ') 
                          : 'Sem calibração ativa'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* AÇÃO A: ATUALIZAR CONTADOR DE CAMPO */}
              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                  <Gauge size={14} className="text-blue-700" />
                  <span>Atualizar Contador de Campo</span>
                </span>
                
                <form onSubmit={handleUpdateMeter} className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      required
                      min={activeAsset.current_meter ?? activeAsset.currentMeter ?? 0}
                      value={meterValue}
                      onChange={(e) => setMeterValue(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2 text-[10px] font-bold text-slate-500">
                      {isVehicle ? "KM" : "HORAS"}
                    </span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingMeter || meterValue === '' || Number(meterValue) < (activeAsset.current_meter ?? activeAsset.currentMeter ?? 0)}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 h-9"
                  >
                    {submittingMeter ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <span>Guardar</span>
                    )}
                  </button>
                </form>

                {meterSuccess && (
                  <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Contador atualizado e sincronizado com sucesso!</span>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  O valor atual é de {activeAsset.current_meter ?? activeAsset.currentMeter ?? 0} {isVehicle ? "km" : "horas"}. Não é possível inserir valores inferiores ao atual.
                </span>
              </div>

              {/* AÇÃO B: CONSULTAR DOCUMENTAÇÃO DE CAMPO */}
              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-700" />
                  <span>Documentos e Certificados do Ativo ({documents.length})</span>
                </span>

                {loadingDocs ? (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="animate-spin text-slate-400 mx-auto" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum certificado ou ficha anexada.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-2 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-2 truncate mr-3">
                          <File size={14} className="text-blue-700 shrink-0" />
                          <span className="font-medium text-slate-900 truncate" title={doc.title}>{doc.title}</span>
                        </div>
                        <a
                          href={doc.signed_url || doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-0.5 shrink-0"
                        >
                          <Eye size={12} />
                          <span>Abrir</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AÇÃO C: REPORTAR ANOMALIA / AVARIA */}
              <div className="bg-white border border-slate-200 p-4 rounded-md">
                {!reportIssue ? (
                  <button
                    onClick={() => setReportIssue(true)}
                    className="w-full py-2 bg-white hover:bg-red-50 border border-red-300 text-red-700 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Activity size={14} />
                    <span>Reportar Anomalia / Avaria na Viatura</span>
                  </button>
                ) : (
                  <form onSubmit={handleReportIssueSubmit} className="space-y-3 animate-fade-in">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide block border-b border-slate-200 pb-2 mb-2">
                      Nova Ordem de Serviço (Avaria Corretiva)
                    </span>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Título da Avaria / Intervenção *</label>
                      <input
                        type="text"
                        required
                        value={issueTitle}
                        onChange={(e) => setIssueTitle(e.target.value)}
                        placeholder="ex: Fuga de óleo no retentor ou motor com ruído"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Descrição detalhada do problema *</label>
                      <textarea
                        required
                        rows={2}
                        value={issueDescription}
                        onChange={(e) => setReportIssueDescription(e.target.value)}
                        placeholder="Descreva minuciosamente o problema técnico encontrado..."
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md p-2.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Contador no Momento ({isVehicle ? 'km' : 'horas'}) *</label>
                        <input
                          type="number"
                          required
                          min={activeAsset.current_meter ?? activeAsset.currentMeter ?? 0}
                          value={issueMeterAtService}
                          onChange={(e) => setIssueMeterAtService(e.target.value !== '' ? Number(e.target.value) : '')}
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Prioridade Sugerida *</label>
                        <select
                          value={issuePriority}
                          onChange={(e) => setIssuePriority(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-2 py-1.5 text-xs text-slate-900 focus:outline-none cursor-pointer"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                    </div>
                    
                    {issueSuccess && (
                      <div className="text-xs text-emerald-700 font-medium flex items-center gap-1 py-1">
                        <CheckCircle2 size={12} />
                        <span>Ordem de Manutenção Corretiva Aberta!</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setReportIssue(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingIssue || !issueTitle.trim() || !issueDescription.trim() || issueMeterAtService === ''}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-medium rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {submittingIssue ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <span>Abrir OS Corretiva</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Botão para ler outro código */}
              <button
                onClick={() => {
                  setActiveAsset(null);
                  setDocuments([]);
                  startCamera();
                }}
                className="w-full py-2 border border-slate-300 hover:bg-slate-50 bg-white text-xs font-medium text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                Escanear Outro Equipamento
              </button>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
