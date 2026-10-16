export interface CountryCurrency {
  country: string;
  code: string;
  currency: string;
  currencyName: string;
  symbol: string;
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  { country: 'Moçambique', code: 'MZ', currency: 'MZN', currencyName: 'Metical Moçambicano', symbol: 'MTn' },
  { country: 'África do Sul', code: 'ZA', currency: 'ZAR', currencyName: 'Rand Sul-Africano', symbol: 'R' },
  { country: 'Angola', code: 'AO', currency: 'AOA', currencyName: 'Kwanza Angolano', symbol: 'Kz' },
  { country: 'Zimbabué', code: 'ZW', currency: 'USD', currencyName: 'Dólar Americano', symbol: '$' },
  { country: 'Zâmbia', code: 'ZM', currency: 'ZMW', currencyName: 'Kwacha Zambiano', symbol: 'ZK' },
  { country: 'Tanzânia', code: 'TZ', currency: 'TZS', currencyName: 'Xelim Tanzaniano', symbol: 'TSh' },
  { country: 'Malawi', code: 'MW', currency: 'MWK', currencyName: 'Kwacha Malawiano', symbol: 'MK' },
  { country: 'Botswana', code: 'BW', currency: 'BWP', currencyName: 'Pula de Botswana', symbol: 'P' },
  { country: 'Namíbia', code: 'NA', currency: 'NAD', currencyName: 'Dólar Namibiano', symbol: 'N$' },
  { country: 'Portugal', code: 'PT', currency: 'EUR', currencyName: 'Euro', symbol: '€' },
  { country: 'Brasil', code: 'BR', currency: 'BRL', currencyName: 'Real Brasileiro', symbol: 'R$' },
  { country: 'Emirados Árabes Unidos', code: 'AE', currency: 'AED', currencyName: 'Dirham dos EAU', symbol: 'AED' },
  { country: 'Estados Unidos', code: 'US', currency: 'USD', currencyName: 'Dólar Americano', symbol: '$' }
];

export const ALL_CURRENCIES = [
  { code: 'MZN', label: 'MZN - Metical Moçambicano' },
  { code: 'ZAR', label: 'ZAR - Rand Sul-Africano' },
  { code: 'USD', label: 'USD - Dólar Americano' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'AOA', label: 'AOA - Kwanza Angolano' },
  { code: 'ZMW', label: 'ZMW - Kwacha Zambiano' },
  { code: 'TZS', label: 'TZS - Xelim Tanzaniano' },
  { code: 'BWP', label: 'BWP - Pula de Botswana' }
];

export const formatMoney = (val: number, currency: string = 'MZN') => {
  const num = (val || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${num} ${currency}`;
};
