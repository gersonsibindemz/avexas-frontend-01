import React from 'react';
import { FileText, Trash2 } from 'lucide-react';

export interface DraftBannerProps {
  onDiscard: () => void;
  savedAt?: number | null;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({ onDiscard, savedAt }) => {
  const timeText = savedAt
    ? `salvo em ${new Date(savedAt).toLocaleDateString('pt-MZ')} às ${new Date(savedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`
    : 'salvo anteriormente';

  return (
    <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 animate-fade-in">
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={16} className="text-amber-700 shrink-0" />
        <span className="truncate">
          <strong className="font-semibold">Rascunho recuperado:</strong> Dados restaurados ({timeText}).
        </span>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        className="self-end sm:self-auto text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 py-0.5 px-2 rounded hover:bg-rose-50"
        title="Descartar rascunho e limpar formulário"
      >
        <Trash2 size={12} />
        <span>Descartar rascunho</span>
      </button>
    </div>
  );
};

export default DraftBanner;
