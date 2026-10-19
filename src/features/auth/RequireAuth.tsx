import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import type { Role } from '../../types'

/**
 * Route guard for UX only. Laravel enforces the real permissions on every endpoint.
 */
export default function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-500">{t('common.loading')}</div>
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />

  return <Outlet />
}
