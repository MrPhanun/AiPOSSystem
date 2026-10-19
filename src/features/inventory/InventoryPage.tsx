import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import { dateTime } from '../../lib/format'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import type { Paginated, StockMovement, Variant } from '../../types'

export default function InventoryPage() {
  const { t } = useTranslation()
  const [result, setResult] = useState<Paginated<Variant> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjusting, setAdjusting] = useState<Variant | null>(null)
  const [history, setHistory] = useState<Variant | null>(null)

  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<Variant>>('/variants', { params: { page, per_page: 20, search: query || undefined, low_stock: lowOnly ? 1 : undefined } })
      setResult(res.data); setError(null)
    } catch (err) { setError(apiMessage(err, t('common.error'))) } finally { setLoading(false) }
  }, [page, query, lowOnly, t])
  useEffect(() => { void load() }, [load])

  const th = 'label-caps px-4 py-3 text-left'
  return (
    <div className="space-y-5 p-4 md:p-8">
      <h1 className="heading text-3xl">{t('inventory.title')}</h1>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory.search')} className="field pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1) }} /> {t('inventory.lowOnly')}
        </label>
      </div>
      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink bg-tile">
            <tr>
              <th className={th}>{t('products.name')}</th><th className={th}>SKU</th><th className={th}>{t('products.size')} / {t('products.color')}</th>
              <th className={`${th} text-right`}>{t('products.stock')}</th><th className={th}>{t('users.status')}</th><th className={`${th} text-right`}>{t('users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/15">
            {loading && !result && <tr><td colSpan={6} className="px-4 py-10 text-center">{t('common.loading')}</td></tr>}
            {result?.data.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center">{t('products.empty')}</td></tr>}
            {result?.data.map((v) => {
              const out = v.stock_quantity === 0
              const low = !out && v.stock_quantity <= v.low_stock_threshold
              return (
                <tr key={v.id} className={loading ? 'opacity-50' : 'hover:bg-tile/60'}>
                  <td className="px-4 py-3 font-bold">{v.product_name}</td>
                  <td className="mono px-4 py-3">{v.sku}</td>
                  <td className="px-4 py-3">{v.size} / {v.color}</td>
                  <td className={`mono px-4 py-3 text-right text-base font-bold ${out || low ? 'text-crimson' : 'text-ink'}`}>{v.stock_quantity}</td>
                  <td className="px-4 py-3"><Badge tone={out ? 'alert' : low ? 'alert' : 'acid'}>{out ? t('pos.soldOut') : low ? t('inventory.low') : t('inventory.ok')}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => setAdjusting(v)} className="btn btn-ghost !px-3 !py-1"><SlidersHorizontal size={12} /> {t('inventory.adjust')}</button>
                      <button type="button" onClick={() => setHistory(v)} className="btn btn-ghost !px-3 !py-1" aria-label={t('inventory.history')}><History size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {result && <Pagination meta={result.meta} page={page} onPage={setPage} />}
      {adjusting && <AdjustDialog variant={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); void load() }} />}
      {history && <HistoryDialog variant={history} onClose={() => setHistory(null)} />}
    </div>
  )
}

function AdjustDialog({ variant, onClose, onSaved }: { variant: Variant; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const n = Math.abs(parseInt(qty, 10) || 0)
      await api.post(`/variants/${variant.id}/adjust`, { quantity_change: mode === 'add' ? n : -n, reason })
      onSaved()
    } catch (err) {
      const f = apiFieldErrors(err)
      setError(Object.values(f)[0]?.[0] ?? apiMessage(err, t('common.error')))
    } finally { setBusy(false) }
  }

  return (
    <Modal title={`${t('inventory.adjust')}: ${variant.product_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="mono text-xs">{variant.sku} · {variant.size}/{variant.color} · {t('products.stock')}: <b className="text-ink">{variant.stock_quantity}</b></div>
        <div className="inline-flex overflow-hidden border border-ink">
          {(['add', 'remove'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`px-4 py-1.5 text-xs font-extrabold uppercase ${mode === m ? 'bg-ink text-paper' : 'bg-paper hover:bg-tile'}`}>{t(`inventory.${m}`)}</button>
          ))}
        </div>
        <label className="block"><span className="label-caps">{t('inventory.quantity')}</span>
          <input required type="number" min="1" className="field mono mt-1.5" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
        <label className="block"><span className="label-caps">{t('inventory.reason')}</span>
          <input required className="field mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('inventory.reasonHint')} /></label>
        {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="btn btn-solid">{busy && <Loader2 size={13} className="animate-spin" />} {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

function HistoryDialog({ variant, onClose }: { variant: Variant; onClose: () => void }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<StockMovement[] | null>(null)
  useEffect(() => { api.get<{ data: StockMovement[] }>(`/variants/${variant.id}/movements`).then((r) => setRows(r.data.data)).catch(() => setRows([])) }, [variant.id])

  return (
    <Modal title={`${t('inventory.history')}: ${variant.sku}`} onClose={onClose} wide>
      <div className="panel max-h-[60vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 border-b border-ink bg-tile">
            <tr><th className="label-caps px-3 py-2 text-left">{t('sales.date')}</th><th className="label-caps px-3 py-2 text-left">{t('inventory.type')}</th><th className="label-caps px-3 py-2 text-right">±</th><th className="label-caps px-3 py-2 text-right">{t('products.stock')}</th><th className="label-caps px-3 py-2 text-left">{t('inventory.reason')}</th></tr>
          </thead>
          <tbody className="divide-y divide-ink/15">
            {!rows && <tr><td colSpan={5} className="px-3 py-8 text-center">{t('common.loading')}</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center">{t('products.empty')}</td></tr>}
            {rows?.map((m) => (
              <tr key={m.id}>
                <td className="mono px-3 py-2 text-xs">{dateTime(m.created_at)}</td>
                <td className="px-3 py-2"><Badge>{t(`inventory.types.${m.type}`, m.type)}</Badge></td>
                <td className={`mono px-3 py-2 text-right font-bold ${m.quantity_change < 0 ? 'text-crimson' : 'text-ink'}`}>{m.quantity_change > 0 ? '+' : ''}{m.quantity_change}</td>
                <td className="mono px-3 py-2 text-right">{m.stock_before} → {m.stock_after}</td>
                <td className="px-3 py-2 text-xs">{m.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
