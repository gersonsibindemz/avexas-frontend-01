import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Fuel,
  TrendingUp,
  Award
} from 'lucide-react';

interface Asset {
  id: string;
  code_tag: string;
  codeTag?: string;
  name: string;
}

interface FuelLog {
  id: string;
  logged_at: string;
  loggedAt?: string;
  asset_id: string;
  assetId?: string;
  asset_name?: string;
  asset?: {
    code_tag?: string;
    name?: string;
  };
  fuel_type: 'Diesel' | 'Gasolina' | string;
  fuelType?: string;
  liters: number;
  price_per_liter_mzn: number;
  pricePerLiterMzn?: number;
  total_cost_mzn: number;
  totalCostMzn?: number;
  current_meter: number;
  currentMeter?: number;
  station_name: string;
  stationName?: string;
  receipt_doc_ref: string;
  receiptDocRef?: string;
}

export const FuelPage: React.FC = () => {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de pesquisa e filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('all');

  // Modais e Toasts
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Campos do Formulário
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [fuelType, setFuelType] = useState<'Diesel' | 'Gasolina'>('Diesel');
  const [liters, setLiters] = useState<number | ''>('');
  const [pricePerLiterMzn, setPricePerLiterMzn] = useState<number | ''>('');
  const [currentMeter, setCurrentMeter] = useState<number | ''>('');
  const [stationName, setStationName] = useState('');
  const [receiptDocRef, setReceiptDocRef] = useState('');

  // Busca lista de abastecimentos
  const fetchFuelLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/fuel');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.fuelLogs || response.data?.data || [];
      setLogs(data);
    } catch (err: any) {
      console.error('Erro ao carregar histórico de combustível:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Não foi possível estabelecer ligação ao servidor para carregar o histórico de combustível.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Carrega ativos cadastrados para o dropdown
  const fetchAssetsForDropdown = async () => {
    try {
      const response = await api.get('/assets');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.assets || response.data?.data || [];
      setAssets(data);
      if (data.length > 0) {
        setSelectedAssetId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar ativos para abastecimento:', err);
    }
  };

  useEffect(() => {
    fetchFuelLogs();
    fetchAssetsForDropdown();
  }, []);

  // Formatação de Moeda Padronizada em Meticais
  const formatMZN = (val?: number) => {
    const value = val ?? 0;
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
  };

  // Formatação de Litros
  const formatLiters = (val?: number) => {
    const value = val ?? 0;
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  };

  // Submissão do Abastecimento
  const handleRegisterFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !liters || !pricePerLiterMzn || !currentMeter || !stationName || !receiptDocRef) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Payload robusto mapeando camelCase e snake_case para maior segurança de integração
    const payload = {
      assetId: selectedAssetId,
      asset_id: selectedAssetId,
      fuelType,
      fuel_type: fuelType,
      liters: Number(liters),
      pricePerLiterMzn: Number(pricePerLiterMzn),
      price_per_liter_mzn: Number(pricePerLiterMzn),
      currentMeter: Number(currentMeter),
      current_meter: Number(currentMeter),
      stationName,
      station_name: stationName,
      receiptDocRef,
      receipt_doc_ref: receiptDocRef,
      loggedAt: new Date().toISOString(),
      logged_at: new Date().toISOString()
    };

    try {
      await api.post('/fuel', payload);
      setSuccessMessage('Abastecimento registado com sucesso no servidor!');
      setIsModalOpen(false);

      // Limpa formulário
      setLiters('');
      setPricePerLiterMzn('');
      setCurrentMeter('');
      setStationName('');
      setReceiptDocRef('');

      // Recarrega os dados
      await fetchFuelLogs();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao guardar abastecimento:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar abastecimento no servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtros aplicados localmente
  const filteredLogs = logs.filter((log) => {
    const code = (log.asset?.code_tag || log.asset_id || '').toLowerCase();
    const name = (log.asset_name || log.asset?.name || '').toLowerCase();
    const station = (log.station_name || log.stationName || '').toLowerCase();
    const receipt = (log.receipt_doc_ref || log.receiptDocRef || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      code.includes(query) ||
      name.includes(query) ||
      station.includes(query) ||
      receipt.includes(query);

    const matchesFuelType = 
      fuelTypeFilter === 'all' || 
      (log.fuel_type || log.fuelType || '').toLowerCase() === fuelTypeFilter.toLowerCase();

    return matchesSearch && matchesFuelType;
  });

  // Métricas rápidas calculadas
  const totalLiters = filteredLogs.reduce((acc, log) => acc + (log.liters ?? 0), 0);
  const totalCost = filteredLogs.reduce((acc, log) => acc + (log.total_cost_mzn ?? log.totalCostMzn ?? 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl shadow-2xl max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-white">Consumo Atualizado</span>
            <span className="text-xs text-slate-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Gestão de Combustível</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-500" />}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Controlo analítico de abastecimentos, verificação de recibos e eficiência energética da frota.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFuelLogs}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar histórico"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              fetchAssetsForDropdown();
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus size={16} />
            <span>Registar Abastecimento</span>
          </button>
        </div>
      </div>

      {/* Alerta de erro da API */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-300 mb-0.5">Erro no Histórico de Combustível</span>
            <span className="leading-relaxed block text-slate-300">{error}</span>
          </div>
          <button 
            onClick={fetchFuelLogs}
            className="text-[11px] font-bold bg-red-900/30 hover:bg-red-900/50 px-2.5 py-1 rounded border border-red-800/40 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Grid de Estatísticas Rápidas baseadas nos filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl">
          <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider mb-2">Preço de Referência em Moçambique</span>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
            <span className="text-slate-300 text-xs">Gasóleo (Diesel) / Litro</span>
            <span className="font-mono font-bold text-white text-sm">{formatMZN(75.00)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-300 text-xs">Gasolina / Litro</span>
            <span className="font-mono font-bold text-white text-sm">{formatMZN(86.25)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider mb-1">Combustível Total Adquirido</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tracking-tight block mt-1">
              {loading ? '--- L' : formatLiters(totalLiters)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2">Volume cumulativo dos registros filtrados</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider mb-1">Investimento Acumulado</span>
            <span className="text-2xl font-bold text-blue-400 font-mono tracking-tight block mt-1">
              {loading ? '--- MZN' : formatMZN(totalCost)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2">Custo total dos abastecimentos faturados</span>
        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por matrícula, nome, posto, ou nº de recibo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <select
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Qualquer Tipo</option>
            <option value="diesel">Diesel (Gasóleo)</option>
            <option value="gasolina">Gasolina</option>
          </select>
        </div>
      </div>

      {/* Tabela de Abastecimentos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
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
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-800 text-slate-500 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Nenhum Registo de Combustível</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Não existem abastecimentos correspondentes aos filtros aplicados na base de dados real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Data Abastecimento</th>
                  <th className="py-3.5 px-4 font-semibold">Viatura / Ativo</th>
                  <th className="py-3.5 px-4 font-semibold">Tipo</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Litragem</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Preço / L</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Custo Abastecido</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Odómetro</th>
                  <th className="py-3.5 px-4 font-semibold">Posto</th>
                  <th className="py-3.5 px-4 font-semibold">Fatura / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const matchingAsset = assets.find(a => a.id === log.asset_id || a.id === log.assetId);
                  
                  let assetCode = log.asset?.code_tag || log.asset_id;
                  let assetLabel = log.asset_name || log.asset?.name || 'Equipamento';
                  if (matchingAsset) {
                    assetCode = matchingAsset.code_tag || matchingAsset.codeTag || assetCode;
                    assetLabel = matchingAsset.name || assetLabel;
                  }

                  const loggedDate = log.logged_at || log.loggedAt;
                  const fuelKind = log.fuel_type || log.fuelType || 'Diesel';
                  const logLiters = log.liters ?? 0;
                  const price = log.price_per_liter_mzn ?? log.pricePerLiterMzn ?? 0;
                  const total = log.total_cost_mzn ?? log.totalCostMzn ?? 0;
                  const odometer = log.current_meter ?? log.currentMeter ?? 0;
                  const station = log.station_name || log.stationName || 'Não especificado';
                  const receipt = log.receipt_doc_ref || log.receiptDocRef || 'Sem ref';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors duration-150">
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {loggedDate ? new Date(loggedDate).toLocaleString('pt-MZ') : '---'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-emerald-400 text-xs font-bold">{assetCode}</span>
                          <span className="text-[11px] text-slate-400">{assetLabel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-300">
                        {fuelKind}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300">
                        {formatLiters(logLiters)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                        {formatMZN(price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-400 font-bold">
                        {formatMZN(total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                        {odometer.toLocaleString('pt-MZ')} km
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {station}
                      </td>
                      <td className="py-3.5 px-4 text-mono text-xs text-slate-400">
                        {receipt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO: REGISTAR ABASTECIMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Fuel className="text-emerald-500" size={18} />
                <h2 className="text-base font-bold text-white">Registar Abastecimento</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterFuel} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fuelAsset" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Ativo Abastecido *
                  </label>
                  <select
                    id="fuelAsset"
                    required
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {assets.length === 0 ? (
                      <option value="">A carregar ativos...</option>
                    ) : (
                      assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          [{asset.code_tag || asset.codeTag}] {asset.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="fuelKindSelect" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Tipo de Combustível *
                  </label>
                  <select
                    id="fuelKindSelect"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Diesel">Diesel (Gasóleo)</option>
                    <option value="Gasolina">Gasolina</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="litersInput" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Litros Abastecidos *
                  </label>
                  <div className="relative">
                    <input
                      id="litersInput"
                      type="number"
                      step="0.01"
                      required
                      min={0.1}
                      value={liters}
                      onChange={(e) => setLiters(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="ex: 120,50"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-500">LITROS</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="priceInput" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Preço por Litro (MZN) *
                  </label>
                  <div className="relative">
                    <input
                      id="priceInput"
                      type="number"
                      step="0.01"
                      required
                      min={0.1}
                      value={pricePerLiterMzn}
                      onChange={(e) => setPricePerLiterMzn(e.target.value !== '' ? Number(e.target.value) : '')}
                      placeholder="ex: 75,00"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-500">MZN</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="meterInput" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Odómetro Atual (km) *
                  </label>
                  <input
                    id="meterInput"
                    type="number"
                    required
                    min={0}
                    value={currentMeter}
                    onChange={(e) => setCurrentMeter(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 142500"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="station" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Posto de Abastecimento *
                  </label>
                  <input
                    id="station"
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="ex: Petromoc Maputo"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="receipt" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Referência do Recibo / Fatura *
                </label>
                <input
                  id="receipt"
                  type="text"
                  required
                  value={receiptDocRef}
                  onChange={(e) => setReceiptDocRef(e.target.value)}
                  placeholder="ex: FAT-2026/8942"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              {/* Pré-visualização do Custo Estimado */}
              {liters && pricePerLiterMzn && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <DollarSign size={14} />
                    Custo Total Calculado:
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatMZN(Number(liters) * Number(pricePerLiterMzn))}
                  </span>
                </div>
              )}

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
                      <span>A guardar...</span>
                    </>
                  ) : (
                    <span>Guardar Abastecimento</span>
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

export default FuelPage;
