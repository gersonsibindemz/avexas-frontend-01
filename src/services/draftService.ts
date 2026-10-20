/**
 * Serviço de Gestão e Persistência de Rascunhos (Drafts)
 * Permite salvar, recuperar e eliminar rascunhos de formulários
 * com isolamento por utilizador e tenant.
 */

export interface DraftEnvelope<T = any> {
  data: T;
  timestamp: number;
  meta?: Record<string, any>;
}

const buildKey = (module: string, tenantId?: string, userId?: string): string => {
  const tenant = tenantId || 'default_tenant';
  const user = userId || 'default_user';
  return `avexas_cmms_draft_${module}_${tenant}_${user}`;
};

export const draftService = {
  /**
   * Salva os dados de um formulário como rascunho
   */
  saveDraft: <T = any>(
    module: string,
    data: T,
    tenantId?: string,
    userId?: string,
    meta?: Record<string, any>
  ): void => {
    try {
      const key = buildKey(module, tenantId, userId);
      const envelope: DraftEnvelope<T> = {
        data,
        timestamp: Date.now(),
        meta
      };
      localStorage.setItem(key, JSON.stringify(envelope));
    } catch (err) {
      console.warn(`[DraftService] Erro ao gravar rascunho do módulo ${module}:`, err);
    }
  },

  /**
   * Recupera o rascunho salvo para o módulo e utilizador atual
   */
  getDraft: <T = any>(
    module: string,
    tenantId?: string,
    userId?: string
  ): DraftEnvelope<T> | null => {
    try {
      const key = buildKey(module, tenantId, userId);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as DraftEnvelope<T>;
    } catch (err) {
      console.warn(`[DraftService] Erro ao obter rascunho do módulo ${module}:`, err);
      return null;
    }
  },

  /**
   * Remove definitivamente o rascunho
   */
  clearDraft: (module: string, tenantId?: string, userId?: string): void => {
    try {
      const key = buildKey(module, tenantId, userId);
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[DraftService] Erro ao remover rascunho do módulo ${module}:`, err);
    }
  },

  /**
   * Verifica se existe um rascunho salvo
   */
  hasDraft: (module: string, tenantId?: string, userId?: string): boolean => {
    try {
      const key = buildKey(module, tenantId, userId);
      return !!localStorage.getItem(key);
    } catch {
      return false;
    }
  },

  /**
   * Helper para verificar se um objeto tem pelo menos um valor preenchido/não padrão
   */
  hasMeaningfulContent: (obj: any, ignoreKeys: string[] = []): boolean => {
    if (!obj || typeof obj !== 'object') return false;

    for (const [key, value] of Object.entries(obj)) {
      if (ignoreKeys.includes(key)) continue;

      if (value === null || value === undefined) continue;

      if (typeof value === 'string' && value.trim() !== '') {
        return true;
      }

      if (typeof value === 'number' && value !== 0 && !isNaN(value)) {
        return true;
      }

      if (typeof value === 'boolean' && value) {
        return true;
      }

      if (Array.isArray(value) && value.length > 0) {
        return true;
      }

      if (typeof value === 'object' && draftService.hasMeaningfulContent(value, ignoreKeys)) {
        return true;
      }
    }

    return false;
  }
};
