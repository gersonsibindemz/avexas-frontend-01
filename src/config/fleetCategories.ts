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
    types: ['Equipamento móvel especial', 'Outro tipo (especificar)']
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

export const ENERGY_TYPES = ['Diesel', 'Gasolina', 'Elétrico', 'Híbrido', 'GPL', 'GNV'];
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
