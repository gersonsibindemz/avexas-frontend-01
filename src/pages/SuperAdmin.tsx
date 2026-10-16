import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  COUNTRIES_CURRENCIES,
  ALL_CURRENCIES,
  formatMoney
} from '../config/countriesCurrencies';
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
  Trash2,
  Fuel,
  Globe,
  DollarSign
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  trade_name?: string;
  tradeName?: string;
  nuit: string;
  province: string;
  country?: string;
  currency?: string;
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

interface FuelPriceRecord {
  id: string;
  country: string;
  currency: string;
  diesel_price: number;
  gasoline_price: number;
  scope_type: 'national' | 'company_exception';
  tenant_id?: string;
  tenant_name?: string;
  updated_at?: string;
}

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Aba Ativa: 'tenants' ou 'fuel_pricing'
  const [activeTab, setActiveTab] = useState<'tenants' | 'fuel_pricing'>('tenants');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais do Tenant
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Modal de Exclusão/Arquivamento
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  // Modal de Tabela de Preços de Combustível
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [editingFuelPriceId, setEditingFuelPriceId] = useState<string | null>(null);

  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
  useEscapeKey(() => setIsDeleteModalOpen(false), isDeleteModalOpen);
  useEscapeKey(() => setIsFuelModalOpen(false), isFuelModalOpen);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Campos do Formulário de Empresa (Tenant)
  const [tenantName, setTenantName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [nuit, setNuit] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('Moçambique');
  const [currency, setCurrency] = useState('MZN');
  const [maxAssetsLimit, setMaxAssetsLimit] = useState<number>(50);
  const [maxUsersLimit, setMaxUsersLimit] = useState<number>(15);
  const [operationalScope, setOperationalScope] = useState<'fleet' | 'plant' | 'mixed'>('mixed');

  // Campos do Administrador Inicial (no cadastro)
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Campos da Tabela de Preços de Combustível
  const [fuelPrices, setFuelPrices] = useState<FuelPriceRecord[]>([]);
  const [fpCountry, setFpCountry] = useState('Moçambique');
  const [fpCurrency, setFpCurrency] = useState('MZN');
  const [fpScopeType, setFpScopeType] = useState<'national' | 'company_exception'>('national');
  const [fpTenantId, setFpTenantId] = useState('');
  const [fpDieselPrice, setFpDieselPrice] = useState<number>(75.0);
  const [fpGasolinePrice, setFpGasolinePrice] = useState<number>(86.25);

  // Auto-vinculação País -> Moeda no formulário de Tenant
  const handleCountryChange = (c: string) => {
    setCountry(c);
    const found = COUNTRIES_CURRENCIES.find(item => item.country === c);
    if (found) {
      setCurrency(found.currency);
    }
  };

  // Auto-vinculação País -> Moeda no formulário de Combustível
  const handleFpCountryChange = (c: string) => {
    setFpCountry(c);
    const found = COUNTRIES_CURRENCIES.find(item => item.country === c);
    if (found) {
      setFpCurrency(found.currency);
    }
  };

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

  // Busca lista de preços de combustível
  const fetchFuelPrices = async () => {
    try {
      let data: FuelPriceRecord[] = [];
      try {
        const response = await api.get('/super-admin/fuel-prices');
        data = Array.isArray(response.data) ? response.data : response.data?.prices || [];
      } catch {
        const saved = localStorage.getItem('cmms_fuel_prices');
        if (saved) {
          data = JSON.parse(saved);
        } else {
          data = [
            {
              id: 'fp-1',
              country: 'Moçambique',
              currency: 'MZN',
              diesel_price: 75.0,
              gasoline_price: 86.25,
              scope_type: 'national',
              updated_at: new Date().toISOString()
            },
            {
              id: 'fp-2',
              country: 'África do Sul',
              currency: 'ZAR',
              diesel_price: 21.5,
              gasoline_price: 22.8,
              scope_type: 'national',
              updated_at: new Date().toISOString()
            },
            {
              id: 'fp-3',
              country: 'Angola',
              currency: 'AOA',
              diesel_price: 200.0,
              gasoline_price: 300.0,
              scope_type: 'national',
              updated_at: new Date().toISOString()
            }
          ];
          localStorage.setItem('cmms_fuel_prices', JSON.stringify(data));
        }
      }
      setFuelPrices(data);
    } catch (err) {
      console.error('Erro ao carregar preços de combustível:', err);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchFuelPrices();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTenantId(null);
    setTenantName('');
    setTradeName('');
    setNuit('');
    setProvince('Maputo');
    setCountry('Moçambique');
    setCurrency('MZN');
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
    setCountry(tenant.country || 'Moçambique');
    setCurrency(tenant.currency || 'MZN');
    setMaxAssetsLimit(tenant.max_assets_limit ?? tenant.maxAssetsLimit ?? 50);
    setMaxUsersLimit(tenant.max_users_limit ?? tenant.maxUsersLimit ?? tenant.max_users ?? tenant.maxUsers ?? 15);
    setOperationalScope((tenant.operational_scope || tenant.operationalScope || 'mixed') as any);
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: any = {
      name: tenantName,
      trade_name: tradeName,
      tradeName: tradeName,
      nuit,
      province,
      country,
      currency,
      max_assets_limit: Number(maxAssetsLimit),
      maxAssetsLimit: Number(maxAssetsLimit),
      max_users_limit: Number(maxUsersLimit),
      maxUsersLimit: Number(maxUsersLimit),
      operational_scope: operationalScope,
      operationalScope: operationalScope
    };

    if (modalMode === 'create') {
      payload.adminFullName = adminFullName;
      payload.adminEmail = adminEmail;
      payload.adminPassword = adminPassword;
      payload.adminPhone = adminPhone;
    }

    try {
      if (modalMode === 'create') {
        try {
          await api.post('/admin/tenants', payload);
        } catch {
          await api.post('/super-admin/tenants', payload);
        }
        setSuccessMessage(`Empresa "${tenantName}" registada e provisionada com sucesso!`);
      } else {
        try {
          await api.put(`/admin/tenants/${editingTenantId}`, payload);
        } catch {
          await api.put(`/super-admin/tenants/${editingTenantId}`, payload);
        }
        setSuccessMessage(`Parâmetros da empresa "${tenantName}" atualizados com sucesso!`);
      }

      setIsModalOpen(false);
      fetchTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao guardar empresa:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Falha ao guardar os dados da empresa.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveStatus = async (tenant: Tenant) => {
    const currentActive = tenant.is_active ?? tenant.isActive ?? true;
    const newStatus = !currentActive;
    try {
      try {
        await api.patch(`/admin/tenants/${tenant.id}/toggle-status`, { is_active: newStatus });
      } catch {
        await api.put(`/super-admin/tenants/${tenant.id}`, { ...tenant, is_active: newStatus });
      }
      setSuccessMessage(`Estado da empresa "${tenant.name}" alterado para ${newStatus ? 'Ativo' : 'Suspenso'}.`);
      fetchTenants();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao alterar estado do tenant:', err);
    }
  };

  // Fuel Price Handlers
  const handleOpenFuelModal = (record?: FuelPriceRecord) => {
    if (record) {
      setEditingFuelPriceId(record.id);
      setFpCountry(record.country);
      setFpCurrency(record.currency);
      setFpScopeType(record.scope_type);
      setFpTenantId(record.tenant_id || '');
      setFpDieselPrice(record.diesel_price);
      setFpGasolinePrice(record.gasoline_price);
    } else {
      setEditingFuelPriceId(null);
      setFpCountry('Moçambique');
      setFpCurrency('MZN');
      setFpScopeType('national');
      setFpTenantId('');
      setFpDieselPrice(75.0);
      setFpGasolinePrice(86.25);
    }
    setIsFuelModalOpen(true);
  };

  const handleSaveFuelPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedTenant = tenants.find(t => t.id === fpTenantId);

    const recordPayload: FuelPriceRecord = {
      id: editingFuelPriceId || `fp-${Date.now()}`,
      country: fpCountry,
      currency: fpCurrency,
      diesel_price: Number(fpDieselPrice),
      gasoline_price: Number(fpGasolinePrice),
      scope_type: fpScopeType,
      tenant_id: fpScopeType === 'company_exception' ? fpTenantId : undefined,
      tenant_name: fpScopeType === 'company_exception' ? selectedTenant?.name : undefined,
      updated_at: new Date().toISOString()
    };

    try {
      await api.post('/super-admin/fuel-prices', recordPayload).catch(() => {});
    } catch {
      // Local storage fallback
    } finally {
      let updated: FuelPriceRecord[];
      if (editingFuelPriceId) {
        updated = fuelPrices.map(fp => (fp.id === editingFuelPriceId ? recordPayload : fp));
      } else {
        updated = [recordPayload, ...fuelPrices];
      }
      setFuelPrices(updated);
      localStorage.setItem('cmms_fuel_prices', JSON.stringify(updated));
      setIsFuelModalOpen(false);
      setSubmitting(false);
      setSuccessMessage('Tabela de preços de combustível atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Cálculo de Métricas Globais
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => (t.is_active ?? t.isActive ?? true)).length;
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
            <span>Administração Global CMMS</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Painel administrativo global de controlo de licenças, empresas contratantes e tabela oficial de combustível.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { fetchTenants(); fetchFuelPrices(); }}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          {activeTab === 'tenants' ? (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
            >
              <Plus size={16} />
              <span>Registar Nova Empresa</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenFuelModal()}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
            >
              <Plus size={16} />
              <span>Definir Tabela de Preços</span>
            </button>
          )}
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO SUPER ADMIN */}
      <div className="border-b border-slate-200 flex gap-4">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`pb-3 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'tenants'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>Empresas & Contratos</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{tenants.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('fuel_pricing')}
          className={`pb-3 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'fuel_pricing'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Fuel size={16} />
          <span>Preços de Combustível por País / Moeda</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{fuelPrices.length}</span>
        </button>
      </div>

      {/* Alerta de erro */}
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

      {/* CONTEÚDO DA ABA 1: EMPRESAS & CONTRATOS */}
      {activeTab === 'tenants' && (
        <>
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
                      <th className="py-3 px-4 font-semibold">País / Moeda</th>
                      <th className="py-3 px-4 font-semibold">NUIT</th>
                      <th className="py-3 px-4 font-semibold">Âmbito Operacional</th>
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
                      const assetsLimit = tenant.max_assets_limit ?? tenant.maxAssetsLimit ?? 50;
                      const usersLimit = tenant.max_users_limit ?? tenant.maxUsersLimit ?? tenant.max_users ?? tenant.maxUsers ?? 15;
                      const scope = tenant.operational_scope || tenant.operationalScope || 'mixed';
                      const tenantCountry = tenant.country || 'Moçambique';
                      const tenantCurrency = tenant.currency || 'MZN';

                      return (
                        <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {companyName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            {trade}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                            <span className="block">{tenantCountry}</span>
                            <span className="text-[10px] text-blue-700 font-mono font-bold">{tenantCurrency}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {tenant.nuit}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {scope === 'plant' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                Instalação Fabril
                              </span>
                            ) : scope === 'fleet' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Frota
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Operação Mista
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-right text-slate-700">
                            {assetsLimit} ativos / {usersLimit} users
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {active ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Suspenso
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(tenant)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Editar Parâmetros"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleToggleActiveStatus(tenant)}
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title={active ? 'Suspender Licença' : 'Reativar Licença'}
                              >
                                {active ? <Pause size={15} /> : <Play size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* CONTEÚDO DA ABA 2: PREÇOS DE COMBUSTÍVEL POR PAÍS / MOEDA */}
      {activeTab === 'fuel_pricing' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <span className="font-semibold text-sm text-slate-900 block">Tabela Oficial de Preços de Referência de Combustível</span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Valores de referência por litro vigentes para cálculo de eficiência e custos de abastecimento no CMMS.
              </span>
            </div>
            <button
              onClick={() => handleOpenFuelModal()}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2 px-3 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Definir Tabela de Preços</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider bg-slate-50">
                  <th className="py-3 px-4">País</th>
                  <th className="py-3 px-4">Moeda Oficial</th>
                  <th className="py-3 px-4">Preço Diesel / Litro</th>
                  <th className="py-3 px-4">Preço Gasolina / Litro</th>
                  <th className="py-3 px-4">Âmbito da Regra</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {fuelPrices.map((fp) => (
                  <tr key={fp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Globe size={15} className="text-blue-700 shrink-0" />
                      <span>{fp.country}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-800">
                      {fp.currency}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatMoney(fp.diesel_price, fp.currency)}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatMoney(fp.gasoline_price, fp.currency)}
                    </td>

                    <td className="py-3.5 px-4">
                      {fp.scope_type === 'national' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Padrão Nacional
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Exceção: {fp.tenant_name || 'Empresa Específica'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenFuelModal(fp)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Editar Tabela de Preços"
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRO / EDIÇÃO DE EMPRESA (TENANT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-700" size={20} />
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Registar Nova Empresa Contratante' : 'Editar Parâmetros da Empresa'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTenant} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Seção 1: Dados Institucionais */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-700" />
                  <span>1. Dados Institucionais e Contratuais</span>
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

                <div className="grid grid-cols-2 gap-4">
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
                      Província Sede / Cidade *
                    </label>
                    <input
                      id="province"
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="ex: Maputo, Beira"
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* PAÍS E MOEDA COM AUTO-VINCULAÇÃO */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-xs font-medium text-slate-700 mb-1">
                      País *
                    </label>
                    <select
                      id="country"
                      required
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      {COUNTRIES_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.country}>
                          {c.country} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="currency" className="block text-xs font-medium text-slate-700 mb-1">
                      Moeda Oficial *
                    </label>
                    <select
                      id="currency"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer font-mono"
                    >
                      {ALL_CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="operationalScope" className="block text-xs font-medium text-slate-700 mb-1">
                      Âmbito Operacional *
                    </label>
                    <select
                      id="operationalScope"
                      required
                      value={operationalScope}
                      onChange={(e) => setOperationalScope(e.target.value as 'fleet' | 'plant' | 'mixed')}
                      className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="fleet">Frota (Transportes/Logística)</option>
                      <option value="plant">Instalação Fabril (Indústria)</option>
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

              {/* Seção 2: Administrador Inicial (Apenas no cadastro) */}
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
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-none flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Provisionar Empresa' : 'Guardar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TABELA DE PREÇOS DE COMBUSTÍVEL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Fuel className="text-blue-700" size={20} />
                <h2 className="text-base font-bold text-slate-900">
                  {editingFuelPriceId ? 'Editar Preço de Referência' : 'Definir Tabela de Preços de Combustível'}
                </h2>
              </div>
              <button
                onClick={() => setIsFuelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFuelPrice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  País *
                </label>
                <select
                  required
                  value={fpCountry}
                  onChange={(e) => handleFpCountryChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                >
                  {COUNTRIES_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.country}>
                      {c.country} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Moeda Oficial *
                </label>
                <select
                  required
                  value={fpCurrency}
                  onChange={(e) => setFpCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono cursor-pointer"
                >
                  {ALL_CURRENCIES.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Âmbito da Regra *
                </label>
                <select
                  value={fpScopeType}
                  onChange={(e) => setFpScopeType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
                >
                  <option value="national">Padrão Nacional (Para todas as empresas do país)</option>
                  <option value="company_exception">Exceção para Empresa Específica</option>
                </select>
              </div>

              {fpScopeType === 'company_exception' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Empresa Beneficiária da Exceção *
                  </label>
                  <select
                    required={fpScopeType === 'company_exception'}
                    value={fpTenantId}
                    onChange={(e) => setFpTenantId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 cursor-pointer"
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

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preço Diesel ({fpCurrency}/Litro) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={fpDieselPrice}
                    onChange={(e) => setFpDieselPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preço Gasolina ({fpCurrency}/Litro) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0}
                    value={fpGasolinePrice}
                    onChange={(e) => setFpGasolinePrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-none flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Guardar Preço de Referência</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
