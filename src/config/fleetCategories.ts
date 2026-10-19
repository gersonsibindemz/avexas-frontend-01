export const FLEET_CATEGORIES = [
  {
    code: 'CAT-01', name: 'Veículos ligeiros',
    types: ['Sedan', 'Hatchback', 'SUV', 'Jipe', 'Station Wagon']
  },
  {
    code: 'CAT-02', name: 'Veículos comerciais ligeiros',
    types: ['Pickup', 'Furgão', 'Carrinha de carga', 'Van']
  },
  {
    code: 'CAT-03', name: 'Veículos pesados de mercadorias',
    types: ['Camião rígido', 'Camião basculante', 'Camião-cisterna', 'Camião frigorífico', 'Camião porta-contentores', 'Camião trator']
  },
  {
    code: 'CAT-06', name: 'Reboques e semirreboques',
    types: ['Reboque de carga', 'Trela', 'Semirreboque', 'Trela plataforma', 'Porta-contentores', 'Trela cisterna', 'Trela basculante', 'Trela frigorífica', 'Trela extensível', 'Trela de transporte de máquinas']
  },
  {
    code: 'CAT-07', name: 'Tratores e máquinas agrícolas',
    types: ['Trator agrícola', 'Colheitadeira', 'Pulverizador autopropelido', 'Semeadora autopropelida']
  },
  {
    code: 'CAT-08', name: 'Máquinas de construção civil',
    types: ['Escavadora', 'Retroescavadora', 'Pá carregadora', 'Bulldozer', 'Motoniveladora', 'Rolo compactador', 'Dumper articulado']
  },
  {
    code: 'CAT-09', name: 'Equipamentos de movimentação de cargas',
    types: ['Empilhadeira', 'Porta-contentores', 'Reach Stacker', 'Transpaleteira motorizada']
  },
  {
    code: 'CAT-14', name: 'Outros equipamentos móveis terrestres',
    types: ['Equipamento móvel especial', 'Outro tipo (especificar)']
  }
];

// Subtipos exclusivos para categoria CAT-06 (Trelas/Reboques)
export const TRAILER_SUBTYPES = [
  'Carga geral', 'Plataforma', 'Basculante', 'Cisterna', 'Frigorífica', 'Porta-contentores', 'Transporte de máquinas', 'Extensível', 'Silo', 'Madeira/toros', 'Animais', 'Outro (especificar)'
];

export const ENERGY_TYPES = ['Diesel', 'Gasolina', 'Elétrico', 'Híbrido', 'GPL', 'GNV'];
export const OWNERSHIP_TYPES = ['Próprio', 'Alugado', 'Leasing', 'Cedido'];

// ==============================================
// SINCRONIZAÇÃO DE CATEGORIAS COM O BACKEND
// ==============================================
// O backend (POST/PUT /api/assets) só aceita as categorias canónicas abaixo
// (ver ASSET_CATEGORIES em src/routes/assets.js). Códigos fora dessa lista
// (CAT-06, CAT-07, CAT-08, CAT-09, CAT-14, other_equipment) são rejeitados
// com 400 "Categoria inválida" e o CAT-03 do front (veículos pesados) seria
// convertido em "machinery" pelo backend. Por isso, o envio ao backend é
// sempre feito através de toBackendCategory(), preservando o código fino
// (CAT-xx) apenas na interface (onde alimenta a lista de tipos/subtipos).
export const BACKEND_ASSET_CATEGORIES = [
  'vehicle_light',
  'vehicle_heavy',
  'machinery',
  'plant_equipment',
  'generator',
] as const;

const UI_CATEGORY_TO_BACKEND: Record<string, string> = {
  'CAT-01': 'vehicle_light', // Veículos ligeiros
  'CAT-02': 'vehicle_light', // Veículos comerciais ligeiros
  'CAT-03': 'vehicle_heavy', // Veículos pesados de mercadorias
  'CAT-06': 'vehicle_heavy', // Reboques e semirreboques
  'CAT-07': 'machinery', // Tratores e máquinas agrícolas
  'CAT-08': 'machinery', // Máquinas de construção civil
  'CAT-09': 'machinery', // Equipamentos de movimentação de cargas
  'CAT-14': 'machinery', // Outros equipamentos móveis terrestres
};

// Converte a categoria selecionada no formulário para o valor canónico aceite pelo backend.
// Valores já canónicos (ex.: generator, machinery) são preservados.
export const toBackendCategory = (
  category?: string | null,
  domain?: 'fleet' | 'plant',
): string => {
  const value = (category ?? '').trim();
  if (!value) return value;
  if (value === 'other_equipment') {
    return domain === 'plant' ? 'plant_equipment' : 'machinery';
  }
  if ((BACKEND_ASSET_CATEGORIES as readonly string[]).includes(value)) return value;
  return UI_CATEGORY_TO_BACKEND[value] ?? value;
};
