/**
 * Serviço de Tratamento e Deduplicação Inteligente de Notificações
 * Garante unicidade por assunto/ocorrência, eliminando duplicações em pares,
 * mas preservando repetições legítimas com datetime próprio.
 */

export interface NotificationItem {
  id: string | number;
  title?: string;
  titulo?: string;
  message?: string;
  mensagem?: string;
  asset_id?: string | number;
  assetId?: string | number;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  read?: boolean;
  isRead?: boolean;
  link?: string;
  targetUrl?: string;
  target_url?: string;
  url?: string;
  _duplicateIds?: (string | number)[];
}

export const deduplicateNotifications = (items: NotificationItem[]): NotificationItem[] => {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Ordena por data decrescente (mais recentes primeiro)
  const sorted = [...items].sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const result: NotificationItem[] = [];

  for (const item of sorted) {
    const rawTitle = (item.title || item.titulo || '').trim().toLowerCase();
    const rawMsg = (item.message || item.mensagem || '').trim().toLowerCase();
    const assetKey = String(item.asset_id || item.assetId || '');
    const subjectKey = `${rawTitle}:::${rawMsg}:::${assetKey}`;

    const itemDate = new Date(item.created_at || item.createdAt || 0);
    const itemTime = itemDate.getTime();

    // Procura se já existe uma notificação com o mesmo assunto registrada nesta ocorrência
    const existingIndex = result.findIndex((existing) => {
      const exTitle = (existing.title || existing.titulo || '').trim().toLowerCase();
      const exMsg = (existing.message || existing.mensagem || '').trim().toLowerCase();
      const exAsset = String(existing.asset_id || existing.assetId || '');
      const exSubjectKey = `${exTitle}:::${exMsg}:::${exAsset}`;

      if (exSubjectKey !== subjectKey) return false;

      // Mesmo assunto: verifica se é duplicação em par (mesma ocorrência)
      // Se a diferença de tempo for menor ou igual a 30 minutos (ou sem data válida), trata-se de par duplicado.
      // Se for um evento anterior que se repetiu em data/hora diferente (> 30 min), é uma notificação válida.
      const exDate = new Date(existing.created_at || existing.createdAt || 0);
      const exTime = exDate.getTime();

      if (isNaN(itemTime) || isNaN(exTime)) {
        return true;
      }

      const diffMinutes = Math.abs(exTime - itemTime) / (1000 * 60);
      return diffMinutes <= 30;
    });

    if (existingIndex >= 0) {
      // É uma duplicata em par do mesmo evento! Agrupa o ID
      const existing = result[existingIndex];
      const dupIds = existing._duplicateIds || [existing.id];
      if (!dupIds.includes(item.id)) {
        dupIds.push(item.id);
      }
      existing._duplicateIds = dupIds;

      // Se qualquer uma das cópias não tiver sido lida, marca a mantida como não-lida
      const isItemUnread = !(item.is_read ?? item.read ?? item.isRead);
      if (isItemUnread) {
        existing.is_read = false;
        existing.read = false;
        existing.isRead = false;
      }
    } else {
      // Nova notificação única ou repetição legítima em datetime diferente
      result.push({
        ...item,
        _duplicateIds: [item.id]
      });
    }
  }

  return result;
};
