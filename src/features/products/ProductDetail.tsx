import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'
import ProductImage from '../../components/ProductImage'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import { money } from '../../lib/format'
import { useSettings } from '../../lib/useSettings'
import { useAuth } from '../auth/AuthContext'
import type { Product, Variant } from '../../types'

export default function ProductDetail({ productId, onClose, onEdit, onChanged }: { productId: number; onClose: () => void; onEdit: (p: Product) => void; onChanged: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { khr_per_usd } = useSettings()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Variant | null>(null)

  const load = () => api.get<{ data: Product }>(`/products/${productId}`).then((r) => setProduct(r.data.data)).catch((e) => setError(apiMessage(e, t('common.error'))))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [productId])

  async function removeProduct() {
    if (!window.confirm(t('common.confirmDelete'))) return
    try { await api.delete(`/products/${productId}`); onChanged(); onClose() }
    catch (e) { setError(apiMessage(e, t('common.error'))) }
  }
  async function removeVariant(id: number) {
    if (!window.confirm(t('common.confirmDelete'))) return
    try { await api.delete(`/variants/${id}`); await load(); onChanged() }
    catch (e) { setError(apiMessage(e, t('common.error'))) }
  }

  const th = 'label-caps px-3 py-2 text-left'
  return (
    <Modal title={product?.name ?? t('common.loading')} onClose={onClose} wide>
      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}
      {product && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <ProductImage url={product.image_url} alt={product.name} className="aspect-square w-full border border-ink" />
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="outline">{product.category_name}</Badge>
                {product.brand && <Badge tone="muted">{product.brand}</Badge>}
                {!product.is_active && <Badge tone="alert">{t('status.inactive')}</Badge>}
              </div>
              <div className="mono text-2xl font-bold text-ink">
                {product.min_price === null ? '—' : product.min_price === product.max_price
                  ? `$${product.min_price.toFixed(2)}` : `$${product.min_price.toFixed(2)} – $${product.max_price!.toFixed(2)}`}
              </div>
              <p className="text-graphite">{product.description || t('products.noDescription')}</p>
              <div className="mono text-xs">{t('products.totalStock')}: <b className="text-ink">{product.total_stock}</b></div>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => onEdit(product)} className="btn btn-ghost"><Pencil size={13} /> {t('common.edit')}</button>
                  <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost"><Plus size={13} /> {t('products.addVariant')}</button>
                  <button type="button" onClick={() => void removeProduct()} className="btn btn-danger"><Trash2 size={13} /> {t('common.delete')}</button>
                </div>
              )}
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ink bg-tile">
                <tr>
                  <th className={th}>SKU</th><th className={th}>{t('products.size')}</th><th className={th}>{t('products.color')}</th>
                  <th className={`${th} text-right`}>{t('products.price')}</th>
                  {isAdmin && <th className={`${th} text-right`}>{t('products.cost')}</th>}
                  <th className={`${th} text-right`}>{t('products.stock')}</th>
                  {isAdmin && <th className={th} />}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/15">
                {product.variants.map((v) => {
                  const out = v.stock_quantity === 0
                  const low = !out && v.stock_quantity <= v.low_stock_threshold
                  return (
                    <tr key={v.id} className={v.is_active ? '' : 'opacity-50'}>
                      <td className="mono px-3 py-2">{v.sku}</td>
                      <td className="px-3 py-2">{v.size}</td>
                      <td className="px-3 py-2">{v.color}</td>
                      <td className="mono px-3 py-2 text-right">{money(v.selling_price, 'USD', khr_per_usd)}</td>
                      {isAdmin && <td className="mono px-3 py-2 text-right">{v.cost_price !== null ? money(v.cost_price, 'USD', khr_per_usd) : '—'}</td>}
                      <td className={`mono px-3 py-2 text-right font-bold ${out || low ? 'text-crimson' : 'text-ink'}`}>
                        {out ? t('pos.soldOut') : v.stock_quantity}
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button type="button" onClick={() => setEditing(v)} aria-label="edit" className="rounded-full p-1.5 hover:bg-white/80"><Pencil size={14} /></button>
                          <button type="button" onClick={() => void removeVariant(v.id)} aria-label="delete" className="rounded-full p-1.5 hover:bg-white/80"><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && <AddVariant variant={editing} productId={editing.product_id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); onChanged() }} />}
      {adding && product && <AddVariant productId={product.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); void load(); onChanged() }} />}
    </Modal>
  )
}

function AddVariant({ productId, variant, onClose, onSaved }: { productId: number; variant?: Variant; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [f, setF] = useState({ sku: '', barcode: '', size: variant?.size ?? '', color: variant?.color ?? '', cost_price: variant?.cost_price != null ? String(variant.cost_price) : '', selling_price: variant ? String(variant.selling_price) : '', stock_quantity: '0' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setErrors({})
    try {
      if (variant) await api.patch(`/variants/${variant.id}`, { size: f.size, color: f.color, barcode: variant.barcode, cost_price: Number(f.cost_price || 0), selling_price: Number(f.selling_price), low_stock_threshold: variant.low_stock_threshold })
      else await api.post(`/products/${productId}/variants`, { size: f.size, color: f.color, cost_price: Number(f.cost_price || 0), selling_price: Number(f.selling_price), stock_quantity: Number(f.stock_quantity || 0) })
      onSaved()
    } catch (err) {
      setErrors(apiFieldErrors(err))
    } finally { setBusy(false) }
  }
  const err = (k: string) => errors[k]?.[0] && <span className="block text-xs font-semibold text-crimson">{errors[k][0]}</span>
  const field = (k: keyof typeof f, label: string, extra = {}) => (
    <label className="block"><span className="label-caps">{label}</span><input className="field mt-1" value={f[k]} onChange={set(k)} {...extra} />{err(k)}</label>
  )

  return (
    <Modal title={variant ? t('common.edit') : t('products.addVariant')} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        
        {field('size', t('products.size'), { required: true })}
        {field('color', t('products.color'), { required: true })}
        {field('cost_price', t('products.cost'), { type: 'number', min: 0, step: '0.01' })}
        {field('selling_price', t('products.price'), { type: 'number', min: 0, step: '0.01', required: true })}
        {!variant && field('stock_quantity', t('products.stock'), { type: 'number', min: 0 })}
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="btn btn-solid">{busy && <Loader2 size={13} className="animate-spin" />} {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}
