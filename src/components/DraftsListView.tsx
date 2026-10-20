import React from 'react';
import { DraftItem } from '../services/draftService';
import { FileText, Trash2, Edit2, Clock, Plus, AlertCircle } from 'lucide-react';

interface DraftsListViewProps {
  moduleName: string; // e.g. "Ativo", "Ordem de Serviço", "Plano de Manutenção", "Abastecimento", "Item de Inventário"
  drafts: DraftItem[];
  onResumeDraft: (draft: DraftItem) => void;
  onDeleteDraft: (draftId: string) => void;
  onNewItem?: () => void;
}

export const DraftsListView: React.FC<DraftsListViewProps> = ({
  moduleName,
  drafts,
  onResumeDraft,
  onDeleteDraft,
  onNewItem
}) => {
  if (drafts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mx-auto">
          <FileText size={22} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhum rascunho guardado de {moduleName}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Quando iniciar o preenchimento de um novo {moduleName.toLowerCase()} e sair antes de concluir, poderá guardá-lo como rascunho para continuar mais tarde.
          </p>
        </div>
        {onNewItem && (
          <button
            type="button"
            onClick={onNewItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer shadow-xs mt-2"
          >
            <Plus size={14} />
            <span>Criar Novo {moduleName}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner Informativo */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Lista de Rascunhos:</span> Estes registos contêm informações parciais guardadas no seu dispositivo. Não foram submetidos à base de dados para não concorrer com os registos ativos. Clique em <strong>Continuar</strong> para concluir o preenchimento e registar oficialmente.
        </div>
      </div>

      {/* Tabela de Rascunhos */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Identificação do Rascunho</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Última Gravação</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-md">
                          {draft.title || 'Rascunho Sem Título'}
                        </div>
                        {draft.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                            {draft.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                    {moduleName}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock size={12} className="text-slate-400" />
                      <span>
                        {new Date(draft.timestamp).toLocaleString('pt-MZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Rascunho Pendente
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onResumeDraft(draft)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Continuar a preencher este rascunho"
                      >
                        <Edit2 size={12} />
                        <span>Continuar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja descartar definitivamente este rascunho de "${draft.title}"?`)) {
                            onDeleteDraft(draft.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Descartar rascunho"
                        aria-label="Descartar rascunho"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DraftsListView;
