/**
 * Serviço de Cache Inteligente de Navegação em Memória
 * Evita recarregamentos desnecessários e spinners de loading ao alternar entre páginas.
 * Uma página só recarrega dados se o utilizador executou uma ação modificadora (criar, editar, eliminar)
 * ou clicou explicitamente no botão de recarregar.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  dirty: boolean;
}

class DataCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.dirty) return null;
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return Boolean(entry && !entry.dirty);
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      dirty: false,
    });
  }

  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.dirty = true;
    } else {
      this.cache.set(key, { data: null, timestamp: Date.now(), dirty: true });
    }
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  isDirty(key: string): boolean {
    const entry = this.cache.get(key);
    return !entry || entry.dirty;
  }
}

export const dataCache = new DataCacheService();
