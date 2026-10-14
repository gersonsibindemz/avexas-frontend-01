import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import {
  Plus,
  Users as UsersIcon,
  Search,
  X,
  RefreshCw,
  Edit2,
  Trash2,
  Shield,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Layers
} from 'lucide-react';

interface TenantUser {
  id: string;
  fullName: string;
  fullName_?: string;
  email: string;
  role: 'tenant_admin' | 'supervisor' | 'technician' | 'driver_operator';
  operational_scope: 'fleet' | 'plant' | 'both';
  operationalScope?: 'fleet' | 'plant' | 'both';
  specialty?: string;
  created_at?: string;
}

export const UsersPage: React.FC = () => {
  const { user, isTenantAdmin, isSuperAdmin } = useAuth();
  const { technicianSpecialties } = useCurrentDomain();

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<TenantUser | null>(null);

  // Campos do Formulário
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant_admin' | 'supervisor' | 'technician' | 'driver_operator'>('technician');
  const [operationalScope, setOperationalScope] = useState<'fleet' | 'plant' | 'both'>('fleet');
  const [specialty, setSpecialty] = useState('');

  // Escopo do utilizador atual e bloqueio de escopo
  const currentUserScope = user?.operational_scope || user?.tenant?.operational_scope || user?.tenant?.operationalScope || 'fleet';
  const isScopeLocked = !isSuperAdmin && (currentUserScope === 'fleet' || currentUserScope === 'plant');

  // Limites do Tenant
  const [maxUsersLimit, setMaxUsersLimit] = useState<number>(15);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/users');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.users || response.data?.data || [];
      
      // Adaptando nomes dos atributos vindos do backend e filtrando defensivamente is_active === false
      const activeData = data.filter((u: any) => u.is_active !== false && u.isActive !== false);

      const normalizedUsers = activeData.map((u: any) => ({
        id: u.id,
        fullName: u.fullName || u.fullName_ || u.name || 'Utilizador Técnico',
        email: u.email,
        role: u.role,
        operational_scope: u.operational_scope || u.operationalScope || 'fleet',
        specialty: u.specialty || u.technical_specialty || u.specialization || '',
        is_active: u.is_active ?? u.isActive ?? true
      }));

      setUsers(normalizedUsers.filter(u => u.is_active !== false));

      // Obter limites se retornados pela API
      if (response.data?.maxUsers || response.data?.max_users) {
        setMaxUsersLimit(response.data.maxUsers || response.data.max_users);
      } else if (user?.tenant?.max_users || user?.tenant?.maxUsers) {
        setMaxUsersLimit(user.tenant.max_users || user.tenant.maxUsers || 15);
      }
    } catch (err: any) {
      console.error('Erro ao carregar utilizadores:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Não foi possível ligar ao servidor para carregar a lista de utilizadores.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  if (!isTenantAdmin && !isSuperAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-2xl">
        <div className="w-12 h-12 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800/30">
          <Shield size={24} />
        </div>
        <h2 className="text-md font-bold text-slate-100">Acesso Restrito</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Apenas administradores da empresa têm permissão para aceder à Gestão de Utilizadores e Contratos.
        </p>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    const initialScope = currentUserScope === 'plant' ? 'plant' : 'fleet';
    setModalMode('create');
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('technician');
    setOperationalScope(initialScope);
    setSpecialty(technicianSpecialties.length > 0 ? technicianSpecialties[0].value : '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser: TenantUser) => {
    const targetScope = targetUser.operational_scope === 'plant' ? 'plant' : (targetUser.operational_scope === 'fleet' ? 'fleet' : (currentUserScope === 'plant' ? 'plant' : 'fleet'));
    setModalMode('edit');
    setEditingUserId(targetUser.id);
    setFullName(targetUser.fullName);
    setEmail(targetUser.email);
    setPassword(''); // deixa vazio para não alterar se não preenchido
    setRole(targetUser.role);
    setOperationalScope(targetScope);
    setSpecialty(targetUser.specialty || (technicianSpecialties.length > 0 ? technicianSpecialties[0].value : ''));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      alert('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    if (modalMode === 'create' && !password.trim()) {
      alert('A palavra-passe é obrigatória para novos utilizadores.');
      return;
    }
    if (role === 'technician' && !specialty) {
      alert('Por favor, selecione a especialidade técnica.');
      return;
    }

    setSubmitting(true);
    try {
      const activeScope = isScopeLocked ? (currentUserScope === 'plant' ? 'plant' : 'fleet') : (operationalScope === 'both' ? 'fleet' : operationalScope);
      const payload: any = {
        fullName,
        email,
        role,
        operationalScope: activeScope,
        operational_scope: activeScope,
        ...(role === 'technician' && {
          specialty,
          technical_specialty: specialty,
          specialization: specialty
        })
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (modalMode === 'create') {
        if (users.length >= maxUsersLimit) {
          alert(`Limite de utilizadores atingido (${maxUsersLimit}). Não é possível criar mais contas.`);
          setSubmitting(false);
          return;
        }
        await api.post('/users', payload);
        setSuccessMessage('Utilizador criado com sucesso!');
      } else {
        await api.put(`/users/${editingUserId}`, payload);
        setSuccessMessage('Utilizador atualizado com sucesso!');
      }

      setIsModalOpen(false);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar utilizador:', err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Erro ao gravar utilizador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = (targetUser: TenantUser) => {
    setDeletingUser(targetUser);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const targetUserId = deletingUser.id;
    try {
      await api.delete(`/users/${targetUserId}`);
      setUsers(prev => prev.filter(user => user.id !== targetUserId));
      setSuccessMessage('Utilizador removido do contrato com sucesso.');
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao eliminar utilizador:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao eliminar utilizador.');
    }
  };

  // Filtragem local de busca
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
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
        return 'Gestor de Contrato';
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
        return 'Frota Rodoviária';
      case 'plant':
        return 'Instalação Fabril';
      default:
        return 'Frota Rodoviária';
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <UsersIcon className="text-blue-700" size={24} />
            Gestão de Utilizadores
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Adicione e controle permissões de supervisores, técnicos e operadores do CMMS.
          </p>
        </div>

        {/* INDICADOR DE UTILIZADORES USADOS */}
        <div className="bg-white border border-slate-200 rounded-md px-4 py-2.5 flex items-center justify-between gap-4 self-start md:self-auto shadow-none">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-700 shrink-0" size={16} />
            <span className="text-xs font-semibold text-slate-700">Utilizadores do Contrato:</span>
          </div>
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
            {users.length} / {maxUsersLimit} Utilizadores Utilizados
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
            placeholder="Pesquisar por nome, email ou nível..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none transition-colors font-mono"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchUsers}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md border border-slate-300 transition-colors cursor-pointer"
            title="Recarregar Lista"
          >
            <RefreshCw size={14} />
          </button>
          
          <button
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors text-xs flex items-center justify-center gap-2 shadow-none cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Utilizador</span>
          </button>
        </div>
      </div>

      {/* LISTA DE UTILIZADORES */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center shadow-none">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="text-blue-700 animate-spin" size={28} />
            <p className="text-xs text-slate-500 font-medium">A carregar utilizadores do tenant...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-red-700 flex flex-col items-center gap-4">
          <AlertTriangle size={32} />
          <p className="text-xs">{error}</p>
          <button onClick={fetchUsers} className="bg-white hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-md border border-slate-300 cursor-pointer">
            Tentar Novamente
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-500">
          <UsersIcon className="mx-auto text-slate-400 mb-3" size={36} />
          <p className="text-xs font-semibold text-slate-900">Nenhum utilizador encontrado.</p>
          <p className="text-xs text-slate-500 mt-1">Tente ajustar os seus termos de pesquisa ou adicione um novo utilizador.</p>
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
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                        {u.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      {u.fullName}
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
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-md border border-slate-300 transition-colors cursor-pointer"
                        title="Editar Utilizador"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(u)}
                        className="p-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded-md border border-slate-300 hover:border-red-200 transition-colors cursor-pointer"
                        title="Eliminar Utilizador"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg shadow-xl relative overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <UsersIcon className="text-blue-700" size={18} />
                {modalMode === 'create' ? 'Novo Utilizador do Contrato' : 'Editar Informações do Utilizador'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    disabled={isScopeLocked}
                    value={operationalScope === 'both' ? (currentUserScope === 'plant' ? 'plant' : 'fleet') : operationalScope}
                    onChange={(e) => setOperationalScope(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="fleet">Frota Rodoviária</option>
                    <option value="plant">Instalação Fabril</option>
                  </select>
                  {isScopeLocked && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Definido de acordo com o seu âmbito de gestão atual.
                    </p>
                  )}
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
        </div>
      )}

      {/* CONFIRMAÇÃO DE ELIMINAÇÃO */}
      {isDeleteModalOpen && deletingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-sm shadow-xl p-6 text-center animate-slide-up">
            <div className="w-12 h-12 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Eliminar Utilizador?</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Tem a certeza de que deseja eliminar o utilizador <strong className="text-slate-900">{deletingUser.fullName}</strong>? 
              Esta ação removerá completamente o seu acesso e não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
