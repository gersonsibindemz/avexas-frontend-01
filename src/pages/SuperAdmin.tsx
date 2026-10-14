import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  User,
  Shield,
  Layers,
  Edit2,
  Users,
  Pause,
  Play,
  Trash2
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  trade_name?: string;
  tradeName?: string;
  nuit: string;
  province: string;
  max_assets_limit?: number;
  maxAssetsLimit?: number;
  max_users_limit?: number;
  maxUsersLimit?: number;
  max_users?: number;
  maxUsers?: number;
  operational_scope?: 'fleet' | 'plant' | 'mixed' | string;
  operationalScope?: 'fleet' | 'plant' | 'mixed' | string;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
}

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Controle de Modal e Submissão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Modal de Exclusão/Arquivamento
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Campos do Formulário de Registro/Edição de Empresa
  const [tenantName, setTenantName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [nuit, setNuit] = useState('');
  const [province, setProvince] = useState('');
  const [maxAssetsLimit, setMaxAssetsLimit] = useState<number>(50);
  const [maxUsersLimit, setMaxUsersLimit] = useState<number>(15);
  const [operationalScope, setOperationalScope] = useState<'fleet' | 'plant' | 'mixed'>('mixed');

  // Campos do Administrador Inicial (apenas no cadastro)
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Busca lista de empresas/tenants
  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      console.error('Erro ao carregar empresas:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Não foi possível ligar ao servidor para carregar a lista de empresas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTenantId(null);
    setTenantName('');
    setTradeName('');
    setNuit('');
    setProvince('');
    setMaxAssetsLimit(50);
    setMaxUsersLimit(15);
    setOperationalScope('mixed');
    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminPhone('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: Tenant) => {
    setModalMode('edit');
    setEditingTenantId(tenant.id);
    setTenantName(tenant.name || '');
    setTradeName(tenant.trade_name || tenant.tradeName || '');
    setNuit(tenant.nuit || '');
    setProvince(tenant.province || '');
    setMaxAssetsLimit(tenant.max_assets_limit ?? tenant.maxAssetsLimit ?? 50);
    setMaxUsersLimit(tenant.max_users_limit ?? tenant.max_users ?? tenant.maxUsers ?? 15);
    setOperationalScope((tenant.operational_scope || tenant.operationalScope || 'mixed') as any);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tradeName || !nuit || !province) {
      alert('Por favor, preencha todos os campos obrigatórios da empresa (*).');
      return;
    }

    if (modalMode === 'create' && (!adminFullName || !adminEmail || !adminPassword)) {
      alert('Por favor, preencha os dados do utilizador administrador inicial.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (modalMode === 'create') {
        const createPayload = {
          tenantName,
          tenant_name: tenantName,
          tradeName,
          trade_name: tradeName,
          nuit,
          province,
          maxAssetsLimit: Number(maxAssetsLimit),
          max_assets_limit: Number(maxAssetsLimit),
          maxUsersLimit: Number(maxUsersLimit),
          max_users_limit: Number(maxUsersLimit),
          operationalScope,
          operational_scope: operationalScope,
          adminFullName,
          admin_full_name: adminFullName,
          adminEmail,
          admin_email: adminEmail,
          adminPassword,
          admin_password: adminPassword,
          adminPhone,
          admin_phone: adminPhone
        };

        try {
          await api.post('/admin/tenants', createPayload);
        } catch {
          await api.post('/super-admin/tenants', createPayload);
        }

        setSuccessMessage(`Empresa "${tenantName}" registada e administrador configurado com sucesso!`);
      } else {
        const editPayload = {
          name: tenantName,
          tenantName,
          tenant_name: tenantName,
          tradeName,
          trade_name: tradeName,
          nuit,
          province,
          maxAssetsLimit: Number(maxAssetsLimit),
          max_assets_limit: Number(maxAssetsLimit),
          maxUsersLimit: Number(maxUsersLimit),
          max_users_limit: Number(maxUsersLimit),
          operationalScope,
          operational_scope: operationalScope
        };

        try {
          await api.put(`/admin/tenants/${editingTenantId}`, editPayload);
        } catch {
          await api.put(`/super-admin/tenants/${editingTenantId}`, editPayload);
        }

        setSuccessMessage(`Empresa "${tenantName}" e parâmetros contratuais atualizados com sucesso!`);
      }

      setIsModalOpen(false);
      await fetchTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar dados da empresa.');
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar Estado (Suspender / Ativar)
  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const currentActive = tenant.is_active ?? tenant.isActive ?? true;
    const nextActive = !currentActive;

    try {
      try {
        await api.patch(`/admin/tenants/${tenant.id}/status`, { is_active: nextActive, isActive: nextActive });
      } catch {
        await api.patch(`/super-admin/tenants/${tenant.id}/status`, { is_active: nextActive, isActive: nextActive });
      }

      setSuccessMessage(`Empresa "${tenant.name}" ${nextActive ? 'ativada' : 'suspensa'} com sucesso!`);
      await fetchTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao alterar estado da empresa:', err);
      alert(err.response?.data?.message || err.message || 'Falha ao alterar o estado da empresa.');
    }
  };

  // Confirmar Exclusão/Arquivamento do Contrato
  const handleConfirmDelete = (tenant: Tenant) => {
    setDeletingTenant(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;

    try {
      try {
        await api.delete(`/admin/tenants/${deletingTenant.id}`);
      } catch {
        await api.delete(`/super-admin/tenants/${deletingTenant.id}`);
      }

      setSuccessMessage(`Contrato da empresa "${deletingTenant.name}" cancelado e arquivado com sucesso.`);
      setIsDeleteModalOpen(false);
      setDeletingTenant(null);
      await fetchTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao arquivar empresa:', err);
      alert(err.response?.data?.message || err.message || 'Falha ao arquivar empresa.');
    }
  };

  // Métricas rápidas calculadas
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.is_active ?? t.isActive ?? true).length;
  const totalAssetsSum = tenants.reduce((acc, t) => acc + (t.max_assets_limit ?? t.maxAssetsLimit ?? 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-fade-in">
          <CheckCircle2 className="text-emerald-700 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Operação Concluída</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Gestão de Empresas & Contratos</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Painel administrativo global de controlo de licenças, NUITs e parâmetros contratuais em Moçambique.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTenants}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar empresas"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
          >
            <Plus size={16} />
            <span>Registar Nova Empresa</span>
          </button>
        </div>
      </div>

      {/* Alerta de erro da API */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-800 mb-0.5">Erro de Administração Global</span>
            <span className="leading-relaxed block text-red-700">{error}</span>
          </div>
          <button 
            onClick={fetchTenants}
            className="text-xs font-medium bg-white text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md border border-red-300 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Grid de Métricas Globais Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Total de Empresas</span>
          <span className="text-2xl font-bold text-slate-900 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : totalTenants}
          </span>
          <span className="text-xs text-slate-500 block mt-1">Sistemas industriais ativos</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Delegações Ativas</span>
          <span className="text-2xl font-bold text-emerald-700 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : activeTenants}
          </span>
          <span className="text-xs text-slate-500 block mt-1">Clientes com licenças válidas</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Limite Total de Ativos</span>
          <span className="text-2xl font-bold text-blue-700 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : totalAssetsSum}
          </span>
          <span className="text-xs text-slate-500 block mt-1">Capacidade contratada global</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-md shadow-none">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Taxa de Operação</span>
          <span className="text-2xl font-bold text-amber-700 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : '100%'}
          </span>
          <span className="text-xs text-slate-500 block mt-1">SLA do Servidor CMMS Cloud</span>
        </div>
      </div>

      {/* Tabela de Empresas Contratantes */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="font-semibold text-sm text-slate-900">Empresas Contratantes</span>
          <span className="text-xs text-slate-500">Total de {tenants.length} registadas</span>
        </div>

        {loading ? (
          /* SKELETON */
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2.5">
                <div className="h-6 bg-slate-100 rounded w-12 animate-pulse"></div>
                <div className="h-6 bg-slate-100 rounded flex-1 animate-pulse"></div>
                <div className="h-6 bg-slate-100 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Nenhuma Empresa Cadastrada</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Utilize o botão acima para registar e provisionar o primeiro cliente corporativo no CMMS.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Nome da Empresa</th>
                  <th className="py-3 px-4 font-semibold">Nome Comercial</th>
                  <th className="py-3 px-4 font-semibold">NUIT</th>
                  <th className="py-3 px-4 font-semibold">Província</th>
                  <th className="py-3 px-4 font-semibold text-right">Limites (Ativos / Users)</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => {
                  const companyName = tenant.name;
                  const trade = tenant.trade_name || tenant.tradeName || '---';
                  const active = tenant.is_active ?? tenant.isActive ?? true;
                  const limitAssets = tenant.max_assets_limit ?? tenant.maxAssetsLimit ?? 50;
                  const limitUsers = tenant.max_users_limit ?? tenant.max_users ?? tenant.maxUsers ?? 15;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {companyName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {trade}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {tenant.nuit}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {tenant.province}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-blue-700 font-bold">
                        {limitAssets} ativos / {limitUsers} users
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {active ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(tenant)}
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Editar Empresa & Parâmetros"
                        >
                          <Edit2 size={13} />
                        </button>
                        
                        <button
                          onClick={() => navigate(`/app/users?tenant_id=${tenant.id}`)}
                          className="p-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 rounded-md border border-slate-300 hover:border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Gerir Utilizadores da Empresa"
                        >
                          <Users size={13} />
                        </button>

                        <button
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`p-1.5 rounded-md border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            active
                              ? 'bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border-slate-300 hover:border-amber-200'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border-slate-300 hover:border-emerald-200'
                          }`}
                          title={active ? "Suspender Empresa" : "Ativar Empresa"}
                        >
                          {active ? <Pause size={13} /> : <Play size={13} />}
                        </button>

                        <button
                          onClick={() => handleConfirmDelete(tenant)}
                          className="p-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded-md border border-slate-300 hover:border-red-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Arquivar / Cancelar Contrato"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE EMPRESA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Registar Nova Empresa' : 'Editar Empresa & Parâmetros Contratuais'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Seção 1: Dados da Empresa */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-700" />
                  <span>1. Informações Corporativas</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tenantName" className="block text-xs font-medium text-slate-700 mb-1">
                      Nome Oficial / Razão Social *
                    </label>
                    <input
                      id="tenantName"
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="ex: Caminhos de Ferro, Lda"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="tradeName" className="block text-xs font-medium text-slate-700 mb-1">
                      Nome Comercial / Fantasia *
                    </label>
                    <input
                      id="tradeName"
                      type="text"
                      required
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="ex: CFM Logística"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label htmlFor="nuit" className="block text-xs font-medium text-slate-700 mb-1">
                      NUIT (Identificação Fiscal) *
                    </label>
                    <input
                      id="nuit"
                      type="text"
                      required
                      value={nuit}
                      onChange={(e) => setNuit(e.target.value)}
                      placeholder="ex: 400123456"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="province" className="block text-xs font-medium text-slate-700 mb-1">
                      Província Sede *
                    </label>
                    <input
                      id="province"
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="ex: Maputo, Sofala"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <label htmlFor="operationalScope" className="block text-xs font-medium text-slate-700 mb-1">
                      Âmbito Operacional Contratado *
                    </label>
                    <select
                      id="operationalScope"
                      required
                      value={operationalScope}
                      onChange={(e) => setOperationalScope(e.target.value as 'fleet' | 'plant' | 'mixed')}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="fleet">Frota Rodoviária (Transportes/Logística)</option>
                      <option value="plant">Instalação Fabril (Indústria/Maquinaria)</option>
                      <option value="mixed">Operação Mista (Frota + Fábrica)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="maxAssets" className="block text-xs font-medium text-slate-700 mb-1">
                      Limite de Ativos *
                    </label>
                    <input
                      id="maxAssets"
                      type="number"
                      required
                      min={1}
                      value={maxAssetsLimit}
                      onChange={(e) => setMaxAssetsLimit(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="maxUsers" className="block text-xs font-medium text-slate-700 mb-1">
                      Limite de Utilizadores *
                    </label>
                    <input
                      id="maxUsers"
                      type="number"
                      required
                      min={1}
                      value={maxUsersLimit}
                      onChange={(e) => setMaxUsersLimit(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Administrador Inicial (Apenas no cadastro de nova empresa) */}
              {modalMode === 'create' && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User size={14} className="text-blue-700" />
                    <span>2. Utilizador Administrador Inicial</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="adminName" className="block text-xs font-medium text-slate-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        id="adminName"
                        type="text"
                        required={modalMode === 'create'}
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        placeholder="ex: João Sitoe"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminPhone" className="block text-xs font-medium text-slate-700 mb-1">
                        Telefone / Celular
                      </label>
                      <input
                        id="adminPhone"
                        type="text"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="ex: +258 84 123 4567"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label htmlFor="adminEmail" className="block text-xs font-medium text-slate-700 mb-1">
                        E-mail Corporativo *
                      </label>
                      <input
                        id="adminEmail"
                        type="email"
                        required={modalMode === 'create'}
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="ex: admin@empresa.co.mz"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminPass" className="block text-xs font-medium text-slate-700 mb-1">
                        Palavra-passe de Acesso *
                      </label>
                      <div className="relative">
                        <input
                          id="adminPass"
                          type={showAdminPassword ? 'text' : 'password'}
                          required={modalMode === 'create'}
                          minLength={8}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-3 pr-10 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões do Modal */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{modalMode === 'create' ? 'A provisionar...' : 'A guardar...'}</span>
                    </>
                  ) : (
                    <span>{modalMode === 'create' ? 'Registar Empresa' : 'Guardar Alterações'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO / ARQUIVAMENTO */}
      {isDeleteModalOpen && deletingTenant && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-md w-full max-w-sm shadow-xl p-6 text-center animate-slide-up">
            <div className="w-12 h-12 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Cancelar Contrato da Empresa?</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Tem a certeza de que deseja suspender/arquivar o contrato da empresa <strong className="text-slate-900">{deletingTenant.name}</strong>?
              Esta ação afetará o acesso dos utilizadores associados.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTenant}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                Sim, Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminPage;
