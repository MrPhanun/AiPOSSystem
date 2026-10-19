import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, homeFor } from '../features/auth/AuthContext'
import { MaskLogo } from '../components/Brand'

function Message({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <MaskLogo size={110} className="mx-auto" />
        <h1 className="heading mt-4 text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-graphite">{text}</p>
        <Link to={user ? homeFor(user.role) : '/login'} className="btn btn-solid mt-6">
          {t('errors.back')}
        </Link>
      </div>
    </div>
  )
}

export function ForbiddenPage() {
  const { t } = useTranslation()
  return <Message title={t('errors.forbiddenTitle')} text={t('errors.forbiddenText')} />
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return <Message title={t('errors.notFoundTitle')} text={t('errors.notFoundText')} />
}
