import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { BrandLogo } from './BrandLogo';
import {
  Wrench,
  X,
  Lock,
  UploadCloud,
  Info,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

export interface MaintenanceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdNotification?: any) => void;
  initialData?: any;
}

interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
  file?: File;
}

export const MaintenanceNotificationModal: React.FC<MaintenanceNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData
}) => {
  const { user } = useAuth();
  const domainConfig = useCurrentDomain();
  const isPlant = domainConfig.domain === 'plant';

  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campos do formulário
  const [requestNumber, setRequestNumber] = useState<string>('Será gerado automaticamente');
  const [status, setStatus] = useState<'draft' | 'pending_triage' | string>('pending_triage');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Campos de Fábrica e Frota
  const [areaProcess, setAreaProcess] = useState('');
  const [location, setLocation] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [requesterName, setRequesterName] = useState(user?.fullName || '');
  const [operatorName, setOperatorName] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [maintenanceType, setMaintenanceType] = useState<string>('corrective');
  const [meterValue, setMeterValue] = useState<number | ''>('');
  const [operationalStatus, setOperationalStatus] = useState<string>('stopped');
  const [problemDescription, setProblemDescription] = useState('');

  // Anexos
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Carrega lista de ativos
  useEffect(() => {
    if (!isOpen) return;

    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const response = await api.get('/assets');
        const list = Array.isArray(response.data) ? response.data : (response.data?.assets || response.data?.data || []);
        
        // Filtrar por domínio
        const domainList = list.filter((asset: any) => {
          const isPlantType = asset.category === 'generator' || asset.category === 'machinery' || asset.type === 'plant' || asset.category_type === 'plant';
          const isFleetType = asset.category === 'vehicle_light' || asset.category === 'vehicle_heavy' || asset.type === 'fleet' || asset.category_type === 'fleet';
          if (isPlant) return !isFleetType;
          return !isPlantType;
        });

        const finalList = domainList.length > 0 ? domainList : list;
        setAssets(finalList);

        if (initialData) {
          const matched = finalList.find((a: any) => a.id === initialData.asset_id || a.id === initialData.assetId);
          if (matched) {
            setSelectedAssetId(matched.id);
            setSelectedAsset(matched);
          }
        } else if (finalList.length > 0 && !selectedAssetId) {
          setSelectedAssetId(finalList[0].id);
          setSelectedAsset(finalList[0]);
          const currentM = finalList[0].current_meter ?? finalList[0].currentMeter ?? '';
          setMeterValue(currentM);
        }
      } catch (err) {
        console.error('Erro ao carregar ativos para notificação:', err);
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchAssets();

    if (user?.fullName) {
      setRequesterName(user.fullName);
    }
  }, [isOpen, isPlant, user]);

  // Preenche dados ao selecionar um ativo
  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = assets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
    if (asset) {
      const meter = asset.current_meter ?? asset.currentMeter ?? '';
      setMeterValue(meter);
    }
  };

  // Trata upload de ficheiros
  const handleFileAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles: AttachedFile[] = [];

    Array.from(files).forEach((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: `${sizeMb} MB`,
        type: file.type,
        previewUrl,
        file
      });
    });

    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Submissão da Notificação (Enviar ou Guardar Rascunho)
  const handleSubmit = async (targetStatus: 'draft' | 'pending_triage') => {
    if (targetStatus === 'pending_triage') {
      if (!selectedAssetId) {
        alert('Por favor, selecione o equipamento ou veículo.');
        return;
      }
      if (!problemDescription.trim()) {
        alert('Por favor, descreva detalhadamente o problema.');
        return;
      }
      if (!requesterName.trim()) {
        alert('Por favor, informe o nome do solicitante.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const codeTag = selectedAsset?.code_tag || selectedAsset?.codeTag || '';
    const licensePlate = selectedAsset?.license_plate || selectedAsset?.licensePlate || '';

    // Converter fotos anexadas para base64 para envio persistente
    const base64Files = await Promise.all(
      attachedFiles.map(f => {
        if (!f.file) return Promise.resolve(null);
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(f.file!);
        });
      })
    );

    const attachmentsList = base64Files.filter(Boolean);

    const payload = {
      notification_number: initialData?.notification_number || `NOTIF-${Date.now().toString().substring(7)}`,
      asset_id: selectedAssetId,
      assetId: selectedAssetId,
      asset_code_tag: codeTag,
      asset_name: selectedAsset?.name || 'Equipamento',
      license_plate: licensePlate,
      domain: isPlant ? 'plant' : 'fleet',
      area_process: areaProcess,
      areaProcess,
      location: location || 'Não especificado',
      occurred_at: occurredAt || new Date().toISOString(),
      occurredAt,
      requester_name: requesterName,
      requesterName,
      operator_name: operatorName,
      operatorName,
      priority,
      maintenance_type: maintenanceType,
      maintenanceType,
      meter_value: meterValue !== '' ? Number(meterValue) : undefined,
      meterValue: meterValue !== '' ? Number(meterValue) : undefined,
      operational_status: operationalStatus,
      operationalStatus,
      description: problemDescription,
      status: targetStatus,
      attachments: attachmentsList
    };

    try {
      let createdData = null;
      try {
        const res = await api.post('/notifications/maintenance', payload);
        createdData = res.data?.notification || res.data?.data || res.data;
      } catch {
        // Fallback para rota geral
        const res = await api.post('/maintenance-notifications', payload).catch(() => null);
        createdData = res?.data || payload;
      }

      setSubmitSuccess(
        targetStatus === 'draft' 
          ? 'Notificação guardada como rascunho!' 
          : 'Notificação de Manutenção enviada para triagem com sucesso!'
      );

      if (onSuccess) {
        onSuccess(createdData || payload);
      }

      setTimeout(() => {
        setSubmitSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao submeter notificação de manutenção:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao submeter notificação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-slide-up my-6 flex flex-col max-h-[90vh]">
        
        {/* HEADER DO MODAL */}
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="border-r border-slate-200 pr-4 hidden sm:block">
              <BrandLogo variant="dark" className="h-7 w-auto" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#0066FF]" />
                <h2 className="text-base font-bold text-slate-900">Notificação de Manutenção</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPlant
                  ? 'Reporte uma avaria, anomalia ou necessidade de intervenção na fábrica'
                  : 'Reporte uma avaria, anomalia ou necessidade de intervenção na frota'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO (SCROLL) */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50/50">
          
          {/* TOAST DE SUCESSO OU ERRO */}
          {submitSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-3 animate-fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{submitSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-3 animate-fade-in">
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BLOCO SUPERIOR DE METADADOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-none">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Nº da Solicitação
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={requestNumber}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg pl-9 pr-3 py-2 text-xs font-mono disabled:cursor-not-allowed"
                />
                <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Estado Atual
              </label>
              <div className="flex items-center h-9">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'draft'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {status === 'draft' ? 'Rascunho' : 'Pendente de Triagem'}
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO PRINCIPAL (CARD COM FAIXA SUPERIOR AZUL ESCURO #0B132B) */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
            
            {/* Faixa Superior Azul Escuro */}
            <div className="bg-[#0B132B] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span>{isPlant ? 'DADOS DO EQUIPAMENTO / PROCESSO' : 'DADOS DO VEÍCULO / EQUIPAMENTO'}</span>
              <span className="text-[10px] text-slate-300 font-mono">
                {isPlant ? 'ÂMBITO FABRIL' : 'FROTA RODOVIÁRIA'}
              </span>
            </div>

            <div className="p-5 space-y-4">
              
              {/* CAMPOS DE FÁBRICA vs FROTA */}
              {isPlant ? (
                /* CAMPOS PARA FÁBRICA (PLANT) */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ativo / Equipamento *
                      </label>
                      <select
                        value={selectedAssetId}
                        onChange={(e) => handleAssetSelect(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 cursor-pointer outline-none"
                      >
                        {loadingAssets ? (
                          <option value="">A carregar equipamentos...</option>
                        ) : assets.length === 0 ? (
                          <option value="">Nenhum equipamento cadastrado</option>
                        ) : (
                          assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              [{asset.code_tag || asset.codeTag}] {asset.name}
                            </option>
                          ))
                        )}
                      </select>
                      {selectedAsset && (
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          Marca: {selectedAsset.brand || 'N/A'} | Modelo: {selectedAsset.model || 'N/A'} | N.º Série: {selectedAsset.serial_number || selectedAsset.serialNumber || 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código do Equipamento
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedAsset?.code_tag || selectedAsset?.codeTag || ''}
                        placeholder="TAG-EQP"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-mono rounded-lg px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Área / Processo
                      </label>
                      <input
                        type="text"
                        value={areaProcess}
                        onChange={(e) => setAreaProcess(e.target.value)}
                        placeholder="ex: Envase — Linha 02 ou Moagem"
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Local da Ocorrência
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="ex: Setor de Envase — Linha 02"
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* CAMPOS PARA FROTA (FLEET) */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Veículo / Equipamento *
                      </label>
                      <select
                        value={selectedAssetId}
                        onChange={(e) => handleAssetSelect(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 cursor-pointer outline-none"
                      >
                        {loadingAssets ? (
                          <option value="">A carregar veículos...</option>
                        ) : assets.length === 0 ? (
                          <option value="">Nenhum veículo cadastrado</option>
                        ) : (
                          assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              [{asset.license_plate || asset.licensePlate || asset.code_tag || asset.codeTag}] {asset.name}
                            </option>
                          ))
                        )}
                      </select>
                      {selectedAsset && (
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          Modelo: {selectedAsset.model || 'N/A'} | Combustível: {selectedAsset.fuel_type || selectedAsset.fuelType || 'Diesel'} | Ano: {selectedAsset.manufacture_year || selectedAsset.manufactureYear || 'N/A'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Matrícula / Registro
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedAsset?.license_plate || selectedAsset?.licensePlate || ''}
                        placeholder="MM-00-XX"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-mono rounded-lg px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Local da Ocorrência
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="ex: Frente de lavra — Área Norte ou Estrada EN6"
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motorista / Operador
                      </label>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="ex: João Macamo"
                        className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CAMPOS COMUNS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data e Hora da Ocorrência *
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Solicitante *
                  </label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                {isPlant && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Operador / Responsável
                    </label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="ex: Carlos Tembe"
                      className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPlant ? 'Horímetro Atual (Horas)' : 'Odómetro Atual (Km)'}
                  </label>
                  <input
                    type="number"
                    value={meterValue}
                    onChange={(e) => setMeterValue(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 12500"
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridade / Nível de Urgência
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 cursor-pointer outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente (Imediato)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Manutenção
                  </label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 cursor-pointer outline-none"
                  >
                    <option value="corrective">Corretiva (Avaria/Paragem)</option>
                    <option value="preventive">Preventiva</option>
                    <option value="predictive">Preditiva</option>
                    <option value="improvement">Melhoria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado Operacional do Ativo
                  </label>
                  <select
                    value={operationalStatus}
                    onChange={(e) => setOperationalStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2 text-xs text-slate-900 cursor-pointer outline-none"
                  >
                    <option value="stopped">Parado — {isPlant ? 'linha indisponível' : 'indisponível'}</option>
                    <option value="degraded">Operacional — {isPlant ? 'em risco' : 'com restrições'}</option>
                    <option value="normal">Operacional normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição Detalhada do Problema / Avaria *
                </label>
                <textarea
                  required
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Descreva detalhadamente o sintoma, ruído, fuga de óleo, vibração ou falha observada no equipamento..."
                  className="w-full bg-white border border-slate-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-lg px-3 py-2.5 text-xs text-slate-900 outline-none leading-relaxed"
                />
              </div>

            </div>
          </div>

          {/* BLOCO INFERIOR: ANEXOS E EVIDÊNCIAS */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
            
            {/* Faixa Superior Azul Escuro */}
            <div className="bg-[#0B132B] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider">
              ANEXOS E EVIDÊNCIAS (FOTOS E DOCUMENTOS)
            </div>

            <div className="p-5 space-y-4">
              
              {/* DROPZONE PONTILHADA */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileAdd(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative ${
                  isDragging ? 'border-[#0066FF] bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => handleFileAdd(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center border border-blue-100">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Arraste fotos, vídeos ou documentos aqui
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ou clique para selecionar ficheiros do seu dispositivo
                    </p>
                  </div>
                </div>
              </div>

              {/* LISTA DE FICHEIROS ANEXADOS */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    Ficheiros Anexados ({attachedFiles.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {attachedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt="Preview"
                              className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                              DOC
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 block truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block">{item.size}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                          title="Remover ficheiro"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAIXA INFORMATIVA */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-center gap-2.5">
                <Info size={16} className="text-[#0066FF] shrink-0" />
                <span>
                  Após a triagem, esta solicitação poderá originar uma Ordem de Serviço na equipa de manutenção.
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Os campos marcados com * são de preenchimento obrigatório.
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              Guardar como rascunho
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('pending_triage')}
              disabled={submitting}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-none"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>A submeter...</span>
                </>
              ) : (
                <span>Enviar solicitação</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MaintenanceNotificationModal;
