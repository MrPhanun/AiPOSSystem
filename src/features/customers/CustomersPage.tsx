import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Search } from 'lucide-react'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import { usd } from '../../lib/format'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import type { Customer, Paginated } from '../../types'

export default function CustomersPage() {
  const { t } = useTranslation()
  const [result, setResult] = useState<Paginated<Customer> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<Customer>>('/customers', { params: { page, per_page: 15, search: query || undefined } })
      setResult(res.data); setError(null)
    } catch (err) { setError(apiMessage(err, t('common.error'))) } finally { setLoading(false) }
  }, [page, query, t])
  useEffect(() => { void load() }, [load])

  const th = 'label-caps px-4 py-3 text-left'
  return (
    <div className="space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-3xl">{t('customers.title')}</h1>
        <button type="button" onClick={() => setAdding(true)} className="btn btn-solid"><Plus size={14} /> {t('customers.add')}</button>
      </div>
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('customers.search')} className="field pl-9" />
      </div>
      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}
      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink bg-tile">
            <tr><th className={th}>{t('users.name')}</th><th className={th}>{t('customers.phone')}</th><th className={th}>{t('customers.address')}</th><th className={`${th} text-right`}>{t('customers.orders')}</th><th className={`${th} text-right`}>{t('customers.spent')}</th></tr>
          </thead>
          <tbody className="divide-y divide-ink/15">
            {loading && !result && <tr><td colSpan={5} className="px-4 py-10 text-center">{t('common.loading')}</td></tr>}
            {result?.data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center">{t('customers.empty')}</td></tr>}
            {result?.data.map((c) => (
              <tr key={c.id} className={loading ? 'opacity-50' : 'hover:bg-tile/60'}>
                <td className="px-4 py-3 font-bold">{c.name}</td>
                <td className="mono px-4 py-3">{c.phone ?? '—'}</td>
                <td className="px-4 py-3">{c.address ?? '—'}</td>
                <td className="mono px-4 py-3 text-right">{c.sales_count}</td>
                <td className="mono px-4 py-3 text-right font-bold text-ink">{usd(c.total_spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result && <Pagination meta={result.meta} page={page} onPage={setPage} />}
      {adding && <AddCustomer onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setPage(1); void load() }} />}
    </div>
  )
}

function AddCustomer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErrors({})
    try { await api.post('/customers', { ...f, phone: f.phone || null, email: f.email || null, address: f.address || null }); onSaved() }
    catch (err) { setErrors(apiFieldErrors(err)) } finally { setBusy(false) }
  }
  const err = (k: string) => errors[k]?.[0] && <span className="block text-xs font-semibold text-crimson">{errors[k][0]}</span>

  return (
    <Modal title={t('customers.add')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="label-caps">{t('users.name')}</span><input required className="field mt-1" value={f.name} onChange={set('name')} />{err('name')}</label>
        <label className="block"><span className="label-caps">{t('customers.phone')}</span><input className="field mono mt-1" value={f.phone} onChange={set('phone')} />{err('phone')}</label>
        <label className="block"><span className="label-caps">{t('users.email')}</span><input type="email" className="field mt-1" value={f.email} onChange={set('email')} />{err('email')}</label>
        <label className="block"><span className="label-caps">{t('customers.address')}</span><input className="field mt-1" value={f.address} onChange={set('address')} />{err('address')}</label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="btn btn-solid">{busy && <Loader2 size={13} className="animate-spin" />} {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}
