import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { homeFor, useAuth } from './AuthContext'
import { apiStatus } from '../../lib/api-client'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { TigerLogo, Wordmark } from '../../components/Brand'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from ?? homeFor(user.role)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const signedIn = await login(email, password)
      navigate(from ?? homeFor(signedIn.role), { replace: true })
    } catch (err) {
      const status = apiStatus(err)
      setError(status === 429 ? t('login.tooMany') : status === 422 ? t('login.invalid') : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden items-center justify-center border-r border-ink bg-tile md:flex">
        <div className="absolute left-6 top-6 mono text-[11px] uppercase tracking-[0.2em]">HORANGI / STYLEPOS</div>
        <TigerLogo size={360} />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <p className="heading max-w-[14ch] text-3xl leading-[0.95]">{t('app.tagline')}</p>
          <span className="mono text-[11px]">v0.1</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-14">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 md:hidden">
            <Wordmark size={44} />
          </div>

          <h1 className="heading text-4xl">{t('login.title')}</h1>
          <p className="mb-8 mt-2 text-sm text-graphite">{t('login.subtitle')}</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block">
              <span className="label-caps">{t('login.email')}</span>
              <input type="email" required autoComplete="username" className="field mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="label-caps">{t('login.password')}</span>
              <input type="password" required autoComplete="current-password" className="field mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>

            {error && (
              <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-solid w-full py-3">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
