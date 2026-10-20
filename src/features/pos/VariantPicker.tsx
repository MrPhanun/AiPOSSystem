import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import Modal from '../../components/Modal'
import ProductImage from '../../components/ProductImage'
import type { Variant } from '../../types'

const SWATCH: Record<string, string> = {
  black: '#111111', white: '#ffffff', red: '#d62828', blue: '#1d4ed8', navy: '#1e2a5a', green: '#15803d', olive: '#6b7a2a',
  beige: '#d9c8a5', silver: '#c0c0c0', grey: '#8a8a8a', gray: '#8a8a8a', indigo: '#3b3f8f', brown: '#7a4a21', pink: '#f4a6c0',
  yellow: '#facc15', orange: '#f97316', purple: '#7e22ce', cream: '#f5ecd7', khaki: '#b5a36a',
}

/** Cashier picks a colour, then a size, then a quantity. No scanner needed. */
export default function VariantPicker({ variants, cart, fmt, onAdd, onClose }: {
  variants: Variant[]
  cart: Record<number, number>
  fmt: (n: number) => string
  onAdd: (variant: Variant, qty: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const first = variants[0]
  const left = (v: Variant) => v.stock_quantity - (cart[v.id] ?? 0)

  const colors = useMemo(() => [...new Set(variants.map((v) => v.color))], [variants])
  const colorHasStock = (c: string) => variants.some((v) => v.color === c && left(v) > 0)

  const [color, setColor] = useState(() => colors.find(colorHasStock) ?? colors[0])
  const sizes = variants.filter((v) => v.color === color)
  const [sizeId, setSizeId] = useState<number | null>(() => (sizes.length === 1 && left(sizes[0]) > 0 ? sizes[0].id : null))
  const [qty, setQty] = useState(1)

  const selected = variants.find((v) => v.id === sizeId) ?? null
  const max = selected ? Math.max(left(selected), 0) : 0

  function pickColor(c: string) {
    setColor(c)
    const s = variants.filter((v) => v.color === c)
    setSizeId(s.length === 1 && left(s[0]) > 0 ? s[0].id : null)
    setQty(1)
  }

  return (
    <Modal title={first.product_name} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex gap-4">
          <ProductImage url={first.image_url} alt={first.product_name} className="h-28 w-28 shrink-0 rounded-2xl border border-white/80" />
          <div>
            <span className="mono text-[10px] uppercase tracking-wider">{first.category_name}</span>
            <div className="mono mt-1 text-3xl font-bold text-ink">{fmt(selected?.selling_price ?? first.selling_price)}</div>
            {selected && <div className="mono mt-1 text-xs">{t('pos.inStock', { count: left(selected) })}</div>}
          </div>
        </div>

        <div>
          <div className="label-caps mb-2">{t('products.color')}</div>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const ok = colorHasStock(c)
              const on = c === color
              return (
                <button key={c} type="button" disabled={!ok} onClick={() => pickColor(c)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper hover:bg-tile'}`}>
                  <span className="h-4 w-4 rounded-full border border-graphite" style={{ background: SWATCH[c.toLowerCase()] ?? '#e5e5e5' }} />
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="label-caps mb-2">{t('products.size')}</div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((v) => {
              const ok = left(v) > 0
              const on = v.id === sizeId
              return (
                <button key={v.id} type="button" disabled={!ok} onClick={() => { setSizeId(v.id); setQty(1) }}
                  className={`min-w-14 rounded-2xl border px-3 py-2 text-center transition text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'border-ink bg-acid text-ink' : 'border-ink bg-paper hover:bg-tile'}`}>
                  {v.size}
                  <span className={`mono block text-[10px] font-normal ${ok && left(v) <= v.low_stock_threshold ? 'text-crimson' : ''}`}>{ok ? left(v) : t('pos.soldOut')}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-4">
          <div className="inline-flex items-stretch overflow-hidden rounded-full border border-white/80 bg-white/60">
            <button type="button" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="px-3 hover:bg-tile disabled:opacity-30" aria-label="minus"><Minus size={14} /></button>
            <span className="mono min-w-10 border-x border-ink px-3 py-2 text-center font-bold text-ink">{qty}</span>
            <button type="button" disabled={!selected || qty >= max} onClick={() => setQty(qty + 1)} className="px-3 hover:bg-tile disabled:opacity-30" aria-label="plus"><Plus size={14} /></button>
          </div>
          <button type="button" disabled={!selected || max === 0}
            onClick={() => { if (selected) { onAdd(selected, qty); onClose() } }}
            className="btn btn-acid flex-1 py-3 text-sm">
            {selected ? `${t('pos.addToCart')} · ${fmt(selected.selling_price * qty)}` : t('pos.chooseSize')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
