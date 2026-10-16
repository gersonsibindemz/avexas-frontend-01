import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentDomain } from '../config/domainRegistry';
import {
  Plus,
  Layers,
  Search,
  X,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
  MapPin,
  TrendingUp,
  DollarSign,
  ArrowRightLeft,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';

interface Part {
  id: string;
  oem_reference?: string;
  oemReference?: string;
  part_number?: string;
  name: string;
  category: 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'lubricants' | 'tires_wheels' | 'other' | string;
  location?: string;
  warehouse_location?: string;
  warehouseLocation?: string;
  current_stock?: number;
  currentStock?: number;
  min_stock?: number;
  minStock?: number;
  unit_cost?: number;
  unitCost?: number;
  created_at?: string;
}

export const InventoryPage: React.FC = () => {
  const { user, isTenantAdmin, isSupervisor } = useAuth();
  const { partCategories } = useCurrentDomain();
  
  // Lista de Peças e Estados de Carregamento
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Modais
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partModalMode, setPartModalMode] = useState<'create' | 'edit'>('create');
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockPart, setSelectedStockPart] = useState<Part | null>(null);
  const [stockActionType, setStockActionType] = useState<'input' | 'output'>('input'); // input = Entrada, output = Saída
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [stockUnitCost, setStockUnitCost] = useState<number | ''>('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);

  // Formulário de Nova Peça
  const [formOemReference, setFormOemReference] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(partCategories[0]?.value || 'mechanical');
  const [formWarehouseLocation, setFormWarehouseLocation] = useState('');
  const [formCurrentStock, setFormCurrentStock] = useState<number | ''>('');
  const [formMinStock, setFormMinStock] = useState<number | ''>('');
  const [formUnitCost, setFormUnitCost] = useState<number | ''>('');
  const [submittingPart, setSubmittingPart] = useState(false);

  // Carregar Peças (Requisito 6.2)
  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/parts');
      setParts(response.data.parts || response.data || []);
    } catch (err: any) {
      console.error('Erro ao obter inventário:', err);
      setError('Falha ao comunicar com o servidor de inventário.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Submissão de Cadastro / Edição de Peça (Requisito 6.3)
  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOemReference.trim() || !formName.trim() || formCurrentStock === '' || formMinStock === '' || formUnitCost === '') {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmittingPart(true);
    const payload = {
      oem_reference: formOemReference,
      name: formName,
      category: formCategory,
      warehouse_location: formWarehouseLocation || 'Geral',
      current_stock: Number(formCurrentStock),
      min_stock: Number(formMinStock),
      unit_cost: Number(formUnitCost),
    };

    try {
      if (partModalMode === 'create') {
        await api.post('/parts', payload);
        setSuccessMessage('Nova peça adicionada com sucesso ao inventário!');
      } else {
        await api.put(`/parts/${editingPartId}`, payload);
        setSuccessMessage('Dados da peça atualizados com sucesso!');
      }

      setIsPartModalOpen(false);
      resetPartForm();
      await fetchInventory(); // Recarrega do banco real
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao guardar peça:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao guardar dados da peça.');
    } finally {
      setSubmittingPart(false);
    }
  };

  const resetPartForm = () => {
    setFormOemReference('');
    setFormName('');
    setFormCategory('mechanical');
    setFormWarehouseLocation('');
    setFormCurrentStock('');
    setFormMinStock('');
    setFormUnitCost('');
    setEditingPartId(null);
  };

  const handleOpenCreateModal = () => {
    resetPartForm();
    setPartModalMode('create');
    setIsPartModalOpen(true);
  };

  const handleOpenEditModal = (part: Part) => {
    setPartModalMode('edit');
    setEditingPartId(part.id);
    setFormOemReference(part.part_number || part.oem_reference || part.oemReference || '');
    setFormName(part.name || '');
    setFormCategory(part.category || 'mechanical');
    setFormWarehouseLocation(part.location || part.warehouse_location || part.warehouseLocation || '');
    setFormCurrentStock(part.current_stock ?? part.currentStock ?? 0);
    setFormMinStock(part.min_stock ?? part.minStock ?? 0);
    setFormUnitCost(part.unit_cost ?? part.unitCost ?? 0);
    setIsPartModalOpen(true);
  };

  // Processar Entrada ou Saída de Material (Repor Stock)
  const handleStockUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockPart || stockQuantity === '') return;

    const qty = Number(stockQuantity);
    const newCost = stockUnitCost !== '' ? Number(stockUnitCost) : (selectedStockPart.unit_cost ?? selectedStockPart.unitCost ?? 0);
    
    // Validar saída
    if (stockActionType === 'output' && qty > (selectedStockPart.current_stock ?? selectedStockPart.currentStock ?? 0)) {
      alert('Quantidade de saída excede o stock disponível atualmente.');
      return;
    }

    setSubmittingPart(true);
    const quantityDelta = stockActionType === 'input' ? qty : -qty;
    const finalStock = (selectedStockPart.current_stock ?? selectedStockPart.currentStock ?? 0) + quantityDelta;

    try {
      if (stockActionType === 'input') {
        try {
          // POST /parts/:id/restock
          await api.post(`/parts/${selectedStockPart.id}/restock`, {
            quantity: qty,
            unitCost: newCost,
            unit_cost: newCost
          });
        } catch (apiErr) {
          // Fallback robusto direto PATCH
          await api.patch(`/parts/${selectedStockPart.id}`, {
            current_stock: finalStock,
            unit_cost: newCost
          });
        }
      } else {
        try {
          // POST /parts/:id/withdraw
          await api.post(`/parts/${selectedStockPart.id}/withdraw`, {
            quantity: qty
          });
        } catch (apiErr) {
          // Fallback robusto direto PATCH
          await api.patch(`/parts/${selectedStockPart.id}`, {
            current_stock: finalStock
          });
        }
      }

      setSuccessMessage(
        stockActionType === 'input'
          ? `Adicionadas ${qty} unidades de "${selectedStockPart.name}" ao inventário.`
          : `Retiradas ${qty} unidades de "${selectedStockPart.name}" do inventário.`
      );
      
      setIsStockModalOpen(false);
      setSelectedStockPart(null);
      setStockQuantity('');
      setStockUnitCost('');
      await fetchInventory(); // recarrega a lista diretamente do banco de dados
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar stock:', err);
      alert(err.response?.data?.message || err.message || 'Erro ao processar movimentação.');
    } finally {
      setSubmittingPart(false);
    }
  };

  const handleOpenStockModal = (part: Part, type: 'input' | 'output' = 'input') => {
    setSelectedStockPart(part);
    setStockActionType(type);
    setStockQuantity('');
    setStockUnitCost(part.unit_cost ?? part.unitCost ?? '');
    setIsStockModalOpen(true);
  };

  // Excluir Peça (Soft Delete)
  const handleDeletePartConfirm = async () => {
    if (!deletingPart) return;

    try {
      try {
        await api.delete(`/parts/${deletingPart.id}`);
      } catch (err) {
        // Fallback para delete alternativo
        await api.delete(`/inventory/${deletingPart.id}`);
      }

      setSuccessMessage(`Peça "${deletingPart.name}" eliminada do inventário.`);
      setIsDeleteModalOpen(false);
      setDeletingPart(null);
      await fetchInventory(); // Recarrega do banco real
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao eliminar peça:', err);
      alert('Não foi possível eliminar a peça.');
    }
  };

  // Auxiliares de Formatação
  const formatMZN = (val?: number) => {
    const value = val ?? 0;
    return `${value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
  };

  const getCategoryLabel = (cat: string) => {
    const found = partCategories.find(c => c.value === cat);
    if (found) return found.label;
    return cat;
  };

  // Cálculos de Indicadores Rápidos
  const totalItems = parts.length;
  const lowStockItems = parts.filter(p => Number(p.current_stock ?? p.currentStock ?? 0) <= Number(p.min_stock ?? p.minStock ?? 0)).length;
  const totalValue = parts.reduce((acc, p) => acc + (Number(p.current_stock ?? p.currentStock ?? 0) * Number(p.unit_cost ?? p.unitCost ?? 0)), 0);

  // Filtragem
  const filteredParts = parts.filter(p => {
    const name = (p.name || '').toLowerCase();
    const ref = (p.part_number || p.oem_reference || p.oemReference || '').toLowerCase();
    const loc = (p.location || p.warehouse_location || p.warehouseLocation || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = name.includes(query) || ref.includes(query) || loc.includes(query);
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStatus = true;
    if (stockStatusFilter === 'low') {
      matchesStatus = Number(p.current_stock ?? p.currentStock ?? 0) <= Number(p.min_stock ?? p.minStock ?? 0);
    } else if (stockStatusFilter === 'available') {
      matchesStatus = Number(p.current_stock ?? p.currentStock ?? 0) > 0;
    } else if (stockStatusFilter === 'out_of_stock') {
      matchesStatus = Number(p.current_stock ?? p.currentStock ?? 0) === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Apenas admins e supervisores podem aceder
  if (!isTenantAdmin && !isSupervisor) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center max-w-md mx-auto my-12 shadow-none">
        <div className="w-16 h-16 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito</h3>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          O módulo de Inventário e Armazém é acessível apenas a Administradores da Empresa e Supervisores de Manutenção.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-md shadow-lg max-w-md flex gap-3 items-start animate-bounce">
          <CheckCircle2 className="text-blue-700 shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block text-sm text-slate-900">Gestão de Peças</span>
            <span className="text-xs text-slate-600">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Gestão de Inventário</span>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Controle de stocks de peças sobressalentes, rastreabilidade de consumíveis e alertas de rotura em Moçambique.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md transition-all cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-medium py-2.5 px-4 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-none"
          >
            <Plus size={16} />
            <span>Nova Peça</span>
          </button>
        </div>
      </div>

      {/* Indicadores Rápidos (Requisito 1.1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center gap-4 shadow-none">
          <div className="w-11 h-11 bg-slate-100 text-slate-700 border border-slate-200 rounded-md flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Total de Itens</span>
            <span className="text-xl font-bold text-slate-900 block mt-0.5">{totalItems}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center gap-4 shadow-none">
          <div className="w-11 h-11 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className={lowStockItems > 0 ? "animate-pulse text-red-600" : ""} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Itens Abaixo do Mínimo (Alerta)</span>
            <span className={`text-xl font-bold block mt-0.5 ${lowStockItems > 0 ? "text-red-700" : "text-slate-900"}`}>
              {lowStockItems}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center gap-4 shadow-none">
          <div className="w-11 h-11 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Valor Total Imobilizado</span>
            <span className="text-lg font-bold text-blue-700 block mt-0.5">{formatMZN(totalValue)}</span>
          </div>
        </div>

      </div>

      {/* Caixa de Busca e Filtros */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row gap-3 shadow-none">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por OEM/Referência, nome da peça ou localização no armazém..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {partCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-2 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Todos os Stocks</option>
            <option value="low">Abaixo do Mínimo</option>
            <option value="available">Disponível em Stock</option>
            <option value="out_of_stock">Esgotado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Peças (Requisito 1.2) */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-none">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center py-2">
                <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package size={36} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma peça encontrada</h3>
            <p className="text-slate-500 text-xs mt-1">Registe novas peças sobressalentes para o armazém.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] bg-slate-50">
                  <th className="py-3 px-4">Referência / OEM</th>
                  <th className="py-3 px-4">Nome da Peça / Artigo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4 text-center">Stock Atual</th>
                  <th className="py-3 px-4 text-right">Custo Unitário</th>
                  <th className="py-3 px-4 text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.map((part) => {
                  const oemRef = part.part_number || part.oem_reference || part.oemReference || 'S/N';
                  const loc = part.location || part.warehouse_location || part.warehouseLocation || 'Geral';
                  const currentStock = Number(part.current_stock ?? part.currentStock ?? 0);
                  const minStock = Number(part.min_stock ?? part.minStock ?? 0);
                  const unitCost = Number(part.unit_cost ?? part.unitCost ?? 0);
                  const isLowStock = currentStock <= minStock;
                  
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                        {oemRef}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-900 font-medium block">{part.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {getCategoryLabel(part.category)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{loc}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle size={10} className="animate-pulse" />
                            <span>{currentStock} un (Min: {minStock})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {currentStock} un
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-bold">
                        {formatMZN(unitCost)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Botão Ação Rápida: Repor Stock */}
                          <button
                            onClick={() => handleOpenStockModal(part, 'input')}
                            className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md text-[10px] flex items-center gap-0.5 transition-all shadow-none cursor-pointer"
                            title="Entrada de Material / Repor"
                          >
                            <Plus size={10} />
                            <span>Repor</span>
                          </button>

                          <button
                            onClick={() => handleOpenStockModal(part, 'output')}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md text-[10px] flex items-center gap-0.5 transition-all border border-slate-300"
                            title="Dar Saída para Serviço"
                          >
                            <span>Retirar</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(part)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                            title="Editar Peça"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => {
                              setDeletingPart(part);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                            title="Eliminar Artigo"
                          >
                            <Trash2 size={13} />
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

      {/* ==========================================
          MODAL: CADASTRAR OU EDITAR PEÇA
          ========================================== */}
      {isPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Package className="text-blue-700" size={18} />
                <h2 className="text-base font-bold text-slate-900">
                  {partModalMode === 'create' ? 'Cadastrar Peça de Reposição' : 'Editar Ficha da Peça'}
                </h2>
              </div>
              <button
                onClick={() => setIsPartModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePart} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Referência / OEM *</label>
                  <input
                    type="text"
                    required
                    value={formOemReference}
                    onChange={(e) => setFormOemReference(e.target.value)}
                    placeholder="ex: FIL-LF16015"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 uppercase focus:outline-none font-mono placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Categoria *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-2 py-1.5 text-xs text-slate-900 cursor-pointer focus:outline-none"
                  >
                    {partCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Nome Completo da Peça / Descrição Técnica *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Filtro de Combustível Secundário Cat"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Localização no Armazém *</label>
                <input
                  type="text"
                  required
                  value={formWarehouseLocation}
                  onChange={(e) => setFormWarehouseLocation(e.target.value)}
                  placeholder="ex: Prateleira B2, Gaveta 3"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    disabled={partModalMode === 'edit'}
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 10"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Stock Mínimo *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="ex: 3"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Custo Unitário *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="MZN"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPartModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPart}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md transition-all flex items-center gap-1 disabled:opacity-50 shadow-none"
                >
                  {submittingPart ? <Loader2 size={13} className="animate-spin" /> : <span>Guardar Peça</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ENTRADA / SAÍDA RÁPIDA DE STOCK (REPOR STOCK)
          ========================================== */}
      {isStockModalOpen && selectedStockPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl overflow-hidden animate-slide-up">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-blue-700" size={18} />
                <span className="font-bold text-sm text-slate-900">
                  {stockActionType === 'input' ? 'Entrada de Material' : 'Saída para Consumo'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsStockModalOpen(false);
                  setSelectedStockPart(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-xs space-y-1 text-slate-600">
                <div><span className="font-semibold text-slate-700">Peça:</span> <span className="text-slate-900 font-bold">{selectedStockPart.name}</span></div>
                <div><span className="font-semibold text-slate-700">OEM / Ref:</span> <span className="font-mono text-blue-700 font-bold">{selectedStockPart.part_number || selectedStockPart.oem_reference || selectedStockPart.oemReference || 'S/N'}</span></div>
                <div><span className="font-semibold text-slate-700">Localização:</span> <span className="text-slate-800">{selectedStockPart.location || selectedStockPart.warehouse_location || selectedStockPart.warehouseLocation || 'Geral'}</span></div>
                <div><span className="font-semibold text-slate-700">Stock Disponível:</span> <span className="text-slate-900 font-bold">{selectedStockPart.current_stock ?? selectedStockPart.currentStock ?? 0} un</span></div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Operação Técnica</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockActionType('input')}
                    className={`py-2 text-xs font-medium rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      stockActionType === 'input'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownToLine size={13} />
                    <span>Entrada (Aumento)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockActionType('output')}
                    className={`py-2 text-xs font-medium rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      stockActionType === 'output'
                        ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpFromLine size={13} />
                    <span>Saída (Consumo)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Quantidade *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="unidades"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1.5 uppercase">Novo Custo / Uni (MZN) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stockUnitCost}
                    onChange={(e) => setStockUnitCost(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="MZN"
                    className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsStockModalOpen(false);
                    setSelectedStockPart(null);
                  }}
                  className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingPart || stockQuantity === ''}
                  className={`px-4 py-1.5 text-white text-xs font-medium rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-none ${
                    stockActionType === 'input' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submittingPart ? <Loader2 size={13} className="animate-spin" /> : <span>Confirmar</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMAR ELIMINAÇÃO
          ========================================== */}
      {isDeleteModalOpen && deletingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md shadow-xl p-6 space-y-4 animate-slide-up">
            <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-md flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Eliminar Artigo do Inventário</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Tem a certeza que deseja eliminar a peça <span className="font-bold text-slate-900 font-mono">{deletingPart.part_number || deletingPart.oem_reference || deletingPart.oemReference || 'S/N'}</span> - <span className="font-bold text-slate-900">{deletingPart.name}</span>?
                Esta ação apagará as informações do armazém de forma irreversível.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingPart(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePartConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-medium rounded-md transition-all shadow-none"
              >
                Confirmar Eliminação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryPage;
