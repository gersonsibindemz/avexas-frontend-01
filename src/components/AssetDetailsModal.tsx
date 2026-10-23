import React, { useState } from 'react';
import { Download, Edit3, X } from 'lucide-react';
import { SecondaryView } from './SecondaryView';
import { exportAssetTechSheetToExcel } from '../utils/excelExport';

interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  formatCategory: (cat: string) => string;
  onEdit: (asset: any) => void;
}

export const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  isOpen,
  onClose,
  asset,
  formatCategory,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  if (!asset) return null;

  const codeTag = asset.code_tag || asset.codeTag || 'SEM-TAG';
  const techSpecs = asset.technical_specs || {};
  const safety = asset.safety_checks || {};

  const tabs = [
    { id: 0, label: '1. Identificação' },
    { id: 1, label: '2. Fabricante' },
    { id: 2, label: '3. Características' },
    { id: 3, label: '4. Medidores' },
    { id: 4, label: '5. Aquisição' },
    { id: 5, label: '6. Manutenção' },
    { id: 6, label: '7. Segurança' },
  ];

  const renderField = (label: string, value: any) => (
    <div className="bg-slate-50/80 p-2.5 rounded border border-slate-200">
      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span className="block text-xs font-medium text-slate-900 break-words">
        {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '—'}
      </span>
    </div>
  );

  return (
    <SecondaryView
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha do Equipamento: ${codeTag}`}
      subtitle={`${asset.name || 'Sem nome'} · ${asset.brand || ''} ${asset.model || ''}`}
      maxWidthClass="max-w-4xl mx-auto"
    >
      <div className="space-y-6 pb-6 text-xs text-slate-800">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            {asset.photo_url ? (
              <img
                src={asset.photo_url}
                alt={codeTag}
                className="w-14 h-14 object-cover rounded-md border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                {codeTag.substring(0, 3)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">{codeTag}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-semibold border border-slate-200">
                  {formatCategory(asset.category)}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-semibold border border-slate-200">
                  {asset.domain === 'plant' ? 'Fábrica' : 'Frota'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">{asset.name || 'Equipamento'}</h2>
              <span className="text-xs text-slate-500">
                Placa/Identificação: <strong>{asset.license_plate || asset.licensePlate || '—'}</strong>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportAssetTechSheetToExcel(asset, formatCategory)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>Baixar Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(asset);
              }}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-t-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[220px]">
          {activeTab === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Código / Tag', codeTag)}
              {renderField('Placa / Identificação', asset.license_plate || asset.licensePlate)}
              {renderField('Nome / Designação', asset.name)}
              {renderField('Categoria / Grupo', formatCategory(asset.category))}
              {renderField('Tipo de Ativo', asset.asset_type || asset.assetType)}
              {renderField('Subtipo / Configuração', asset.asset_subtype || asset.assetSubtype)}
              {renderField('Empresa / Unidade', asset.company)}
              {renderField('Departamento / Área', asset.department)}
              {renderField('Localização / Base', asset.location)}
              {renderField('Centro de Custo', asset.cost_center || asset.costCenter)}
              {renderField('Estado', asset.status)}
              {renderField('Criticidade', asset.criticality_level || asset.criticalityLevel)}
              {renderField('Responsável', asset.responsible)}
              {renderField('Operador / Motorista', asset.operator_driver)}
              {renderField('QR Code', asset.qr_code || asset.qrCode || 'Geração automática')}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Observações Gerais', asset.notes)}
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Fabricante / Marca', asset.brand)}
              {renderField('Modelo / Versão', asset.model)}
              {renderField('Ano de Fabrico', asset.manufacture_year)}
              {renderField('Número de Série', asset.serial_number)}
              {renderField('VIN / Chassis', asset.chassis_vin)}
              {renderField('Número do Motor', asset.engine_number)}
              {renderField('Cor / Configuração', asset.color)}
            </div>
          )}

          {activeTab === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Motorização', techSpecs.engine_type)}
              {renderField('Potência', techSpecs.power || asset.power_kw_kva)}
              {renderField('Combustível / Energia', asset.energy_type || techSpecs.fuel)}
              {renderField('Transmissão', techSpecs.transmission)}
              {renderField('Tração / Eixos', techSpecs.traction || asset.axle_config)}
              {renderField('N.º de Eixos', techSpecs.axles)}
              {renderField('Peso Bruto / Tara', techSpecs.weight_load)}
              {renderField('Carga Útil / Capacidade', techSpecs.payload_capacity)}
              {renderField('Capacidade Tanque (L)', techSpecs.tank_capacity || asset.fuel_tank_capacity_liters)}
              {renderField('Consumo de Referência', techSpecs.consumption)}
              {renderField('Medida dos Pneus', techSpecs.tire_size)}
              {renderField('Dimensões', techSpecs.dimensions)}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Outras Especificações', techSpecs.other_specs)}
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Quilometragem Inicial', asset.initial_km ?? 0)}
              {renderField('Quilometragem Atual', asset.current_km ?? asset.current_meter ?? 0)}
              {renderField('Horímetro Inicial', asset.initial_hour_meter ?? 0)}
              {renderField('Horímetro Atual', asset.current_hour_meter ?? 0)}
              {renderField('Unidade de Medida', asset.measurement_unit || asset.meter_unit || 'Km')}
              {renderField('Última Leitura em', asset.last_reading_date)}
              {renderField('Regime / Turno', asset.shift)}
              {renderField('Horas Operação Previstas', asset.expected_operating_hours)}
              {renderField('Leitura Atual Medidor', asset.current_meter ?? 0)}
              {renderField('Unidade Medidor', asset.meter_unit || 'Km')}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Observações Operacionais', asset.operational_notes)}
              </div>
            </div>
          )}

          {activeTab === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Data de Aquisição', asset.acquisition_date)}
              {renderField('Início de Operação', asset.operation_date)}
              {renderField('Valor de Aquisição', asset.acquisition_value ? `${asset.acquisition_value} ${asset.currency || 'MZN'}` : '—')}
              {renderField('Fornecedor / Vendedor', asset.supplier)}
              {renderField('Garantia Até', asset.warranty_expiry)}
              {renderField('Validade do Seguro', asset.insurance_expiry)}
              {renderField('Próxima Inspeção Periódica', asset.inspection_expiry)}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Outras Licenças / Certificados', asset.licenses_certificates_notes)}
              </div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Plano de Manutenção', asset.maintenance_plan_id || 'Sem plano associado')}
              {renderField('Tipo de Manutenção', asset.maintenance_type)}
              {renderField('Periodicidade / Unidade', asset.maintenance_periodicity)}
              {renderField('Última Manutenção (Data)', asset.last_maintenance_date)}
              {renderField('Última Manutenção (Leitura)', asset.last_maintenance_meter)}
              {renderField('Próxima Manutenção (Data)', asset.next_maintenance_date)}
              {renderField('Próxima Manutenção (Leitura)', asset.next_maintenance_meter)}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Notas de Manutenção', asset.maintenance_notes)}
              </div>
            </div>
          )}

          {activeTab === 6 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {renderField('Extintor / Validade', safety.extinguisher_validity)}
              {renderField('Triângulo / Sinalização', safety.warning_triangle)}
              {renderField('Kit de Primeiros Socorros', safety.first_aid_kit)}
              {renderField('Colete Refletor / EPI', safety.ppe)}
              {renderField('Dispositivos de Segurança', safety.safety_devices)}
              {renderField('Condição Geral', asset.general_condition || safety.general_condition || 'Bom')}
              <div className="sm:col-span-2 md:col-span-3">
                {renderField('Observações de Segurança', safety.safety_observations)}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </SecondaryView>
  );
};
