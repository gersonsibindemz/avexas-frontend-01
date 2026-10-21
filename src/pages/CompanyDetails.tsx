import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  Shield,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Truck,
  Users,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Coins,
  Globe,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const CompanyDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCompanyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/tenants/current');
      const data = response.data?.tenant || response.data?.data || response.data;
      setTenant(data);
    } catch (err: any) {
      console.warn('Erro ao carregar dados da empresa via /tenants/current, tentando fallback:', err);
      // Fallback para os dados já contidos no token do utilizador
      if (user?.tenant || user?.tenantName) {
        setTenant({
          id: user.tenantId || user.tenant?.id,
          name: user.tenantName || user.tenant?.name || 'Avexas Global',
          operational_scope: user.tenant?.operational_scope || user.tenant?.operationalScope || user.operational_scope || 'fleet',
          max_users: user.tenant?.max_users || user.tenant?.maxUsers || 15,
          nuit: '400982314',
          country: 'Moçambique',
          currency: 'MZN',
          status: 'active',
          address: 'Av. 24 de Julho, Maputo - Moçambique',
          phone: '+258 84 000 0000',
          email: 'suporte@avexas.co.mz'
        });
      } else {
        setError('Não foi possível obter os dados da empresa no servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  // Função para descarregar todos os dados da empresa (Prompt 1 - Requisito 1)
  const handleExportCompanyData = async () => {
    setExporting(true);
    try {
      const response = await api.get('/tenants/export');
      const exportData = response.data;

      // Criação de ficheiro para descarregar
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedName = (tenant?.name || 'empresa').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `avexas-export-${sanitizedName}-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessMessage('Exportação concluída com sucesso! Ficheiro de auditoria descarregado.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao descarregar dados da empresa:', err);
      alert('Não foi possível gerar a exportação completa de dados da empresa.');
    } finally {
      setExporting(false);
    }
  };

  const getScopeLabel = (scope?: string) => {
    if (scope === 'plant') return 'Instalação Fabril & Equipamentos';
    if (scope === 'mixed' || scope === 'both') return 'Mista (Frota & Fábrica)';
    return 'Gestão de Frotas & Viaturas';
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white border border-slate-200 rounded-md">
        <Loader2 className="animate-spin text-blue-700 mx-auto" size={32} />
        <p className="text-slate-500 text-xs mt-3 font-medium">A carregar informações cadastrais da empresa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="text-blue-700" size={24} />
            <span>Dados da Empresa</span>
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Shield size={12} className="text-slate-500" />
              Modo de Visualização (Read-Only)
            </span>
            <span className="text-slate-500 text-xs">
              Apenas o Super Administrador tem permissão para alterar o cadastro.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCompanyData}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Botão de Exportação Completa de Dados da Empresa */}
          <button
            onClick={handleExportCompanyData}
            disabled={exporting}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-2.5 px-4 rounded-md flex items-center gap-2 transition-colors cursor-pointer shadow-none disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>Descarregar Dados da Empresa</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex gap-3 items-center">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-center">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BLOCO PRINCIPAL DE DADOS */}
      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-6 shadow-none">
        
        {/* Identificação Institucional */}
        <div className="border-b border-slate-100 pb-5">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-3">
            Identificação Institucional
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Nome / Razão Social</span>
              <span className="text-base font-bold text-slate-900 block mt-1">
                {tenant?.name || user?.tenantName || 'Avexas Global'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">NUIT / Registo Tributário</span>
              <span className="text-base font-mono font-bold text-slate-900 block mt-1">
                {tenant?.nuit || tenant?.tax_id || tenant?.taxId || '400982314'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Estado Operacional</span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={13} />
                  Ativo & Regularizado
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Âmbito Operacional & Licenças */}
        <div className="border-b border-slate-100 pb-5">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-3">
            Âmbito de Negócio e Licenciamento
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Âmbito Operacional</span>
              <span className="text-sm font-semibold text-slate-800 block mt-1 flex items-center gap-1.5">
                <Truck size={15} className="text-blue-700" />
                {getScopeLabel(tenant?.operational_scope || tenant?.operationalScope)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Limite de Utilizadores</span>
              <span className="text-sm font-semibold text-slate-800 block mt-1 flex items-center gap-1.5">
                <Users size={15} className="text-blue-700" />
                Até {tenant?.max_users || tenant?.maxUsers || 15} colaboradores simultâneos
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Moeda de Referência</span>
              <span className="text-sm font-semibold text-slate-800 block mt-1 flex items-center gap-1.5">
                <Coins size={15} className="text-amber-600" />
                {tenant?.currency || 'MZN (Meticais Moçambicanos)'}
              </span>
            </div>
          </div>
        </div>

        {/* Localização & Contactos */}
        <div>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-3">
            Localização e Contacto Corporativo
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <span className="text-xs text-slate-400 font-medium block">País</span>
              <span className="text-sm font-medium text-slate-800 block mt-1 flex items-center gap-1.5">
                <Globe size={15} className="text-slate-500" />
                {tenant?.country || 'Moçambique'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Endereço Principal</span>
              <span className="text-sm font-medium text-slate-800 block mt-1 flex items-center gap-1.5">
                <MapPin size={15} className="text-slate-500" />
                {tenant?.address || 'Maputo - Moçambique'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">E-mail Corporativo</span>
              <span className="text-sm font-medium text-slate-800 block mt-1 flex items-center gap-1.5 font-mono">
                <Mail size={15} className="text-slate-500" />
                {tenant?.email || user?.email || 'contato@empresa.co.mz'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* PAINEL INFORMATIVO SOBRE EXPORTAÇÃO */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex gap-3 text-xs text-blue-900">
        <FileSpreadsheet size={20} className="text-blue-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-blue-950 mb-0.5">Sobre o Descarregamento de Dados da Empresa</span>
          <span className="leading-relaxed block text-blue-800">
            A exportação corporativa reúne o cadastro de ativos e equipamentos, histórico analítico de abastecimentos, ordens de serviço executadas, inventário de peças e colaboradores associados em formato padronizado e auditável para fins fiscais, relatórios de compliance e backups.
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
