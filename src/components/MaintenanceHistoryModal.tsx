import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Wrench, Calendar, Gauge, CheckCircle2, Clock } from 'lucide-react';
import { SecondaryView } from './SecondaryView';
import { api } from '../services/api';

interface MaintenanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  onNewMaintenance: (asset: any) => void;
}

export const MaintenanceHistoryModal: React.FC<MaintenanceHistoryModalProps> = ({
  isOpen,
  onClose,
  asset,
  onNewMaintenance,
}) => {
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && asset?.id) {
      fetchHistory();
    }
  }, [isOpen, asset?.id]);

  const fetchHistory = async () => {
    if (!asset?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/work-orders', {
        params: { asset_id: asset.id },
      });
      const data = res.data?.data || res.data?.workOrders || res.data || [];
      const orders = Array.isArray(data) ? data : [];
      setWorkOrders(orders);
    } catch (err) {
      console.error('Erro ao carregar histórico de ordens:', err);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  const codeTag = asset.code_tag || asset.codeTag || 'SEM-TAG';

  const formatTypeLabel = (type?: string) => {
    switch (type) {
      case 'preventive':
        return 'Preventiva';
      case 'corrective':
        return 'Correctiva';
      case 'predictive':
        return 'Preditiva';
      case 'inspection':
        return 'Inspecção';
      default:
        return type || 'Manutenção';
    }
  };

  const formatStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={10} />
            <span>Concluída</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={10} />
            <span>Em Execução</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Pendente</span>
          </span>
        );
    }
  };

  return (
    <SecondaryView
      isOpen={isOpen}
      onClose={onClose}
      title={`Histórico de Manutenção: ${codeTag}`}
      subtitle={`Registo cronológico de ordens e intervenções em ${asset.name || 'Equipamento'}`}
      maxWidthClass="max-w-4xl mx-auto"
    >
      <div className="space-y-4 pb-6 text-xs text-slate-800">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div>
            <span className="font-mono font-bold text-slate-900 text-xs block">
              {codeTag} · {asset.name}
            </span>
            <span className="text-[11px] text-slate-500">
              {asset.brand} {asset.model} | Placa: {asset.license_plate || '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNewMaintenance(asset);
            }}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>Registar Nova Manutenção</span>
          </button>
        </div>

        {/* Listagem */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span>A carregar histórico de intervenções...</span>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-lg border border-slate-200 p-6">
            <Wrench size={32} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-xs font-bold text-slate-700">Sem histórico de manutenção registado</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Ainda não foram registadas ordens de serviço ou intervenções técnicas para este equipamento.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewMaintenance(asset);
              }}
              className="mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={13} />
              <span>Registar Primeira Manutenção</span>
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-3.5">Nº OS</th>
                    <th className="py-3 px-3.5">Intervenção / Descrição</th>
                    <th className="py-3 px-3.5">Tipo</th>
                    <th className="py-3 px-3.5">Data</th>
                    <th className="py-3 px-3.5">Medidor</th>
                    <th className="py-3 px-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workOrders.map((wo) => {
                    const osNum = wo.os_number || wo.osNumber || `OS-${String(wo.id).substring(0, 6).toUpperCase()}`;
                    const date = wo.completed_at || wo.created_at || wo.date;
                    const dateFormatted = date ? new Date(date).toLocaleDateString('pt-PT') : '—';
                    const meter = wo.meter_at_service ?? wo.meterAtService ?? wo.current_meter;

                    return (
                      <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {osNum}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-slate-900 block">{wo.title || 'Manutenção'}</span>
                          {wo.description && (
                            <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{wo.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                          {formatTypeLabel(wo.order_type || wo.orderType)}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{dateFormatted}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                          {meter !== undefined && meter !== null ? (
                            <div className="flex items-center gap-1.5">
                              <Gauge size={12} className="text-slate-400" />
                              <span>{meter}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {formatStatusBadge(wo.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </SecondaryView>
  );
};
