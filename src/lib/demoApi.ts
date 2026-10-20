/* eslint-disable @typescript-eslint/no-explicit-any */
// Demo mode (VITE_DEMO=true): an in-browser fake of the backend API so the app runs on GitHub Pages.
// Data lives in localStorage ("Reset demo" = clear site data). Mirrors backend/server.js.
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

type R = Record<string, any>
const KEY = 'horangi-pos-demo-v1'
const RATE = 4100

// ───────── seed ─────────
const FILL: R = { black: '#161616', white: '#f6f6f6', grey: '#8d8d8d', beige: '#d8c7a3' }
const SHAPES: R = {
  tee: '<path d="M62 34 L88 22 Q100 40 112 22 L138 34 L176 66 L154 92 L140 78 L140 172 L60 172 L60 78 L46 92 L24 66 Z"/>',
  pants: '<path d="M60 22 H140 L152 178 H108 L100 84 L92 178 H48 Z"/>',
  shoe: '<path d="M18 128 Q18 100 44 98 L68 94 L84 68 L112 84 Q142 94 176 114 Q188 122 184 140 L18 140 Z"/><rect x="16" y="140" width="170" height="14" rx="7" fill="#d9d9d9" stroke="#161616" stroke-width="3"/>',
}
const img = (shape: string, color: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dcdcdc"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><g fill="${FILL[color.toLowerCase()] ?? '#bbb'}" stroke="#161616" stroke-width="3" stroke-linejoin="round">${SHAPES[shape]}</g></svg>`)

const PRODUCTS: [string, string, string, string, string, number, number, string[], string[]][] = [
  ['T-Shirts', 'tee', 'TEE-CLS', 'Classic Cotton Tee', 'Soft 100% cotton crew-neck tee for everyday wear.', 6, 12, ['Black', 'White'], ['S', 'M', 'L', 'XL']],
  ['T-Shirts', 'tee', 'TEE-OVR', 'Oversized Graphic Tee', 'Relaxed oversized fit with tiger graphic print.', 8, 18, ['Black', 'Grey'], ['M', 'L', 'XL']],
  ['T-Shirts', 'tee', 'TEE-TGR', 'Tiger Print Tee', 'Limited tiger print tee, heavyweight cotton.', 9, 20, ['White', 'Black'], ['S', 'M', 'L']],
  ['T-Shirts', 'tee', 'POL-PIQ', 'Pique Polo Shirt', 'Smart-casual polo with ribbed collar.', 11, 22, ['Black', 'White', 'Grey'], ['M', 'L', 'XL']],
  ['Pants', 'pants', 'JNS-SLM', 'Slim Fit Jeans', 'Stretch denim, slim through the leg.', 18, 35, ['Black', 'Grey'], ['28', '30', '32', '34']],
  ['Pants', 'pants', 'CRG-PNT', 'Cargo Pants', 'Utility cargo with six pockets.', 20, 38, ['Black', 'Beige'], ['30', '32', '34']],
  ['Pants', 'pants', 'JOG-PNT', 'Jogger Pants', 'Comfort fleece joggers with tapered cuff.', 14, 28, ['Black', 'Grey'], ['S', 'M', 'L', 'XL']],
  ['Pants', 'pants', 'CHN-PNT', 'Chino Pants', 'Classic chino, office to weekend.', 16, 32, ['Beige', 'Black'], ['30', '32', '34']],
  ['Shoes', 'shoe', 'SNK-STR', 'Street Sneakers', 'Cushioned everyday sneakers.', 30, 59, ['White', 'Black'], ['39', '40', '41', '42', '43']],
  ['Shoes', 'shoe', 'RUN-PRO', 'Running Shoes', 'Lightweight breathable running shoes.', 35, 69, ['Black', 'Grey'], ['40', '41', '42', '43']],
  ['Shoes', 'shoe', 'CNV-LOW', 'Canvas Low Top', 'Timeless low-top canvas sneaker.', 19, 39, ['White', 'Black'], ['38', '39', '40', '41', '42']],
  ['Shoes', 'shoe', 'SLD-SND', 'Slide Sandals', 'Easy slip-on slides for hot days.', 8, 19, ['Black'], ['40', '41', '42']],
]

function seed(): R {
  let s = 7
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const now = Date.now()
  const db: R = {
    seq: { user: 5, category: 4, product: 100, variant: 1, customer: 6, sale: 1, item: 1, move: 1 },
    session: null,
    settings: { store_name: 'HORANGI', address: 'Phnom Penh, Cambodia', phone: '012 345 678', khr_per_usd: RATE, receipt_footer: 'Thank you! Come again.' },
    users: [
      { id: 1, name: 'Testing', email: 'testing@pos.com', password: '123456789', role: 'admin', is_active: true, locale: 'en', created_at: new Date(now).toISOString() },
      { id: 2, name: 'Admin', email: 'admin@stylepos.test', password: 'password', role: 'admin', is_active: true, locale: 'en', created_at: new Date(now).toISOString() },
      { id: 3, name: 'Cashier', email: 'cashier@stylepos.test', password: 'password', role: 'cashier', is_active: true, locale: 'en', created_at: new Date(now).toISOString() },
    ],
    categories: [{ id: 1, name: 'T-Shirts', is_active: true }, { id: 2, name: 'Pants', is_active: true }, { id: 3, name: 'Shoes', is_active: true }],
    products: [], variants: [], customers: [], sales: [], movements: [],
  }
  const catId: R = { 'T-Shirts': 1, Pants: 2, Shoes: 3 }
  PRODUCTS.forEach(([cat, shape, code, name, desc, cost, price, colors, sizes], i) => {
    const pid = i + 1
    db.products.push({ id: pid, category_id: catId[cat], name, description: desc, brand: 'Horangi', image_path: img(shape, colors[0]), is_active: true })
    for (const color of colors) for (const size of sizes) {
      const stock = Math.floor(rnd() * 28) + 4
      db.variants.push({ id: db.seq.variant++, product_id: pid, sku: `${code}-${color.slice(0, 3).toUpperCase()}-${size}`, barcode: null, size, color, cost_price: cost, selling_price: price, stock_quantity: stock, low_stock_threshold: 5, is_active: true })
    }
  })
  const setStock = (sku: string, n: number) => { const v = db.variants.find((x: R) => x.sku === sku); if (v) v.stock_quantity = n }
  setStock('TEE-CLS-BLA-M', 2); setStock('SNK-STR-WHI-42', 2); setStock('SLD-SND-BLA-41', 0)
  ;[['Sokha Chan', '012 345 678', 'sokha@example.com', 'Phnom Penh'], ['Dara Kim', '096 111 2233', 'dara@example.com', 'Siem Reap'],
    ['Srey Neang', '098 765 432', null, 'Phnom Penh'], ['Vannak Sok', '077 888 999', 'vannak@example.com', 'Battambang'], ['Maly Heng', '010 222 333', null, 'Kampot']]
    .forEach(([name, phone, email, address], i) => db.customers.push({ id: i + 1, name, phone, email, address }))
  const methods = ['cash', 'khqr', 'bank_transfer']
  for (let i = 0; i < 16; i++) {
    const when = new Date(now - Math.floor(rnd() * 7) * 864e5 - Math.floor(rnd() * 8) * 36e5)
    const lines: R[] = []
    for (let n = 1 + Math.floor(rnd() * 3); n > 0; n--) {
      const v = db.variants[Math.floor(rnd() * db.variants.length)]
      if (!lines.some((l) => l.v.id === v.id)) lines.push({ v, qty: 1 + Math.floor(rnd() * 2) })
    }
    const subtotal = lines.reduce((a, l) => a + l.v.selling_price * l.qty, 0)
    const discount = rnd() < 0.25 ? 5 : 0
    makeSale(db, { cashier_id: rnd() < 0.5 ? 3 : 1, customer_id: rnd() < 0.6 ? Math.floor(rnd() * 5) + 1 : null, currency: 'USD', method: methods[Math.floor(rnd() * 3)], subtotal, discount, lines: lines.map((l) => ({ variant: l.v, qty: l.qty })), when: when.toISOString(), touchStock: false })
  }
  return db
}

function makeSale(db: R, o: R): R {
  const id = db.seq.sale++
  const day = o.when.slice(0, 10).replaceAll('-', '')
  const sale: R = {
    id, receipt_number: `INV-${day}-${String(id).padStart(5, '0')}`, cashier_id: o.cashier_id, customer_id: o.customer_id, status: 'completed', payment_status: 'paid',
    currency: o.currency, exchange_rate: db.settings.khr_per_usd, subtotal: o.subtotal, discount_amount: o.discount, tax_amount: 0, total_amount: o.subtotal - o.discount, notes: null, sold_at: o.when,
    items: o.lines.map(({ variant: v, qty }: R) => ({ id: db.seq.item++, variant_id: v.id, product_name: db.products.find((p: R) => p.id === v.product_id).name, sku: v.sku, size: v.size, color: v.color, quantity: qty, unit_price: v.selling_price, line_total: v.selling_price * qty })),
    payments: [{ method: o.method, currency: o.currency, amount: o.subtotal - o.discount, status: 'paid' }],
  }
  if (o.touchStock) for (const { variant: v, qty } of o.lines) move(db, v, -qty, 'sale', 'Sale')
  db.sales.push(sale)
  return sale
}
function move(db: R, v: R, change: number, type: string, reason: string | null) {
  const before = v.stock_quantity
  v.stock_quantity += change
  db.movements.push({ id: db.seq.move++, variant_id: v.id, type, quantity_change: change, stock_before: before, stock_after: v.stock_quantity, reason, created_at: new Date().toISOString() })
}

// ───────── persistence ─────────
let mem: R | null = null
function load(): R {
  if (mem) return mem
  try { const raw = localStorage.getItem(KEY); if (raw) return (mem = JSON.parse(raw)) } catch { /* ignore */ }
  mem = seed(); save(); return mem!
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)) } catch { /* quota/private mode */ } }

// ───────── helpers ─────────
class Fail extends Error { constructor(public status: number, message: string, public errors?: R) { super(message) } }
const fail = (s: number, m: string, e?: R): never => { throw new Fail(s, m, e) }
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
const page = (rows: any[], q: R, def: number) => {
  const per = Math.min(Math.max(num(q.per_page, def), 1), 500), p = Math.max(num(q.page, 1), 1)
  return { data: rows.slice((p - 1) * per, p * per), meta: { current_page: p, last_page: Math.max(Math.ceil(rows.length / per), 1), total: rows.length, per_page: per } }
}
const has = (s: any, q: string) => String(s ?? '').toLowerCase().includes(q.toLowerCase())
const userOut = (u: R) => ({ id: u.id, name: u.name, email: u.email, role: u.role, is_active: u.is_active, locale: u.locale, created_at: u.created_at })

function variantOut(db: R, v: R, admin: boolean) {
  const p = db.products.find((x: R) => x.id === v.product_id)
  const c = db.categories.find((x: R) => x.id === p.category_id)
  return { id: v.id, product_id: v.product_id, product_name: p.name, category_id: p.category_id, category_name: c?.name ?? null, image_url: p.image_path, sku: v.sku, barcode: v.barcode, size: v.size, color: v.color, selling_price: v.selling_price, cost_price: admin ? v.cost_price : null, stock_quantity: v.stock_quantity, low_stock_threshold: v.low_stock_threshold, is_active: v.is_active }
}
function productOut(db: R, p: R, admin: boolean) {
  const vs = db.variants.filter((v: R) => v.product_id === p.id).map((v: R) => variantOut(db, v, admin))
  const prices = vs.map((v: R) => v.selling_price)
  return { id: p.id, name: p.name, description: p.description, brand: p.brand, category_id: p.category_id, category_name: db.categories.find((c: R) => c.id === p.category_id)?.name ?? null, image_path: p.image_path, image_url: p.image_path, is_active: p.is_active, total_stock: vs.reduce((a: number, v: R) => a + v.stock_quantity, 0), min_price: prices.length ? Math.min(...prices) : null, max_price: prices.length ? Math.max(...prices) : null, variants: vs }
}
function saleOut(db: R, s: R, detail: boolean) {
  const cashier = db.users.find((u: R) => u.id === s.cashier_id)
  const cust = db.customers.find((c: R) => c.id === s.customer_id)
  const out: R = { id: s.id, receipt_number: s.receipt_number, status: s.status, payment_status: s.payment_status, currency: s.currency, exchange_rate: s.exchange_rate, subtotal: s.subtotal, discount_amount: s.discount_amount, tax_amount: s.tax_amount, total_amount: s.total_amount, notes: s.notes, sold_at: s.sold_at, cashier: { id: s.cashier_id, name: cashier?.name ?? '—' }, customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone } : null, item_count: s.items.reduce((a: number, i: R) => a + i.quantity, 0) }
  if (detail) { out.items = s.items; out.payments = s.payments }
  return out
}
const soldVariant = (db: R, id: number) => db.sales.some((s: R) => s.items.some((i: R) => i.variant_id === id))
function checkVariant(v: R, prefix: string, errors: R) {
  if (!v.size) errors[`${prefix}.size`] = ['Size is required.']
  if (!v.color) errors[`${prefix}.color`] = ['Color is required.']
  if (v.selling_price === '' || v.selling_price == null || !(num(v.selling_price, -1) >= 0)) errors[`${prefix}.selling_price`] = ['Selling price is required.']
}
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })

// ───────── router ─────────
async function route(method: string, url: string, q: R, body: any): Promise<[number, any]> {
  const db = load()
  const me = db.users.find((u: R) => u.id === db.session)
  const parts = url.replace(/^\//, '').split('/')
  const [a, b, c] = parts
  const is = (m: string, pattern: string) => method === m && pattern.split('/').length === parts.length && pattern.split('/').every((seg, i) => seg.startsWith(':') || seg === parts[i])
  const ok = (data: any, status = 200): [number, any] => [status, data]

  if (is('GET', 'settings')) return ok({ data: db.settings })
  if (is('POST', 'login')) {
    const u = db.users.find((x: R) => x.email.toLowerCase() === String(body?.email ?? '').toLowerCase())
    if (!u || u.password !== String(body?.password ?? '')) fail(422, 'These credentials do not match our records.', { email: ['These credentials do not match our records.'] })
    if (!u.is_active) fail(403, 'This account is disabled.')
    db.session = u.id; save(); return ok({ data: userOut(u) })
  }
  if (is('POST', 'logout')) { db.session = null; save(); return ok({}, 204) }
  if (!me) fail(401, 'Unauthenticated.')
  const admin = me.role === 'admin'
  const needAdmin = () => { if (!admin) fail(403, 'Forbidden.') }

  if (is('GET', 'user')) return ok({ data: userOut(me) })
  if (is('PATCH', 'user/profile')) { if (!['en', 'km'].includes(body?.locale)) fail(422, 'Invalid locale.'); me.locale = body.locale; save(); return ok({ data: userOut(me) }) }

  // users
  if (is('GET', 'users')) { needAdmin(); const s = q.search ?? ''; return ok(page(db.users.filter((u: R) => !s || has(u.name, s) || has(u.email, s)).sort((x: R, y: R) => y.id - x.id).map(userOut), q, 15)) }
  if (is('POST', 'users')) {
    needAdmin(); const e: R = {}
    if (!body.name) e.name = ['Name is required.']
    if (!body.email) e.email = ['Email is required.']
    else if (db.users.some((u: R) => u.email.toLowerCase() === body.email.toLowerCase())) e.email = ['Email already taken.']
    if (!body.password || String(body.password).length < 6) e.password = ['Password must be at least 6 characters.']
    if (!['admin', 'cashier'].includes(body.role)) e.role = ['Invalid role.']
    if (Object.keys(e).length) fail(422, 'Validation failed.', e)
    const u = { id: db.seq.user++, name: body.name, email: body.email, password: body.password, role: body.role, is_active: true, locale: 'en', created_at: new Date().toISOString() }
    db.users.push(u); save(); return ok({ data: userOut(u) }, 201)
  }
  if (is('PATCH', 'users/:id/status')) {
    needAdmin(); const u = db.users.find((x: R) => x.id === Number(b)); if (!u) fail(404, 'Not found.')
    if (u.id === me.id) fail(422, 'You cannot disable your own account.')
    u.is_active = !!body.is_active; save(); return ok({ data: userOut(u) })
  }

  // categories
  if (is('GET', 'categories')) return ok({ data: [...db.categories].sort((x: R, y: R) => x.name.localeCompare(y.name)).map((cat: R) => ({ ...cat, products_count: db.products.filter((p: R) => p.category_id === cat.id).length })) })
  if (is('POST', 'categories')) {
    needAdmin(); const name = String(body?.name ?? '').trim()
    if (!name) fail(422, 'Name is required.', { name: ['Name is required.'] })
    if (db.categories.some((x: R) => x.name.toLowerCase() === name.toLowerCase())) fail(422, 'Category already exists.', { name: ['Category already exists.'] })
    const cat = { id: db.seq.category++, name, is_active: true }; db.categories.push(cat); save(); return ok({ data: { ...cat, products_count: 0 } }, 201)
  }
  if (is('PATCH', 'categories/:id')) { needAdmin(); const cat = db.categories.find((x: R) => x.id === Number(b)); if (!cat) fail(404, 'Not found.'); cat.name = String(body?.name ?? cat.name).trim(); save(); return ok({ data: cat }) }
  if (is('DELETE', 'categories/:id')) {
    needAdmin(); if (db.products.some((p: R) => p.category_id === Number(b))) fail(422, 'Category still has products.')
    db.categories = db.categories.filter((x: R) => x.id !== Number(b)); save(); return ok({ deleted: true })
  }

  // products
  if (is('GET', 'products')) {
    let rows = db.products.filter((p: R) => (!q.category_id || p.category_id === Number(q.category_id)) &&
      (!q.search || has(p.name, q.search) || has(p.brand, q.search) || db.variants.some((v: R) => v.product_id === p.id && (has(v.sku, q.search) || has(v.barcode, q.search)))))
    rows = rows.sort((x: R, y: R) => y.id - x.id)
    const pg = page(rows, q, 24); return ok({ data: pg.data.map((p: R) => productOut(db, p, admin)), meta: pg.meta })
  }
  if (is('GET', 'products/:id')) { const p = db.products.find((x: R) => x.id === Number(b)); if (!p) fail(404, 'Not found.'); return ok({ data: productOut(db, p, admin) }) }
  if (is('POST', 'products')) {
    needAdmin(); const e: R = {}
    if (!body.name) e.name = ['Name is required.']
    if (!body.category_id) e.category_id = ['Category is required.']
    const vs: R[] = Array.isArray(body.variants) ? body.variants : []
    if (!vs.length) e.variants = ['At least one variant is required.']
    vs.forEach((v, i) => checkVariant(v, `variants.${i}`, e))
    if (Object.keys(e).length) fail(422, 'Validation failed.', e)
    const p = { id: db.seq.product++, category_id: Number(body.category_id), name: body.name, description: body.description ?? null, brand: body.brand ?? null, image_path: null, is_active: true }
    db.products.push(p)
    for (const v of vs) addVariant(db, p.id, v)
    save(); return ok({ data: productOut(db, p, true) }, 201)
  }
  if (is('PATCH', 'products/:id')) {
    needAdmin(); const p = db.products.find((x: R) => x.id === Number(b)); if (!p) fail(404, 'Not found.')
    if (!body.name) fail(422, 'Validation failed.', { name: ['Name is required.'] })
    Object.assign(p, { name: body.name, description: body.description ?? null, brand: body.brand ?? null, category_id: Number(body.category_id), is_active: body.is_active ?? p.is_active })
    save(); return ok({ data: productOut(db, p, true) })
  }
  if (is('DELETE', 'products/:id')) {
    needAdmin(); const p = db.products.find((x: R) => x.id === Number(b)); if (!p) fail(404, 'Not found.')
    const ids = db.variants.filter((v: R) => v.product_id === p.id).map((v: R) => v.id)
    if (ids.some((id: number) => soldVariant(db, id))) { p.is_active = false; save(); return ok({ deactivated: true }) }
    db.variants = db.variants.filter((v: R) => v.product_id !== p.id); db.movements = db.movements.filter((m: R) => !ids.includes(m.variant_id))
    db.products = db.products.filter((x: R) => x.id !== p.id); save(); return ok({ deleted: true })
  }
  if (is('POST', 'products/:id/image')) {
    needAdmin(); const p = db.products.find((x: R) => x.id === Number(b)); if (!p) fail(404, 'Not found.')
    const f = body instanceof FormData ? body.get('image') : null
    if (!(f instanceof File)) fail(422, 'Image is required.', { image: ['Image is required.'] })
    p.image_path = await fileToDataUrl(f as File); save(); return ok({ data: { image_path: p.image_path, image_url: p.image_path } })
  }
  if (is('DELETE', 'products/:id/image')) { needAdmin(); const p = db.products.find((x: R) => x.id === Number(b)); if (p) p.image_path = null; save(); return ok({}, 204) }
  if (is('POST', 'products/:id/variants')) {
    needAdmin(); const e: R = {}; checkVariant(body ?? {}, 'variant', e)
    if (Object.keys(e).length) fail(422, 'Validation failed.', e)
    if (!db.products.some((x: R) => x.id === Number(b))) fail(404, 'Not found.')
    const v = addVariant(db, Number(b), body); save(); return ok({ data: variantOut(db, v, true) }, 201)
  }

  // variants / inventory
  if (is('GET', 'variants')) {
    const rows = db.variants.filter((v: R) => {
      const p = db.products.find((x: R) => x.id === v.product_id)
      return (!q.search || has(p.name, q.search) || has(v.sku, q.search) || has(v.barcode, q.search)) && (!q.sellable || (v.is_active && p.is_active)) && (!q.low_stock || v.stock_quantity <= v.low_stock_threshold)
    }).sort((x: R, y: R) => variantOut(db, x, true).product_name.localeCompare(variantOut(db, y, true).product_name))
    const pg = page(rows, q, 20); return ok({ data: pg.data.map((v: R) => variantOut(db, v, admin)), meta: pg.meta })
  }
  if (is('PATCH', 'variants/:id')) {
    needAdmin(); const v = db.variants.find((x: R) => x.id === Number(b)); if (!v) fail(404, 'Not found.')
    const e: R = {}; checkVariant(body ?? {}, 'variant', e); if (Object.keys(e).length) fail(422, 'Validation failed.', e)
    Object.assign(v, { size: body.size, color: body.color, barcode: body.barcode || null, cost_price: num(body.cost_price), selling_price: num(body.selling_price), low_stock_threshold: Math.trunc(num(body.low_stock_threshold, 5)), is_active: body.is_active ?? v.is_active })
    save(); return ok({ data: variantOut(db, v, true) })
  }
  if (is('DELETE', 'variants/:id')) {
    needAdmin(); const v = db.variants.find((x: R) => x.id === Number(b)); if (!v) fail(404, 'Not found.')
    if (soldVariant(db, v.id)) { v.is_active = false; save(); return ok({ deactivated: true }) }
    db.variants = db.variants.filter((x: R) => x.id !== v.id); db.movements = db.movements.filter((m: R) => m.variant_id !== v.id); save(); return ok({ deleted: true })
  }
  if (is('POST', 'variants/:id/adjust')) {
    needAdmin(); const v = db.variants.find((x: R) => x.id === Number(b)); if (!v) fail(404, 'Not found.')
    const change = Math.trunc(num(body?.quantity_change)); if (!change) fail(422, 'Quantity is required.', { quantity_change: ['Quantity is required.'] })
    if (v.stock_quantity + change < 0) fail(422, 'Stock cannot go below zero.', { quantity_change: ['Stock cannot go below zero.'] })
    move(db, v, change, 'adjustment', body?.reason ?? null); save(); return ok({ data: variantOut(db, v, true) })
  }
  if (is('GET', 'variants/:id/movements')) { needAdmin(); return ok({ data: db.movements.filter((m: R) => m.variant_id === Number(b)).sort((x: R, y: R) => y.id - x.id).slice(0, 100) }) }

  // customers
  if (is('GET', 'customers')) {
    const s = q.search ?? ''
    const rows = db.customers.filter((x: R) => !s || has(x.name, s) || has(x.phone, s) || has(x.email, s)).sort((x: R, y: R) => x.name.localeCompare(y.name)).map((x: R) => {
      const mine = db.sales.filter((sl: R) => sl.customer_id === x.id && sl.status === 'completed')
      return { ...x, sales_count: mine.length, total_spent: mine.reduce((acc: number, sl: R) => acc + sl.total_amount, 0) }
    })
    return ok(page(rows, q, 15))
  }
  if (is('POST', 'customers')) {
    if (!body.name) fail(422, 'Name is required.', { name: ['Name is required.'] })
    const x = { id: db.seq.customer++, name: body.name, phone: body.phone ?? null, email: body.email ?? null, address: body.address ?? null }
    db.customers.push(x); save(); return ok({ data: { ...x, sales_count: 0, total_spent: 0 } }, 201)
  }
  if (is('PATCH', 'customers/:id')) {
    const x = db.customers.find((k: R) => k.id === Number(b)); if (!x) fail(404, 'Not found.')
    if (!body.name) fail(422, 'Name is required.', { name: ['Name is required.'] })
    Object.assign(x, { name: body.name, phone: body.phone ?? null, email: body.email ?? null, address: body.address ?? null }); save(); return ok({ data: x })
  }
  if (is('DELETE', 'customers/:id')) {
    needAdmin(); db.sales.forEach((s: R) => { if (s.customer_id === Number(b)) s.customer_id = null })
    db.customers = db.customers.filter((k: R) => k.id !== Number(b)); save(); return ok({ deleted: true })
  }

  // sales
  if (is('GET', 'sales')) {
    const s = q.search ?? ''
    const rows = db.sales.filter((x: R) => (admin || x.cashier_id === me.id) && (!q.date || x.sold_at.slice(0, 10) === q.date) &&
      (!s || has(x.receipt_number, s) || has(db.customers.find((k: R) => k.id === x.customer_id)?.name, s)))
      .sort((x: R, y: R) => y.id - x.id)
    const pg = page(rows, q, 15); return ok({ data: pg.data.map((x: R) => saleOut(db, x, false)), meta: pg.meta })
  }
  if (is('GET', 'sales/:id')) {
    const s = db.sales.find((x: R) => x.id === Number(b)); if (!s || (!admin && s.cashier_id !== me.id)) fail(404, 'Not found.')
    return ok({ data: saleOut(db, s, true) })
  }
  if (is('POST', 'sales')) {
    const items: R[] = Array.isArray(body.items) ? body.items : []
    if (!items.length) fail(422, 'Cart is empty.')
    if (!['USD', 'KHR'].includes(body.currency)) fail(422, 'Invalid currency.')
    if (body.idempotency_key) { const dup = db.sales.find((x: R) => x.key === body.idempotency_key); if (dup) return ok({ data: saleOut(db, dup, true) }) }
    const lines = items.map((it) => {
      const v = db.variants.find((x: R) => x.id === it.variant_id && x.is_active); const qty = Math.trunc(num(it.quantity))
      if (!v || qty < 1) fail(422, 'A cart item is no longer available.')
      if (v.stock_quantity < qty) fail(422, `Not enough stock for ${variantOut(db, v, true).product_name} (${v.size}/${v.color}). Only ${v.stock_quantity} left.`)
      return { variant: v, qty }
    })
    const subtotal = lines.reduce((acc, l) => acc + l.variant.selling_price * l.qty, 0)
    const sale = makeSale(db, { cashier_id: me.id, customer_id: body.customer_id || null, currency: body.currency, method: body.payment_method, subtotal, discount: Math.min(Math.max(num(body.discount_amount), 0), subtotal), lines, when: new Date().toISOString(), touchStock: true })
    sale.key = body.idempotency_key; save(); return ok({ data: saleOut(db, sale, true) }, 201)
  }
  if (is('POST', 'sales/:id/void')) {
    needAdmin(); const s = db.sales.find((x: R) => x.id === Number(b)); if (!s) fail(404, 'Not found.')
    if (!String(body?.reason ?? '').trim()) fail(422, 'Reason is required.', { reason: ['Reason is required.'] })
    if (s.status !== 'completed') fail(422, 'Only completed sales can be voided.')
    for (const i of s.items) { const v = db.variants.find((x: R) => x.id === i.variant_id); if (v) move(db, v, i.quantity, 'void', `Void ${s.receipt_number}`) }
    s.status = 'voided'; s.payment_status = 'voided'; s.payments.forEach((p: R) => { p.status = 'voided' }); save(); return ok({ data: saleOut(db, s, true) })
  }

  // dashboard
  if (is('GET', 'dashboard')) {
    needAdmin()
    const done = db.sales.filter((s: R) => s.status === 'completed')
    const day = (d: Date) => d.toISOString().slice(0, 10)
    const today = done.filter((s: R) => s.sold_at.slice(0, 10) === day(new Date()))
    const week = Array.from({ length: 7 }, (_, k) => {
      const d = day(new Date(Date.now() - (6 - k) * 864e5)); const rows = done.filter((s: R) => s.sold_at.slice(0, 10) === d)
      return { date: d, revenue: rows.reduce((a: number, s: R) => a + s.total_amount, 0), orders: rows.length }
    })
    const tally: R = {}
    done.forEach((s: R) => s.items.forEach((i: R) => { const t = (tally[i.product_name] ??= { name: i.product_name, quantity: 0, revenue: 0 }); t.quantity += i.quantity; t.revenue += i.line_total }))
    const low = db.variants.filter((v: R) => v.is_active && v.stock_quantity <= v.low_stock_threshold)
    return ok({ data: {
      today_sales: today.reduce((a: number, s: R) => a + s.total_amount, 0), today_orders: today.length, today_items: today.reduce((a: number, s: R) => a + s.items.reduce((n: number, i: R) => n + i.quantity, 0), 0),
      low_stock_count: low.length, week, top_products: Object.values(tally).sort((x: any, y: any) => y.quantity - x.quantity).slice(0, 5),
      low_stock: low.sort((x: R, y: R) => x.stock_quantity - y.stock_quantity).slice(0, 20).map((v: R) => ({ id: v.id, name: variantOut(db, v, true).product_name, sku: v.sku, size: v.size, color: v.color, stock_quantity: v.stock_quantity })),
    } })
  }
  void a; void c
  return fail(404, 'Not found.')
}

function addVariant(db: R, productId: number, v: R): R {
  const p = db.products.find((x: R) => x.id === productId)
  const row = { id: db.seq.variant++, product_id: productId, sku: v.sku || `SKU-${p.id}-${db.seq.variant}`, barcode: v.barcode || null, size: v.size, color: v.color, cost_price: num(v.cost_price), selling_price: num(v.selling_price), stock_quantity: Math.trunc(num(v.stock_quantity)), low_stock_threshold: Math.trunc(num(v.low_stock_threshold, 5)), is_active: true }
  if (db.variants.some((x: R) => x.product_id === productId && x.size === row.size && x.color === row.color)) fail(422, 'Duplicate size/colour.')
  db.variants.push(row)
  if (row.stock_quantity > 0) db.movements.push({ id: db.seq.move++, variant_id: row.id, type: 'initial', quantity_change: row.stock_quantity, stock_before: 0, stock_after: row.stock_quantity, reason: 'Initial stock', created_at: new Date().toISOString() })
  return row
}

/** axios adapter: answers every request from the in-browser demo database. */
export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const respond = (status: number, data: any): AxiosResponse => ({ data, status, statusText: String(status), headers: {}, config })
  let body = config.data
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { /* keep */ } }
  try {
    const [status, data] = await route((config.method ?? 'get').toUpperCase(), (config.url ?? '').split('?')[0], config.params ?? {}, body)
    return respond(status, data)
  } catch (err) {
    if (err instanceof Fail) {
      const res = respond(err.status, { message: err.message, errors: err.errors })
      throw new AxiosError(err.message, String(err.status), config, null, res)
    }
    throw err
  }
}

export function resetDemo() { mem = null; try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
