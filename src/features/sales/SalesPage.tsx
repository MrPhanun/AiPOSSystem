import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Search } from 'lucide-react'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import { dateTime, money } from '../../lib/format'
import { useAuth } from '../auth/AuthContext'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import Receipt from './Receipt'
import type { Paginated, Sale } from '../../types'

const tone = (s: Sale['status']) => (s === 'completed' ? 'acid' : s === 'voided' ? 'alert' : 'muted')

export default function SalesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [result, setResult] = useState<Paginated<Sale> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Sale | null>(null)

  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<Sale>>('/sales', { params: { page, per_page: 15, search: query || undefined, date: date || undefined } })
      setResult(res.data); setError(null)
    } catch (err) { setError(apiMessage(err, t('common.error'))) } finally { setLoading(false) }
  }, [page, query, date, t])
  useEffect(() => { void load() }, [load])

  async function view(id: number) {
    try { setOpen((await api.get<{ data: Sale }>(`/sales/${id}`)).data.data) }
    catch (err) { setError(apiMessage(err, t('common.error'))) }
  }

  const th = 'label-caps px-4 py-3 text-left'
  return (
    <div className="space-y-5 p-4 md:p-8">
      <h1 className="heading text-3xl">{t('sales.title')}</h1>
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('sales.search')} className="field pl-9" />
        </div>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1) }} className="field mono !w-auto" />
        {date && <button type="button" onClick={() => setDate('')} className="btn btn-ghost">{t('common.clear')}</button>}
      </div>
      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink bg-tile">
            <tr>
              <th className={th}>{t('sales.receipt')}</th><th className={th}>{t('sales.date')}</th><th className={th}>{t('sales.customer')}</th>
              {isAdmin && <th className={th}>{t('sales.cashier')}</th>}
              <th className={`${th} text-right`}>{t('sales.items')}</th><th className={`${th} text-right`}>{t('pos.total')}</th><th className={th}>{t('users.status')}</th><th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/15">
            {loading && !result && <tr><td colSpan={8} className="px-4 py-10 text-center">{t('common.loading')}</td></tr>}
            {result?.data.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center">{t('sales.empty')}</td></tr>}
            {result?.data.map((s) => (
              <tr key={s.id} className={loading ? 'opacity-50' : 'hover:bg-tile/60'}>
                <td className="mono px-4 py-3 font-bold text-ink">{s.receipt_number}</td>
                <td className="mono px-4 py-3 text-xs">{dateTime(s.sold_at)}</td>
                <td className="px-4 py-3">{s.customer?.name ?? t('pos.walkIn')}</td>
                {isAdmin && <td className="px-4 py-3">{s.cashier?.name}</td>}
                <td className="mono px-4 py-3 text-right">{s.item_count ?? '—'}</td>
                <td className="mono px-4 py-3 text-right font-bold text-ink">{money(s.total_amount, s.currency, s.exchange_rate)}</td>
                <td className="px-4 py-3"><Badge tone={tone(s.status)}>{t(`sales.status.${s.status}`)}</Badge></td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => void view(s.id)} className="btn btn-ghost !px-3 !py-1"><Eye size={12} /> {t('sales.view')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result && <Pagination meta={result.meta} page={page} onPage={setPage} />}
      {open && <SaleDialog sale={open} isAdmin={isAdmin} onClose={() => setOpen(null)} onChanged={(s) => { setOpen(s); void load() }} />}
    </div>
  )
}

function SaleDialog({ sale, isAdmin, onClose, onChanged }: { sale: Sale; isAdmin: boolean; onClose: () => void; onChanged: (s: Sale) => void }) {
  const { t } = useTranslation()
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function doVoid() {
    setError(null)
    try { onChanged((await api.post<{ data: Sale }>(`/sales/${sale.id}/void`, { reason })).data.data); setVoiding(false) }
    catch (err) { setError(Object.values(apiFieldErrors(err))[0]?.[0] ?? apiMessage(err, t('common.error'))) }
  }

  return (
    <Modal title={sale.receipt_number} onClose={onClose}>
      <Receipt sale={sale} />
      {isAdmin && sale.status === 'completed' && (
        <div className="no-print mt-5 border-t border-ink pt-4">
          {!voiding ? (
            <button type="button" onClick={() => setVoiding(true)} className="btn btn-danger w-full">{t('sales.void')}</button>
          ) : (
            <div className="space-y-2">
              <input autoFocus className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('sales.voidReason')} />
              {error && <p role="alert" className="text-xs font-semibold text-crimson">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setVoiding(false)} className="btn btn-ghost">{t('common.cancel')}</button>
                <button type="button" disabled={!reason.trim()} onClick={() => void doVoid()} className="btn btn-danger">{t('sales.voidConfirm')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
