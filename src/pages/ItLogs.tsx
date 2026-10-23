import React, { useState, useEffect } from 'react';
import { TablePagination } from '../components/TablePagination';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SecondaryView from '../components/SecondaryView';
import {
  Terminal,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  User,
  Clock,
  Filter,
  CheckSquare,
  Square,
  Layers,
  ChevronRight,
  ShieldAlert,
  Calendar,
  AlertCircle
} from 'lucide-react';

export interface AuditLogItem {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  action: string;
  details?: any;
  error_message?: string;
  log_type: 'success' | 'error';
  status: 'open' | 'start' | 'pause' | 'finished' | 'closed' | 'solved';
  is_read: boolean;
  is_opened: boolean;
  opened_at?: string;
  read_at?: string;
  created_at: string;
  tracking_history?: any[];
}

export const ItLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<'all' | 'success' | 'error'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Seleção múltipla
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [batchUpdating, setBatchUpdating] = useState(false);

  // Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (typeFilter !== 'all') params.logType = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/it-logs', { params });
      const data = response.data?.logs || response.data?.data || response.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao carregar logs de IT:', err);
      setError('Não foi possível obter os logs de sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, statusFilter]);

  // Abertura e Leitura de Log
  const handleOpenLog = async (log: AuditLogItem) => {
    setSelectedLog(log);
    setIsDetailOpen(true);

    // Rastreamento: Marca no backend como aberto e lido
    try {
      await api.patch(`/it-logs/${log.id}/open`);
      await api.patch(`/it-logs/${log.id}/read`);
      // Atualiza localmente
      setLogs(prev =>
        prev.map(item =>
          item.id === log.id
            ? { ...item, is_opened: true, is_read: true, opened_at: new Date().toISOString(), read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (e) {
      console.warn('Falha no rastreio de leitura do log:', e);
    }
  };

  // Alternar seleção de um log
  const toggleSelectLog = (id: string) => {
    setSelectedLogIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Alternar seleção de todos os logs filtrados
  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map(l => l.id));
    }
  };

  // Transição de Estado em Lote / Individual (start -> pause -> finished -> closed/solved)
  const handleBatchStatusTransition = async (newStatus: 'start' | 'pause' | 'finished' | 'closed') => {
    if (selectedLogIds.length === 0) return;
    setBatchUpdating(true);
    try {
      await api.patch('/it-logs/status', {
        logIds: selectedLogIds,
        status: newStatus
      });

      setSuccessMessage(`Estado dos ${selectedLogIds.length} logs alterado para "${newStatus.toUpperCase()}" com sucesso.`);
      setSelectedLogIds([]);
      fetchLogs();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Erro ao transitar estado dos logs:', err);
      alert('Não foi possível atualizar o estado dos logs selecionados.');
    } finally {
      setBatchUpdating(false);
    }
  };

  // Filtragem local por texto se já carregado
  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actionMatch = (l.action || '').toLowerCase().includes(q);
    const userMatch = (l.user_email || l.user_name || '').toLowerCase().includes(q);
    const tenantMatch = (l.tenant_name || '').toLowerCase().includes(q);
    const errorMatch = (l.error_message || '').toLowerCase().includes(q);
    return actionMatch || userMatch || tenantMatch || errorMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'start':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Play size={10} className="fill-current" />
            Em Análise (Start)
          </span>
        );
      case 'pause':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Pause size={10} className="fill-current" />
            Em Pausa (Pause)
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle size={10} />
            Finalizado (Finished)
          </span>
        );
      case 'closed':
      case 'solved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={10} />
            Resolvido (Closed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Pendente
          </span>
        );
    }
  };

  // Contadores
  const errorLogsCount = logs.filter(l => l.log_type === 'error').length;
  const inProgressCount = logs.filter(l => l.status === 'start' || l.status === 'pause').length;
  const solvedCount = logs.filter(l => l.status === 'closed' || l.status === 'solved' || l.status === 'finished').length;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Terminal className="text-blue-700" size={24} />
            <span>Central de Logs de IT & Auditoria</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Monitorização operacional, diagnóstico de erros e encaminhamento de fluxos de suporte para todas as empresas e utilizadores ancorados.
          </p>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex gap-3 items-center">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-center">
          <AlertCircle size={18} className="text-red-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Terminal size={20} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Total de Eventos</span>
            <span className="text-lg font-bold text-slate-900">{logs.length}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Erros Detectados</span>
            <span className="text-lg font-bold text-red-600">{errorLogsCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <Play size={18} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Em Resolução (IT)</span>
            <span className="text-lg font-bold text-blue-700">{inProgressCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Solucionados / Fechados</span>
            <span className="text-lg font-bold text-emerald-700">{solvedCount}</span>
          </div>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-none">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por ação, utilizador, empresa ou mensagem de erro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filtro por Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">Todos os Tipos (Sucesso e Erros)</option>
            <option value="error">Apenas Falhas / Erros</option>
            <option value="success">Apenas Sucessos</option>
          </select>

          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">Todos os Estados</option>
            <option value="open">Pendente (Open)</option>
            <option value="start">Em Análise (Start)</option>
            <option value="pause">Em Pausa (Pause)</option>
            <option value="finished">Finalizado (Finished)</option>
            <option value="closed">Fechado / Solucionado (Closed)</option>
          </select>
        </div>
      </div>

      {/* BARRA DE AÇÕES PARA SELEÇÃO MÚLTIPLA */}
      {selectedLogIds.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <CheckSquare size={16} className="text-blue-700" />
            <span>{selectedLogIds.length} {selectedLogIds.length === 1 ? 'log selecionado' : 'logs selecionados'}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-slate-600 mr-1">Encaminhar fluxo:</span>
            
            <button
              onClick={() => handleBatchStatusTransition('start')}
              disabled={batchUpdating}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Iniciar tratamento do log"
            >
              <Play size={12} />
              <span>Iniciar (Start)</span>
            </button>

            <button
              onClick={() => handleBatchStatusTransition('pause')}
              disabled={batchUpdating}
              className="px-2.5 py-1.5 bg-white hover:bg-amber-600 hover:text-white border border-amber-300 text-amber-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Colocar log em pausa"
            >
              <Pause size={12} />
              <span>Pausar (Pause)</span>
            </button>

            <button
              onClick={() => handleBatchStatusTransition('finished')}
              disabled={batchUpdating}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-300 text-indigo-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Marcar como finalizado pela equipa técnica"
            >
              <CheckCircle size={12} />
              <span>Finalizar (Finished)</span>
            </button>

            <button
              onClick={() => handleBatchStatusTransition('closed')}
              disabled={batchUpdating}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Fechar e considerar solucionado"
            >
              <CheckCircle2 size={12} />
              <span>Fechar / Solucionado</span>
            </button>

            <button
              onClick={() => setSelectedLogIds([])}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* TABELA DE LOGS */}
      {loading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-md">
          <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
          <p className="text-slate-500 text-xs mt-3">A carregar registos de IT...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-md">
          <Terminal size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nenhum Log Encontrado</h3>
          <p className="text-slate-500 text-xs mt-1">
            Não existem registos de auditoria correspondentes aos critérios de pesquisa e filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="Selecionar todos os registos filtrados"
                    >
                      {selectedLogIds.length > 0 && selectedLogIds.length === filteredLogs.length ? (
                        <CheckSquare size={16} className="text-blue-700" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-4">Ação / Descrição</th>
                  <th className="py-3 px-4">Empresa (Tenant)</th>
                  <th className="py-3 px-4">Utilizador Ancorado</th>
                  <th className="py-3 px-3">Rastreio (Aberto / Lido)</th>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.slice((logPage - 1) * logItemsPerPage, logPage * logItemsPerPage).map((log) => {
                  const isSelected = selectedLogIds.includes(log.id);
                  const isError = log.log_type === 'error';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : isError ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Checkbox de seleção */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLog(log.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer focus:ring-0"
                        />
                      </td>

                      {/* Estado do Log no Fluxo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Tipo: Sucesso ou Erro */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isError ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <XCircle size={14} className="text-red-600" />
                            Erro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Sucesso
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate" title={log.action}>
                        {log.action}
                        {log.error_message && (
                          <span className="block text-[11px] font-normal text-red-600 truncate mt-0.5">
                            {log.error_message}
                          </span>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Building2 size={12} className="text-slate-400" />
                          {log.tenant_name || 'Avexas Global'}
                        </span>
                      </td>

                      {/* Utilizador */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <User size={12} className="text-slate-400" />
                          {log.user_email || log.user_name || 'Sistema Automático'}
                        </span>
                      </td>

                      {/* Rastreio: Aberto / Lido */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-[10px]">
                          {log.is_opened ? (
                            <span className="text-emerald-700 font-medium">✓ Aberto</span>
                          ) : (
                            <span className="text-slate-400">Não aberto</span>
                          )}
                          {log.is_read ? (
                            <span className="text-blue-700 font-medium">✓ Lido</span>
                          ) : (
                            <span className="text-slate-400">Não lido</span>
                          )}
                        </div>
                      </td>

                      {/* Data / Hora */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-MZ')}
                      </td>

                      {/* Botão de Abrir */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenLog(log)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-none"
                        >
                          <Eye size={12} />
                          <span>Abrir</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              currentPage={logPage}
              totalItems={filteredLogs.length}
              itemsPerPage={logItemsPerPage}
              onPageChange={setLogPage}
              onItemsPerPageChange={setLogItemsPerPage}
            />
          </div>
        </div>
      )}

      {/* CAMADA SECUNDÁRIA: DETALHES COMPLETOS DO LOG */}
      <SecondaryView
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedLog ? `Detalhes do Log: ${selectedLog.action}` : 'Detalhes do Log'}
        subtitle="Rastreabilidade completa de execução, metadados e histórico de tratamento"
        icon={<Terminal className="text-blue-700" size={18} />}
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="p-6 space-y-5">
            {/* Cabeçalho do Log */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedLog.status)}
                {selectedLog.log_type === 'error' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                    Falha Operacional
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Execução com Sucesso
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {new Date(selectedLog.created_at).toLocaleString('pt-MZ')}
              </span>
            </div>

            {/* Metadados de Ancoragem */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Empresa Ancorada</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  {selectedLog.tenant_name || selectedLog.tenant_id || 'Avexas Global'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Utilizador Ancorado</span>
                <span className="font-bold text-slate-900 mt-1 block font-mono">
                  {selectedLog.user_email || selectedLog.user_name || 'Sistema'}
                </span>
              </div>
            </div>

            {/* Informação de Rastreio */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Rastreamento de Auditoria</span>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>Data de Abertura:</span>
                <span className="font-mono">{selectedLog.opened_at ? new Date(selectedLog.opened_at).toLocaleString('pt-MZ') : 'Agora mesmo'}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Data de Leitura:</span>
                <span className="font-mono">{selectedLog.read_at ? new Date(selectedLog.read_at).toLocaleString('pt-MZ') : 'Agora mesmo'}</span>
              </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {selectedLog.error_message && (
              <div>
                <span className="text-xs font-bold text-red-700 block mb-1">Mensagem de Erro / Stack:</span>
                <div className="bg-red-50 border border-red-200 p-3 rounded text-red-800 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.error_message}
                </div>
              </div>
            )}

            {/* Payload / Detalhes Estruturados */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Carga de Dados (Payload / Contexto):</span>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs font-mono overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            {/* Ações de Estado sobre o Log Aberto */}
            <div className="pt-4 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-2">Transição de Estado Operacional:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/it-logs/status', { logIds: [selectedLog.id], status: 'start' });
                    setSelectedLog({ ...selectedLog, status: 'start' });
                    fetchLogs();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Play size={12} />
                  <span>Iniciar (Start)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/it-logs/status', { logIds: [selectedLog.id], status: 'pause' });
                    setSelectedLog({ ...selectedLog, status: 'pause' });
                    fetchLogs();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-amber-600 hover:text-white border border-amber-300 text-amber-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Pause size={12} />
                  <span>Pausar (Pause)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/it-logs/status', { logIds: [selectedLog.id], status: 'finished' });
                    setSelectedLog({ ...selectedLog, status: 'finished' });
                    fetchLogs();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-300 text-indigo-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCircle size={12} />
                  <span>Finalizar (Finished)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/it-logs/status', { logIds: [selectedLog.id], status: 'closed' });
                    setSelectedLog({ ...selectedLog, status: 'closed' });
                    fetchLogs();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCircle2 size={12} />
                  <span>Fechar / Solucionado</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </SecondaryView>
    </div>
  );
};

export default ItLogsPage;
