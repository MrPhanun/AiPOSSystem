import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { api, apiMessage } from '../../lib/api-client'
import { useAuth } from '../auth/AuthContext'
import Badge from '../../components/Badge'
import AddUserDialog from './AddUserDialog'
import type { Paginated, User } from '../../types'

const PER_PAGE = 10

export default function UsersPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()

  const [result, setResult] = useState<Paginated<User> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<User>>('/users', { params: { page, per_page: PER_PAGE, search: query || undefined } })
      setResult(res.data)
      setError(null)
    } catch (err) {
      setError(apiMessage(err, t('common.error')))
    } finally {
      setLoading(false)
    }
  }, [page, query, t])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle(u: User) {
    try {
      await api.patch(`/users/${u.id}/status`, { is_active: !u.is_active })
      await load()
    } catch (err) {
      setError(apiMessage(err, t('common.error')))
    }
  }

  const th = 'label-caps px-4 py-3 text-left'

  return (
    <div className="space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-3xl">{t('users.title')}</h1>
        <button type="button" onClick={() => setShowAdd(true)} className="btn btn-solid">
          <Plus size={14} /> {t('users.add')}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('users.searchPlaceholder')} className="field pl-9" />
      </div>

      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink bg-tile">
            <tr>
              <th className={th}>{t('users.name')}</th>
              <th className={th}>{t('users.email')}</th>
              <th className={th}>{t('users.role')}</th>
              <th className={th}>{t('users.status')}</th>
              <th className={`${th} text-right`}>{t('users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/15">
            {loading && !result && <tr><td colSpan={5} className="px-4 py-10 text-center">{t('common.loading')}</td></tr>}
            {result?.data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center">{t('users.empty')}</td></tr>}
            {result?.data.map((u) => {
              const isMe = u.id === me?.id
              return (
                <tr key={u.id} className={loading ? 'opacity-50' : 'hover:bg-tile/60'}>
                  <td className="px-4 py-3 font-bold">
                    {u.name} {isMe && <span className="mono text-[10px] uppercase">({t('common.you')})</span>}
                  </td>
                  <td className="mono px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'solid' : 'outline'}>{t(`role.${u.role}`)}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={u.is_active ? 'acid' : 'muted'}>{t(u.is_active ? 'status.active' : 'status.inactive')}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" disabled={isMe} onClick={() => void toggle(u)} className={`btn ${u.is_active ? 'btn-danger' : 'btn-ghost'} !px-3 !py-1`}>
                      {t(u.is_active ? 'users.deactivate' : 'users.activate')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="flex items-center justify-between text-sm">
          <span className="mono">{t('common.total', { count: result.meta.total })}</span>
          <div className="flex items-center gap-3">
            <span className="mono">{t('common.page', { current: result.meta.current_page, last: result.meta.last_page })}</span>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-ghost !px-3 !py-1">{t('common.previous')}</button>
            <button type="button" disabled={page >= result.meta.last_page} onClick={() => setPage((p) => p + 1)} className="btn btn-ghost !px-3 !py-1">{t('common.next')}</button>
          </div>
        </div>
      )}

      {showAdd && (
        <AddUserDialog
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            setPage(1)
            void load()
          }}
        />
      )}
    </div>
  )
}
