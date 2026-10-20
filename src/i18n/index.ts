import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import km from './km.json'
import type { Locale } from '../types'

const STORAGE_KEY = 'stylepos.lang'

// Storage can be blocked (private mode, strict browser shields) - never let that crash the app.
const read = (): Locale | null => { try { return localStorage.getItem(STORAGE_KEY) as Locale | null } catch { return null } }
const saved = read() ?? 'en'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, km: { translation: km } },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = saved

export function setLanguage(lang: Locale) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* storage unavailable */ } // fallback for signed-out users
  document.documentElement.lang = lang
  return i18n.changeLanguage(lang)
}

export default i18n
