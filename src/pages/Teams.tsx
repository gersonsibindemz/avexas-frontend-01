import React, { useState, useEffect } from 'react';
import { TablePagination } from '../components/TablePagination';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Technician } from '../types/technician';
import { dataCache } from '../services/dataCacheService';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Wrench,
  Truck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const [teamPage, setTeamPage] = useState(1);
  const [teamItemsPerPage, setTeamItemsPerPage] = useState(10);
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    return dataCache.get<Technician[]>('teams') || [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !dataCache.has('teams');
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const fetchTeam = async (isManual = false) => {
    if (!dataCache.has('teams') || isManual) {
      setLoading(true);
    }
    try {
      const res = await api.get('/technicians');
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data?.technicians || res.data?.data || []);
      const uniqueTechs = Array.from(
        new Map<string, Technician>(list.map((t: Technician) => {
          const key = t.email?.toLowerCase() || t.name?.toLowerCase() || t.full_name?.toLowerCase() || t.id;
          return [key, t];
        })).values()
      );
      setTechnicians(uniqueTechs);
      dataCache.set('teams', uniqueTechs);
    } catch (err) {
      console.error('Erro ao carregar equipa técnica:', err);
      if (!dataCache.has('teams')) setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataCache.has('teams')) {
      fetchTeam();
    }
  }, []);

  // Extrair lista de especialidades únicas para o filtro
  const availableSpecialties = Array.from(
    new Set(technicians.map(t => t.specialty).filter(Boolean))
  );

  // Filtragem
  const filteredTechnicians = technicians.filter((tech) => {
    const q = searchQuery.toLowerCase();
    const name = tech.name || tech.full_name || '';
    const email = tech.email || '';
    const phone = tech.phone || '';
    const spec = tech.specialty || '';

    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      spec.toLowerCase().includes(q) ||
      phone.includes(q);

    const matchesSpecialty =
      specialtyFilter === 'all' || tech.specialty === specialtyFilter;

    const matchesScope =
      scopeFilter === 'all' || tech.operational_scope === scopeFilter;

    return matchesSearch && matchesSpecialty && matchesScope;
  });

  // Métricas do Topo
  const totalTeam = technicians.length;
  const inServiceCount = technicians.filter(t => (t.active_orders_count || 0) > 0).length;
  const availableCount = technicians.filter(t => (t.active_orders_count || 0) === 0).length;

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA PÁGINA (READ-ONLY CONSULTATION) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Equipe Técnica</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchTeam(true)}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs font-medium"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-700' : ''} />
            <span>Atualizar Equipes</span>
          </button>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS REAIS NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total da Equipa</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading && technicians.length === 0 ? '---' : totalTeam}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Técnicos em Serviço</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading && technicians.length === 0 ? '---' : `${inServiceCount} em serviço`}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Técnicos Disponíveis</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading && technicians.length === 0 ? '---' : `${availableCount} disponíveis`}</span>
          </div>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Caixa de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar colaborador por nome, e-mail ou especialidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Filtro por Especialidade */}
          <div>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
            >
              <option value="all">Todas as Especialidades</option>
              {availableSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Âmbito */}
          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
            >
              <option value="all">Todos os Âmbitos Operacionais</option>
              <option value="fleet">Frota</option>
              <option value="plant">Instalação Fabril</option>
              <option value="both">Ambos os Âmbitos</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE MEMBROS DA EQUIPE (Prompt 3 - Requisito 4: Listados em tabela) */}
      {loading && technicians.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
          <p className="text-slate-500 text-xs mt-3">A carregar equipa técnica...</p>
        </div>
      ) : technicians.length === 0 ? (
        /* EMPTY STATE REAL */
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Users className="text-slate-300 mx-auto" size={40} />
          <h3 className="text-sm font-bold text-slate-700 mt-2">Nenhum técnico cadastrado para esta empresa</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
            O Administrador pode cadastrar novos técnicos no menu Gestão de Utilizadores.
          </p>
        </div>
      ) : filteredTechnicians.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Search className="text-slate-300 mx-auto" size={36} />
          <h3 className="text-sm font-bold text-slate-700 mt-2">Nenhum técnico encontrado para o filtro aplicado</h3>
          <p className="text-slate-500 text-xs mt-1">
            Tente redefinir os termos de pesquisa ou o filtro de especialidade.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3.5 px-4">Colaborador / Nome</th>
                  <th className="py-3.5 px-4">Especialidade Técnica</th>
                  <th className="py-3.5 px-4">Âmbito Operacional</th>
                  <th className="py-3.5 px-4">Contactos</th>
                  <th className="py-3.5 px-4 text-center">Ordens Ativas</th>
                  <th className="py-3.5 px-4 text-right">Estado Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTechnicians.slice((teamPage - 1) * teamItemsPerPage, teamPage * teamItemsPerPage).map((tech) => {
                  const techName = tech.name || tech.full_name || 'Técnico';
                  const initials = techName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  const activeOrders = tech.active_orders_count || 0;

                  return (
                    <tr key={tech.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Avatar e Nome */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                            {initials}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{techName}</span>
                            <span className="block text-[11px] text-slate-400 font-normal">Técnico de Manutenção</span>
                          </div>
                        </div>
                      </td>

                      {/* Especialidade */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded text-[11px]">
                          {tech.specialty || 'Geral'}
                        </span>
                      </td>

                      {/* Âmbito Operacional */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          {tech.operational_scope === 'plant' ? (
                            <>
                              <Building2 size={14} className="text-slate-500" />
                              <span>Instalação Fabril</span>
                            </>
                          ) : (
                            <>
                              <Truck size={14} className="text-slate-500" />
                              <span>Frota</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Contactos */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {tech.email && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[190px]">{tech.email}</span>
                            </div>
                          )}
                          {tech.phone && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Phone size={12} className="text-slate-400 shrink-0" />
                              <span>{tech.phone}</span>
                            </div>
                          )}
                          {!tech.email && !tech.phone && <span className="text-slate-400 italic">Sem contacto direto</span>}
                        </div>
                      </td>

                      {/* Ordens Ativas */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          activeOrders > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {activeOrders}
                        </span>
                      </td>

                      {/* Estado Operacional */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {activeOrders > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded text-[11px] font-semibold">
                            <Clock size={12} />
                            <span>Em Serviço ({activeOrders})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[11px] font-semibold">
                            <CheckCircle2 size={12} />
                            <span>Disponível</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePagination
              currentPage={teamPage}
              totalItems={filteredTechnicians.length}
              itemsPerPage={teamItemsPerPage}
              onPageChange={setTeamPage}
              onItemsPerPageChange={setTeamItemsPerPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
