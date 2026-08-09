export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
  { code: 'COP', name: 'Peso colombiano', symbol: '$' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs' },
  { code: 'VES', name: 'Bolívar venezolano', symbol: 'Bs' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$U' },
  { code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲' },
  { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q' },
  { code: 'HNL', name: 'Lempira hondureño', symbol: 'L' },
  { code: 'NIO', name: 'Córdoba nicaragüense', symbol: 'C$' },
  { code: 'CRC', name: 'Colón costarricense', symbol: '₡' },
  { code: 'PAB', name: 'Balboa panameño', symbol: 'B/.' },
  { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
  { code: 'CUP', name: 'Peso cubano', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
]

const RATES_CACHE_KEY = 'fx_rates_v1'
const RATES_TTL_MS = 6 * 60 * 60 * 1000

const RATES_FALLBACK: Record<string, number> = {
  USD: 1, PEN: 3.85, MXN: 17.1, COP: 3960, ARS: 870, CLP: 870, BOB: 6.91, VES: 36.2,
  UYU: 39.1, PYG: 7400, GTQ: 7.78, HNL: 24.65, NIO: 36.7, CRC: 522, PAB: 1, DOP: 59.0,
  CUP: 24, EUR: 0.92, GBP: 0.79,
}

interface FxCache { ts: number; rates: Record<string, number> }

export function getCachedRates(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY)
    if (!raw) return null
    const cache: FxCache = JSON.parse(raw)
    if (!cache?.rates || !cache.ts) return null
    if (Date.now() - cache.ts > RATES_TTL_MS) return null
    return cache.rates
  } catch { return null }
}

export async function fetchRates(force = false): Promise<Record<string, number>> {
  const cached = getCachedRates()
  if (!force && cached) return cached
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data?.result !== 'success' || !data.rates) throw new Error('formato no esperado')
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }))
    return data.rates
  } catch (err) {
    if (getCachedRates()) return getCachedRates()!
    throw new Error(err instanceof Error ? err.message : 'Error al obtener tasas')
  }
}

export function toUsd(amount: number, currency: string, rates: Record<string, number>): number | null {
  const rate = rates[currency]
  if (!rate || rate <= 0) return null
  return amount / rate
}

/** Moneda sugerida según el navegador (es-PE -> PEN, es-MX -> MXN, etc.). */
export function guessCurrencyCode(): string {
  const map: Record<string, string> = {
    'pe': 'PEN', 'mx': 'MXN', 'co': 'COP', 'ar': 'ARS', 'cl': 'CLP', 'bo': 'BOB',
    've': 'VES', 'uy': 'UYU', 'py': 'PYG', 'gt': 'GTQ', 'hn': 'HNL', 'ni': 'NIO',
    'cr': 'CRC', 'pa': 'PAB', 'do': 'DOP', 'cu': 'CUP', 'es': 'EUR', 'gb': 'GBP',
    'us': 'USD',
  }
  let lang = ''
  try { lang = navigator.language || '' } catch { }
  const cc = lang.toLowerCase().split('-')[1]
  if (cc && map[cc]) return map[cc]
  return 'USD'
}

export function fallbackRate(currency: string): number | null {
  if (!RATES_FALLBACK[currency]) return null
  return RATES_FALLBACK[currency]
}