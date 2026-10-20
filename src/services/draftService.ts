/**
 * Serviço de Gestão e Persistência de Rascunhos (Drafts)
 * Permite salvar, recuperar e eliminar rascunhos de formulários em listas
 * com isolamento por utilizador e tenant.
 */

export interface DraftItem<T = any> {
  id: string;
  module: string;
  title: string;
  subtitle?: string;
  data: T;
  timestamp: number;
  meta?: Record<string, any>;
}

export interface DraftEnvelope<T = any> {
  data: T;
  timestamp: number;
  meta?: Record<string, any>;
}

const buildSingleKey = (module: string, tenantId?: string, userId?: string): string => {
  const tenant = tenantId || 'default_tenant';
  const user = userId || 'default_user';
  return `avexas_cmms_draft_${module}_${tenant}_${user}`;
};

const buildListKey = (module: string, tenantId?: string, userId?: string): string => {
  const tenant = tenantId || 'default_tenant';
  const user = userId || 'default_user';
  return `avexas_cmms_drafts_list_${module}_${tenant}_${user}`;
};

const deriveDraftTitle = (module: string, data: any): string => {
  if (!data || typeof data !== 'object') return 'Rascunho';
  switch (module) {
    case 'assets':
      return data.name?.trim() || data.code_tag?.trim() || data.license_plate?.trim() || 'Novo Ativo';
    case 'work_orders':
      return data.title?.trim() || 'Nova Ordem de Serviço';
    case 'maintenance_plans':
      return data.title?.trim() || 'Novo Plano de Manutenção';
    case 'fuel':
      return (
        data.plate?.trim() ||
        data.vehicle_name?.trim() ||
        (data.liters ? `${data.liters}L de Combustível` : 'Novo Abastecimento')
      );
    case 'inventory':
      return data.name?.trim() || data.part_number?.trim() || 'Novo Item de Inventário';
    default:
      return 'Rascunho';
  }
};

export const draftService = {
  /**
   * Salva os dados de um formulário na lista de rascunhos do módulo
   */
  saveDraft: <T = any>(
    module: string,
    data: T,
    tenantId?: string,
    userId?: string,
    meta?: Record<string, any>
  ): DraftItem<T> => {
    const listKey = buildListKey(module, tenantId, userId);
    const singleKey = buildSingleKey(module, tenantId, userId);
    const existingList = draftService.getDrafts<T>(module, tenantId, userId);

    const draftId = meta?.draftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const title = meta?.title || deriveDraftTitle(module, data);
    const subtitle = meta?.subtitle;

    const newItem: DraftItem<T> = {
      id: draftId,
      module,
      title,
      subtitle,
      data,
      timestamp: Date.now(),
      meta
    };

    // Atualiza se já existir ou prepend na lista
    const filtered = existingList.filter((d) => d.id !== draftId);
    const updatedList = [newItem, ...filtered].slice(0, 30); // armazena até 30 rascunhos

    try {
      localStorage.setItem(listKey, JSON.stringify(updatedList));
      // Mantém compatibilidade com chave unitária legado
      localStorage.setItem(
        singleKey,
        JSON.stringify({
          data,
          timestamp: newItem.timestamp,
          meta: { ...meta, draftId }
        })
      );
      window.dispatchEvent(new CustomEvent('cmms:drafts-updated', { detail: { module } }));
    } catch (err) {
      console.warn(`[DraftService] Erro ao gravar rascunho do módulo ${module}:`, err);
    }

    return newItem;
  },

  /**
   * Retorna todos os rascunhos guardados para um determinado módulo
   */
  getDrafts: <T = any>(module: string, tenantId?: string, userId?: string): DraftItem<T>[] => {
    try {
      const listKey = buildListKey(module, tenantId, userId);
      const raw = localStorage.getItem(listKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }

      // Fallback para chave unitária legado se a lista ainda não existir
      const singleKey = buildSingleKey(module, tenantId, userId);
      const singleRaw = localStorage.getItem(singleKey);
      if (singleRaw) {
        const single = JSON.parse(singleRaw);
        if (single && single.data) {
          const migrated: DraftItem<T> = {
            id: single.meta?.draftId || `draft_${single.timestamp || Date.now()}`,
            module,
            title: deriveDraftTitle(module, single.data),
            data: single.data,
            timestamp: single.timestamp || Date.now(),
            meta: single.meta
          };
          localStorage.setItem(listKey, JSON.stringify([migrated]));
          return [migrated];
        }
      }

      return [];
    } catch (err) {
      console.warn(`[DraftService] Erro ao obter lista de rascunhos do módulo ${module}:`, err);
      return [];
    }
  },

  /**
   * Recupera um rascunho específico ou o mais recente
   */
  getDraft: <T = any>(
    module: string,
    tenantId?: string,
    userId?: string,
    draftId?: string
  ): DraftEnvelope<T> | null => {
    try {
      const drafts = draftService.getDrafts<T>(module, tenantId, userId);
      if (drafts.length === 0) return null;

      const target = draftId ? drafts.find((d) => d.id === draftId) || drafts[0] : drafts[0];
      return {
        data: target.data,
        timestamp: target.timestamp,
        meta: { ...target.meta, draftId: target.id }
      };
    } catch (err) {
      console.warn(`[DraftService] Erro ao obter rascunho do módulo ${module}:`, err);
      return null;
    }
  },

  /**
   * Remove um rascunho específico pelo ID
   */
  deleteDraft: (module: string, draftId: string, tenantId?: string, userId?: string): void => {
    try {
      const listKey = buildListKey(module, tenantId, userId);
      const drafts = draftService.getDrafts(module, tenantId, userId);
      const updated = drafts.filter((d) => d.id !== draftId);
      localStorage.setItem(listKey, JSON.stringify(updated));

      const singleKey = buildSingleKey(module, tenantId, userId);
      if (updated.length > 0) {
        localStorage.setItem(
          singleKey,
          JSON.stringify({
            data: updated[0].data,
            timestamp: updated[0].timestamp,
            meta: updated[0].meta
          })
        );
      } else {
        localStorage.removeItem(singleKey);
      }

      window.dispatchEvent(new CustomEvent('cmms:drafts-updated', { detail: { module } }));
    } catch (err) {
      console.warn(`[DraftService] Erro ao remover rascunho ${draftId} do módulo ${module}:`, err);
    }
  },

  /**
   * Remove todos os rascunhos de um módulo
   */
  clearDraft: (module: string, tenantId?: string, userId?: string): void => {
    try {
      const listKey = buildListKey(module, tenantId, userId);
      const singleKey = buildSingleKey(module, tenantId, userId);
      localStorage.removeItem(listKey);
      localStorage.removeItem(singleKey);
      window.dispatchEvent(new CustomEvent('cmms:drafts-updated', { detail: { module } }));
    } catch (err) {
      console.warn(`[DraftService] Erro ao remover rascunhos do módulo ${module}:`, err);
    }
  },

  /**
   * Verifica se existe pelo menos um rascunho salvo
   */
  hasDraft: (module: string, tenantId?: string, userId?: string): boolean => {
    return draftService.getDrafts(module, tenantId, userId).length > 0;
  },

  /**
   * Retorna a quantidade de rascunhos de um módulo
   */
  getDraftsCount: (module: string, tenantId?: string, userId?: string): number => {
    return draftService.getDrafts(module, tenantId, userId).length;
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
