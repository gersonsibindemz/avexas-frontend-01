import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
  X
} from 'lucide-react';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConfirm: boolean;
  options: AlertOptions | null;
  confirmOptions: ConfirmOptions | null;
}

export const AppAlertModal: React.FC<AppAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isConfirm,
  options,
  confirmOptions,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'TEXTAREA') {
          e.preventDefault();
          if (isConfirm) {
            onConfirm();
          } else {
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isConfirm, onClose, onConfirm]);

  if (!isOpen) return null;

  const type = options?.type || (confirmOptions?.danger ? 'warning' : 'info');
  const title = isConfirm
    ? confirmOptions?.title || 'Confirmação Necessária'
    : options?.title || (type === 'error' ? 'Erro' : type === 'success' ? 'Sucesso' : 'Atenção');
  const message = isConfirm ? confirmOptions?.message : options?.message;
  const confirmText = isConfirm
    ? confirmOptions?.confirmText || 'Confirmar'
    : options?.confirmText || 'Entendido';
  const cancelText = confirmOptions?.cancelText || 'Cancelar';

  const typeStyles = {
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-600',
      button: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
      icon: <AlertCircle size={24} className="text-rose-600" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
      icon: <AlertTriangle size={24} className="text-amber-600" />,
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
      icon: <CheckCircle2 size={24} className="text-emerald-600" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      button: 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white',
      icon: isConfirm ? <HelpCircle size={24} className="text-blue-600" /> : <Info size={24} className="text-blue-600" />,
    },
  }[type];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden transition-all transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${typeStyles.bg} ${typeStyles.border}`}
          >
            {typeStyles.icon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="alert-dialog-title"
              className="text-base font-bold text-slate-900 mb-1 leading-snug"
            >
              {title}
            </h3>
            <p
              id="alert-dialog-description"
              className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          {isConfirm && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={isConfirm ? onConfirm : onClose}
            className={`px-5 py-2 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer ${typeStyles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
