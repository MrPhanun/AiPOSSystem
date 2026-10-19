import type { Currency } from '../types'

/** Prices are stored in USD. KHR is shown rounded to the nearest 100 riel. */
export function money(usd: number, currency: Currency, khrPerUsd: number): string {
  if (currency === 'USD') return `$${usd.toFixed(2)}`
  const khr = Math.round((usd * khrPerUsd) / 100) * 100
  return `៛${khr.toLocaleString('en-US')}`
}

export function usd(n: number): string {
  return `$${n.toFixed(2)}`
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export function shortDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}
