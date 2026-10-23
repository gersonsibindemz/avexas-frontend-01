import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { SecondaryView } from './SecondaryView';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';

interface RegisterMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  onSuccess: () => void;
}

export const RegisterMaintenanceModal: React.FC<RegisterMaintenanceModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState('Preventiva');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technician, setTechnician] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      setMaintenanceType('Preventiva');
      setMaintenanceDate(new Date().toISOString().split('T')[0]);
      setMeterReading(String(asset.current_meter ?? asset.currentMeter ?? ''));
      setTitle(`Manutenção em ${asset.code_tag || asset.name}`);
      setDescription('');
      setTechnician(asset.responsible || '');
      setCost('');
    }
  }, [isOpen, asset]);

  if (!asset) return null;

  const codeTag = asset.code_tag || asset.codeTag || 'SEM-TAG';
  const meterUnit = asset.meter_unit || asset.measurement_unit || 'Km';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showAlert({ title: 'Campo Obrigatório', message: 'Por favor, insira o título ou motivo da manutenção.', type: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const typeMap: Record<string, string> = {
        'Preventiva': 'preventive',
        'Correctiva': 'corrective',
        'Preditiva': 'predictive',
        'Inspecção': 'inspection',
      };

      const numericMeter = meterReading ? Number(meterReading) : undefined;
      const currentAssetMeter = Number(asset.current_meter || asset.currentMeter || 0);
      const newMeter = numericMeter !== undefined && Number.isFinite(numericMeter) ? Math.max(numericMeter, currentAssetMeter) : currentAssetMeter;

      // 1. Criar Ordem de Serviço concluída para registo de histórico
      try {
        await api.post('/work-orders', {
          assetId: asset.id,
          title: title.trim(),
          description: description.trim() || `Intervenção de manutenção ${maintenanceType.toLowerCase()} registada diretamente no ativo.`,
          orderType: typeMap[maintenanceType] || 'preventive',
          priority: 'medium',
          status: 'completed',
          meterAtService: numericMeter,
          assignedTo: technician.trim() || undefined,
        });
      } catch (woErr) {
        console.warn('Ordem de serviço não criada diretamente, prosseguindo com ficha do ativo:', woErr);
      }

      // 2. Atualizar a ficha do ativo com o registo da última manutenção
      await api.patch(`/assets/${asset.id}`, {
        last_maintenance_date: maintenanceDate || undefined,
        last_maintenance_meter: numericMeter,
        maintenance_type: maintenanceType,
        maintenance_notes: description.trim() || undefined,
        current_meter: newMeter,
        currentMeter: newMeter,
        last_reading_date: maintenanceDate || undefined,
      });

      showAlert({
        title: 'Manutenção Registada',
        message: `A manutenção no equipamento ${codeTag} foi guardada com sucesso!`,
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao registar manutenção:', err);
      showAlert({
        title: 'Erro ao Registar',
        message: err.response?.data?.message || err.response?.data?.error || 'Não foi possível registar a manutenção.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none';

  return (
    <SecondaryView
      isOpen={isOpen}
      onClose={onClose}
      title="Registar Manutenção no Equipamento"
      subtitle={`Registo de intervenção para ${codeTag} (${asset.name || 'Sem nome'})`}
      maxWidthClass="max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6 text-xs text-slate-800">
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 block text-xs">{codeTag} · {asset.name}</span>
            <span className="text-[11px] text-slate-500">
              {asset.brand} {asset.model} | Placa: {asset.license_plate || '—'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Medidor Registado:</span>
            <span className="font-mono font-bold text-slate-900 text-xs">
              {asset.current_meter ?? '0'} {meterUnit}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Manutenção *
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              className={fieldClass}
            >
              <option value="Preventiva">Preventiva</option>
              <option value="Correctiva">Correctiva</option>
              <option value="Preditiva">Preditiva</option>
              <option value="Inspecção">Inspecção</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data da Intervenção *
            </label>
            <input
              type="date"
              required
              value={maintenanceDate}
              onChange={(e) => setMaintenanceDate(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Leitura do Medidor ({meterUnit})
            </label>
            <input
              type="number"
              min="0"
              placeholder={`ex: ${asset.current_meter || '0'}`}
              value={meterReading}
              onChange={(e) => setMeterReading(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Técnico / Responsável
            </label>
            <input
              type="text"
              placeholder="Nome do técnico ou oficina executante"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Título / Resumo da Manutenção *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Revisão dos 10.000 Km, Troca de Óleo e Filtros"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Custo Estimado / Peças (MZN)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="ex: 15000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Descrição dos Trabalhos Executados / Notas
          </label>
          <textarea
            rows={3}
            placeholder="Detalhes dos serviços realizados, peças substituídas ou recomendações futuras..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>A registar...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Guardar Manutenção</span>
              </>
            )}
          </button>
        </div>
      </form>
    </SecondaryView>
  );
};
