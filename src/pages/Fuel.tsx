import React, { useState, useEffect } from 'react';
import { api, getApiErrorMessage } from '../services/api';
import { useAuth, useSuspensionGuard } from '../contexts/AuthContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatMoney } from '../config/countriesCurrencies';
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
  fuel_tank_capacity_liters?: number;
  fuelTankCapacityLiters?: number;
  current_meter?: number;
  currentMeter?: number;
}

interface FuelLog {
  id: string;
  logged_at: string;
  loggedAt?: string;
  asset_id: string;
  assetId?: string;
  asset_name?: string;
  asset_code_tag?: string;
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
  const { currentScope } = useAuth();
  const { checkSuspension, handleActionClick } = useSuspensionGuard();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de pesquisa e filtragem
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('all');

  // Modais e Toasts
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEscapeKey(() => setIsModalOpen(false), isModalOpen);
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
      const filteredAssets = data.filter((asset: any) => {
        // Prioriza o domínio gravado no backend (coluna domain de GET /assets);
        // a categoria é apenas fallback para registos legados sem domínio.
        if (asset.domain === 'fleet' || asset.domain === 'plant') {
          return asset.domain === currentScope;
        }
        if (currentScope === 'plant') {
          return asset.category === 'generator'
            || asset.category === 'machinery'
            || asset.category === 'plant_equipment';
        }
        return asset.category === 'vehicle_light' || asset.category === 'vehicle_heavy';
      });
      setAssets(filteredAssets);
      if (filteredAssets.length > 0) {
        setSelectedAssetId(filteredAssets[0].id);
      } else {
        setSelectedAssetId('');
      }
    } catch (err) {
      console.error('Erro ao carregar ativos para abastecimento:', err);
    }
  };

  // Preço de Referência e Moeda Dinâmica por Empresa / País
  const [refData, setRefData] = useState<{
    country: string;
    currency: string;
    prices: { Diesel: number; Gasolina: number };
  }>({
    country: 'Moçambique',
    currency: 'MZN',
    prices: { Diesel: 75.0, Gasolina: 86.25 }
  });

  const fetchReferencePrices = async () => {
    try {
      const response = await api.get('/fuel/reference-prices').catch(() => null);
      if (response && response.data) {
        setRefData({
          country: response.data.country || 'Moçambique',
          currency: response.data.currency || 'MZN',
          prices: {
            Diesel: response.data.prices?.Diesel ?? response.data.diesel_price ?? 75.0,
            Gasolina: response.data.prices?.Gasolina ?? response.data.gasoline_price ?? 86.25
          }
        });
      } else {
        const savedPrices = localStorage.getItem('cmms_fuel_prices');
        if (savedPrices) {
          const parsed = JSON.parse(savedPrices);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRefData({
              country: parsed[0].country || 'Moçambique',
              currency: parsed[0].currency || 'MZN',
              prices: {
                Diesel: parsed[0].diesel_price || 75.0,
                Gasolina: parsed[0].gasoline_price || 86.25
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar preços de referência:', err);
    }
  };

  useEffect(() => {
    fetchFuelLogs();
    fetchReferencePrices();
  }, []);

  useEffect(() => {
    fetchAssetsForDropdown();
  }, [currentScope]);

  // Sugere automaticamente o preço por litro quando o modal abre ou muda o tipo de combustível
  useEffect(() => {
    if (isModalOpen && pricePerLiterMzn === '') {
      const suggested = fuelType === 'Diesel' ? refData.prices.Diesel : refData.prices.Gasolina;
      setPricePerLiterMzn(suggested);
    }
  }, [isModalOpen, fuelType, refData]);

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
    if (checkSuspension()) return;
    if (!selectedAssetId || !liters || !pricePerLiterMzn || !currentMeter || !stationName || !receiptDocRef) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const selectedAsset = assets.find((a) => a.id === selectedAssetId);
    const tankCapacity = selectedAsset?.fuel_tank_capacity_liters ?? selectedAsset?.fuelTankCapacityLiters;
    const currentMeterVal = selectedAsset?.current_meter ?? selectedAsset?.currentMeter;

    if (tankCapacity && Number(liters) > tankCapacity) {
      alert(`A quantidade informada não pode ser superior à capacidade do tanque (${tankCapacity} Litros).`);
      return;
    }

    if (currentMeterVal !== undefined && currentMeterVal !== null && Number(currentMeter) < currentMeterVal) {
      alert(`A quilometragem informada não pode ser inferior ao último registro (${currentMeterVal} km).`);
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

      // Recarrega os dados de histórico e lista de ativos com novo contador
      await fetchFuelLogs();
      await fetchAssetsForDropdown();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao guardar abastecimento:', err);
      alert(getApiErrorMessage(err, 'Erro ao guardar abastecimento no servidor.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtros aplicados localmente
  const filteredLogs = logs.filter((log) => {
    const code = (log.asset_code_tag || log.asset?.code_tag || log.asset_id?.substring(0, 8) || '').toLowerCase();
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
  const totalLiters = filteredLogs.reduce((acc, log) => acc + Number(log.liters || 0), 0);
  const totalCost = filteredLogs.reduce((acc, log) => {
    const liters = Number(log.liters || 0);
    const cost = Number(log.total_cost_mzn || log.totalCostMzn || (liters * Number(log.price_per_liter_mzn || log.pricePerLiterMzn || 0)));
    return acc + cost;
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-fade-in">
          <CheckCircle2 className="text-emerald-700 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Consumo Atualizado</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Gestão de Combustível</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Controlo analítico de abastecimentos, verificação de recibos e eficiência energética da frota.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFuelLogs}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar histórico"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleActionClick(() => {
              fetchAssetsForDropdown();
              setIsModalOpen(true);
            })}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
          >
            <Plus size={16} />
            <span>Registar Abastecimento</span>
          </button>
        </div>
      </div>

      {/* Alerta de erro da API */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex gap-3 items-start">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-red-800 mb-0.5">Erro no Histórico de Combustível</span>
            <span className="leading-relaxed block text-red-700">{error}</span>
          </div>
          <button 
            onClick={fetchFuelLogs}
            className="text-xs font-medium bg-white text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md border border-red-300 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Grid de Estatísticas Rápidas baseadas nos filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-md shadow-none">
          <div className="mb-2">
            <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">PREÇO DE REFERÊNCIA</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Valores oficiais em vigor no país da empresa</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-600 text-xs font-medium">Gasóleo (Diesel) / Litro</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatMoney(refData.prices.Diesel, refData.currency)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-600 text-xs font-medium">Gasolina / Litro</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{formatMoney(refData.prices.Gasolina, refData.currency)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-md shadow-none flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider mb-1">Combustível Total Adquirido</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight block mt-1">
              {loading ? '--- L' : formatLiters(totalLiters)}
            </span>
          </div>
          <span className="text-xs text-slate-500 block mt-2">Volume cumulativo dos registros filtrados</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-md shadow-none flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider mb-1">Investimento Acumulado</span>
            <span className="text-2xl font-bold text-blue-700 font-mono tracking-tight block mt-1">
              {loading ? `--- ${refData.currency}` : formatMoney(totalCost, refData.currency)}
            </span>
          </div>
          <span className="text-xs text-slate-500 block mt-2">Custo total dos abastecimentos faturados</span>
        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row gap-3 shadow-none">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por matrícula, nome, posto, ou nº de recibo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <select
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value)}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Qualquer Tipo</option>
            <option value="diesel">Diesel (Gasóleo)</option>
            <option value="gasolina">Gasolina</option>
          </select>
        </div>
      </div>

      {/* Tabela de Abastecimentos */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
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
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Nenhum Registo de Combustível</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Não existem abastecimentos correspondentes aos filtros aplicados na base de dados real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Data Abastecimento</th>
                  <th className="py-3 px-4 font-semibold">Viatura / Ativo</th>
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold text-right">Litragem</th>
                  <th className="py-3 px-4 font-semibold text-right">Preço / L</th>
                  <th className="py-3 px-4 font-semibold text-right">Custo Abastecido</th>
                  <th className="py-3 px-4 font-semibold text-right">Odómetro</th>
                  <th className="py-3 px-4 font-semibold">Posto</th>
                  <th className="py-3 px-4 font-semibold">Fatura / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const matchingAsset = assets.find(a => a.id === log.asset_id || a.id === log.assetId);
                  
                  let assetCode = log.asset_code_tag || log.asset?.code_tag || log.asset_id?.substring(0, 8) || '---';
                  let assetLabel = log.asset_name || log.asset?.name || 'Equipamento';
                  if (matchingAsset) {
                    assetCode = matchingAsset.code_tag || matchingAsset.codeTag || assetCode;
                    assetLabel = matchingAsset.name || assetLabel;
                  }

                  const loggedDate = log.logged_at || log.loggedAt;
                  const fuelKind = log.fuel_type || log.fuelType || 'Diesel';
                  const liters = Number(log.liters || 0);
                  const price = Number(log.price_per_liter_mzn || log.pricePerLiterMzn || 0);
                  const cost = Number(log.total_cost_mzn || log.totalCostMzn || (liters * Number(log.price_per_liter_mzn || log.pricePerLiterMzn || 0)));
                  const odometer = log.current_meter ?? log.currentMeter ?? 0;
                  const station = log.station_name || log.stationName || 'Não especificado';
                  const receipt = log.receipt_doc_ref || log.receiptDocRef || 'Sem ref';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {loggedDate ? new Date(loggedDate).toLocaleString('pt-MZ') : '---'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-blue-700 text-xs font-bold">{assetCode}</span>
                          <span className="text-xs text-slate-500">{assetLabel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {fuelKind}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                        {formatLiters(liters)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                        {formatMZN(price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-blue-700 font-bold">
                        {formatMZN(cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {odometer.toLocaleString('pt-MZ')} km
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {station}
                      </td>
                      <td className="py-3 px-4 text-mono text-xs text-slate-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Fuel className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">Registar Abastecimento</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterFuel} className="p-6 space-y-4">
              
              {(() => {
                const currentSelectedAsset = assets.find(a => a.id === selectedAssetId);
                const tankCap = currentSelectedAsset?.fuel_tank_capacity_liters ?? currentSelectedAsset?.fuelTankCapacityLiters;
                const lastMeter = currentSelectedAsset?.current_meter ?? currentSelectedAsset?.currentMeter;

                const hasCapacityError = Boolean(tankCap && liters !== '' && Number(liters) > tankCap);
                const hasMeterError = Boolean(lastMeter !== undefined && lastMeter !== null && currentMeter !== '' && Number(currentMeter) < lastMeter);

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="fuelAsset" className="block text-xs font-medium text-slate-700 mb-1">
                          Ativo Abastecido *
                        </label>
                        <select
                          id="fuelAsset"
                          required
                          value={selectedAssetId}
                          onChange={(e) => setSelectedAssetId(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
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

                        {/* Limites da Viatura selecionada */}
                        {currentSelectedAsset && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded mt-1.5 text-[11px] text-slate-600 font-mono space-y-0.5">
                            <div>Capacidade do Tanque: <strong className="text-slate-800">{tankCap ?? 'N/A'} L</strong></div>
                            <div>Último Contador Registado: <strong className="text-slate-800">{lastMeter ?? 0} km</strong></div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="fuelKindSelect" className="block text-xs font-medium text-slate-700 mb-1">
                          Tipo de Combustível *
                        </label>
                        <select
                          id="fuelKindSelect"
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none cursor-pointer"
                        >
                          <option value="Diesel">Diesel (Gasóleo)</option>
                          <option value="Gasolina">Gasolina</option>
                        </select>
                      </div>
                    </div>

                    {/* Alertas em Vermelho */}
                    {hasCapacityError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600 shrink-0" />
                        <span>Aviso: O abastecimento excede a capacidade máxima do tanque ({tankCap} Litros).</span>
                      </div>
                    )}

                    {hasMeterError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600 shrink-0" />
                        <span>Aviso: A quilometragem informada não pode ser inferior ao odómetro atual ({lastMeter} km).</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="litersInput" className="block text-xs font-medium text-slate-700 mb-1">
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
                            className={`w-full bg-white border rounded-md px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none ${
                              hasCapacityError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                            }`}
                          />
                          <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-500">LITROS</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="priceInput" className="block text-xs font-medium text-slate-700 mb-1">
                          Preço por Litro ({refData.currency}) *
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
                            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-500">{refData.currency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="meterInput" className="block text-xs font-medium text-slate-700 mb-1">
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
                          className={`w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none ${
                            hasMeterError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                          }`}
                        />
                      </div>
                      <div>
                        <label htmlFor="station" className="block text-xs font-medium text-slate-700 mb-1">
                          Posto de Abastecimento *
                        </label>
                        <input
                          id="station"
                          type="text"
                          required
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                          placeholder="ex: Petromoc Maputo"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="receipt" className="block text-xs font-medium text-slate-700 mb-1">
                        Referência do Recibo / Fatura *
                      </label>
                      <input
                        id="receipt"
                        type="text"
                        required
                        value={receiptDocRef}
                        onChange={(e) => setReceiptDocRef(e.target.value)}
                        placeholder="ex: FAT-2026/8942"
                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                    </div>

                    {/* Pré-visualização do Custo Estimado */}
                    {liters && pricePerLiterMzn && !hasCapacityError && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between text-xs">
                        <span className="font-medium text-blue-700 flex items-center gap-1">
                          <DollarSign size={14} />
                          Custo Total Calculado:
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatMoney(Number(liters) * Number(pricePerLiterMzn), refData.currency)}
                        </span>
                      </div>
                    )}

                    {/* Botões */}
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        disabled={submitting}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || hasCapacityError || hasMeterError}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FuelPage;
