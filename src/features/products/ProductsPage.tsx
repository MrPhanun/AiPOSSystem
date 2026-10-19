import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlus, Plus, Search } from 'lucide-react'
import { api, apiMessage } from '../../lib/api-client'
import { useAuth } from '../auth/AuthContext'
import Badge from '../../components/Badge'
import Pagination from '../../components/Pagination'
import ProductImage from '../../components/ProductImage'
import Modal from '../../components/Modal'
import ProductDetail from './ProductDetail'
import ProductForm from './ProductForm'
import type { Category, Paginated, Product } from '../../types'

export default function ProductsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [result, setResult] = useState<Paginated<Product> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [form, setForm] = useState<{ product?: Product } | null>(null)
  const [newCat, setNewCat] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const loadCategories = useCallback(() => api.get<{ data: Category[] }>('/categories').then((r) => setCategories(r.data.data)), [])
  useEffect(() => { void loadCategories() }, [loadCategories])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<Product>>('/products', { params: { page, per_page: 24, search: query || undefined, category_id: category || undefined } })
      setResult(res.data); setError(null)
    } catch (err) { setError(apiMessage(err, t('common.error'))) } finally { setLoading(false) }
  }, [page, query, category, t])
  useEffect(() => { void load() }, [load])

  async function addCategory() {
    if (!newCat?.trim()) return
    try { await api.post('/categories', { name: newCat.trim() }); setNewCat(null); await loadCategories() }
    catch (err) { setError(apiMessage(err, t('common.error'))) }
  }

  return (
    <div className="space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-3xl">{t('products.title')}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setNewCat('')} className="btn btn-ghost"><FolderPlus size={14} /> {t('products.addCategory')}</button>
            <button type="button" onClick={() => setForm({})} disabled={categories.length === 0} className="btn btn-solid"><Plus size={14} /> {t('products.add')}</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('products.searchPlaceholder')} className="field pl-9" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value ? Number(e.target.value) : ''); setPage(1) }} className="field !w-auto">
          <option value="">{t('pos.all')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.products_count})</option>)}
        </select>
      </div>

      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}

      {loading && !result ? <p className="py-10 text-center">{t('common.loading')}</p>
        : result?.data.length === 0 ? <p className="py-10 text-center">{t('products.empty')}</p>
        : (
          <div className={`grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${loading ? 'opacity-60' : ''}`}>
            {result?.data.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="flex flex-col bg-paper text-left hover:bg-tile">
                <ProductImage url={p.image_url} alt={p.name} className="aspect-square w-full border-b border-ink" />
                <div className="flex flex-1 flex-col p-3">
                  <span className="mono text-[10px] uppercase tracking-wider">{p.category_name}</span>
                  <span className="heading mt-1 text-[13px] leading-tight">{p.name}</span>
                  <span className="mono mt-auto pt-2 text-sm font-bold text-ink">
                    {p.min_price === null ? '—' : p.min_price === p.max_price ? `$${p.min_price.toFixed(2)}` : `$${p.min_price.toFixed(2)}+`}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={p.total_stock === 0 ? 'alert' : 'muted'}>{p.total_stock === 0 ? t('pos.soldOut') : t('pos.inStock', { count: p.total_stock })}</Badge>
                    {!p.is_active && <Badge tone="alert">{t('status.inactive')}</Badge>}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

      {result && <Pagination meta={result.meta} page={page} onPage={setPage} />}

      {openId !== null && (
        <ProductDetail productId={openId} onClose={() => setOpenId(null)} onChanged={() => void load()}
          onEdit={(p) => { setOpenId(null); setForm({ product: p }) }} />
      )}
      {form && <ProductForm product={form.product} categories={categories} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load(); void loadCategories() }} />}
      {newCat !== null && (
        <Modal title={t('products.addCategory')} onClose={() => setNewCat(null)}>
          <input autoFocus className="field" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void addCategory()} placeholder={t('products.categoryName')} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setNewCat(null)} className="btn btn-ghost">{t('common.cancel')}</button>
            <button type="button" onClick={() => void addCategory()} className="btn btn-solid">{t('common.save')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
