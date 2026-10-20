import React, { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface SecondaryViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  backLabel?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  maxWidth?: string;
  className?: string;
}

export const SecondaryView: React.FC<SecondaryViewProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  backLabel = 'Voltar',
  icon,
  actions,
  children,
  maxWidthClass,
  maxWidth,
  className = ''
}) => {
  const effectiveMaxWidthClass = maxWidthClass || (maxWidth ? (maxWidth.includes('mx-auto') ? maxWidth : `${maxWidth} mx-auto`) : 'max-w-6xl mx-auto');
  useEffect(() => {
    if (!isOpen) return;

    // Fixar e resetar o scroll do contentor principal do layout
    const mainEl = document.querySelector('main');
    const originalOverflow = mainEl?.style.overflow;
    if (mainEl) {
      mainEl.scrollTop = 0;
      mainEl.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (mainEl) {
        mainEl.style.overflow = originalOverflow || '';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label={title}
      className={`absolute inset-0 z-30 bg-slate-50 flex flex-col min-h-full animate-fade-in ${className}`}
    >
      {/* Barra superior de navegação da Camada Secundária */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors cursor-pointer border border-slate-200 shrink-0"
            title="Voltar para a página anterior"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Voltar</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-blue-700 shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h2 className="text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-slate-500 leading-tight truncate hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar e voltar"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Área de conteúdo rolável da Camada Secundária */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className={`w-full ${effectiveMaxWidthClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SecondaryView;
