import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SecondaryView from './SecondaryView';
import { combinationService, CombinationReportItem } from '../services/combinationService';
import { formatMoney } from '../config/countriesCurrencies';
import {
  BarChart3,
  Truck,
  Link as LinkIcon,
  Layers,
  Wrench,
  Fuel,
  FileText,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Clock,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface FleetOperationsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCombinations: any[];
  assets: any[];
  preselectedCombinationId?: string | null;
}

export const FleetOperationsReportModal: React.FC<FleetOperationsReportModalProps> = ({
  isOpen,
  onClose,
  activeCombinations,
  assets,
  preselectedCombinationId
}) => {
  const [viewMode, setViewMode] = useState<'combinations' | 'assets'>('combinations');
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCombFilter, setSelectedCombFilter] = useState<string>(preselectedCombinationId || 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Carrega dados analíticos de OS e Combustível para agregação
  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    setLoading(true);

    Promise.allSettled([
      api.get('/work-orders'),
      api.get('/fuel')
    ]).then(([woRes, fuelRes]) => {
      if (!isCurrent) return;

      const rawWo = woRes.status === 'fulfilled'
        ? (Array.isArray(woRes.value.data) ? woRes.value.data : woRes.value.data?.workOrders || woRes.value.data?.data || [])
        : [];
      const rawFuel = fuelRes.status === 'fulfilled'
        ? (Array.isArray(fuelRes.value.data) ? fuelRes.value.data : fuelRes.value.data?.fuelLogs || fuelRes.value.data?.data || [])
        : [];

      setWorkOrders(rawWo);
      setFuelLogs(rawFuel);
      setLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (preselectedCombinationId) {
      setSelectedCombFilter(preselectedCombinationId);
      setViewMode('combinations');
    }
  }, [preselectedCombinationId]);

  // Gera relatório analítico consolidado
  const combinationReports: CombinationReportItem[] = combinationService.buildCombinationReport(
    activeCombinations,
    assets,
    workOrders,
    fuelLogs
  );

  const filteredCombinations = combinationReports.filter((item) => {
    const matchesFilter = selectedCombFilter === 'all' || item.combinationId === selectedCombFilter || item.combinationCode === selectedCombFilter;
    const matchesSearch = !searchQuery.trim() ||
      item.combinationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.truck.codeTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.truck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trailers.some(t => t.codeTag.toLowerCase().includes(searchQuery.toLowerCase()) || t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Agregações globais de conjuntos
  const totalCombCost = filteredCombinations.reduce((acc, c) => acc + c.aggregated.totalCostMzn, 0);
  const totalCombMaintenance = filteredCombinations.reduce((acc, c) => acc + c.aggregated.totalMaintenanceCostMzn, 0);
  const totalCombFuel = filteredCombinations.reduce((acc, c) => acc + c.aggregated.totalFuelCostMzn, 0);
  const operationalCombs = filteredCombinations.filter(c => c.aggregated.overallOperationalStatus === 'operational').length;

  // Filtragem de Ativos Individuais
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = !searchQuery.trim() ||
      (asset.code_tag || asset.codeTag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.license_plate || asset.licensePlate || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Função de Impressão do Relatório A4 Oficial do Conjunto
  const handlePrintCombinationReport = (comb: CombinationReportItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permita pop-ups para imprimir o relatório do conjunto.');
      return;
    }

    const html = `<!doctype html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <title>Ficha Operacional de Conjunto - ${comb.combinationCode}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4; margin: 0; }
            .container { width: 100%; max-width: 190mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
            .brand { font-size: 18px; font-weight: 800; color: #0f172a; }
            .brand-sub { color: #64748b; font-size: 9px; font-weight: 500; display: block; }
            h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
            .code { font-size: 14px; font-weight: 800; color: #1d4ed8; font-family: monospace; }
            .section-title { background: #f1f5f9; font-weight: bold; padding: 5px 8px; border: 1px solid #cbd5e1; margin-top: 12px; font-size: 10px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; font-size: 9px; text-transform: uppercase; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
            .kpi-card { border: 1px solid #cbd5e1; padding: 8px; background: #fafafa; border-radius: 4px; }
            .kpi-label { font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .kpi-value { font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            .badge { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; border-radius: 3px; }
            .badge-op { background: #dcfce7; color: #166534; }
            .badge-imp { background: #fef3c7; color: #92400e; }
            .badge-down { background: #fee2e2; color: #991b1b; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .sig-line { border-top: 1px solid #64748b; text-align: center; padding-top: 4px; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="container">
            <header class="header">
              <div>
                <div class="brand">AVEXAS<span class="brand-sub">CMMS · Gestão de Frota e Conjuntos Rodoviários</span></div>
              </div>
              <div style="text-align: right;">
                <h1>Ficha de Conjunto Operacional</h1>
                <div class="code">${comb.combinationCode}</div>
                <div style="font-size: 9px; color: #64748b;">Emissão: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}</div>
              </div>
            </header>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Estado Operacional</div>
                <div class="kpi-value">
                  ${comb.aggregated.overallOperationalStatus === 'operational'
                    ? '<span class="badge badge-op">Totalmente Operacional</span>'
                    : comb.aggregated.overallOperationalStatus === 'impaired'
                    ? '<span class="badge badge-imp">Atenção: Trela em Manutenção</span>'
                    : '<span class="badge badge-down">Fora de Serviço (Trator Parado)</span>'}
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Quilometragem (Odómetro)</div>
                <div class="kpi-value">${comb.aggregated.currentMeter.toLocaleString('pt-MZ')} km</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total de Trelas</div>
                <div class="kpi-value">${comb.aggregated.trailersCount} un</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Custo Consolidado Total</div>
                <div class="kpi-value" style="color: #1d4ed8;">${formatMoney(comb.aggregated.totalCostMzn, 'MZN')}</div>
              </div>
            </div>

            <div class="section-title">1. Veículo Trator (Cavalo Mecânico)</div>
            <table>
              <thead>
                <tr>
                  <th>Código / Tag</th>
                  <th>Equipamento</th>
                  <th>Odómetro</th>
                  <th>Estado</th>
                  <th>Custo Manutenção</th>
                  <th>Custo Combustível</th>
                  <th>Total Trator</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${comb.truck.codeTag}</td>
                  <td>${comb.truck.name}</td>
                  <td>${comb.truck.currentMeter.toLocaleString('pt-MZ')} km</td>
                  <td>${comb.truck.status === 'operational' ? 'Operacional' : 'Em Manutenção'}</td>
                  <td>${formatMoney(comb.truck.maintenanceCostMzn, 'MZN')}</td>
                  <td>${formatMoney(comb.truck.fuelCostMzn, 'MZN')}</td>
                  <td style="font-weight: bold;">${formatMoney(comb.truck.totalCostMzn, 'MZN')}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-title">2. Trelas e Reboques Associados (Associação Operacional)</div>
            <table>
              <thead>
                <tr>
                  <th>Código / Tag</th>
                  <th>Nome do Ativo</th>
                  <th>Papel da Trela no Conjunto</th>
                  <th>Estado</th>
                  <th>OS Abertas</th>
                  <th>OS Fechadas</th>
                  <th>Custo de Manutenção</th>
                </tr>
              </thead>
              <tbody>
                ${comb.trailers.map(t => `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold;">${t.codeTag}</td>
                    <td>${t.name}</td>
                    <td><strong>${t.roleLabel}</strong></td>
                    <td>${t.status === 'operational' ? '<span class="badge badge-op">Operacional</span>' : '<span class="badge badge-imp">Manutenção</span>'}</td>
                    <td>${t.openWorkOrdersCount}</td>
                    <td>${t.completedWorkOrdersCount}</td>
                    <td style="font-weight: bold;">${formatMoney(t.maintenanceCostMzn, 'MZN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="section-title">3. Resumo Económico Consolidado</div>
            <table>
              <tr>
                <td style="width: 50%;"><strong>Custo Total de Manutenção (Trator + Trelas):</strong></td>
                <td style="font-weight: bold; text-align: right;">${formatMoney(comb.aggregated.totalMaintenanceCostMzn, 'MZN')}</td>
              </tr>
              <tr>
                <td><strong>Custo Total de Combustível Consumido:</strong></td>
                <td style="font-weight: bold; text-align: right;">${formatMoney(comb.aggregated.totalFuelCostMzn, 'MZN')}</td>
              </tr>
              <tr style="background: #f1f5f9;">
                <td><strong>CUSTO TOTAL OPERACIONAL DO CONJUNTO:</strong></td>
                <td style="font-size: 13px; font-weight: bold; color: #1d4ed8; text-align: right;">${formatMoney(comb.aggregated.totalCostMzn, 'MZN')}</td>
              </tr>
            </table>

            <div class="signatures">
              <div class="sig-line">
                <strong>Gestor de Frota / Supervisor Operacional</strong><br />
                Assinatura & Data
              </div>
              <div class="sig-line">
                <strong>Responsável de Manutenção</strong><br />
                Assinatura & Data
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <SecondaryView
      isOpen={isOpen}
      onClose={onClose}
      title="Relatório Operacional de Frotas e Conjuntos"
      subtitle="Análise consolidada de custos, manutenção, quilometragem, disponibilidade e documentação"
      icon={<BarChart3 size={18} className="text-blue-700" />}
      maxWidthClass="max-w-6xl mx-auto"
    >
      <div className="bg-white p-6 md:p-8 space-y-6">
        
        {/* Alternador de Modo: Por Conjunto Operacional vs Por Ativo Individual */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('combinations')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'combinations'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon size={14} />
              <span>Por Conjunto Operacional (Camião + Trelas)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('assets')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'assets'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck size={14} />
              <span>Por Ativo Individual</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={viewMode === 'combinations' ? 'Buscar conjunto ou matrícula...' : 'Buscar ativo, código ou tag...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            {viewMode === 'combinations' && activeCombinations.length > 0 && (
              <select
                value={selectedCombFilter}
                onChange={(e) => setSelectedCombFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">Todos os Conjuntos ({activeCombinations.length})</option>
                {activeCombinations.map((c) => (
                  <option key={c.id || c.combination_code} value={c.id || c.combination_code}>
                    {c.combination_code || c.combinationCode || 'Conjunto'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ========================================================
            VISÃO 1: POR CONJUNTO OPERACIONAL (CAMIÃO + TRELAS)
            ======================================================== */}
        {viewMode === 'combinations' && (
          <div className="space-y-6">
            {/* KPI Cards Consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Conjuntos Ativos
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    {filteredCombinations.length}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">
                    {operationalCombs} operacionais
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Custo Total Consolidado
                </span>
                <span className="text-xl font-bold text-blue-700 font-mono block mt-1">
                  {formatMoney(totalCombCost, 'MZN')}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Manutenção: {formatMoney(totalCombMaintenance, 'MZN')}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Custo Combustível Tratores
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono block mt-1">
                  {formatMoney(totalCombFuel, 'MZN')}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Abastecimentos registados
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Disponibilidade Operacional
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    {filteredCombinations.length > 0
                      ? `${Math.round((operationalCombs / filteredCombinations.length) * 100)}%`
                      : '100%'}
                  </span>
                  <span className="text-xs text-slate-500">taxa da frota</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                A carregar dados analíticos dos conjuntos...
              </div>
            ) : filteredCombinations.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-300 rounded-xl p-8">
                <LinkIcon size={32} className="text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">Nenhum conjunto rodoviário encontrado</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Crie associações de Camiões Tratores com Trelas Líder e Seguidoras na Gestão de Conjuntos para visualizar os relatórios consolidados.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCombinations.map((comb) => (
                  <div
                    key={comb.combinationId}
                    className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden"
                  >
                    {/* Header do Conjunto */}
                    <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                          <LinkIcon size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-blue-800">
                              {comb.combinationCode}
                            </span>
                            {comb.aggregated.overallOperationalStatus === 'operational' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={11} />
                                Totalmente Operacional
                              </span>
                            ) : comb.aggregated.overallOperationalStatus === 'impaired' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle size={11} />
                                Parcialmente Afetado (Trela em Manutenção)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle size={11} />
                                Fora de Serviço (Trator Parado)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            Ativo desde {comb.startedAt ? new Date(comb.startedAt).toLocaleDateString('pt-MZ') : 'Registo recente'} · {comb.aggregated.trailersCount} trela(s) acoplada(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">
                            Custo Consolidado
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {formatMoney(comb.aggregated.totalCostMzn, 'MZN')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePrintCombinationReport(comb)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Imprimir Ficha Completa do Conjunto A4"
                        >
                          <Printer size={14} />
                          <span>Imprimir Ficha (A4)</span>
                        </button>
                      </div>
                    </div>

                    {/* Detalhes do Camião Trator e Trelas */}
                    <div className="p-5 space-y-4">
                      
                      {/* Trator */}
                      <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-3.5">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Truck size={14} className="text-blue-700" />
                            Veículo Trator (Cavalo Mecânico)
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            comb.truck.status === 'operational'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {comb.truck.status === 'operational' ? 'Operacional' : 'Em Manutenção'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Tag / Código</span>
                            <span className="font-mono font-semibold text-slate-900">{comb.truck.codeTag}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Equipamento</span>
                            <span className="font-medium text-slate-800 truncate block">{comb.truck.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Quilometragem</span>
                            <span className="font-mono text-slate-900">{comb.truck.currentMeter.toLocaleString('pt-MZ')} km</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Custo Manutenção</span>
                            <span className="font-mono text-slate-900">{formatMoney(comb.truck.maintenanceCostMzn, 'MZN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Custo Combustível</span>
                            <span className="font-mono text-slate-900">{formatMoney(comb.truck.fuelCostMzn, 'MZN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Trelas Associadas com Papel Operacional */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                          Trelas e Reboques Acoplados ({comb.trailers.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {comb.trailers.map((trailer) => (
                            <div
                              key={trailer.id}
                              className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-blue-700">
                                    {trailer.codeTag}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    {trailer.roleLabel}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  trailer.status === 'operational'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {trailer.status === 'operational' ? 'Operacional' : 'Manutenção'}
                                </span>
                              </div>
                              <span className="text-xs text-slate-800 font-medium block truncate">
                                {trailer.name}
                              </span>
                              <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase">OS Abertas</span>
                                  <span className="font-semibold text-slate-900">{trailer.openWorkOrdersCount}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase">OS Concluídas</span>
                                  <span className="font-semibold text-slate-900">{trailer.completedWorkOrdersCount}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase">Custo Trela</span>
                                  <span className="font-mono font-bold text-blue-700">{formatMoney(trailer.maintenanceCostMzn, 'MZN')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VISÃO 2: POR ATIVO INDIVIDUAL
            ======================================================== */}
        {viewMode === 'assets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>A exibir <strong>{filteredAssets.length}</strong> ativos individuais com métricas isoladas</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Filtrar Categoria:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800"
                >
                  <option value="all">Todas</option>
                  <option value="CAT-03">CAT-03 - Veículos Pesados (Camiões)</option>
                  <option value="CAT-06">CAT-06 - Reboques e Semirreboques</option>
                  <option value="CAT-01">CAT-01 - Ligeiros</option>
                  <option value="CAT-02">CAT-02 - Comerciais Ligeiros</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="px-3.5 py-3 font-semibold">Código / Tag</th>
                    <th className="px-3.5 py-3 font-semibold">Equipamento</th>
                    <th className="px-3.5 py-3 font-semibold">Associação Operacional</th>
                    <th className="px-3.5 py-3 font-semibold">Quilometragem / Horímetro</th>
                    <th className="px-3.5 py-3 font-semibold text-center">Estado</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Custo Manutenção</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Custo Combustível</th>
                    <th className="px-3.5 py-3 font-semibold text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((asset) => {
                    const tag = asset.code_tag || asset.codeTag || 'S/N';
                    const meter = Number(asset.current_meter || asset.currentMeter || 0);
                    
                    // Verifica se o ativo está associado a algum conjunto
                    const activeComb = activeCombinations.find((c) => {
                      const truckId = c.truck_id || c.truckId || c.tractor_id;
                      const leaderId = c.leader_trailer_id || c.leaderTrailerId;
                      const followerId = c.follower_trailer_id || c.followerTrailerId;
                      return truckId === asset.id || leaderId === asset.id || followerId === asset.id;
                    });

                    let roleInComb = 'Ativo Individual';
                    if (activeComb) {
                      const combCode = activeComb.combination_code || activeComb.combinationCode || 'CONJ';
                      const truckId = activeComb.truck_id || activeComb.truckId || activeComb.tractor_id;
                      const leaderId = activeComb.leader_trailer_id || activeComb.leaderTrailerId;
                      const followerId = activeComb.follower_trailer_id || activeComb.followerTrailerId;

                      if (truckId === asset.id) {
                        roleInComb = `Trator no ${combCode}`;
                      } else if (leaderId === asset.id) {
                        roleInComb = `Líder (Leader) no ${combCode}`;
                      } else if (followerId === asset.id) {
                        roleInComb = `Seguidora (Follower) no ${combCode}`;
                      }
                    }

                    // Custos do ativo
                    const assetWOs = workOrders.filter((wo) => (wo.asset_id || wo.assetId) === asset.id);
                    const maintCost = assetWOs.reduce((acc, wo) => acc + Number(wo.total_cost_mzn || wo.totalCostMzn || 0), 0);
                    const assetFuels = fuelLogs.filter((fl) => (fl.asset_id || fl.assetId) === asset.id);
                    const fuelCost = assetFuels.reduce((acc, fl) => acc + Number(fl.total_cost_mzn || fl.totalCostMzn || 0), 0);
                    const totalCost = maintCost + fuelCost;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{tag}</td>
                        <td className="px-3.5 py-3">
                          <span className="font-medium text-slate-900 block">{asset.name}</span>
                          <span className="text-[10px] text-slate-500">{asset.brand} {asset.model}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          {activeComb ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <LinkIcon size={10} />
                              {roleInComb}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Desassociado</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-700">
                          {meter > 0 ? `${meter.toLocaleString('pt-MZ')} km` : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            asset.status === 'operational'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {asset.status === 'operational' ? 'Operacional' : 'Manutenção'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-800">
                          {formatMoney(maintCost, 'MZN')}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-800">
                          {fuelCost > 0 ? formatMoney(fuelCost, 'MZN') : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-800">
                          {formatMoney(totalCost, 'MZN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </SecondaryView>
  );
};
