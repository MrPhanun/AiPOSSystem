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
      <header className="flex h-14 shrink-0 items-stretch border-b border-ink bg-paper">
        <div className="flex items-center border-r border-ink px-4">
          <Wordmark size={32} />
        </div>

        <nav className="flex items-stretch overflow-x-auto">
          {NAV.filter((n) => n.roles.includes(user.role)).map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center whitespace-nowrap border-r border-ink px-5 text-xs font-extrabold uppercase tracking-[0.12em] ${
                  isActive ? 'bg-ink text-paper' : 'hover:bg-tile'
                }`
              }
            >
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 px-4">
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

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
