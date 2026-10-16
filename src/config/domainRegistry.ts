import { useAuth } from '../contexts/AuthContext';

export interface CategoryOption {
  value: string;
  label: string;
}

export interface DomainConfig {
  domain: 'fleet' | 'plant';
  domainLabel: string;
  assetNameSingular: string;
  assetNamePlural: string;
  counterLabel: string;
  counterUnit: string;
  counterShort: string;
  searchPlaceholder: string;
  categories: CategoryOption[];
  complianceDocTypes: CategoryOption[];
  failureCauses: CategoryOption[];
  technicianSpecialties: CategoryOption[];
  partCategories: CategoryOption[];
}

export const COMMON_TECHNICIAN_SPECIALTIES: CategoryOption[] = [
  { value: 'Mecânico Auto', label: 'Mecânico Auto' },
  { value: 'Mecânico Auto Especialista', label: 'Mecânico Auto Especialista' },
  { value: 'Electricista Auto', label: 'Electricista Auto' },
  { value: 'Electricista Auto Especialista', label: 'Electricista Auto Especialista' },
  { value: 'Bate-Chapa', label: 'Bate-Chapa' },
  { value: 'Serralheiro', label: 'Serralheiro' },
  { value: 'Montador de Pneus', label: 'Montador de Pneus' }
];

export const DOMAIN_REGISTRY: Record<'fleet' | 'plant', DomainConfig> = {
  fleet: {
    domain: 'fleet',
    domainLabel: 'Frota',
    assetNameSingular: 'Viatura / Ativo',
    assetNamePlural: 'Ativos e Frotas',
    counterLabel: 'Quilometragem (KM)',
    counterUnit: 'km',
    counterShort: 'Odómetro',
    searchPlaceholder: 'Pesquisar por matrícula, modelo ou código de frota...',
    categories: [
      { value: 'vehicle_light', label: 'Veículo Ligeiro' },
      { value: 'vehicle_heavy', label: 'Veículo Pesado' },
      { value: 'other_equipment', label: 'Outros Equipamentos' }
    ],
    complianceDocTypes: [
      { value: 'inspection_certificate', label: 'Certificado de Inspeção' },
      { value: 'warranty', label: 'Validade da Garantia' },
      { value: 'tech_sheet', label: 'Ficha Técnica da Viatura' },
      { value: 'manual', label: 'Manual do Condutor' }
    ],
    failureCauses: [
      { value: 'engine_overheat', label: 'Sobreaquecimento do Motor' },
      { value: 'brake_failure', label: 'Desgaste / Falha no Sistema de Travagem' },
      { value: 'tire_puncture', label: 'Avaria em Pneu / Roda' },
      { value: 'electrical_fault', label: 'Falha Elétrica / Bateria' },
      { value: 'transmission', label: 'Avaria na Caixa de Velocidades / Embraiagem' },
      { value: 'suspension', label: 'Desgaste na Suspensão' },
      { value: 'preventive_service', label: 'Manutenção Preventiva de Rotina' }
    ],
    technicianSpecialties: COMMON_TECHNICIAN_SPECIALTIES,
    partCategories: [
      { value: 'Filtros & Lubrificantes', label: 'Filtros & Lubrificantes' },
      { value: 'Pneus e Câmaras de Ar', label: 'Pneus e Câmaras de Ar' },
      { value: 'Sistema de Travagem', label: 'Sistema de Travagem' },
      { value: 'Baterias e Iluminação', label: 'Baterias e Iluminação' },
      { value: 'Componentes de Motor Diesel', label: 'Componentes de Motor Diesel' },
      { value: 'Suspensão e Direção', label: 'Suspensão e Direção' }
    ]
  },
  plant: {
    domain: 'plant',
    domainLabel: 'Instalação Fabril',
    assetNameSingular: 'Equipamento Fabril',
    assetNamePlural: 'Equipamentos Fabris',
    counterLabel: 'Horímetro Acumulado (Horas)',
    counterUnit: 'h',
    counterShort: 'Horímetro',
    searchPlaceholder: 'Pesquisar por tag técnica, setor fabril ou modelo...',
    categories: [
      { value: 'generator', label: 'Gerador Industrial' },
      { value: 'machinery', label: 'Maquinaria de Chão de Fábrica' },
      { value: 'other_equipment', label: 'Outros Equipamentos' }
    ],
    complianceDocTypes: [
      { value: 'innoq_calibration', label: 'Certificado de Calibração INNOQ' },
      { value: 'boiler_pressure_test', label: 'Teste de Pressão / Caldeira' },
      { value: 'electrical_diagram', label: 'Diagrama Elétrico / Eschema' },
      { value: 'tech_sheet', label: 'Ficha Técnica do Equipamento' },
      { value: 'manual', label: 'Manual de Operação e Manutenção' }
    ],
    failureCauses: [
      { value: 'electrical_short', label: 'Curto-Circuito / Sobrecarga Elétrica' },
      { value: 'hydraulic_leak', label: 'Fuga de Óleo Hidráulico' },
      { value: 'bearing_overheat', label: 'Aquecimento de Rolamento / Chumaceira' },
      { value: 'vibration_anomaly', label: 'Vibração Anormal em Motor/Bomba' },
      { value: 'pneumatic_pressure', label: 'Perda de Pressão Pneumática' },
      { value: 'calibration_drift', label: 'Desvio de Calibração de Sensores' },
      { value: 'preventive_service', label: 'Manutenção Preventiva de Rotina' }
    ],
    technicianSpecialties: COMMON_TECHNICIAN_SPECIALTIES,
    partCategories: [
      { value: 'Rolamentos e Chumaceiras', label: 'Rolamentos e Chumaceiras' },
      { value: 'Sensores e Instrumentação', label: 'Sensores e Instrumentação' },
      { value: 'Válvulas e Mangueiras Hidráulicas', label: 'Válvulas e Mangueiras Hidráulicas' },
      { value: 'Correias e Engrenagens', label: 'Correias e Engrenagens' },
      { value: 'Componentes Elétricos (Contactores/Relés)', label: 'Componentes Elétricos (Contactores/Relés)' },
      { value: 'Óleos e Graxas Industriais', label: 'Óleos e Graxas Industriais' }
    ]
  }
};

export const useCurrentDomain = (): DomainConfig => {
  const { user } = useAuth();
  const scope = user?.operational_scope || user?.tenant?.operational_scope || user?.tenant?.operationalScope;
  const domain: 'fleet' | 'plant' = scope === 'plant' ? 'plant' : 'fleet';
  return DOMAIN_REGISTRY[domain];
};
