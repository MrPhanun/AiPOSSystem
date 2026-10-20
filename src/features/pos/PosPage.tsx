import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, Search, UserRound, X } from 'lucide-react'
import { api, apiMessage } from '../../lib/api-client'
import { money } from '../../lib/format'
import { useSettings } from '../../lib/useSettings'
import ProductImage from '../../components/ProductImage'
import Modal from '../../components/Modal'
import Receipt from '../sales/Receipt'
import CustomerDisplay from './CustomerDisplay'
import VariantPicker from './VariantPicker'
import type { Category, Currency, Customer, Paginated, PaymentMethod, Sale, Variant } from '../../types'

export default function PosPage() {
  const { t } = useTranslation()
  const settings = useSettings()
  const rate = settings.khr_per_usd

  const [variants, setVariants] = useState<Variant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<number | 'all'>('all')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [currency, setCurrency] = useState<Currency>('USD')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [discount, setDiscount] = useState('')
  const [paying, setPaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [receipt, setReceipt] = useState<Sale | null>(null)
  const [pickId, setPickId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [v, c, cu] = await Promise.all([
        api.get<{ data: Variant[] }>('/variants', { params: { per_page: 500, sellable: 1 } }),
        api.get<{ data: Category[] }>('/categories'),
        api.get<Paginated<Customer>>('/customers', { params: { per_page: 100 } }),
      ])
      setVariants(v.data.data)
      setCategories(c.data.data)
      setCustomers(cu.data.data)
      setLoadError(null)
    } catch (err) {
      setLoadError(apiMessage(err, t('common.error')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return variants.filter(
      (i) => (category === 'all' || i.category_id === category) &&
        (!q || `${i.product_name} ${i.size} ${i.color} ${i.sku} ${i.barcode ?? ''}`.toLowerCase().includes(q)),
    )
  }, [variants, search, category])

  // One card per product. Colours and sizes are chosen in the picker.
  const products = useMemo(() => {
    const map = new Map<number, Variant[]>()
    for (const v of items) map.set(v.product_id, [...(map.get(v.product_id) ?? []), v])
    return [...map.entries()].map(([id, vs]) => {
      const all = variants.filter((v) => v.product_id === id)
      const prices = all.map((v) => v.selling_price)
      return {
        id, first: all[0], all,
        stock: all.reduce((n, v) => n + v.stock_quantity, 0),
        inCart: all.reduce((n, v) => n + (cart[v.id] ?? 0), 0),
        min: Math.min(...prices), max: Math.max(...prices),
        matched: vs.length,
      }
    })
  }, [items, variants, cart])

  const lines = useMemo(() => variants.filter((v) => cart[v.id]).map((v) => ({ item: v, qty: cart[v.id] })), [variants, cart])
  const itemCount = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = lines.reduce((s, l) => s + l.item.selling_price * l.qty, 0)
  const discountNum = Math.min(Math.max(parseFloat(discount) || 0, 0), subtotal)
  const total = Math.round((subtotal - discountNum) * 100) / 100
  const other: Currency = currency === 'USD' ? 'KHR' : 'USD'
  const fmt = (n: number, c: Currency = currency) => money(n, c, rate)

  function change(item: Variant, delta: number) {
    setCart((c) => {
      const qty = Math.min(item.stock_quantity, (c[item.id] ?? 0) + delta) // never exceed stock
      const next = { ...c }
      if (qty <= 0) delete next[item.id]
      else next[item.id] = qty
      return next
    })
  }

  // Barcode scanners type the code then press Enter.
  function onSearchEnter() {
    const q = search.trim().toLowerCase()
    const exact = variants.find((i) => i.sku.toLowerCase() === q || (i.barcode ?? '').toLowerCase() === q)
    const target = exact ?? (items.length === 1 ? items[0] : undefined)
    if (target && target.stock_quantity > 0) {
      change(target, 1)
      setSearch('')
    }
  }

  async function confirmPayment() {
    setBusy(true)
    setPayError(null)
    try {
      const res = await api.post<{ data: Sale }>('/sales', {
        items: lines.map((l) => ({ variant_id: l.item.id, quantity: l.qty })),
        customer_id: customerId || null,
        currency,
        payment_method: method,
        discount_amount: discountNum,
        idempotency_key: idemKey,
      })
      setReceipt(res.data.data)
      setPaying(false)
      setCart({})
      setDiscount('')
      setCustomerId('')
      setIdemKey(crypto.randomUUID())
      void load() // refresh stock
    } catch (err) {
      setPayError(apiMessage(err, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 p-3 md:h-[calc(100vh-5rem)] md:grid-cols-[1fr_400px]">
        {/* ───────── Catalog ───────── */}
        <section className="glass flex min-h-0 flex-col overflow-hidden rounded-[2rem]">
          <div className="relative p-4 pb-2">
            <Search size={16} className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 mt-1" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
              placeholder={t('pos.search')}
              className="field mono !rounded-full !py-3.5 !pl-12 !pr-5"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 py-2">
            {([{ id: 'all' as const, name: t('pos.all') }, ...categories]).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`whitespace-nowrap rounded-full border border-white/80 px-5 py-2 text-xs font-bold transition-all ${category === c.id ? 'bg-ink text-paper shadow-md shadow-black/25' : 'bg-white/50 hover:bg-white/90'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-10 text-center text-sm">{t('common.loading')}</p>
            ) : loadError ? (
              <p role="alert" className="m-4 border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{loadError}</p>
            ) : items.length === 0 ? (
              <p className="p-10 text-center text-sm">{t('pos.noResults')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => {
                  const out = p.stock === 0
                  const colorCount = new Set(p.all.map((v) => v.color)).size
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => (p.all.length === 1 ? change(p.all[0], 1) : setPickId(p.id))}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/60 p-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl hover:shadow-black/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <ProductImage url={p.first.image_url} alt={p.first.product_name} className="aspect-[4/3] w-full rounded-2xl" />
                      <div className="px-2 pb-2 pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="mono text-[10px] uppercase tracking-wider">{p.first.category_name}</span>
                          <span className={`mono text-[10px] font-bold uppercase ${out ? 'text-crimson' : ''}`}>
                            {out ? t('pos.soldOut') : t('pos.inStock', { count: p.stock })}
                          </span>
                        </div>
                        <div className="heading mt-1 text-[13px] leading-tight">{p.first.product_name}</div>
                        {p.all.length > 1 && (
                          <div className="mono mt-1 text-[11px]">{t('pos.colors', { count: colorCount })} · {t('pos.options', { count: p.all.length })}</div>
                        )}
                        <div className="mono mt-2 text-lg font-bold text-ink">
                          {p.min === p.max ? fmt(p.min) : `${fmt(p.min)}+`}
                        </div>
                      </div>
                      {p.inCart > 0 && (
                        <span className="mono absolute right-4 top-4 rounded-full border border-black bg-acid px-2.5 py-0.5 text-xs font-bold text-ink">×{p.inCart}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ───────── Cart ───────── */}
        <aside className="glass flex min-h-[420px] flex-col overflow-hidden rounded-[2rem] md:min-h-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="heading text-xl">{t('pos.cart')} <span className="mono text-sm font-normal">({itemCount})</span></h2>
            <div className="inline-flex overflow-hidden rounded-full border border-white/80 bg-white/50 p-0.5">
              {(['USD', 'KHR'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCurrency(c)} className={`mono rounded-full px-3 py-1 text-[11px] font-bold transition ${currency === c ? '!bg-ink !text-paper' : 'bg-transparent text-ink hover:bg-white/80'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sm text-graphite">{t('pos.empty')}</p>
              </div>
            ) : (
              <ul className="space-y-2 px-3 pb-3">
                {lines.map(({ item, qty }) => (
                  <li key={item.id} className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="heading truncate text-[13px]">{item.product_name}</div>
                        <div className="mono text-[11px]">{item.color} / {item.size} · {item.sku}</div>
                      </div>
                      <button type="button" onClick={() => change(item, -qty)} aria-label="remove" className="rounded-full p-1.5 hover:bg-white/80"><X size={14} /></button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-stretch overflow-hidden rounded-full border border-white/80 bg-white/60">
                        <button type="button" onClick={() => change(item, -1)} className="px-2.5 hover:bg-white/90" aria-label="minus"><Minus size={13} /></button>
                        <span className="mono min-w-8 border-x border-ink px-2 py-1 text-center text-sm font-bold text-ink">{qty}</span>
                        <button type="button" onClick={() => change(item, 1)} disabled={qty >= item.stock_quantity} className="px-2.5 hover:bg-white/90 disabled:opacity-30" aria-label="plus"><Plus size={13} /></button>
                      </div>
                      <div className="mono text-sm font-bold text-ink">{fmt(item.selling_price * qty)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="m-2 rounded-[1.5rem] border border-white/70 bg-white/55 p-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label-caps flex items-center gap-1"><UserRound size={11} /> {t('pos.customer')}</span>
                <select className="field mt-1 !py-1.5" value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">{t('pos.walkIn')}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label-caps">{t('pos.payment')}</span>
                <select className="field mt-1 !py-1.5" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {(['cash', 'khqr', 'bank_transfer'] as const).map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span className="label-caps">{t('pos.discount')} (USD)</span>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="field mono !w-28 !py-1 text-right" placeholder="0.00" />
            </label>

            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="label-caps">{t('pos.subtotal')}</span>
              <span className="mono">{fmt(subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="label-caps">{t('pos.discount')}</span>
                <span className="mono">-{fmt(discountNum)}</span>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-black/10 pt-3">
              <span className="heading text-lg">{t('pos.total')}</span>
              <div className="text-right">
                <div className="mono text-4xl font-bold text-ink">{fmt(total)}</div>
                <div className="mono text-xs">{fmt(total, other)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button type="button" disabled={lines.length === 0} onClick={() => { setCart({}); setDiscount('') }} className="btn btn-danger">{t('pos.clear')}</button>
              <button type="button" disabled={lines.length === 0} onClick={() => { setPayError(null); setPaying(true) }} className="btn btn-acid py-3 text-sm">{t('pos.checkout')}</button>
            </div>
          </div>
        </aside>
      </div>

      {pickId !== null && (
        <VariantPicker
          variants={variants.filter((v) => v.product_id === pickId)}
          cart={cart}
          fmt={fmt}
          onAdd={(v, qty) => change(v, qty)}
          onClose={() => setPickId(null)}
        />
      )}

      {paying && (
        <CustomerDisplay
          totalText={fmt(total)}
          altTotalText={fmt(total, other)}
          itemCount={itemCount}
          method={method}
          busy={busy}
          error={payError}
          onBack={() => setPaying(false)}
          onConfirm={() => void confirmPayment()}
        />
      )}

      {receipt && (
        <Modal title={t('sales.saleComplete')} onClose={() => setReceipt(null)}>
          <Receipt sale={receipt} />
          <div className="no-print mt-4 text-center">
            <button type="button" onClick={() => setReceipt(null)} className="btn btn-acid">{t('customer.newSale')}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
