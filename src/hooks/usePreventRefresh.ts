import { useEffect } from 'react';

/**
 * Hook para previnir o recarregamento ou encerramento acidental da página
 * no navegador (F5, fechar aba, fechar janela, botão recarregar).
 *
 * @param enabled Define se a proteção contra recarregamento está ativa (padrão: true)
 */
export const usePreventRefresh = (enabled: boolean = false) => {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Cancela o evento conforme especificação
      event.preventDefault();
      // O Chrome requer que returnValue seja definido com uma string
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);
};

export default usePreventRefresh;
