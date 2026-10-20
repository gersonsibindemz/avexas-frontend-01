/**
 * Serviço de Gestão e Auditoria de Conjuntos Operacionais (Camião + Trelas)
 * 
 * Regras Funcionais Implementadas:
 * 1. Cada camião e cada trela possuem registo de equipamento e código de ativo próprios.
 * 2. O papel Líder/Seguidora é uma associação operacional dinâmica, separada da categoria/tipo.
 * 3. Associação e desassociação com histórico de auditoria completo (data, hora e utilizador responsável).
 * 4. Validação estrita contra dupla associação da mesma trela a dois conjuntos ativos simultaneamente.
 * 5. Suporte bilíngue para o rótulo "Papel da trela no conjunto" (Líder / Leader, Seguidora / Follower).
 * 6. Suporte a combinações flexíveis (1 trela simples, 2 trelas bitrem, ou 3+ trelas road-train/tritrem).
 * 7. Relatório consolidado de custos, manutenção, quilometragem, disponibilidade e documentação.
 */

export type TrailerRole = 'leader' | 'follower' | 'dolly' | 'intermediate';

export interface CombinationTrailerSlot {
  trailerId: string;
  role: TrailerRole;
  order: number;
}

export interface CombinationHistoryEntry {
  id: string;
  combinationId?: string;
  combinationCode: string;
  action: 'association' | 'disassociation' | 'modification';
  truckId: string;
  truckCodeTag?: string;
  truckName?: string;
  trailers: {
    id: string;
    codeTag?: string;
    name?: string;
    role: TrailerRole;
    roleLabel: string;
  }[];
  timestamp: string; // ISO 8601 com data e hora exatas
  performedByUserId?: string;
  performedByUserName: string;
  performedByUserEmail?: string;
  reason?: string;
}

export interface CombinationReportItem {
  combinationId: string;
  combinationCode: string;
  status: 'active' | 'terminated';
  startedAt?: string;
  truck: {
    id: string;
    codeTag: string;
    name: string;
    status: string;
    currentMeter: number;
    fuelCostMzn: number;
    maintenanceCostMzn: number;
    totalCostMzn: number;
    openWorkOrdersCount: number;
    completedWorkOrdersCount: number;
    documentsCount: number;
  };
  trailers: {
    id: string;
    codeTag: string;
    name: string;
    role: TrailerRole;
    roleLabel: string;
    status: string;
    maintenanceCostMzn: number;
    totalCostMzn: number;
    openWorkOrdersCount: number;
    completedWorkOrdersCount: number;
    documentsCount: number;
  }[];
  aggregated: {
    totalCostMzn: number;
    totalMaintenanceCostMzn: number;
    totalFuelCostMzn: number;
    totalWorkOrdersCount: number;
    overallOperationalStatus: 'operational' | 'impaired' | 'down';
    currentMeter: number;
    trailersCount: number;
  };
}

const STORAGE_PREFIX = 'cmms_combinations_history_';

export const combinationService = {
  /**
   * Obtém o rótulo padrão de um papel de trela (bilingue PT / EN)
   */
  getRoleLabel(role: TrailerRole, lang: 'pt' | 'en' = 'pt'): string {
    switch (role) {
      case 'leader':
        return lang === 'en' ? 'Leader (Líder)' : 'Líder (Leader)';
      case 'follower':
        return lang === 'en' ? 'Follower (Seguidora)' : 'Seguidora (Follower)';
      case 'dolly':
        return lang === 'en' ? 'Dolly (Conversor Dolly)' : 'Dolly (Dolly Converter)';
      case 'intermediate':
        return lang === 'en' ? 'Intermediate (Intermediária)' : 'Intermediária (Intermediate)';
      default:
        return role;
    }
  },

  /**
   * Carrega o histórico de auditoria de associações e desassociações por tenant
   */
  getHistory(tenantId?: string): CombinationHistoryEntry[] {
    const key = `${STORAGE_PREFIX}${tenantId || 'global'}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Grava um novo evento de auditoria no histórico
   */
  logEvent(tenantId: string | undefined, entry: Omit<CombinationHistoryEntry, 'id' | 'timestamp'>): void {
    const key = `${STORAGE_PREFIX}${tenantId || 'global'}`;
    const history = this.getHistory(tenantId);
    const newEntry: CombinationHistoryEntry = {
      ...entry,
      id: `comb-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...history].slice(0, 200); // mantém os últimos 200 eventos
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('Não foi possível persistir o histórico de combinações:', err);
    }
  },

  /**
   * Limpa o histórico de auditoria local de associações e desassociações por tenant
   */
  clearHistory(tenantId?: string): void {
    const key = `${STORAGE_PREFIX}${tenantId || 'global'}`;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('Não foi possível limpar o histórico de combinações:', err);
    }
  },

  /**
   * Verifica se uma trela já está associada a algum conjunto ativo.
   * Retorna { isOccupied: boolean, combinationCode?: string }
   */
  checkTrailerOccupied(
    trailerId: string,
    activeCombinations: any[]
  ): { isOccupied: boolean; activeCombinationCode?: string } {
    if (!trailerId || !activeCombinations) return { isOccupied: false };

    for (const comb of activeCombinations) {
      // Ignora combinações terminadas se houver indicador de status
      if (comb.status === 'terminated' || comb.status === 'inactive') continue;

      const leaderId = comb.leader_trailer_id || comb.leaderTrailerId || comb.leader_id || comb.leaderId;
      const followerId = comb.follower_trailer_id || comb.followerTrailerId || comb.follower_id || comb.followerId;

      if (leaderId === trailerId || followerId === trailerId) {
        return {
          isOccupied: true,
          activeCombinationCode: comb.combination_code || comb.combinationCode || comb.code || 'Conjunto Ativo'
        };
      }

      // Verifica lista interna de trelas se existir
      if (Array.isArray(comb.trailers)) {
        const found = comb.trailers.some((t: any) => (t.trailer_id || t.trailerId || t.id) === trailerId);
        if (found) {
          return {
            isOccupied: true,
            activeCombinationCode: comb.combination_code || comb.combinationCode || comb.code || 'Conjunto Ativo'
          };
        }
      }
    }

    return { isOccupied: false };
  },

  /**
   * Verifica se um camião trator já está associado a algum conjunto ativo
   */
  checkTruckOccupied(
    truckId: string,
    activeCombinations: any[]
  ): { isOccupied: boolean; activeCombinationCode?: string } {
    if (!truckId || !activeCombinations) return { isOccupied: false };

    for (const comb of activeCombinations) {
      if (comb.status === 'terminated' || comb.status === 'inactive') continue;

      const combTruckId = comb.truck_id || comb.truckId || comb.tractor_id || comb.tractorId;
      if (combTruckId === truckId) {
        return {
          isOccupied: true,
          activeCombinationCode: comb.combination_code || comb.combinationCode || comb.code || 'Conjunto Ativo'
        };
      }
    }

    return { isOccupied: false };
  },

  /**
   * Gera relatório analítico consolidado por conjunto operacional
   */
  buildCombinationReport(
    combinations: any[],
    assets: any[],
    workOrders: any[],
    fuelLogs: any[]
  ): CombinationReportItem[] {
    return combinations.map((comb) => {
      const truckId = comb.truck_id || comb.truckId || comb.tractor_id || comb.tractorId;
      const leaderId = comb.leader_trailer_id || comb.leaderTrailerId || comb.leader_id || comb.leaderId;
      const followerId = comb.follower_trailer_id || comb.followerTrailerId || comb.follower_id || comb.followerId;
      const combinationCode = comb.combination_code || comb.combinationCode || comb.code || 'CONJ-???';

      // Dados do Camião Trator
      const truckAsset = assets.find((a) => a.id === truckId);
      const truckTag = truckAsset?.code_tag || truckAsset?.codeTag || 'N/A';
      const truckName = truckAsset?.name || 'Camião Trator';
      const truckStatus = truckAsset?.status || 'operational';
      const truckMeter = Number(truckAsset?.current_meter || truckAsset?.currentMeter || 0);

      // Custos do Camião
      const truckWOs = workOrders.filter((wo) => (wo.asset_id || wo.assetId) === truckId);
      const truckMaintCost = truckWOs.reduce((acc, wo) => acc + Number(wo.total_cost_mzn || wo.totalCostMzn || 0), 0);
      const truckFuels = fuelLogs.filter((fl) => (fl.asset_id || fl.assetId) === truckId);
      const truckFuelCost = truckFuels.reduce((acc, fl) => acc + Number(fl.total_cost_mzn || fl.totalCostMzn || 0), 0);

      // Trelas do Conjunto
      const trailerList: any[] = [];

      if (leaderId) {
        const leaderAsset = assets.find((a) => a.id === leaderId);
        const leaderWOs = workOrders.filter((wo) => (wo.asset_id || wo.assetId) === leaderId);
        const leaderMaintCost = leaderWOs.reduce((acc, wo) => acc + Number(wo.total_cost_mzn || wo.totalCostMzn || 0), 0);

        trailerList.push({
          id: leaderId,
          codeTag: leaderAsset?.code_tag || leaderAsset?.codeTag || 'TRELA-1',
          name: leaderAsset?.name || 'Trela Líder',
          role: 'leader' as TrailerRole,
          roleLabel: 'Líder (Leader)',
          status: leaderAsset?.status || 'operational',
          maintenanceCostMzn: leaderMaintCost,
          totalCostMzn: leaderMaintCost,
          openWorkOrdersCount: leaderWOs.filter((wo) => wo.status === 'open' || wo.status === 'in_progress').length,
          completedWorkOrdersCount: leaderWOs.filter((wo) => wo.status === 'completed' || wo.status === 'closed').length,
          documentsCount: Array.isArray(leaderAsset?.documents) ? leaderAsset.documents.length : 0
        });
      }

      if (followerId) {
        const followerAsset = assets.find((a) => a.id === followerId);
        const followerWOs = workOrders.filter((wo) => (wo.asset_id || wo.assetId) === followerId);
        const followerMaintCost = followerWOs.reduce((acc, wo) => acc + Number(wo.total_cost_mzn || wo.totalCostMzn || 0), 0);

        trailerList.push({
          id: followerId,
          codeTag: followerAsset?.code_tag || followerAsset?.codeTag || 'TRELA-2',
          name: followerAsset?.name || 'Trela Seguidora',
          role: 'follower' as TrailerRole,
          roleLabel: 'Seguidora (Follower)',
          status: followerAsset?.status || 'operational',
          maintenanceCostMzn: followerMaintCost,
          totalCostMzn: followerMaintCost,
          openWorkOrdersCount: followerWOs.filter((wo) => wo.status === 'open' || wo.status === 'in_progress').length,
          completedWorkOrdersCount: followerWOs.filter((wo) => wo.status === 'completed' || wo.status === 'closed').length,
          documentsCount: Array.isArray(followerAsset?.documents) ? followerAsset.documents.length : 0
        });
      }

      // Adiciona trelas extras se a combinação tiver array trailers
      if (Array.isArray(comb.trailers)) {
        comb.trailers.forEach((extra: any, idx: number) => {
          const extraId = extra.trailer_id || extra.trailerId || extra.id;
          if (extraId !== leaderId && extraId !== followerId) {
            const extraAsset = assets.find((a) => a.id === extraId);
            const extraWOs = workOrders.filter((wo) => (wo.asset_id || wo.assetId) === extraId);
            const extraMaintCost = extraWOs.reduce((acc, wo) => acc + Number(wo.total_cost_mzn || wo.totalCostMzn || 0), 0);
            const role = (extra.role || 'follower') as TrailerRole;

            trailerList.push({
              id: extraId,
              codeTag: extraAsset?.code_tag || extraAsset?.codeTag || `TRELA-${idx + 3}`,
              name: extraAsset?.name || 'Trela Adicional',
              role,
              roleLabel: extra.role === 'dolly' ? 'Dolly (Conversor Dolly)' : `Seguidora ${idx + 2} (Follower)`,
              status: extraAsset?.status || 'operational',
              maintenanceCostMzn: extraMaintCost,
              totalCostMzn: extraMaintCost,
              openWorkOrdersCount: extraWOs.filter((wo) => wo.status === 'open' || wo.status === 'in_progress').length,
              completedWorkOrdersCount: extraWOs.filter((wo) => wo.status === 'completed' || wo.status === 'closed').length,
              documentsCount: Array.isArray(extraAsset?.documents) ? extraAsset.documents.length : 0
            });
          }
        });
      }

      // Agregações
      const trailersMaintenanceCost = trailerList.reduce((acc, t) => acc + t.maintenanceCostMzn, 0);
      const totalMaintenanceCost = truckMaintCost + trailersMaintenanceCost;
      const totalCost = totalMaintenanceCost + truckFuelCost;

      const totalWOs = truckWOs.length + trailerList.reduce((acc, t) => acc + t.openWorkOrdersCount + t.completedWorkOrdersCount, 0);

      // Disponibilidade operacional do conjunto:
      // Se o cavalo estiver em manutenção ou avaria -> down
      // Se o cavalo estiver operacional mas qualquer trela estiver avariada -> impaired
      // Se todos estiverem operacionais -> operational
      let overallStatus: 'operational' | 'impaired' | 'down' = 'operational';
      if (truckStatus === 'under_maintenance' || truckStatus === 'maintenance' || truckStatus === 'breakdown') {
        overallStatus = 'down';
      } else if (trailerList.some((t) => t.status === 'under_maintenance' || t.status === 'maintenance' || t.status === 'breakdown')) {
        overallStatus = 'impaired';
      }

      return {
        combinationId: comb.id || comb._id || combinationCode,
        combinationCode,
        status: comb.status || 'active',
        startedAt: comb.started_at || comb.start_date || comb.created_at || comb.startedAt || comb.createdAt,
        truck: {
          id: truckId,
          codeTag: truckTag,
          name: truckName,
          status: truckStatus,
          currentMeter: truckMeter,
          fuelCostMzn: truckFuelCost,
          maintenanceCostMzn: truckMaintCost,
          totalCostMzn: truckFuelCost + truckMaintCost,
          openWorkOrdersCount: truckWOs.filter((wo) => wo.status === 'open' || wo.status === 'in_progress').length,
          completedWorkOrdersCount: truckWOs.filter((wo) => wo.status === 'completed' || wo.status === 'closed').length,
          documentsCount: Array.isArray(truckAsset?.documents) ? truckAsset.documents.length : 0
        },
        trailers: trailerList,
        aggregated: {
          totalCostMzn: totalCost,
          totalMaintenanceCostMzn: totalMaintenanceCost,
          totalFuelCostMzn: truckFuelCost,
          totalWorkOrdersCount: totalWOs,
          overallOperationalStatus: overallStatus,
          currentMeter: truckMeter,
          trailersCount: trailerList.length
        }
      };
    });
  }
};
