import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import ProductImage from '../../components/ProductImage'
import Modal from '../../components/Modal'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import type { Category, FieldErrors, Product } from '../../types'

interface VariantRow { sku: string; barcode: string; size: string; color: string; cost_price: string; selling_price: string; stock_quantity: string; low_stock_threshold: string }
const emptyVariant = (): VariantRow => ({ sku: '', barcode: '', size: '', color: '', cost_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '5' })

/** Create (no `product`) or edit (with `product`) a product. Editing covers product info only; sizes/stock are managed in the detail view and Inventory page. */
export default function ProductForm({ product, categories, onClose, onSaved }: { product?: Product; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const editing = !!product
  const [form, setForm] = useState({
    name: product?.name ?? '',
    category_id: product?.category_id ?? categories[0]?.id ?? 0,
    brand: product?.brand ?? '',
    description: product?.description ?? '',
    is_active: product?.is_active ?? true,
  })
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const setV = (i: number, k: keyof VariantRow, v: string) => setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setErrors({}); setFormError(null)
    const base = { ...form, category_id: Number(form.category_id), brand: form.brand || null, description: form.description || null }
    try {
      let id = product?.id
      if (editing) await api.patch(`/products/${product!.id}`, base)
      else {
        const created = await api.post<{ data: Product }>("/products", {
          ...base,
          variants: variants.map((v) => ({
            size: v.size,
            color: v.color,
            cost_price: v.cost_price === "" ? 0 : Number(v.cost_price),
            selling_price: Number(v.selling_price),
            stock_quantity: Number(v.stock_quantity || 0),
            low_stock_threshold: Number(v.low_stock_threshold || 5),
          })),
        });
        id = created.data.data.id
      }
      if (file) {
        const body = new FormData()
        body.append('image', file)
        await api.post(`/products/${id}/image`, body)
      } else if (removeImage && editing) {
        await api.delete(`/products/${id}/image`)
      }
      onSaved()
    } catch (err) {
      const f = apiFieldErrors(err)
      setErrors(f)
      if (Object.keys(f).length === 0) setFormError(apiMessage(err, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  const err = (k: string) => errors[k]?.[0] && <span className="mt-1 block text-xs font-semibold text-crimson">{errors[k][0]}</span>
  const vErr = (i: number, k: string) => errors[`variants.${i}.${k}`]?.[0] && <span className="block text-[10px] font-semibold text-crimson">{errors[`variants.${i}.${k}`][0]}</span>

  return (
    <Modal
      title={editing ? t("products.editTitle") : t("products.createTitle")}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label-caps">{t("products.name")}</span>
            <input
              required
              className="field mt-1.5"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {err("name")}
          </label>
          <label className="block">
            <span className="label-caps">{t("products.category")}</span>
            <select
              required
              className="field mt-1.5"
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: Number(e.target.value) })
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {err("category_id")}
          </label>
          <label className="block">
            <span className="label-caps">{t("products.brand")}</span>
            <input
              className="field mt-1.5"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            {err("brand")}
          </label>
          <div className="block">
            <span className="label-caps">{t("products.image")}</span>
            <div className="mt-1.5 flex items-center gap-3">
              {preview || (!removeImage && product?.image_url) ? (
                <img
                  src={(preview ?? product?.image_url) as string}
                  alt=""
                  className="h-20 w-20 shrink-0 border border-ink object-cover"
                />
              ) : (
                <ProductImage
                  url={null}
                  alt=""
                  className="h-20 w-20 shrink-0 border border-ink"
                />
              )}
              <div className="space-y-1.5">
                <label className="btn btn-ghost cursor-pointer !px-3 !py-1.5">
                  <ImagePlus size={13} /> {t("products.chooseImage")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setRemoveImage(false);
                    }}
                  />
                </label>
                {(file || (editing && product?.image_url && !removeImage)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setRemoveImage(true);
                    }}
                    className="block text-xs font-bold text-crimson underline"
                  >
                    {t("products.removeImage")}
                  </button>
                )}
                <span className="block text-[11px] text-graphite">
                  {t("products.imageHelp")}
                </span>
                {errors.image?.[0] && (
                  <span className="block text-xs font-semibold text-crimson">
                    {errors.image[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <label className="block">
          <span className="label-caps">{t("products.description")}</span>
          <textarea
            rows={2}
            className="field mt-1.5"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {err("description")}
        </label>
        {editing && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />{" "}
            {t("products.visible")}
          </label>
        )}

        {!editing && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label-caps">{t("products.variants")}</span>
              <button
                type="button"
                onClick={() => setVariants((v) => [...v, emptyVariant()])}
                className="btn btn-ghost !px-3 !py-1"
              >
                <Plus size={12} /> {t("products.addVariant")}
              </button>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="grid min-w-[480px] grid-cols-[0.8fr_1fr_0.8fr_0.8fr_0.7fr_auto] gap-1.5"
                >
                  <div>
                    <input
                      required
                      placeholder={t("products.size")}
                      className="field !px-2 !py-1.5 text-xs"
                      value={v.size}
                      onChange={(e) => setV(i, "size", e.target.value)}
                    />
                    {vErr(i, "size")}
                  </div>
                  <div>
                    <input
                      required
                      placeholder={t("products.color")}
                      className="field !px-2 !py-1.5 text-xs"
                      value={v.color}
                      onChange={(e) => setV(i, "color", e.target.value)}
                    />
                    {vErr(i, "color")}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t("products.cost")}
                      className="field mono !px-2 !py-1.5 text-xs"
                      value={v.cost_price}
                      onChange={(e) => setV(i, "cost_price", e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t("products.price")}
                      className="field mono !px-2 !py-1.5 text-xs"
                      value={v.selling_price}
                      onChange={(e) => setV(i, "selling_price", e.target.value)}
                    />
                    {vErr(i, "selling_price")}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      placeholder={t("products.stock")}
                      className="field mono !px-2 !py-1.5 text-xs"
                      value={v.stock_quantity}
                      onChange={(e) =>
                        setV(i, "stock_quantity", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={variants.length === 1}
                    onClick={() =>
                      setVariants((rows) => rows.filter((_, idx) => idx !== i))
                    }
                    aria-label="remove"
                    className="p-1 hover:bg-tile disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {err("variants")}
          </div>
        )}

        {formError && (
          <p
            role="alert"
            className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson"
          >
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={busy} className="btn btn-solid">
            {busy && <Loader2 size={13} className="animate-spin" />}{" "}
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
