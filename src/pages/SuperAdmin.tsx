import React, { useState, useEffect } from 'react';
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
  MapPin,
  ClipboardList
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
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
}

export const SuperAdminPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Controle de Modal e Submissão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Campos do Formulário de Registro de Tenant e Admin
  const [tenantName, setTenantName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [nuit, setNuit] = useState('');
  const [province, setProvince] = useState('');
  const [maxAssetsLimit, setMaxAssetsLimit] = useState<number>(50);

  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Busca lista de tenants reais
  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/super-admin/tenants');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.tenants || response.data?.data || [];
      setTenants(data);
    } catch (err: any) {
      console.error('Erro ao carregar tenants do super-admin:', err);
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

  // Formatação de Moeda Padronizada em Meticais (Sem duplicar MZN MZN)
  const formatMZN = (val: number) => {
    return `${val.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
  };

  // Submissão do novo Tenant + Admin
  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tradeName || !nuit || !province || !adminFullName || !adminEmail || !adminPassword) {
      alert('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Payload robusto com duplicidade camelCase e snake_case para maior segurança técnica
    const payload = {
      tenantName,
      tenant_name: tenantName,
      tradeName,
      trade_name: tradeName,
      nuit,
      province,
      maxAssetsLimit: Number(maxAssetsLimit),
      max_assets_limit: Number(maxAssetsLimit),
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
      await api.post('/super-admin/tenants', payload);
      setSuccessMessage(`Empresa "${tenantName}" registada e administrador configurado com sucesso!`);
      setIsModalOpen(false);

      // Limpa os campos
      setTenantName('');
      setTradeName('');
      setNuit('');
      setProvince('');
      setMaxAssetsLimit(50);
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminPhone('');

      // Recarrega lista
      await fetchTenants();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao cadastrar tenant:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar dados do novo inquilino.');
    } finally {
      setSubmitting(false);
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl shadow-2xl max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-white">Inquilino Ativado</span>
            <span className="text-xs text-slate-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Gestão de Empresas (Tenants)</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Painel administrativo global de controlo de licenças, NUITs e limites contratuais em Moçambique.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTenants}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar empresas"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus size={16} />
            <span>Registar Nova Empresa</span>
          </button>
        </div>
      </div>

      {/* Alerta de erro da API */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-300 mb-0.5">Erro de Administração Global</span>
            <span className="leading-relaxed block text-slate-300">{error}</span>
          </div>
          <button 
            onClick={fetchTenants}
            className="text-[11px] font-bold bg-red-900/30 hover:bg-red-900/50 px-2.5 py-1 rounded border border-red-800/40 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Grid de Métricas Globais Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Total de Empresas</span>
          <span className="text-2xl font-bold text-white tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : totalTenants}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Sistemas industriais ativos</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Delegações Ativas</span>
          <span className="text-2xl font-bold text-emerald-500 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : activeTenants}
          </span>
          <span className="text-[10px] text-slate-600 block mt-1">Clientes com licenças válidas</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Limite Total de Ativos</span>
          <span className="text-2xl font-bold text-blue-500 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : totalAssetsSum}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Capacidade contratada no Render</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Taxa de Operação</span>
          <span className="text-2xl font-bold text-amber-500 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : '100%'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">SLA do Servidor Cloud SQL/Postgres</span>
        </div>
      </div>

      {/* Tabela de Empresas Contratantes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <span className="font-semibold text-sm">Empresas Contratantes</span>
          <span className="text-xs text-slate-400">Total de {tenants.length} registadas</span>
        </div>

        {loading ? (
          /* SKELETON */
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2.5">
                <div className="h-6 bg-slate-800 rounded w-12 animate-pulse"></div>
                <div className="h-6 bg-slate-800 rounded flex-1 animate-pulse"></div>
                <div className="h-6 bg-slate-800 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-800 text-slate-500 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Nenhuma Empresa Cadastrada</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Utilize o botão acima para registar e provisionar o primeiro cliente corporativo no CMMS.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Nome da Empresa</th>
                  <th className="py-3.5 px-4 font-semibold">Nome Comercial</th>
                  <th className="py-3.5 px-4 font-semibold">NUIT</th>
                  <th className="py-3.5 px-4 font-semibold">Província</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Limite de Ativos</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tenants.map((tenant) => {
                  const companyName = tenant.name;
                  const trade = tenant.trade_name || tenant.tradeName || '---';
                  const active = tenant.is_active ?? tenant.isActive ?? true;
                  const limit = tenant.max_assets_limit ?? tenant.maxAssetsLimit ?? 0;

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-medium text-white">
                        {companyName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {trade}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {tenant.nuit}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-400">
                        {tenant.province}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-400 font-bold">
                        {limit} ativos
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          active
                            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-950/30 text-red-400 border-red-500/20'
                        }`}>
                          {active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO: REGISTAR NOVA EMPRESA E ADMIN INICIAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Building2 className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">Registar Nova Empresa</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterTenant} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
              
              {/* Seção 1: Dados da Empresa */}
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers size={14} />
                  <span>1. Informações Corporativas</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tenantName" className="block text-xs font-semibold text-slate-400 mb-1">
                      Nome Oficial / Razão Social *
                    </label>
                    <input
                      id="tenantName"
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="ex: Caminhos de Ferro, Lda"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="tradeName" className="block text-xs font-semibold text-slate-400 mb-1">
                      Nome Comercial / Fantasia *
                    </label>
                    <input
                      id="tradeName"
                      type="text"
                      required
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="ex: CFM Logística"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <label htmlFor="nuit" className="block text-xs font-semibold text-slate-400 mb-1">
                      NUIT (Identificação Fiscal) *
                    </label>
                    <input
                      id="nuit"
                      type="text"
                      required
                      value={nuit}
                      onChange={(e) => setNuit(e.target.value)}
                      placeholder="ex: 400123456"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="province" className="block text-xs font-semibold text-slate-400 mb-1">
                      Província Sede *
                    </label>
                    <input
                      id="province"
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="ex: Maputo, Sofala"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxAssets" className="block text-xs font-semibold text-slate-400 mb-1">
                      Limite de Ativos *
                    </label>
                    <input
                      id="maxAssets"
                      type="number"
                      required
                      min={1}
                      value={maxAssetsLimit}
                      onChange={(e) => setMaxAssetsLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Administrador Inicial */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={14} />
                  <span>2. Utilizador Administrador Inicial</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adminName" className="block text-xs font-semibold text-slate-400 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      id="adminName"
                      type="text"
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="ex: João Sitoe"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPhone" className="block text-xs font-semibold text-slate-400 mb-1">
                      Telefone / Celular
                    </label>
                    <input
                      id="adminPhone"
                      type="text"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="ex: +258 84 123 4567"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label htmlFor="adminEmail" className="block text-xs font-semibold text-slate-400 mb-1">
                      E-mail Corporativo *
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="ex: admin@empresa.co.mz"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminPass" className="block text-xs font-semibold text-slate-400 mb-1">
                      Palavra-passe de Acesso *
                    </label>
                    <div className="relative">
                      <input
                        id="adminPass"
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-3 pr-10 py-2 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>A provisionar...</span>
                    </>
                  ) : (
                    <span>Criar Inquilino</span>
                  )}
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
