import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth, useSuspensionGuard } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import { useEscapeKey } from '../hooks/useEscapeKey';
import SecondaryView from '../components/SecondaryView';
import {
  Plus,
  Users as UsersIcon,
  Search,
  X,
  RefreshCw,
  Edit2,
  Shield,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Mail,
  User as UserIcon,
  Layers,
  Building2,
  ArrowLeft
} from 'lucide-react';

interface TenantUser {
  id: string;
  fullName: string;
  fullName_?: string;
  email: string;
  role: 'tenant_admin' | 'supervisor' | 'technician' | 'driver_operator';
  operational_scope: 'fleet' | 'plant' | 'both' | 'mixed';
  operationalScope?: 'fleet' | 'plant' | 'both' | 'mixed';
  specialty?: string;
  created_at?: string;
  is_active: boolean;
  is_suspended?: boolean;
}

interface TenantItem {
  id: string;
  name: string;
  trade_name?: string;
  tradeName?: string;
  max_users_limit?: number;
  max_users?: number;
  maxUsers?: number;
  operational_scope?: string;
}

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const { checkSuspension, handleActionClick } = useSuspensionGuard();
  const { technicianSpecialties } = useCurrentDomain();
  const currentUserScope = user?.operational_scope || user?.operationalScope || user?.tenant?.operational_scope || user?.tenant?.operationalScope;
  const canSelectAllScopes = isSuperAdmin || currentUserScope === 'mixed' || currentUserScope === 'both';
  const availableOperationalScopes: Array<'fleet' | 'plant' | 'mixed'> = canSelectAllScopes
    ? ['fleet', 'plant', 'mixed']
    : currentUserScope === 'plant'
      ? ['plant']
      : ['fleet'];

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loadingTenants, setLoadingTenants] = useState<boolean>(true);

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<TenantUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
  useEscapeKey(() => setIsSuspendModalOpen(false), isSuspendModalOpen);

  // Campos do Formulário
  const [modalTenantId, setModalTenantId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant_admin' | 'supervisor' | 'technician' | 'driver_operator'>('technician');
  const [operationalScope, setOperationalScope] = useState<'fleet' | 'plant' | 'mixed'>('fleet');
  const [specialty, setSpecialty] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tenant atualmente selecionado para cálculo de licenças
  const selectedTenant = tenants.find((t) => t.id === (selectedTenantId || modalTenantId));
  const maxUsersLimit = selectedTenant?.max_users_limit || selectedTenant?.max_users || selectedTenant?.maxUsers || 15;

  // Carrega lista de empresas/tenants (Super Admin)
  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      let data = [];
      try {
        const response = await api.get('/admin/tenants');
        data = Array.isArray(response.data) ? response.data : response.data?.tenants || response.data?.data || [];
      } catch {
        const response = await api.get('/super-admin/tenants');
        data = Array.isArray(response.data) ? response.data : response.data?.tenants || response.data?.data || [];
      }
      setTenants(data);
      if (data.length > 0 && !selectedTenantId) {
        setSelectedTenantId(data[0].id);
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de empresas:', err);
    } finally {
      setLoadingTenants(false);
    }
  };

  // Carrega utilizadores filtrados por empresa
  const fetchUsers = async (tenantIdToFetch?: string) => {
    const targetTenantId = tenantIdToFetch !== undefined ? tenantIdToFetch : selectedTenantId;
    if (!targetTenantId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/users?tenant_id=${targetTenantId}`);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.users || response.data?.data || [];

      // Normaliza utilizadores sem remover contas suspensas da lista.
      const normalizedUsers = data.map((u: any) => ({
        id: u.id,
        fullName: u.fullName || u.fullName_ || u.full_name || u.name || 'Utilizador Técnico',
        email: u.email,
        role: u.role,
        operational_scope: u.operational_scope || u.operationalScope || 'fleet',
        specialty: u.specialty || u.technical_specialty || u.specialization || '',
        is_active: u.is_active ?? u.isActive ?? !(u.is_suspended ?? u.isSuspended ?? u.status === 'suspended'),
        is_suspended: u.is_suspended ?? u.isSuspended ?? u.status === 'suspended'
      }));

      setUsers(normalizedUsers);
    } catch (err: any) {
      console.error('Erro ao carregar utilizadores:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Não foi possível ligar ao servidor para carregar a lista de utilizadores da empresa selecionada.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchUsers(selectedTenantId);
    } else {
      setUsers([]);
    }
  }, [selectedTenantId]);

  if (!isSuperAdmin && user?.role !== 'super_admin') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-2xl">
        <div className="w-12 h-12 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800/30">
          <Shield size={24} />
        </div>
        <h2 className="text-md font-bold text-slate-100">Acesso Restrito ao Super Admin</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Apenas Administradores Globais (Super Admin) têm permissão para gerir os utilizadores de empresas e contratos.
        </p>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    if (!selectedTenantId && tenants.length > 0) {
      setModalTenantId(tenants[0].id);
    } else {
      setModalTenantId(selectedTenantId);
    }
    setModalMode('create');
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('technician');
    setOperationalScope(currentUserScope === 'plant' ? 'plant' : currentUserScope === 'mixed' || currentUserScope === 'both' ? 'mixed' : 'fleet');
    setSpecialty(technicianSpecialties.length > 0 ? technicianSpecialties[0].value : '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser: TenantUser) => {
    const targetScope = targetUser.operational_scope === 'plant'
      ? 'plant'
      : targetUser.operational_scope === 'mixed' || targetUser.operational_scope === 'both'
        ? 'mixed'
        : 'fleet';
    setModalMode('edit');
    setEditingUserId(targetUser.id);
    setFullName(targetUser.fullName);
    setEmail(targetUser.email);
    setPassword('');
    setRole(targetUser.role);
    setOperationalScope(targetScope);
    setSpecialty(targetUser.specialty || (technicianSpecialties.length > 0 ? technicianSpecialties[0].value : ''));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkSuspension()) return;
    if (!fullName.trim() || !email.trim()) {
      alert('Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const activeTenantId = selectedTenantId || modalTenantId;
    if (modalMode === 'create' && !activeTenantId) {
      alert('Por favor, selecione uma empresa (tenant) antes de criar o utilizador.');
      return;
    }

    if (modalMode === 'create' && !password.trim()) {
      alert('A palavra-passe é obrigatória para novos utilizadores.');
      return;
    }
    if (modalMode === 'create' && !canSelectAllScopes && (currentUserScope === 'fleet' || currentUserScope === 'plant') && operationalScope !== currentUserScope) {
      alert('Não pode criar utilizadores fora do seu âmbito operacional.');
      return;
    }
    if (role === 'technician' && !specialty) {
      alert('Por favor, selecione a especialidade técnica.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        if (users.length >= maxUsersLimit) {
          alert(`Limite de utilizadores atingido para esta empresa (${maxUsersLimit}). Não é possível criar mais contas.`);
          setSubmitting(false);
          return;
        }

        const createPayload = {
          tenant_id: activeTenantId,
          tenantId: activeTenantId,
          full_name: fullName.trim(),
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          role: role,
          operational_scope: operationalScope,
          operationalScope: operationalScope,
          ...(role === 'technician' && {
            specialty: specialty,
            technical_specialty: specialty,
            specialization: specialty
          })
        };

        await api.post('/users', createPayload);
        setSuccessMessage('Utilizador criado com sucesso!');
      } else {
        const editPayload = {
          name: fullName.trim(),
          full_name: fullName.trim(),
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          role: role,
          operational_scope: operationalScope,
          operationalScope: operationalScope,
          ...(role === 'technician' && {
            specialty: specialty,
            technical_specialty: specialty,
            specialization: specialty
          }),
          ...(password.trim() ? { password } : {})
        };

        await api.put(`/users/${editingUserId}`, editPayload);
        setSuccessMessage('Utilizador atualizado com sucesso!');
      }

      setIsModalOpen(false);
      await fetchUsers(activeTenantId);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar utilizador:', err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Erro ao gravar utilizador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSuspend = (targetUser: TenantUser) => {
    setSuspendingUser(targetUser);
    setSuspensionReason('');
    setIsSuspendModalOpen(true);
  };

  const handleSuspendUser = async () => {
    if (checkSuspension()) return;
    if (!suspendingUser) return;
    if (!suspensionReason.trim()) {
      alert('Indique uma justificativa para suspender este utilizador.');
      return;
    }

    const targetUserId = suspendingUser.id;
    setIsSuspending(true);
    try {
      await api.patch('/users/' + targetUserId + '/suspend', { reason: suspensionReason.trim() });
      setUsers((prev) => prev.map((user) => user.id === targetUserId
        ? { ...user, is_active: false, is_suspended: true }
        : user));
      setSuccessMessage('Utilizador suspenso com sucesso.');
      setIsSuspendModalOpen(false);
      setSuspendingUser(null);
      setSuspensionReason('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao suspender utilizador:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao suspender utilizador.');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivateUser = async (targetUser: TenantUser) => {
    if (checkSuspension()) return;

    try {
      await api.patch(`/users/${targetUser.id}/reactivate`);
      setUsers((previous) => previous.map((user) => user.id === targetUser.id
        ? { ...user, is_active: true, is_suspended: false }
        : user));
      setSuccessMessage('Utilizador reativado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao reativar utilizador:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao reativar utilizador.');
    }
  };

  // Filtragem local de busca e tabela
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesScope = scopeFilter === 'all' || u.operational_scope === scopeFilter;
    return matchesSearch && matchesRole && matchesScope;
  });

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'tenant_admin':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'supervisor':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'technician':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'driver_operator':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const formatRoleName = (userRole: string) => {
    switch (userRole) {
      case 'tenant_admin':
        return 'Gestor de Contrato (Admin)';
      case 'supervisor':
        return 'Supervisor Operacional';
      case 'technician':
        return 'Técnico de Manutenção';
      case 'driver_operator':
        return 'Motorista / Operador';
      default:
        return userRole;
    }
  };

  const formatScopeName = (scope: string) => {
    switch (scope) {
      case 'fleet':
        return 'Frota';
      case 'plant':
        return 'Instalação Fabril';
      case 'both':
      case 'mixed':
        return 'Frota e Instalação Fabril';
      default:
        return 'Frota';
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <UsersIcon className="text-blue-700" size={24} />
              Gestão de Utilizadores & Técnicos
            </h1>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Selecione uma empresa para gerir as contas e atribuir níveis de acesso de supervisores e técnicos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedTenantId && fetchUsers(selectedTenantId)}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Atualizar lista"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => handleActionClick(handleOpenCreateModal)}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
          >
            <Plus size={16} />
            <span>Registar Novo Utilizador / Técnico</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE EMPRESA (TENANT) NO TOPO */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Building2 className="text-blue-700 shrink-0" size={20} />
          <label htmlFor="tenant-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Empresa:
          </label>
          {loadingTenants ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="animate-spin" size={14} />
              <span>A carregar empresas...</span>
            </div>
          ) : (
            <select
              id="tenant-select"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full md:w-72 bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="">[ Selecione uma Empresa ▾ ]</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* INDICADOR DE UTILIZADORES USADOS DO TENANT SELECIONADO */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
          <Layers className="text-blue-700 shrink-0" size={16} />
          <span className="text-xs font-semibold text-slate-700">Licenças do Contrato:</span>
          <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
            {selectedTenantId ? `${users.length} / ${maxUsersLimit} Utilizadores Utilizados` : 'Selecione uma Empresa'}
          </span>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex gap-3 items-center animate-fade-in shadow-none">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-none">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            disabled={!selectedTenantId}
            placeholder={selectedTenantId ? "Pesquisar por nome, email ou nível..." : "Selecione uma empresa primeiro..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none transition-colors font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={!selectedTenantId}
            aria-label="Filtrar por cargo"
            className="w-full sm:w-48 bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="all">Todos os cargos</option>
            <option value="tenant_admin">Gestor de Contrato</option>
            <option value="supervisor">Supervisor</option>
            <option value="technician">Técnico</option>
            <option value="driver_operator">Motorista / Operador</option>
          </select>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            disabled={!selectedTenantId}
            aria-label="Filtrar por âmbito operacional"
            className="w-full sm:w-44 bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="all">Todos os âmbitos</option>
            <option value="fleet">Frota</option>
            <option value="plant">Instalação Fabril</option>
            <option value="both">Frota e Fábrica</option>
            <option value="mixed">Misto</option>
          </select>
          <button
            onClick={() => fetchUsers(selectedTenantId)}
            disabled={!selectedTenantId}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Recarregar Lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* LISTA DE UTILIZADORES */}
      {!selectedTenantId ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-500 shadow-none">
          <Building2 className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-sm font-bold text-slate-800">Selecione uma Empresa</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Por favor, escolha uma empresa no seletor acima para visualizar, editar e criar contas de utilizadores.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center shadow-none">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="text-blue-700 animate-spin" size={28} />
            <p className="text-xs text-slate-500 font-medium">A carregar utilizadores da empresa...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-red-700 flex flex-col items-center gap-4">
          <AlertTriangle size={32} />
          <p className="text-xs">{error}</p>
          <button onClick={() => fetchUsers(selectedTenantId)} className="bg-white hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-md border border-slate-300 cursor-pointer">
            Tentar Novamente
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-500">
          <UsersIcon className="mx-auto text-slate-400 mb-3" size={36} />
          <p className="text-xs font-semibold text-slate-900">Nenhum utilizador encontrado para esta empresa.</p>
          <p className="text-xs text-slate-500 mt-1">Utilize "Registar Novo Utilizador / Técnico" para adicionar o primeiro utilizador a este contrato.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Nível de Acesso (Cargo)</th>
                  <th className="py-3 px-4">Escopo Operacional</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${u.is_active ? '' : 'opacity-60'}`}>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                        {u.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      {u.fullName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[10px] font-medium ${getRoleBadgeColor(u.role)}`}>
                          {formatRoleName(u.role)}
                        </span>
                        {u.role === 'technician' && u.specialty && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {u.specialty}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatScopeName(u.operational_scope)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {u.is_active ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleActionClick(() => handleOpenEditModal(u))}
                        className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-md border border-slate-300 transition-colors cursor-pointer"
                        title="Editar Utilizador"
                      >
                        <Edit2 size={13} />
                      </button>
                      {u.is_active ? (
                        <button
                          onClick={() => handleActionClick(() => handleConfirmSuspend(u))}
                          className="p-1.5 bg-white hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-md border border-slate-300 hover:border-amber-200 transition-colors cursor-pointer"
                          title="Suspender Utilizador"
                        >
                          <Lock size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActionClick(() => handleReactivateUser(u))}
                          className="p-1.5 bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-md border border-slate-300 hover:border-emerald-200 transition-colors cursor-pointer"
                          title="Reativar Utilizador"
                        >
                          <Unlock size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CAMADA SECUNDÁRIA: CRIAÇÃO / EDIÇÃO DE UTILIZADOR */}
      <SecondaryView
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Novo Utilizador do Contrato' : 'Editar Informações do Utilizador'}
        subtitle="Configuração de credenciais de acesso, perfil de permissões e vínculo corporativo"
        icon={<UsersIcon className="text-blue-700" size={18} />}
        maxWidth="max-w-2xl"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seleção de Empresa no Modal se não selecionado */}
              {modalMode === 'create' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Empresa (Tenant) *
                  </label>
                  <select
                    required
                    value={modalTenantId || selectedTenantId}
                    onChange={(e) => setModalTenantId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Selecione a empresa...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: João Macamo"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: joao.macamo@empresa.co.mz"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Palavra-passe {modalMode === 'edit' && '(deixe em branco para manter)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === 'create' ? 'Mínimo 6 caracteres' : '••••••••'}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nível de Acesso (Cargo) *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      setRole(newRole);
                      if (newRole === 'technician' && !specialty && technicianSpecialties.length > 0) {
                        setSpecialty(technicianSpecialties[0].value);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="tenant_admin">Gestor de Contrato (Admin)</option>
                    <option value="supervisor">Supervisor Operacional</option>
                    <option value="technician">Técnico de Manutenção</option>
                    <option value="driver_operator">Motorista / Operador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Âmbito Operacional *
                  </label>
                  <select
                    required
                    value={operationalScope}
                    onChange={(e) => setOperationalScope(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {availableOperationalScopes.includes('fleet') && <option value="fleet">Frota</option>}
                    {availableOperationalScopes.includes('plant') && <option value="plant">Instalação Fabril</option>}
                    {availableOperationalScopes.includes('mixed') && <option value="mixed">Mista</option>}
                  </select>
                </div>
              </div>

              {/* CAMPO CONDICIONAL PARA TÉCNICO DE MANUTENÇÃO */}
              {role === 'technician' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Especialidade Técnica *
                  </label>
                  <select
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Selecione a especialidade...</option>
                    {technicianSpecialties.map((spec) => (
                      <option key={spec.value} value={spec.value}>
                        {spec.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium transition-colors shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      <span>A gravar...</span>
                    </>
                  ) : (
                    <span>Guardar Alterações</span>
                  )}
                </button>
              </div>
            </form>
        </div>
      </SecondaryView>

      {/* CAMADA SECUNDÁRIA: CONFIRMAÇÃO DE SUSPENSÃO */}
      <SecondaryView
        isOpen={Boolean(isSuspendModalOpen && suspendingUser)}
        onClose={() => setIsSuspendModalOpen(false)}
        title="Suspender Utilizador"
        subtitle="Bloqueio imediato de autenticação na plataforma"
        icon={<Lock className="text-amber-700" size={18} />}
        maxWidth="max-w-md"
      >
        {suspendingUser && (
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 text-center">Suspender Utilizador?</h3>
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              A conta de <strong className="text-slate-900">{suspendingUser.fullName}</strong> perderá acesso até ser reativada.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="suspension-reason">
                Justificativa da suspensão *
              </label>
              <textarea
                id="suspension-reason"
                required
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
                placeholder="Indique o motivo da suspensão..."
                className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none resize-y"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                disabled={isSuspending}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSuspendUser}
                disabled={isSuspending || !suspensionReason.trim()}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSuspending ? 'A suspender...' : 'Suspender Utilizador'}
              </button>
            </div>
          </div>
        )}
      </SecondaryView>
    </div>
  );
};

export default UsersPage;
