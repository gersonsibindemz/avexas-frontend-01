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
