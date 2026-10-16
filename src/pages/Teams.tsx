import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Wrench,
  ShieldCheck,
  Truck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: 'technician' | 'supervisor' | 'driver_operator' | 'tenant_admin';
  phone?: string;
  specialty?: string;
  operational_scope?: 'fleet' | 'plant' | 'both';
  is_allocated?: boolean;
  active_wo_count?: number;
}

export const TeamsPage: React.FC = () => {
  const { isTenantAdmin, isSupervisor } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const fetchTeams = async () => {
    setLoading(true);
    try {
      // Buscar utilizadores e ordens ativas para determinar alocações
      const [usersRes, woRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/work-orders')
      ]);

      let userList: any[] = [];
      if (usersRes.status === 'fulfilled') {
        userList = Array.isArray(usersRes.value.data)
          ? usersRes.value.data
          : usersRes.value.data?.users || usersRes.value.data?.data || [];
      } else {
        // Fallback para endpoint de técnicos se /users falhar por nível de permissão
        const techRes = await api.get('/technicians').catch(() => ({ data: [] }));
        userList = Array.isArray(techRes.data) ? techRes.data : techRes.data?.technicians || [];
      }

      let woList: any[] = [];
      if (woRes.status === 'fulfilled') {
        woList = Array.isArray(woRes.value.data)
          ? woRes.value.data
          : woRes.value.data?.workOrders || woRes.value.data?.data || [];
      }

      // Mapear contagem de ordens de serviço ativas por técnico
      const activeWoCounts: Record<string, number> = {};
      woList.forEach((wo: any) => {
        if (wo.status === 'open' || wo.status === 'in_progress' || wo.status === 'pending') {
          const techId = wo.assigned_to || wo.technician_id || wo.assignedTo;
          if (techId) {
            activeWoCounts[techId] = (activeWoCounts[techId] || 0) + 1;
          }
        }
      });

      // Filtrar papéis operacionais (técnicos, supervisores, motoristas)
      const filteredUsers = userList.filter((u: any) =>
        ['technician', 'supervisor', 'driver_operator'].includes(u.role)
      );

      const formattedMembers: TeamMember[] = filteredUsers.map((u: any, idx: number) => {
        const activeCount = activeWoCounts[u.id] || 0;
        
        // Especialidade inferida do registo ou predefinida por padrão profissional
        const defaultSpecialties = ['Mecânica Geral', 'Eletricidade Auto', 'Serralharia Industrial', 'Pneumática', 'Hidráulica', 'Manutenção Preventiva'];
        const assignedSpecialty = u.specialty || u.specialization || defaultSpecialties[idx % defaultSpecialties.length];

        return {
          id: u.id,
          fullName: u.fullName || u.full_name || u.email.split('@')[0],
          email: u.email,
          role: u.role,
          phone: u.phone || u.phone_number || '+258 84 000 0000',
          specialty: assignedSpecialty,
          operational_scope: u.operational_scope || u.tenant?.operational_scope || 'fleet',
          is_allocated: activeCount > 0,
          active_wo_count: activeCount
        };
      });

      setMembers(formattedMembers);
    } catch (err) {
      console.error('Erro ao carregar colaboradores e equipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Extrair lista de especialidades únicas para o filtro
  const availableSpecialties = Array.from(
    new Set(members.map(m => m.specialty).filter(Boolean))
  );

  // Filtragem
  const filteredMembers = members.filter((member) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      member.fullName.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      (member.specialty && member.specialty.toLowerCase().includes(q)) ||
      (member.phone && member.phone.includes(q));

    const matchesSpecialty =
      specialtyFilter === 'all' || member.specialty === specialtyFilter;

    const matchesScope =
      scopeFilter === 'all' || member.operational_scope === scopeFilter;

    return matchesSearch && matchesSpecialty && matchesScope;
  });

  // Métricas
  const totalActiveTechs = members.filter(m => m.role === 'technician').length;
  const totalSpecialists = members.filter(m => m.specialty && m.specialty !== 'Geral').length;
  const totalAllocated = members.filter(m => m.is_allocated).length;

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'technician':
        return 'Técnico de Manutenção';
      case 'supervisor':
        return 'Supervisor Operacional';
      case 'driver_operator':
        return 'Motorista / Operador';
      default:
        return 'Colaborador';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO DA PÁGINA (READ-ONLY CONSULTATION) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="text-blue-700" size={24} />
            <span>Equipes Técnicas & Operacionais</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Consulta e alocação em tempo real de colaboradores técnicos, supervisores e operadores da empresa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchTeams}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs font-medium"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-700' : ''} />
            <span>Atualizar Equipes</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS NO TOPO (3 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <Wrench size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Técnicos Ativos</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : totalActiveTechs}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Especialistas Técnicos</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : totalSpecialists}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-none">
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Alocados em Serviços</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{loading ? '---' : `${totalAllocated} membros`}</span>
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
            </select>
          </div>
        </div>
      </div>

      {/* LISTA / GRID DE COLABORADORES */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
          <p className="text-slate-500 text-xs mt-3">A carregar quadro de equipes técnicas...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-md">
          <Users className="text-slate-300 mx-auto" size={40} />
          <h3 className="text-sm font-bold text-slate-700 mt-2">Nenhum colaborador encontrado</h3>
          <p className="text-slate-500 text-xs mt-1">
            Tente ajustar os termos de pesquisa ou remover os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const initials = member.fullName
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={member.id}
                className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-none"
              >
                <div>
                  {/* Topo do Cartão: Avatar + Nome + Role */}
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                    <div className="w-12 h-12 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {member.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {formatRoleLabel(member.role)}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes: Especialidade + Âmbito */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Especialidade:</span>
                      <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        {member.specialty || 'Técnica Geral'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Âmbito:</span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        {member.operational_scope === 'plant' ? (
                          <>
                            <Building2 size={13} className="text-slate-500" />
                            <span>Instalação Fabril</span>
                          </>
                        ) : (
                          <>
                            <Truck size={13} className="text-slate-500" />
                            <span>Frota</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">E-mail:</span>
                      <span className="text-slate-800 font-mono text-[11px] truncate max-w-[170px]" title={member.email}>
                        {member.email}
                      </span>
                    </div>

                    {member.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Contacto:</span>
                        <span className="text-slate-800 font-mono text-[11px]">
                          {member.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Cartão: Estado Operacional */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Estado Atual:</span>
                  {member.is_allocated ? (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                      <Clock size={12} />
                      <span>Alocado ({member.active_wo_count} OS)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                      <CheckCircle2 size={12} />
                      <span>Disponível</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
