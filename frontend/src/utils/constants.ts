export const MARKETS = [
  { value: 'A_SHARE', label: 'A股', currency: 'CNY', hint: '如 600519, 000858, 300750' },
  { value: 'HK', label: '港股', currency: 'HKD', hint: '如 0700.HK' },
  { value: 'US', label: '美股', currency: 'USD', hint: '如 AAPL' },
  { value: 'FR', label: '法股', currency: 'EUR', hint: '如 MC.PA' },
  { value: 'SE', label: '瑞典股', currency: 'SEK', hint: '如 VOLV-B.ST' },
  { value: 'CN_FUTURES', label: '中国期货', currency: 'CNY', hint: '品种+年月 或 品种+0(主力)' },
] as const

export const CN_FUTURES_PRODUCTS = [
  { code: 'IF', name: '沪深300股指', multiplier: 300 },
  { code: 'IC', name: '中证500股指', multiplier: 200 },
  { code: 'IH', name: '上证50股指', multiplier: 300 },
  { code: 'IM', name: '中证1000股指', multiplier: 200 },
  { code: 'T', name: '10年期国债', multiplier: 10000 },
  { code: 'TF', name: '5年期国债', multiplier: 10000 },
  { code: 'TS', name: '2年期国债', multiplier: 20000 },
]

export const CURRENCIES = ['CNY', 'USD', 'HKD', 'EUR', 'SEK'] as const

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  HKD: 'HK$',
  EUR: '€',
  SEK: 'kr',
}

export const MARKET_COLORS: Record<string, string> = {
  A_SHARE: 'bg-red-500/20 text-red-400',
  A_SHARE_SH: 'bg-red-500/20 text-red-400',
  A_SHARE_SZ: 'bg-red-500/20 text-red-400',
  HK: 'bg-orange-500/20 text-orange-400',
  US: 'bg-blue-500/20 text-blue-400',
  FR: 'bg-indigo-500/20 text-indigo-400',
  SE: 'bg-yellow-500/20 text-yellow-400',
  CN_FUTURES: 'bg-amber-500/20 text-amber-400',
  FUTURES: 'bg-amber-500/20 text-amber-400',
}

export const MARKET_LABELS: Record<string, string> = {
  A_SHARE: 'A股',
  A_SHARE_SH: 'A股',
  A_SHARE_SZ: 'A股',
  HK: '港股',
  US: '美股',
  FR: '法股',
  SE: '瑞典股',
  CN_FUTURES: '中国期货',
  FUTURES: '中国期货',
}
