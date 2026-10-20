import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppAlertModal, AlertOptions, ConfirmOptions } from '../components/AppAlertModal';

interface AlertContextValue {
  showAlert: (optionsOrMessage: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

// Referência global acessível mesmo fora do ciclo de vida direto de hooks React
let globalShowAlert: ((optionsOrMessage: AlertOptions | string) => Promise<void>) | null = null;
let globalShowConfirm: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

export const triggerGlobalAlert = (optionsOrMessage: AlertOptions | string) => {
  if (globalShowAlert) {
    return globalShowAlert(optionsOrMessage);
  }
  return Promise.resolve();
};

export const triggerGlobalConfirm = (options: ConfirmOptions) => {
  if (globalShowConfirm) {
    return globalShowConfirm(options);
  }
  return Promise.resolve(false);
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: AlertOptions | null;
    isConfirm: boolean;
    confirmOptions: ConfirmOptions | null;
    resolvePromise?: (value: boolean | void) => void;
  }>({
    isOpen: false,
    options: null,
    isConfirm: false,
    confirmOptions: null,
  });

  const closeAlert = useCallback(() => {
    setModalState((prev) => {
      if (prev.resolvePromise) {
        prev.resolvePromise(false);
      }
      return {
        isOpen: false,
        options: null,
        isConfirm: false,
        confirmOptions: null,
      };
    });
  }, []);

  const handleConfirmAction = useCallback(() => {
    setModalState((prev) => {
      if (prev.confirmOptions?.onConfirm) {
        prev.confirmOptions.onConfirm();
      }
      if (prev.resolvePromise) {
        prev.resolvePromise(true);
      }
      return {
        isOpen: false,
        options: null,
        isConfirm: false,
        confirmOptions: null,
      };
    });
  }, []);

  const showAlert = useCallback((optionsOrMessage: AlertOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const options: AlertOptions =
        typeof optionsOrMessage === 'string'
          ? {
              message: optionsOrMessage,
              type: /erro|falha|inv[aá]lid|falhou|recusad/i.test(optionsOrMessage)
                ? 'error'
                : /sucesso|conclu[íi]d|cadastrado com sucesso|atualizado com sucesso/i.test(optionsOrMessage)
                ? 'success'
                : 'warning',
              title: /erro|falha|inv[aá]lid|falhou|recusad/i.test(optionsOrMessage)
                ? 'Erro'
                : /sucesso|conclu[íi]d/i.test(optionsOrMessage)
                ? 'Sucesso'
                : 'Atenção',
            }
          : optionsOrMessage;

      setModalState({
        isOpen: true,
        options,
        isConfirm: false,
        confirmOptions: null,
        resolvePromise: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        options: null,
        isConfirm: true,
        confirmOptions: options,
        resolvePromise: (val) => resolve(Boolean(val)),
      });
    });
  }, []);

  useEffect(() => {
    globalShowAlert = showAlert;
    globalShowConfirm = showConfirm;

    // Substituir transparentemente o alert nativo do navegador pelo nosso popup interno
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msgStr = typeof message === 'string' ? message : String(message ?? '');
      void showAlert(msgStr);
    };

    return () => {
      globalShowAlert = null;
      globalShowConfirm = null;
      window.alert = originalAlert;
    };
  }, [showAlert, showConfirm]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, closeAlert }}>
      {children}
      <AppAlertModal
        isOpen={modalState.isOpen}
        onClose={closeAlert}
        onConfirm={handleConfirmAction}
        isConfirm={modalState.isConfirm}
        options={modalState.options}
        confirmOptions={modalState.confirmOptions}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert deve ser utilizado dentro de um AlertProvider');
  }
  return context;
};
