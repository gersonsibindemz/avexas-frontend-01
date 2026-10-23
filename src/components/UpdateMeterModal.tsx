import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Gauge } from 'lucide-react';
import { SecondaryView } from './SecondaryView';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';

interface UpdateMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  onSuccess: () => void;
}

export const UpdateMeterModal: React.FC<UpdateMeterModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [meterValue, setMeterValue] = useState('');
  const [readingDate, setReadingDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      setMeterValue(String(asset.current_meter ?? asset.currentMeter ?? ''));
      setReadingDate(new Date().toISOString().split('T')[0]);
      setNotes(asset.operational_notes || '');
    }
  }, [isOpen, asset]);

  if (!asset) return null;

  const codeTag = asset.code_tag || asset.codeTag || 'SEM-TAG';
  const meterUnit = asset.meter_unit || asset.measurement_unit || (asset.domain === 'plant' ? 'Horas' : 'Km');
  const currentVal = Number(asset.current_meter ?? asset.currentMeter ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericMeter = Number(meterValue);
    if (!Number.isFinite(numericMeter) || numericMeter < 0) {
      showAlert({ title: 'Valor Inválido', message: 'Por favor, insira um valor numérico válido para o medidor.', type: 'warning' });
      return;
    }

    if (numericMeter < currentVal) {
      showAlert({
        title: 'Leitura Inferior',
        message: `O novo valor (${numericMeter} ${meterUnit}) é inferior à leitura registada anteriormente (${currentVal} ${meterUnit}). Verifique o valor digitado.`,
        type: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/assets/${asset.id}`, {
        current_meter: numericMeter,
        currentMeter: numericMeter,
        last_reading_date: readingDate || undefined,
        operational_notes: notes.trim() || undefined,
      });

      showAlert({
        title: 'Medidor Atualizado',
        message: `A leitura de ${codeTag} foi atualizada para ${numericMeter} ${meterUnit}.`,
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar medidor:', err);
      showAlert({
        title: 'Erro na Atualização',
        message: err.response?.data?.message || err.response?.data?.error || 'Não foi possível atualizar o contador.',
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
      title="Atualizar Hodómetro / Horímetro"
      subtitle={`Lançamento de nova leitura para ${codeTag} (${asset.name || 'Sem nome'})`}
      maxWidthClass="max-w-md mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6 text-xs text-slate-800">
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-900 text-xs">{codeTag} · {asset.name}</span>
            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-800 rounded text-[10px] font-semibold">
              {asset.domain === 'plant' ? 'Horímetro' : 'Hodómetro'}
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Leitura atual gravada: <strong className="font-semibold text-slate-800">{currentVal} {meterUnit}</strong>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Gauge size={13} className="text-blue-700" />
            <span>Nova Leitura do Contador ({meterUnit}) *</span>
          </label>
          <input
            type="number"
            step="any"
            required
            min={currentVal}
            placeholder={`ex: ${currentVal + 100}`}
            value={meterValue}
            onChange={(e) => setMeterValue(e.target.value)}
            className={`${fieldClass} text-sm font-semibold`}
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            Insira o valor exato visível no painel do veículo ou horímetro da máquina.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Data da Leitura *
          </label>
          <input
            type="date"
            required
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Observações Operacionais (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Turno, rota, condições de trabalho ou operador no momento da leitura..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
                <span>A atualizar...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Guardar Leitura</span>
              </>
            )}
          </button>
        </div>
      </form>
    </SecondaryView>
  );
};
