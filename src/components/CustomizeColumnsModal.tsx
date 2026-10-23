import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, Plus, RotateCcw, Check } from 'lucide-react';
import { SecondaryView } from './SecondaryView';

export interface ColumnDefinition {
  id: string;
  label: string;
  visible: boolean;
}

interface CustomizeColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: ColumnDefinition[];
  onApplyLayout: (columns: ColumnDefinition[]) => void;
  onResetDefault: () => void;
}

export const CustomizeColumnsModal: React.FC<CustomizeColumnsModalProps> = ({
  isOpen,
  onClose,
  availableColumns,
  onApplyLayout,
  onResetDefault,
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setColumns([...availableColumns]);
      setSelectedToAdd('');
    }
  }, [isOpen, availableColumns]);

  const visibleColumns = columns.filter((col) => col.visible);
  const hiddenColumns = columns.filter((col) => !col.visible);

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleColumns.length) return;

    const newVisible = [...visibleColumns];
    const [moved] = newVisible.splice(index, 1);
    newVisible.splice(targetIndex, 0, moved);

    // Reconstruct full list preserving visible order followed by hidden
    setColumns([...newVisible, ...hiddenColumns]);
  };

  const removeColumn = (colId: string) => {
    setColumns(
      columns.map((col) => (col.id === colId ? { ...col, visible: false } : col))
    );
  };

  const addColumn = () => {
    if (!selectedToAdd) return;
    setColumns(
      columns.map((col) => (col.id === selectedToAdd ? { ...col, visible: true } : col))
    );
    setSelectedToAdd('');
  };

  const handleApply = () => {
    onApplyLayout(columns);
    onClose();
  };

  const handleReset = () => {
    onResetDefault();
    onClose();
  };

  return (
    <SecondaryView
      isOpen={isOpen}
      onClose={onClose}
      title="Personalizar Colunas da Tabela"
      subtitle="Organize, adicione ou oculte as colunas exibidas na tabela de equipamentos"
      maxWidthClass="max-w-2xl mx-auto"
    >
      <div className="space-y-6 pb-6 text-xs text-slate-800">
        {/* Adicionar Colunas Ocultas */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Adicionar Coluna à Vista
          </label>
          <div className="flex gap-2">
            <select
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              disabled={hiddenColumns.length === 0}
              className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 disabled:opacity-50"
            >
              <option value="">
                {hiddenColumns.length === 0
                  ? 'Todas as colunas disponíveis já estão visíveis'
                  : 'Selecione uma coluna para adicionar...'}
              </option>
              {hiddenColumns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addColumn}
              disabled={!selectedToAdd}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={14} />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {/* Lista de Colunas Visíveis com Ordenação e Remoção */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-900">
              Colunas Visíveis ({visibleColumns.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Use as setas para mover a posição ou o "X" para remover.
            </span>
          </div>

          <div className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white max-h-72 overflow-y-auto">
            {visibleColumns.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                Nenhuma coluna selecionada. Adicione pelo menos uma coluna.
              </div>
            ) : (
              visibleColumns.map((col, idx) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 text-xs">{col.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, 'down')}
                      disabled={idx === visibleColumns.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColumn(col.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded ml-1 cursor-pointer"
                      title="Remover coluna"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs w-full sm:w-auto justify-center"
          >
            <RotateCcw size={13} />
            <span>Restaurar padrão</span>
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium cursor-pointer w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={visibleColumns.length === 0}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center shadow-xs"
            >
              <Check size={14} />
              <span>Aplicar Layout</span>
            </button>
          </div>
        </div>
      </div>
    </SecondaryView>
  );
};
