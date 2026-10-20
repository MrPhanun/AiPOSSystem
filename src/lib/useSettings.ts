import { useEffect, useState } from 'react'
import { api } from './api-client'
import type { Settings } from '../types'

const FALLBACK: Settings = { store_name: 'HORANGI', address: null, phone: null, khr_per_usd: 4000, receipt_footer: 'Thank you!' }
let cache: Settings | null = null

/** Store settings (shop name, KHR rate, receipt footer). Fetched once and shared. */
export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(cache ?? FALLBACK)
  useEffect(() => {
    if (cache) return
    api.get<{ data: Settings }>('/settings').then((r) => {
      cache = r.data.data
      setSettings(cache)
    }).catch(() => undefined)
  }, [])
  return settings
}

export function resetSettingsCache() {
  cache = null
}
