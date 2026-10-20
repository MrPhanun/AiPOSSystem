import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Shirt } from 'lucide-react'
import { homeFor, useAuth } from './AuthContext'
import { IS_DEMO, apiStatus } from '../../lib/api-client'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { TigerLogo, Wordmark } from '../../components/Brand'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState(IS_DEMO ? 'testing@pos.com' : '')
  const [password, setPassword] = useState(IS_DEMO ? '123456789' : '')
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
    <div className="relative grid min-h-screen overflow-hidden md:grid-cols-2">
      <div className="blob -left-24 top-10 h-80 w-80 bg-black/20" />
      <div className="blob right-0 top-1/3 h-96 w-96 bg-white" style={{ animationDelay: '-4s' }} />
      <div className="blob bottom-0 left-1/3 h-72 w-72 bg-black/25" style={{ animationDelay: '-8s' }} />

      {/* Brand panel */}
      <div className="relative hidden flex-col items-center justify-center p-10 md:flex">
        <div className="absolute left-8 top-8">
          <Wordmark size={40} />
        </div>
        <div className="floaty glass grid h-[26rem] w-[26rem] place-items-center rounded-[3rem]">
          <TigerLogo size={340} />
        </div>
        <p className="heading mt-10 flex max-w-[18ch] flex-col items-center gap-3 text-center text-4xl leading-[1.05]">
          <Shirt size={36} strokeWidth={2.2} />
          {t('app.slogan')}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="absolute right-5 top-5">
          <LanguageSwitcher />
        </div>

        <div className="glass mx-auto w-full max-w-md rounded-[2rem] p-8 sm:p-10">
          <div className="mb-8 md:hidden">
            <Wordmark size={44} />
            <p className="mt-4 flex items-center gap-2 text-sm font-bold"><Shirt size={16} />{t('app.slogan')}</p>
          </div>

          <h1 className="heading text-4xl">{t('login.title')}</h1>
          <p className="mb-8 mt-2 text-sm text-graphite">{t('login.subtitle')}</p>

          {IS_DEMO && (
            <p className="mb-5 rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-xs">
              <b>Demo account</b> · testing@pos.com / 123456789 (pre-filled). Data is saved in your browser only.
            </p>
          )}
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
              <p role="alert" className="rounded-2xl border border-crimson/40 bg-crimson/10 px-4 py-2.5 text-sm font-semibold text-crimson">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-solid w-full py-3.5 text-sm">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
