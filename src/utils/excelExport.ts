import * as XLSX from 'xlsx';

export interface AssetExportItem {
  id?: string;
  code_tag?: string;
  codeTag?: string;
  name?: string;
  category?: string;
  license_plate?: string;
  licensePlate?: string;
  brand?: string;
  model?: string;
  manufacture_year?: string | number;
  domain?: string;
  cost_center?: string;
  costCenter?: string;
  department?: string;
  location?: string;
  status?: string;
  criticality_level?: string;
  criticalityLevel?: string;
  current_meter?: string | number;
  currentMeter?: string | number;
  meter_unit?: string;
  measurement_unit?: string;
  responsible?: string;
  operator_driver?: string;
  maintenance_type?: string;
  maintenance_periodicity?: string;
  last_maintenance_date?: string;
  last_maintenance_meter?: string | number;
  next_maintenance_date?: string;
  next_maintenance_meter?: string | number;
  general_condition?: string;
  notes?: string;
  technical_specs?: Record<string, any>;
  safety_checks?: Record<string, any>;
  acquisition_date?: string;
  acquisition_value?: string | number;
  currency?: string;
  supplier?: string;
  warranty_expiry?: string;
  insurance_expiry?: string;
  inspection_expiry?: string;
  [key: string]: any;
}

const formatStatusText = (status?: string): string => {
  switch (status) {
    case 'operational':
      return 'Operacional';
    case 'under_maintenance':
      return 'Em Manutenção';
    case 'breakdown':
      return 'Avariado';
    case 'inactive':
      return 'Inativo';
    case 'decommissioned':
      return 'Abatido';
    default:
      return status || '—';
  }
};

const formatCriticalityText = (level?: string): string => {
  switch (level) {
    case 'A':
      return 'A - Alta';
    case 'B':
      return 'B - Média';
    case 'C':
      return 'C - Baixa';
    default:
      return level || '—';
  }
};

/**
 * Exporta uma lista de ativos para ficheiro Excel (.xlsx)
 */
export const exportAssetsListToExcel = (
  assets: AssetExportItem[],
  fileName: string,
  formatCategoryFn: (cat: string) => string
) => {
  const rows = assets.map((asset) => {
    const codeTag = asset.code_tag || asset.codeTag || '—';
    const plate = asset.license_plate || asset.licensePlate || '—';
    const costCenter = asset.cost_center || asset.costCenter || '—';
    const currentMeter = asset.current_meter ?? asset.currentMeter ?? '—';
    const meterUnit = asset.meter_unit || asset.measurement_unit || 'Km';
    const level = asset.criticality_level || asset.criticalityLevel || 'B';
    const categoryName = formatCategoryFn(asset.category || '');
    const domainLabel = asset.domain === 'plant' ? 'Fábrica' : 'Frota';

    return {
      'Código / Tag': codeTag,
      'Nome / Designação': asset.name || '—',
      'Categoria': categoryName,
      'Placa / Identificação': plate,
      'Marca': asset.brand || '—',
      'Modelo': asset.model || '—',
      'Ano Fabrico': asset.manufacture_year || '—',
      'Âmbito': domainLabel,
      'Centro de Custo': costCenter,
      'Departamento': asset.department || '—',
      'Localização / Base': asset.location || '—',
      'Estado': formatStatusText(asset.status),
      'Criticidade': formatCriticalityText(level),
      'Leitura Atual': currentMeter !== '—' ? Number(currentMeter) : '—',
      'Unidade Medidor': meterUnit,
      'Responsável': asset.responsible || '—',
      'Operador / Motorista': asset.operator_driver || '—',
      'Tipo de Manutenção': asset.maintenance_type || '—',
      'Periodicidade': asset.maintenance_periodicity || '—',
      'Condição Geral': asset.general_condition || asset.safety_checks?.general_condition || '—',
      'Observações': asset.notes || '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajuste automático de largura de colunas
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((row) => String((row as any)[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipamentos');

  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
};

/**
 * Exporta a ficha técnica completa de um equipamento individual para ficheiro Excel (.xlsx)
 */
export const exportAssetTechSheetToExcel = (
  asset: AssetExportItem,
  formatCategoryFn: (cat: string) => string
) => {
  const codeTag = asset.code_tag || asset.codeTag || 'SEM-TAG';
  const techSpecs = asset.technical_specs || {};
  const safety = asset.safety_checks || {};

  const sheetData: (string | number)[][] = [
    ['FICHA TÉCNICA DO EQUIPAMENTO', ''],
    ['Sistema de Gestão de Ativos e Manutenção (CMMS)', ''],
    ['Data de Emissão:', new Date().toLocaleDateString('pt-PT')],
    ['', ''],
    ['1. IDENTIFICAÇÃO E DADOS GERAIS', ''],
    ['Código do Equipamento / Tag', codeTag],
    ['Placa / Identificação', asset.license_plate || asset.licensePlate || '—'],
    ['Nome / Designação', asset.name || '—'],
    ['Categoria / Grupo', formatCategoryFn(asset.category || '')],
    ['Tipo de Ativo', asset.asset_type || asset.assetType || '—'],
    ['Subtipo / Configuração', asset.asset_subtype || asset.assetSubtype || '—'],
    ['Empresa / Unidade', asset.company || '—'],
    ['Departamento / Área', asset.department || '—'],
    ['Localização / Base', asset.location || '—'],
    ['Centro de Custo', asset.cost_center || asset.costCenter || '—'],
    ['Estado Operacional', formatStatusText(asset.status)],
    ['Nível de Criticidade', formatCriticalityText(asset.criticality_level || asset.criticalityLevel)],
    ['Responsável', asset.responsible || '—'],
    ['Operador / Motorista', asset.operator_driver || '—'],
    ['QR Code / Referência', asset.qr_code || asset.qrCode || 'Geração automática'],
    ['Observações Gerais', asset.notes || '—'],
    ['', ''],
    ['2. IDENTIFICAÇÃO DO FABRICANTE', ''],
    ['Fabricante / Marca', asset.brand || '—'],
    ['Modelo / Versão', asset.model || '—'],
    ['Ano de Fabrico', asset.manufacture_year || '—'],
    ['Número de Série', asset.serial_number || '—'],
    ['VIN / Número do Chassis', asset.chassis_vin || '—'],
    ['Número do Motor', asset.engine_number || '—'],
    ['Cor / Configuração', asset.color || '—'],
    ['', ''],
    ['3. CARACTERÍSTICAS TÉCNICAS', ''],
    ['Motorização', techSpecs.engine_type || '—'],
    ['Potência', techSpecs.power || asset.power_kw_kva || '—'],
    ['Combustível / Energia', asset.energy_type || techSpecs.fuel || '—'],
    ['Transmissão', techSpecs.transmission || '—'],
    ['Tração / Configuração de Eixos', techSpecs.traction || asset.axle_config || '—'],
    ['N.º de Eixos', techSpecs.axles || '—'],
    ['Peso Bruto / Tara', techSpecs.weight_load || '—'],
    ['Carga Útil / Capacidade', techSpecs.payload_capacity || '—'],
    ['Capacidade do Tanque (L)', techSpecs.tank_capacity || asset.fuel_tank_capacity_liters || '—'],
    ['Consumo de Referência', techSpecs.consumption || '—'],
    ['Medida dos Pneus', techSpecs.tire_size || '—'],
    ['Dimensão / Configuração', techSpecs.dimensions || '—'],
    ['Outras Especificações', techSpecs.other_specs || '—'],
    ['', ''],
    ['4. OPERAÇÃO E MEDIDORES', ''],
    ['Quilometragem Inicial', asset.initial_km ?? 0],
    ['Quilometragem Atual', asset.current_km ?? asset.current_meter ?? 0],
    ['Horímetro Inicial', asset.initial_hour_meter ?? 0],
    ['Horímetro Atual', asset.current_hour_meter ?? 0],
    ['Unidade de Medida', asset.measurement_unit || asset.meter_unit || 'Km'],
    ['Última Leitura em', asset.last_reading_date || '—'],
    ['Regime / Turno de Operação', asset.shift || '—'],
    ['Horas de Operação Previstas', asset.expected_operating_hours || '—'],
    ['Leitura Atual do Medidor', asset.current_meter || '0'],
    ['Unidade do Medidor', asset.meter_unit || 'Km'],
    ['Observações Operacionais', asset.operational_notes || '—'],
    ['', ''],
    ['5. CONFORMIDADE, AQUISIÇÃO E DOCUMENTOS', ''],
    ['Data de Aquisição', asset.acquisition_date || '—'],
    ['Data de Início de Operação', asset.operation_date || '—'],
    ['Valor de Aquisição', asset.acquisition_value || '—'],
    ['Moeda', asset.currency || 'MZN'],
    ['Fornecedor / Vendedor', asset.supplier || '—'],
    ['Garantia Até', asset.warranty_expiry || '—'],
    ['Validade do Seguro', asset.insurance_expiry || '—'],
    ['Próxima Inspeção Periódica', asset.inspection_expiry || '—'],
    ['Outras Licenças / Certificados', asset.licenses_certificates_notes || '—'],
    ['', ''],
    ['6. MANUTENÇÃO', ''],
    ['Plano de Manutenção Associado', asset.maintenance_plan_id || 'Sem plano associado'],
    ['Tipo de Manutenção', asset.maintenance_type || '—'],
    ['Periodicidade / Unidade', asset.maintenance_periodicity || '—'],
    ['Última Manutenção (Data)', asset.last_maintenance_date || '—'],
    ['Última Manutenção (Leitura)', asset.last_maintenance_meter || '—'],
    ['Próxima Manutenção Prevista', asset.next_maintenance_date || '—'],
    ['Próxima Manutenção (Leitura)', asset.next_maintenance_meter || '—'],
    ['Notas de Manutenção', asset.maintenance_notes || '—'],
    ['', ''],
    ['7. SEGURANÇA E CONDIÇÕES DE UTILIZAÇÃO', ''],
    ['Extintor / Validade', safety.extinguisher_validity || '—'],
    ['Triângulo / Sinalização', safety.warning_triangle || '—'],
    ['Kit de Primeiros Socorros', safety.first_aid_kit || '—'],
    ['Colete Refletor / EPI', safety.ppe || '—'],
    ['Dispositivos de Segurança', safety.safety_devices || '—'],
    ['Condição Geral do Ativo', asset.general_condition || safety.general_condition || 'Bom'],
    ['Estado / Observações de Segurança', safety.safety_observations || '—']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = [{ wch: 36 }, { wch: 55 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ficha Técnica');

  const safeName = (codeTag || asset.name || 'equipamento').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Ficha_Tecnica_${safeName}.xlsx`);
};
