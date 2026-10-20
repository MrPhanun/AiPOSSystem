import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import { Wordmark } from './Brand'
import type { Role } from '../types'

const NAV: { to: string; key: string; roles: Role[] }[] = [
  { to: '/pos', key: 'nav.pos', roles: ['admin', 'cashier'] },
  { to: '/products', key: 'nav.products', roles: ['admin', 'cashier'] },
  { to: '/sales', key: 'nav.sales', roles: ['admin', 'cashier'] },
  { to: '/customers', key: 'nav.customers', roles: ['admin', 'cashier'] },
  { to: '/admin/inventory', key: 'nav.inventory', roles: ['admin'] },
  { to: '/admin/dashboard', key: 'nav.dashboard', roles: ['admin'] },
  { to: '/admin/users', key: 'nav.users', roles: ['admin'] },
]

export default function AppLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-20 px-3 pt-3">
        <header className="glass flex h-14 items-center gap-2 rounded-full px-3 sm:px-4">
          <Wordmark size={34} />

          <nav className="mx-2 flex items-center gap-1 overflow-x-auto sm:mx-4">
            {NAV.filter((n) => n.roles.includes(user.role)).map(({ to, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    isActive ? 'bg-ink text-paper shadow-md shadow-black/30' : 'text-ink hover:bg-white/70'
                  }`
                }
              >
                {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-bold">{user.name}</div>
              <div className="mono text-[10px] uppercase tracking-[0.15em]">{t(`role.${user.role}`)}</div>
            </div>
            <button type="button" onClick={() => void logout()} className="btn btn-ghost" aria-label={t('nav.logout')}>
              <LogOut size={14} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </header>
      </div>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
