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
  const [issueDescription, setReportIssueDescription] = useState('');
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
    setReportIssueDescription('');
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
    if (!activeAsset || !issueDescription.trim()) return;

    setSubmittingIssue(true);
    try {
      const code = activeAsset.code_tag || activeAsset.codeTag || activeAsset.id;
      const payload = {
        assetId: activeAsset.id,
        asset_id: activeAsset.id,
        title: `Avaria Reportada via QR Scanner: ${activeAsset.name}`,
        description: `Sinalizado anomalia em campo por scanner de câmara.\nDescrição do operador:\n${issueDescription}`,
        orderType: 'corrective',
        order_type: 'corrective',
        priority: 'high',
        status: 'open'
      };

      await api.post('/work-orders', payload);
      setIssueSuccess(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header do Scanner */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <QrCode className="text-emerald-500 animate-pulse" size={20} />
            <span className="font-bold text-sm tracking-wide text-white">Leitor de QR Code Móvel</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          
          {/* MODO A: ESCANEANDO (Sem ativo selecionado) */}
          {!activeAsset && !loadingAsset && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              
              {/* Moldura do Leitor QR */}
              <div className="relative w-72 h-72 border-2 border-slate-800 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center">
                
                {/* Visualizador HTML5-QRCode */}
                <div id={scannerId} className="w-full h-full object-cover"></div>

                {/* Laser de Scan de Campo */}
                {!scannerError && (
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/50 animate-laser-scanning z-10 pointer-events-none"></div>
                )}

                {/* Cantos Iluminados (Moldura Tecnológica) */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md pointer-events-none z-10"></div>
                <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md pointer-events-none z-10"></div>
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md pointer-events-none z-10"></div>
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md pointer-events-none z-10"></div>
              </div>

              {/* Mensagem orientadora */}
              <div className="text-center px-4 max-w-sm">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Aponte a câmara do telemóvel para a etiqueta **QR Code** colada na viatura ou gerador.
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  Abertura automática de ficha técnica
                </p>
              </div>

              {/* Tratamento de Erros de Permissão ou Scanner */}
              {scannerError && (
                <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start max-w-sm">
                  <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold block text-red-300">Falha no Scanner</span>
                    <span className="leading-relaxed block text-slate-300">{scannerError}</span>
                    <button
                      onClick={startCamera}
                      className="mt-2 text-[10px] font-bold bg-red-900/40 text-red-300 px-2 py-1 rounded border border-red-800/30 hover:bg-red-900/60"
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
              <Loader2 className="animate-spin text-emerald-500" size={36} />
              <p className="text-xs text-slate-400 font-medium tracking-wide">A carregar detalhes de campo do ativo...</p>
            </div>
          )}

          {/* MODO C: PAINEL DE AÇÃO RÁPIDA DE CAMPO (Ativo Identificado!) */}
          {activeAsset && (
            <div className="space-y-5 animate-slide-up">
              
              {/* Header de Identificação do Ativo */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono font-bold text-sm text-emerald-400 block tracking-wider uppercase">
                    {activeAsset.code_tag || activeAsset.codeTag}
                  </span>
                  <h3 className="text-white font-bold text-base leading-tight">{activeAsset.name}</h3>
                  <span className="text-xs text-slate-400 block mt-0.5">{activeAsset.brand} {activeAsset.model}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                    level === 'A' 
                      ? 'bg-red-950/40 text-red-400 border border-red-500/20' 
                      : level === 'B' 
                      ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' 
                      : 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                  }`}>
                    Criticidade {level}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    {isVehicle ? "Frota de Campo" : "Equipamento Industrial"}
                  </span>
                </div>
              </div>

              {/* Detalhes Técnicos e de Conformidade */}
              <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-850 pb-1.5">
                  Ficha Operacional & Conformidade
                </span>
                
                {isVehicle ? (
                  /* INFORMAÇÕES DE VIATURA */
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Matrícula</span>
                      <span className="text-slate-200 font-mono font-bold">{activeAsset.license_plate || activeAsset.licensePlate || '---'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Odómetro Atual</span>
                      <span className="text-slate-200 font-bold">{(activeAsset.current_meter ?? activeAsset.currentMeter ?? 0).toLocaleString('pt-MZ')} km</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block uppercase text-[10px]">Validade Inspeção INATRO</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-emerald-500" />
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
                      <span className="text-slate-500 block uppercase text-[10px]">Setor da Planta</span>
                      <span className="text-slate-200 font-semibold">{activeAsset.plant_sector || activeAsset.plantSector || 'Não especificado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Horímetro Atual</span>
                      <span className="text-slate-200 font-bold">{(activeAsset.current_meter ?? activeAsset.currentMeter ?? 0).toLocaleString('pt-MZ')} horas</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Tensão / Potência</span>
                      <span className="text-slate-200 font-mono font-bold">
                        {activeAsset.voltage_specs || activeAsset.voltageSpecs || '---'} / {activeAsset.power_kw_kva || activeAsset.powerKwKva || '---'} kW
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[10px]">Calibração INNOQ</span>
                      <span className="text-slate-200 font-semibold flex items-center gap-1">
                        <Clock size={12} className="text-emerald-500" />
                        {activeAsset.innoq_calibration_expiry || activeAsset.innoqCalibrationExpiry 
                          ? new Date(activeAsset.innoq_calibration_expiry || activeAsset.innoqCalibrationExpiry || '').toLocaleDateString('pt-MZ') 
                          : 'Sem calibração ativa'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* AÇÃO A: ATUALIZAR CONTADOR DE CAMPO */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                  <Gauge size={14} />
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3.5 top-2 text-[10px] font-bold text-slate-500">
                      {isVehicle ? "KM" : "HORAS"}
                    </span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingMeter || meterValue === '' || Number(meterValue) < (activeAsset.current_meter ?? activeAsset.currentMeter ?? 0)}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 h-9"
                  >
                    {submittingMeter ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <span>Guardar</span>
                    )}
                  </button>
                </form>

                {meterSuccess && (
                  <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Contador atualizado e sincronizado com sucesso!</span>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  O valor atual é de {activeAsset.current_meter ?? activeAsset.currentMeter ?? 0} {isVehicle ? "km" : "horas"}. Não é possível inserir valores inferiores ao atual.
                </span>
              </div>

              {/* AÇÃO B: CONSULTAR DOCUMENTAÇÃO DE CAMPO */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span>Documentos e Certificados do Ativo ({documents.length})</span>
                </span>

                {loadingDocs ? (
                  <div className="text-center py-4">
                    <Loader2 size={18} className="animate-spin text-slate-500 mx-auto" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Nenhum certificado ou ficha anexada.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-2 bg-slate-950/40 border border-slate-850 rounded-lg flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-2 truncate mr-3">
                          <File size={14} className="text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-300 truncate" title={doc.title}>{doc.title}</span>
                        </div>
                        <a
                          href={doc.signed_url || doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 shrink-0"
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
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                {!reportIssue ? (
                  <button
                    onClick={() => setReportIssue(true)}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/70 border border-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Activity size={14} />
                    <span>Reportar Anomalia / Avaria na Viatura</span>
                  </button>
                ) : (
                  <form onSubmit={handleReportIssueSubmit} className="space-y-3 animate-fade-in">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
                      Descrever Anomalia Operacional
                    </span>
                    <textarea
                      required
                      rows={2}
                      value={issueDescription}
                      onChange={(e) => setReportIssueDescription(e.target.value)}
                      placeholder="Descreva o problema encontrado (ex: vazamento de óleo, ruído na caixa de câmbio...)"
                      className="w-full bg-slate-950 border border-slate-850 focus:border-red-500/50 rounded-lg p-2.5 text-xs text-white"
                    />
                    
                    {issueSuccess && (
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>Ordem de Manutenção Corretiva Aberta!</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReportIssue(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingIssue || !issueDescription.trim()}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                className="w-full py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/20 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
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
