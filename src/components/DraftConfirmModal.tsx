import React from 'react';
import { FileText, Trash2, Save, X } from 'lucide-react';

export interface DraftConfirmModalProps {
  isOpen: boolean;
  moduleName: string;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const DraftConfirmModal: React.FC<DraftConfirmModalProps> = ({
  isOpen,
  moduleName,
  onSaveDraft,
  onDiscard,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div 
        role="dialog"
        aria-labelledby="draft-confirm-title"
        aria-modal="true"
        className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scale-up"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="draft-confirm-title" className="text-sm font-bold text-slate-900">
                Guardar como Rascunho?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Você já começou a preencher este registo de <strong className="text-slate-800 font-semibold">{moduleName}</strong>. 
                Deseja guardar as informações para continuar mais tarde ou descartar definitivamente?
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Voltar ao formulário"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Descartar e Sair</span>
            </button>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
              >
                Continuar a Preencher
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-md transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Save size={13} />
                <span>Salvar Rascunho</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftConfirmModal;
