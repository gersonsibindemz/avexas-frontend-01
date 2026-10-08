import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Plus,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string; // fallback
  name: string;
  brand?: string;
  model: string;
  category: 'vehicle_light' | 'vehicle_heavy' | 'generator' | 'machinery' | string;
  current_meter?: number;
  meter_kind?: 'odometer_km' | 'hourmeter_hours' | string;
  status: 'operational' | 'breakdown' | 'maintenance' | string;
  cost_center: string;
  costCenter?: string; // fallback
  manufacture_year?: number;
}

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtro e pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Controle do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Campos do Formulário de Cadastro
  const [codeTag, setCodeTag] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'vehicle_light' | 'vehicle_heavy' | 'generator' | 'machinery'>('vehicle_light');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [manufactureYear, setManufactureYear] = useState(new Date().getFullYear());
  const [meterKind, setMeterKind] = useState<'odometer_km' | 'hourmeter_hours'>('odometer_km');
  const [costCenter, setCostCenter] = useState('');

  // Busca inicial dos dados
  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/assets');
      // Trata a resposta de forma resiliente
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.assets || response.data?.data || [];
      setAssets(data);
    } catch (err: any) {
      console.error('Erro ao carregar ativos:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Não foi possível estabelecer ligação ao servidor do Render. O backend pode estar em cold-start.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Cadastro de novo ativo
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeTag || !name || !model || !costCenter) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Envia o payload duplicando chaves em camelCase e snake_case para maior compatibilidade com o backend
    const payload = {
      codeTag,
      code_tag: codeTag,
      name,
      category,
      brand,
      model,
      manufactureYear: Number(manufactureYear),
      manufacture_year: Number(manufactureYear),
      meterKind,
      meter_kind: meterKind,
      costCenter,
      cost_center: costCenter,
      status: 'operational', // Padrão inicial
      current_meter: 0 // Inicia zerado
    };

    try {
      await api.post('/assets', payload);
      
      // Exibe mensagem de sucesso
      setSuccessMessage(`Ativo "${codeTag} - ${name}" registado com sucesso!`);
      
      // Fecha o modal e limpa os campos
      setIsModalOpen(false);
      setCodeTag('');
      setName('');
      setCategory('vehicle_light');
      setBrand('');
      setModel('');
      setManufactureYear(new Date().getFullYear());
      setMeterKind('odometer_km');
      setCostCenter('');

      // Recarrega a lista automaticamente
      await fetchAssets();

      // Esconde o toast de sucesso após 4 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Erro ao registar ativo:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar as informações do ativo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Formatação amigável das categorias
  const formatCategory = (cat: string) => {
    switch (cat) {
      case 'vehicle_light':
        return 'Veículo Ligeiro';
      case 'vehicle_heavy':
        return 'Frota Pesada';
      case 'generator':
        return 'Gerador Industrial';
      case 'machinery':
        return 'Maquinaria / Chão Fábrica';
      default:
        return cat || 'Não especificado';
    }
  };

  // Formatação amigável do status de manutenção
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Disponível
          </span>
        );
      case 'breakdown':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-950/40 text-red-400 border border-red-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Em Manutenção
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/40 text-amber-400 border border-amber-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Em Oficina
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status || 'Desconhecido'}
          </span>
        );
    }
  };

  // Formatação do medidor (Odómetro / Horímetro)
  const formatMeter = (value?: number, kind?: string) => {
    const val = value ?? 0;
    const formattedVal = new Intl.NumberFormat('pt-MZ').format(val);
    if (kind === 'odometer_km') {
      return `${formattedVal} km`;
    } else if (kind === 'hourmeter_hours') {
      return `${formattedVal} h`;
    }
    return `${formattedVal} unidades`;
  };

  // Filtragem dos ativos localmente para melhor responsividade
  const filteredAssets = assets.filter((asset) => {
    const code = (asset.code_tag || asset.codeTag || '').toLowerCase();
    const assetName = (asset.name || '').toLowerCase();
    const assetModel = (asset.model || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = code.includes(query) || assetName.includes(query) || assetModel.includes(query);
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Cálculo de estatísticas rápidas
  const totalCount = assets.length;
  const operationalCount = assets.filter(a => a.status === 'operational').length;
  const breakdownCount = assets.filter(a => a.status === 'breakdown').length;
  const workshopCount = assets.filter(a => a.status === 'maintenance').length;

  return (
    <div className="space-y-6">
      
      {/* Banner de Mensagem de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl shadow-2xl max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-white">Operação Concluída</span>
            <span className="text-xs text-slate-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Título e Botão de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Ativos e Frotas</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Registo em tempo real e monitorização de saúde de frotas industriais na base corporativa real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAssets}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus size={16} />
            <span>Cadastrar Ativo</span>
          </button>
        </div>
      </div>

      {/* Tratamento de Erros da API */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-300 mb-0.5">Erro de Ligação</span>
            <span className="leading-relaxed block text-slate-300">{error}</span>
          </div>
          <button 
            onClick={fetchAssets}
            className="text-[11px] font-bold bg-red-900/30 hover:bg-red-900/50 px-2.5 py-1 rounded border border-red-800/40 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Grid de Estatísticas em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Total Registado</span>
          <span className="text-2xl font-bold text-white tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : totalCount}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Ativos operacionais e parados</span>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider block">Disponíveis</span>
          <span className="text-2xl font-bold text-emerald-400 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : operationalCount}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-1">Prontos para operação fabril</span>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block">Em Oficina</span>
          <span className="text-2xl font-bold text-amber-400 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : workshopCount}
          </span>
          <span className="text-[10px] text-amber-600 block mt-1">Manutenção agendada ou preventiva</span>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-red-500 font-bold uppercase tracking-wider block">Em Manutenção</span>
          <span className="text-2xl font-bold text-red-400 tracking-tight mt-1 block font-mono tabular-nums">
            {loading ? '---' : breakdownCount}
          </span>
          <span className="text-[10px] text-red-600 block mt-1">Paragem corretiva por avaria</span>
        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por código, marca, modelo ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Categorias</option>
            <option value="vehicle_light">Veículo Ligeiro</option>
            <option value="vehicle_heavy">Frota Pesada</option>
            <option value="generator">Gerador Industrial</option>
            <option value="machinery">Maquinaria / Chão Fábrica</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal: Tabela de Ativos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        
        {loading ? (
          /* SKELETON LOADING */
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-slate-800 rounded w-10 animate-pulse"></div>
            </div>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2">
                <div className="h-8 bg-slate-800 rounded w-16 animate-pulse"></div>
                <div className="h-8 bg-slate-800 rounded flex-1 animate-pulse"></div>
                <div className="h-8 bg-slate-800 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-slate-800 rounded w-28 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          /* ESTADO VAZIO */
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-800 text-slate-500 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Nenhum Ativo Encontrado</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
              Não existem registros para os filtros selecionados ou ainda não há frotas cadastradas no backend.
            </p>
            {searchQuery || categoryFilter !== 'all' ? (
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                className="text-emerald-500 hover:text-emerald-400 text-xs font-semibold mt-4 transition-colors underline decoration-dotted"
              >
                Limpar Filtros
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 px-4 rounded-lg mt-4 transition-all"
              >
                Cadastrar Primeiro Ativo
              </button>
            )}
          </div>
        ) : (
          /* LISTAGEM POPULADA REAL */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Código / Matrícula</th>
                  <th className="py-3.5 px-4 font-semibold">Ativo / Equipamento</th>
                  <th className="py-3.5 px-4 font-semibold">Categoria</th>
                  <th className="py-3.5 px-4 font-semibold">Centro de Custo</th>
                  <th className="py-3.5 px-4 font-semibold">Uso Acumulado</th>
                  <th className="py-3.5 px-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/20 transition-colors duration-150">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 tracking-wide">
                      {asset.code_tag || asset.codeTag}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm leading-5">{asset.name}</span>
                        <span className="text-xs text-slate-400 leading-4 mt-0.5">
                          {asset.brand ? `${asset.brand} ` : ''}{asset.model}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                      {formatCategory(asset.category)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-400">
                      {asset.cost_center || asset.costCenter}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300 tabular-nums">
                      {formatMeter(asset.current_meter, asset.meter_kind)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(asset.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO DE ATIVO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Wrench className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">Registar Novo Ativo</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleCreateAsset} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="codeTag" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Código / Matrícula *
                  </label>
                  <input
                    id="codeTag"
                    type="text"
                    required
                    value={codeTag}
                    onChange={(e) => setCodeTag(e.target.value)}
                    placeholder="ex: CFM-042, MAT-009"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Nome do Ativo *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Empilhadora Caterpillar"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Categoria *
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  >
                    <option value="vehicle_light">Veículo Ligeiro</option>
                    <option value="vehicle_heavy">Frota Pesada</option>
                    <option value="generator">Gerador Industrial</option>
                    <option value="machinery">Maquinaria / Chão Fábrica</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="costCenter" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Centro de Custo / Província *
                  </label>
                  <input
                    id="costCenter"
                    type="text"
                    required
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="ex: Maputo CFM, Beira Terminal"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label htmlFor="brand" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Marca
                  </label>
                  <input
                    id="brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="ex: Scania"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="model" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Modelo *
                  </label>
                  <input
                    id="model"
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="ex: R450 6x4"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="col-span-1">
                  <label htmlFor="manufactureYear" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Ano Fabrico
                  </label>
                  <input
                    id="manufactureYear"
                    type="number"
                    value={manufactureYear}
                    onChange={(e) => setManufactureYear(Number(e.target.value))}
                    min={1950}
                    max={new Date().getFullYear() + 1}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="meterKind" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Tipo de Medidor de Uso
                </label>
                <select
                  id="meterKind"
                  value={meterKind}
                  onChange={(e) => setMeterKind(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                >
                  <option value="odometer_km">Odómetro (Quilómetros - km)</option>
                  <option value="hourmeter_hours">Horímetro (Horas - h)</option>
                </select>
              </div>

              {/* Info de rodapé de cadastro */}
              <div className="text-[10px] text-slate-500 flex gap-1.5 items-start py-2 leading-relaxed bg-slate-950/20 rounded-lg p-3 border border-slate-800/40">
                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  O medidor de uso acumulado inicial será configurado como 0. Novas ordens de serviço e abastecimentos poderão incrementar este indicador.
                </span>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>A guardar...</span>
                    </>
                  ) : (
                    <span>Guardar Ativo</span>
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

export default AssetsPage;
