import { useTranslation } from 'react-i18next'
import { useAuth } from '../features/auth/AuthContext'
import { setLanguage } from '../i18n'
import type { Locale } from '../types'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { user, updateLocale } = useAuth()
  const current = (i18n.language as Locale) ?? 'en'

  async function choose(lang: Locale) {
    if (lang === current) return
    if (user) await updateLocale(lang).catch(() => setLanguage(lang))
    else await setLanguage(lang)
  }

  const btn = (lang: Locale, label: string) => (
    <button
      type="button"
      onClick={() => choose(lang)}
      className={`px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${current === lang ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-tile'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-white/80 bg-white/50">
      {btn('en', 'EN')}
      {btn('km', 'ខ្មែរ')}
    </div>
  )
}
