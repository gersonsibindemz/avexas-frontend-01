import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  created_at?: string;
}

export const UsersPage: React.FC = () => {
  const { user, isTenantAdmin, isSuperAdmin } = useAuth();
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
  const [operationalScope, setOperationalScope] = useState<'fleet' | 'plant' | 'both'>('both');

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
      
      // Adaptando nomes dos atributos vindos do backend
      const normalizedUsers = data.map((u: any) => ({
        id: u.id,
        fullName: u.fullName || u.fullName_ || u.name || 'Utilizador Técnico',
        email: u.email,
        role: u.role,
        operational_scope: u.operational_scope || u.operationalScope || 'both'
      }));

      setUsers(normalizedUsers);

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
    setModalMode('create');
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('technician');
    setOperationalScope('both');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser: TenantUser) => {
    setModalMode('edit');
    setEditingUserId(targetUser.id);
    setFullName(targetUser.fullName);
    setEmail(targetUser.email);
    setPassword(''); // deixa vazio para não alterar se não preenchido
    setRole(targetUser.role);
    setOperationalScope(targetUser.operational_scope);
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

    setSubmitting(true);
    try {
      const payload: any = {
        fullName,
        email,
        role,
        operationalScope,
        operational_scope: operationalScope
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
    try {
      await api.delete(`/users/${deletingUser.id}`);
      setSuccessMessage('Utilizador removido com sucesso!');
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
      await fetchUsers();
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
        return 'bg-blue-950/50 text-blue-400 border border-blue-500/20';
      case 'supervisor':
        return 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20';
      case 'technician':
        return 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20';
      case 'driver_operator':
        return 'bg-amber-950/50 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-slate-950/50 text-slate-400 border border-slate-800';
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
        return 'Gestão de Frotas (Frota)';
      case 'plant':
        return 'Chão de Fábrica (Fábrica)';
      case 'both':
        return 'Ambos (Frota e Fábrica)';
      default:
        return scope;
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UsersIcon className="text-emerald-500" size={24} />
            Gestão de Utilizadores
          </h1>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Adicione e controle permissões de supervisores, técnicos e operadores do CMMS.
          </p>
        </div>

        {/* INDICADOR DE UTILIZADORES USADOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 self-start md:self-auto shadow-md">
          <div className="flex items-center gap-2">
            <Layers className="text-emerald-500 shrink-0" size={16} />
            <span className="text-xs font-semibold text-slate-300">Utilizadores do Contrato:</span>
          </div>
          <span className="text-sm font-bold text-white bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800">
            {users.length} / {maxUsersLimit} Utilizadores Utilizados
          </span>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-3 items-center animate-fade-in shadow-lg">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou nível..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchUsers}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="Recarregar Lista"
          >
            <RefreshCw size={14} />
          </button>
          
          <button
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-150 text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Utilizador</span>
          </button>
        </div>
      </div>

      {/* LISTA DE UTILIZADORES */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="text-emerald-500 animate-spin" size={28} />
            <p className="text-xs text-slate-400 font-medium">A carregar utilizadores do tenant...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-red-400 flex flex-col items-center gap-4">
          <AlertTriangle size={32} />
          <p className="text-xs">{error}</p>
          <button onClick={fetchUsers} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg border border-slate-700">
            Tentar Novamente
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <UsersIcon className="mx-auto text-slate-700 mb-3" size={36} />
          <p className="text-xs font-semibold">Nenhum utilizador encontrado.</p>
          <p className="text-[11px] text-slate-600 mt-1">Tente ajustar os seus termos de pesquisa ou adicione um novo utilizador.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Nível de Acesso (Cargo)</th>
                  <th className="py-3 px-4">Escopo Operacional</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-700">
                        {u.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      {u.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeColor(u.role)}`}>
                        {formatRoleName(u.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatScopeName(u.operational_scope)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                        title="Editar Utilizador"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(u)}
                        className="p-1.5 bg-slate-950 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 hover:border-red-900/30 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <UsersIcon className="text-emerald-500" size={18} />
                {modalMode === 'create' ? 'Novo Utilizador do Contrato' : 'Editar Informações do Utilizador'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <UserIcon size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: João Macamo"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: joao.macamo@empresa.co.mz"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Palavra-passe {modalMode === 'edit' && '(deixe em branco para manter)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === 'create' ? 'Mínimo 6 caracteres' : '••••••••'}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nível de Acesso (Cargo)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  >
                    <option value="tenant_admin">Gestor de Contrato (Admin)</option>
                    <option value="supervisor">Supervisor Operacional</option>
                    <option value="technician">Técnico de Manutenção</option>
                    <option value="driver_operator">Motorista / Operador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Escopo Operacional
                  </label>
                  <select
                    value={operationalScope}
                    onChange={(e) => setOperationalScope(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  >
                    <option value="fleet">Gestão de Frotas (Frota)</option>
                    <option value="plant">Chão de Fábrica (Fábrica)</option>
                    <option value="both">Ambos os Negócios (Ambos)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl p-6 text-center animate-scale-up">
            <div className="w-12 h-12 bg-red-950/40 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Eliminar Utilizador?</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Tem a certeza de que deseja eliminar o utilizador <strong className="text-slate-200">{deletingUser.fullName}</strong>? 
              Esta ação removerá completamente o seu acesso e não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
