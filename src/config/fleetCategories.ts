export interface FleetCategory {
  code: string;
  name: string;
  types: string[];
}

export const FLEET_CATEGORIES: FleetCategory[] = [
  {
    code: 'CAT-01',
    name: 'Veículos ligeiros',
    types: ['Sedan', 'Hatchback', 'SUV', 'Jipe', 'Station Wagon']
  },
  {
    code: 'CAT-02',
    name: 'Veículos comerciais ligeiros',
    types: ['Pickup', 'Furgão', 'Carrinha de carga', 'Van']
  },
  {
    code: 'CAT-03',
    name: 'Veículos pesados de mercadorias',
    types: [
      'Camião rígido',
      'Camião basculante',
      'Camião-cisterna',
      'Camião frigorífico',
      'Camião porta-contentores',
      'Camião trator'
    ]
  },
  {
    code: 'CAT-04',
    name: 'Transporte de passageiros',
    types: ['Autocarro', 'Miniautocarro', 'Minibus', 'Autocarro articulado']
  },
  {
    code: 'CAT-05',
    name: 'Motociclos e veículos de duas/três rodas',
    types: ['Motociclo', 'Scooter', 'Triciclo motorizado', 'Quadriciclo']
  },
  {
    code: 'CAT-06',
    name: 'Reboques e semirreboques',
    types: [
      'Trela / semirreboque',
      'Trela',
      'Semirreboque',
      'Reboque',
      'Reboque de carga',
      'Trela plataforma',
      'Porta-contentores',
      'Trela cisterna',
      'Trela basculante',
      'Trela frigorífica',
      'Trela extensível',
      'Trela de transporte de máquinas',
      'Dolly / eixo dolly'
    ]
  },
  {
    code: 'CAT-07',
    name: 'Tratores e máquinas agrícolas',
    types: [
      'Trator agrícola',
      'Colheitadeira',
      'Pulverizador autopropelido',
      'Semeadora autopropelida'
    ]
  },
  {
    code: 'CAT-08',
    name: 'Máquinas de construção civil',
    types: [
      'Escavadora',
      'Retroescavadora',
      'Pá carregadora',
      'Bulldozer',
      'Motoniveladora',
      'Rolo compactador',
      'Dumper articulado'
    ]
  },
  {
    code: 'CAT-09',
    name: 'Equipamentos de movimentação de cargas',
    types: [
      'Empilhadeira',
      'Porta-contentores',
      'Reach Stacker',
      'Transpaleteira motorizada'
    ]
  },
  {
    code: 'CAT-10',
    name: 'Equipamentos de elevação',
    types: [
      'Grua móvel',
      'Camião-grua',
      'Plataforma elevatória',
      'Manipulador telescópico'
    ]
  },
  {
    code: 'CAT-11',
    name: 'Veículos de serviço especial',
    types: [
      'Oficina móvel',
      'Camião de assistência',
      'Veículo de recolha de resíduos',
      'Camião de limpeza'
    ]
  },
  {
    code: 'CAT-12',
    name: 'Veículos de emergência',
    types: [
      'Ambulância',
      'Veículo de combate a incêndios',
      'Veículo de salvamento',
      'Viatura policial'
    ]
  },
  {
    code: 'CAT-13',
    name: 'Veículos elétricos e de mobilidade alternativa',
    types: [
      'Automóvel elétrico',
      'Pickup elétrica',
      'Furgão elétrico',
      'Motociclo elétrico'
    ]
  },
  {
    code: 'CAT-14',
    name: 'Outros equipamentos móveis terrestres',
    types: ['Equipamento móvel especial']
  }
];

// Subtipos gerais para trelas/semirreboques
export const TRAILER_SUBTYPES = [
  'Carga geral',
  'Plataforma',
  'Basculante',
  'Cisterna',
  'Frigorífica',
  'Porta-contentores',
  'Transporte de máquinas',
  'Extensível',
  'Silo',
  'Madeira/toros',
  'Animais',
  'Outro (especificar)'
];

// Subtipos específicos de reboques
export const REBOQUE_SUBTYPES = [
  'Reboque de carga geral',
  'Reboque plataforma',
  'Reboque basculante',
  'Reboque cisterna',
  'Reboque especializado',
  'Outro (especificar)'
];

// Subtipos específicos de dolly
export const DOLLY_SUBTYPES = [
  'Dolly de ligação',
  'Configuração específica definida pela operação',
  'Outro (especificar)'
];

/**
 * Retorna a lista de subtipos aplicáveis conforme a categoria e o tipo de equipamento selecionado.
 */
export const getSubtypesForType = (categoryCode: string, typeName?: string): string[] => {
  if (categoryCode !== 'CAT-06') {
    return [];
  }
  const typeLower = (typeName || '').toLowerCase();
  if (typeLower.includes('dolly')) {
    return DOLLY_SUBTYPES;
  }
  if (typeLower.startsWith('reboque')) {
    return REBOQUE_SUBTYPES;
  }
  return TRAILER_SUBTYPES;
};

export const PLANT_CATEGORIES: FleetCategory[] = [
  {
    code: 'PLANT-01',
    name: 'Geradores de energia',
    types: ['Gerador Diesel Estacionário', 'Gerador Móvel / Reboque', 'Gerador a Gás', 'UPS / No-Break Industrial']
  },
  {
    code: 'PLANT-02',
    name: 'Compressores industriais',
    types: ['Compressor de Parafuso', 'Compressor de Pistão', 'Compressor Centrífugo', 'Secador de Ar Industrial']
  },
  {
    code: 'PLANT-03',
    name: 'Bombas e sistemas de fluidos',
    types: ['Bomba Centrífuga', 'Bomba Submersível', 'Bomba Dosadora', 'Grupo Hidrofor']
  },
  {
    code: 'PLANT-04',
    name: 'Caldeiras e vasos de pressão',
    types: ['Caldeira a Vapor', 'Caldeira de Água Quente', 'Vaso de Pressão / Reservatório', 'Permutador de Calor']
  },
  {
    code: 'PLANT-05',
    name: 'Motores e redutores elétricos',
    types: ['Motor Elétrico Trifásico', 'Motorredutor', 'Variador de Frequência', 'Bancada Eletromecânica']
  },
  {
    code: 'PLANT-06',
    name: 'Transformadores e quadros elétricos',
    types: ['Transformador de Média Tensão', 'Quadro Geral de Baixa Tensão (QGBT)', 'CCM (Centro de Controlo de Motores)', 'Banco de Condensadores']
  },
  {
    code: 'PLANT-07',
    name: 'Linhas de produção e embalamento',
    types: ['Linha de Enchimento / Envase', 'Linha de Embalagem', 'Tapete Transportador Industrial', 'Paletizadora / Envolvedora']
  },
  {
    code: 'PLANT-08',
    name: 'Sistemas de climatização e AVAC',
    types: ['Chiller Industrial', 'Torre de Arrefecimento', 'Câmara Frigorífica', 'Unidade de Tratamento de Ar (UTA)']
  },
  {
    code: 'PLANT-09',
    name: 'Outros equipamentos fabris',
    types: ['Misturador / Agitador', 'Moinho / Triturador', 'Prensa Hidráulica / Mecânica', 'Equipamento Específico']
  }
];

export const isPlantCategoryCode = (code?: string | null): boolean => {
  if (!code) return false;
  return code.startsWith('PLANT-') || ['generator', 'machinery', 'plant_equipment'].includes(code);
};

export const getCleanCategoryName = (categoryCodeOrValue?: string | null): string => {
  if (!categoryCodeOrValue) return '';
  const fleetMatch = FLEET_CATEGORIES.find((c) => c.code === categoryCodeOrValue);
  if (fleetMatch) return fleetMatch.name;
  const plantMatch = PLANT_CATEGORIES.find((c) => c.code === categoryCodeOrValue);
  if (plantMatch) return plantMatch.name;

  const fallbackLabels: Record<string, string> = {
    vehicle_light: 'Veículos ligeiros',
    vehicle_heavy: 'Veículos pesados',
    machinery: 'Máquinas industriais',
    plant_equipment: 'Equipamentos fabris',
    generator: 'Geradores de energia',
    other_equipment: 'Outros equipamentos'
  };

  return fallbackLabels[categoryCodeOrValue] || categoryCodeOrValue;
};

export const getCategoriesForScope = (scope?: string | null): (FleetCategory & { domain: 'fleet' | 'plant' })[] => {
  const fleetList = FLEET_CATEGORIES.map((cat) => ({ ...cat, domain: 'fleet' as const }));
  const plantList = PLANT_CATEGORIES.map((cat) => ({ ...cat, domain: 'plant' as const }));

  if (scope === 'plant') return plantList;
  if (scope === 'fleet') return fleetList;
  return [...fleetList, ...plantList];
};

export const ENERGY_TYPES = ['Diesel', 'Gasolina', 'Elétrico / Bateria', 'Híbrido', 'Gás Natural', 'GPL', 'Solar', 'Outro'];
export const OWNERSHIP_TYPES = ['Próprio', 'Alugado', 'Leasing', 'Cedido'];

// ==============================================
// SINCRONIZAÇÃO DE CATEGORIAS COM O BACKEND
// ==============================================
export const BACKEND_ASSET_CATEGORIES = [
  'vehicle_light',
  'vehicle_heavy',
  'machinery',
  'plant_equipment',
  'generator',
] as const;

export const UI_CATEGORY_TO_BACKEND: Record<string, string> = {
  'CAT-01': 'vehicle_light', // Veículos ligeiros
  'CAT-02': 'vehicle_light', // Veículos comerciais ligeiros
  'CAT-03': 'vehicle_heavy', // Veículos pesados de mercadorias
  'CAT-04': 'vehicle_heavy', // Transporte de passageiros
  'CAT-05': 'vehicle_light', // Motociclos e veículos de duas/três rodas
  'CAT-06': 'vehicle_heavy', // Reboques e semirreboques
  'CAT-07': 'machinery',     // Tratores e máquinas agrícolas
  'CAT-08': 'machinery',     // Máquinas de construção civil
  'CAT-09': 'machinery',     // Equipamentos de movimentação de cargas
  'CAT-10': 'machinery',     // Equipamentos de elevação
  'CAT-11': 'vehicle_heavy', // Veículos de serviço especial
  'CAT-12': 'vehicle_heavy', // Veículos de emergência
  'CAT-13': 'vehicle_light', // Veículos elétricos e de mobilidade alternativa
  'CAT-14': 'machinery',     // Outros equipamentos móveis terrestres
  'PLANT-01': 'generator',        // Geradores de energia
  'PLANT-02': 'plant_equipment', // Compressores industriais
  'PLANT-03': 'plant_equipment', // Bombas e sistemas de fluidos
  'PLANT-04': 'plant_equipment', // Caldeiras e vasos de pressão
  'PLANT-05': 'plant_equipment', // Motores e redutores elétricos
  'PLANT-06': 'plant_equipment', // Transformadores e quadros elétricos
  'PLANT-07': 'machinery',       // Linhas de produção e embalamento
  'PLANT-08': 'plant_equipment', // Sistemas de climatização e AVAC
  'PLANT-09': 'plant_equipment', // Outros equipamentos fabris
};

// Converte a categoria selecionada no formulário para o valor canónico aceite pelo backend.
export const toBackendCategory = (
  category?: string | null,
  domain?: 'fleet' | 'plant',
): string => {
  const value = (category ?? '').trim();
  if (!value) return value;
  if (value === 'other_equipment') {
    return domain === 'plant' ? 'plant_equipment' : 'machinery';
  }
  if ((BACKEND_ASSET_CATEGORIES as readonly string[]).includes(value as any)) return value;
  return UI_CATEGORY_TO_BACKEND[value] ?? value;
};
