import 'node:process'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import sql from 'mssql'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// minimal .env loader
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* no .env */ }

const { DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET = 'dev-secret', PORT = 8000 } = process.env
const UPLOADS = path.join(__dirname, 'uploads')
fs.mkdirSync(UPLOADS, { recursive: true })

const pool = await new sql.ConnectionPool({
  server: DB_SERVER, database: DB_NAME, user: DB_USER, password: DB_PASSWORD,
  options: { trustServerCertificate: true, encrypt: false },
  pool: { max: 10 },
}).connect()

// ---------- helpers ----------
const run = async (text, params = {}, tx) => {
  const r = (tx ? new sql.Request(tx) : pool.request())
  for (const [k, v] of Object.entries(params)) r.input(k, v)
  return (await r.query(text)).recordset ?? []
}
const one = async (text, params, tx) => (await run(text, params, tx))[0]
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
class HttpError extends Error { constructor(status, message, errors) { super(message); this.status = status; this.errors = errors } }
const fail = (status, message, errors) => { throw new HttpError(status, message, errors) }
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
const paging = (req, def = 15) => {
  const per = Math.min(Math.max(num(req.query.per_page, def), 1), 500)
  const page = Math.max(num(req.query.page, 1), 1)
  return { per, page, offset: (page - 1) * per }
}
const meta = (page, per, total) => ({ current_page: page, last_page: Math.max(Math.ceil(total / per), 1), total, per_page: per })
const like = (s) => `%${String(s).replace(/[%_[]/g, (c) => `[${c}]`)}%`
const imageUrl = (p) => (p ? `/api/v1/files/${p}` : null)

const userOut = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, is_active: !!u.is_active, locale: u.locale, created_at: u.created_at })

const variantOut = (v, admin) => ({
  id: v.id, product_id: v.product_id, product_name: v.product_name, category_id: v.category_id,
  category_name: v.category_name ?? null, image_url: imageUrl(v.image_path), sku: v.sku, barcode: v.barcode ?? null,
  size: v.size, color: v.color, selling_price: Number(v.selling_price),
  cost_price: admin ? Number(v.cost_price) : null,
  stock_quantity: v.stock_quantity, low_stock_threshold: v.low_stock_threshold, is_active: !!v.is_active,
})
const VARIANT_SELECT = `SELECT v.*, p.name product_name, p.category_id, p.image_path, c.name category_name
  FROM variants v JOIN products p ON p.id = v.product_id LEFT JOIN categories c ON c.id = p.category_id`

// ---------- app ----------
const app = express()
app.use(express.json())
app.use(cookieParser())
const upload = multer({ dest: UPLOADS, limits: { fileSize: 5 * 1024 * 1024 } })

app.get('/sanctum/csrf-cookie', (_req, res) => res.sendStatus(204))

const api = express.Router()
app.use('/api/v1', api)
api.use('/files', express.static(UPLOADS))
app.use('/product-images', express.static(UPLOADS))

const sign = (u, res) =>
  res.cookie('token', jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '12h' }), { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600e3 })

api.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body ?? {}
  const u = email ? await one('SELECT * FROM users WHERE email = @email', { email }) : null
  if (!u || !(await bcrypt.compare(String(password ?? ''), u.password_hash)))
    fail(422, 'These credentials do not match our records.', { email: ['These credentials do not match our records.'] })
  if (!u.is_active) fail(403, 'This account is disabled.')
  sign(u, res)
  res.json({ data: userOut(u) })
}))

api.post('/logout', (_req, res) => { res.clearCookie('token'); res.sendStatus(204) })

const auth = wrap(async (req, _res, next) => {
  try {
    const { id } = jwt.verify(req.cookies.token ?? '', JWT_SECRET)
    const u = await one('SELECT * FROM users WHERE id = @id', { id })
    if (!u || !u.is_active) throw new Error()
    req.user = u
  } catch { fail(401, 'Unauthenticated.') }
  next()
})
const admin = (req, _res, next) => (req.user.role === 'admin' ? next() : next(new HttpError(403, 'Forbidden.')))

api.get('/settings', wrap(async (_req, res) => {
  const s = await one('SELECT * FROM settings WHERE id = 1')
  res.json({ data: { store_name: s.store_name, address: s.address, phone: s.phone, khr_per_usd: Number(s.khr_per_usd), receipt_footer: s.receipt_footer } })
}))

api.use(auth)

api.get('/user', (req, res) => res.json({ data: userOut(req.user) }))
api.patch('/user/profile', wrap(async (req, res) => {
  const locale = req.body?.locale
  if (!['en', 'km'].includes(locale)) fail(422, 'Invalid locale.', { locale: ['Invalid locale.'] })
  await run('UPDATE users SET locale = @locale, updated_at = SYSUTCDATETIME() WHERE id = @id', { locale, id: req.user.id })
  res.json({ data: userOut({ ...req.user, locale }) })
}))

// ---------- users (admin) ----------
api.get('/users', admin, wrap(async (req, res) => {
  const { per, page, offset } = paging(req)
  const s = req.query.search ? like(req.query.search) : null
  const where = s ? 'WHERE name LIKE @s OR email LIKE @s' : ''
  const total = (await one(`SELECT COUNT(*) n FROM users ${where}`, { s })).n
  const rows = await run(`SELECT * FROM users ${where} ORDER BY id DESC OFFSET @o ROWS FETCH NEXT @p ROWS ONLY`, { s, o: offset, p: per })
  res.json({ data: rows.map(userOut), meta: meta(page, per, total) })
}))
api.post('/users', admin, wrap(async (req, res) => {
  const { name, email, password, role } = req.body ?? {}
  const errors = {}
  if (!name) errors.name = ['Name is required.']
  if (!email) errors.email = ['Email is required.']
  if (!password || String(password).length < 6) errors.password = ['Password must be at least 6 characters.']
  if (!['admin', 'cashier'].includes(role)) errors.role = ['Invalid role.']
  if (email && (await one('SELECT id FROM users WHERE email = @email', { email }))) errors.email = ['Email already taken.']
  if (Object.keys(errors).length) fail(422, 'Validation failed.', errors)
  const u = await one(
    'INSERT INTO users (name, email, password_hash, role) OUTPUT INSERTED.* VALUES (@name, @email, @h, @role)',
    { name, email, h: await bcrypt.hash(String(password), 10), role },
  )
  res.status(201).json({ data: userOut(u) })
}))
api.patch('/users/:id/status', admin, wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) fail(422, 'You cannot disable your own account.')
  const u = await one('UPDATE users SET is_active = @a OUTPUT INSERTED.* WHERE id = @id', { a: req.body?.is_active ? 1 : 0, id: req.params.id })
  if (!u) fail(404, 'Not found.')
  res.json({ data: userOut(u) })
}))

// ---------- categories ----------
api.get('/categories', wrap(async (_req, res) => {
  const rows = await run(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) products_count
    FROM categories c ORDER BY c.name`)
  res.json({ data: rows.map((c) => ({ id: c.id, name: c.name, is_active: !!c.is_active, products_count: c.products_count })) })
}))
api.post('/categories', admin, wrap(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) fail(422, 'Name is required.', { name: ['Name is required.'] })
  if (await one('SELECT id FROM categories WHERE name = @name', { name })) fail(422, 'Category already exists.', { name: ['Category already exists.'] })
  const c = await one('INSERT INTO categories (name) OUTPUT INSERTED.* VALUES (@name)', { name })
  res.status(201).json({ data: { id: c.id, name: c.name, is_active: true, products_count: 0 } })
}))

api.patch('/categories/:id', admin, wrap(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) fail(422, 'Name is required.', { name: ['Name is required.'] })
  const c = await one('UPDATE categories SET name = @n OUTPUT INSERTED.* WHERE id = @id', { n: name, id: req.params.id }).catch((e) => { throw dupMsg(e) })
  if (!c) fail(404, 'Not found.')
  res.json({ data: c })
}))
api.delete('/categories/:id', admin, wrap(async (req, res) => {
  if (await one('SELECT TOP 1 1 x FROM products WHERE category_id = @id', { id: req.params.id })) fail(422, 'Category still has products.')
  await run('DELETE FROM categories WHERE id = @id', { id: req.params.id })
  res.json({ deleted: true })
}))

// ---------- products ----------
async function loadProducts(where, params, isAdmin, extra = '') {
  const prods = await run(`SELECT p.*, c.name category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where} ${extra}`, params)
  if (!prods.length) return []
  const ids = prods.map((p) => Number(p.id)).join(',')
  const vars = await run(`${VARIANT_SELECT} WHERE v.product_id IN (${ids}) ORDER BY v.id`)
  return prods.map((p) => {
    const vs = vars.filter((v) => v.product_id === p.id).map((v) => variantOut(v, isAdmin))
    const prices = vs.map((v) => v.selling_price)
    return {
      id: p.id, name: p.name, description: p.description, brand: p.brand, category_id: p.category_id,
      category_name: p.category_name, image_path: p.image_path, image_url: imageUrl(p.image_path), is_active: !!p.is_active,
      total_stock: vs.reduce((a, v) => a + v.stock_quantity, 0),
      min_price: prices.length ? Math.min(...prices) : null, max_price: prices.length ? Math.max(...prices) : null,
      variants: vs,
    }
  })
}
const isAdmin = (req) => req.user.role === 'admin'

api.get('/products', wrap(async (req, res) => {
  const { per, page, offset } = paging(req, 24)
  const conds = ['1=1']
  const params = {}
  if (req.query.search) { conds.push('(p.name LIKE @s OR p.brand LIKE @s OR EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND (v.sku LIKE @s OR v.barcode LIKE @s)))'); params.s = like(req.query.search) }
  if (req.query.category_id) { conds.push('p.category_id = @cat'); params.cat = Number(req.query.category_id) }
  const where = `WHERE ${conds.join(' AND ')}`
  const total = (await one(`SELECT COUNT(*) n FROM products p ${where}`, params)).n
  const data = await loadProducts(where, { ...params, o: offset, p: per }, isAdmin(req), 'ORDER BY p.id DESC OFFSET @o ROWS FETCH NEXT @p ROWS ONLY')
  res.json({ data, meta: meta(page, per, total) })
}))
api.get('/products/:id', wrap(async (req, res) => {
  const [p] = await loadProducts('WHERE p.id = @id', { id: req.params.id }, isAdmin(req))
  if (!p) fail(404, 'Not found.')
  res.json({ data: p })
}))

const genSku = () => `SKU-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
async function insertVariant(tx, productId, v, userId) {
  const row = await one(
    `INSERT INTO variants (product_id, sku, barcode, size, color, cost_price, selling_price, stock_quantity, low_stock_threshold)
     OUTPUT INSERTED.* VALUES (@pid, @sku, @barcode, @size, @color, @cost, @price, @stock, @low)`,
    { pid: productId, sku: v.sku || genSku(), barcode: v.barcode || null, size: v.size, color: v.color, cost: num(v.cost_price), price: num(v.selling_price), stock: Math.trunc(num(v.stock_quantity)), low: Math.trunc(num(v.low_stock_threshold, 5)) },
    tx,
  )
  if (row.stock_quantity > 0)
    await run(`INSERT INTO stock_movements (variant_id, user_id, type, quantity_change, stock_before, stock_after, reason) VALUES (@v, @u, 'initial', @q, 0, @q, 'Initial stock')`, { v: row.id, u: userId, q: row.stock_quantity }, tx)
  return row
}
function checkVariant(v, prefix, errors) {
  if (!v.size) errors[`${prefix}.size`] = ['Size is required.']
  if (!v.color) errors[`${prefix}.color`] = ['Color is required.']
  if (!(num(v.selling_price, -1) >= 0) || v.selling_price === '' || v.selling_price == null) errors[`${prefix}.selling_price`] = ['Selling price is required.']
}
const withTx = async (fn) => {
  const tx = new sql.Transaction(pool)
  await tx.begin()
  try { const r = await fn(tx); await tx.commit(); return r } catch (e) { await tx.rollback().catch(() => {}); throw e }
}
const dupMsg = (e) => (e.number === 2601 || e.number === 2627 ? new HttpError(422, 'Duplicate SKU, barcode, or size/color.') : e)

api.post('/products', admin, wrap(async (req, res) => {
  const b = req.body ?? {}
  const errors = {}
  if (!b.name) errors.name = ['Name is required.']
  if (!b.category_id) errors.category_id = ['Category is required.']
  const vs = Array.isArray(b.variants) ? b.variants : []
  if (!vs.length) errors.variants = ['At least one variant is required.']
  vs.forEach((v, i) => checkVariant(v, `variants.${i}`, errors))
  if (Object.keys(errors).length) fail(422, 'Validation failed.', errors)
  const id = await withTx(async (tx) => {
    const p = await one('INSERT INTO products (category_id, name, description, brand) OUTPUT INSERTED.id VALUES (@c, @n, @d, @b)', { c: b.category_id, n: b.name, d: b.description || null, b: b.brand || null }, tx)
    for (const v of vs) await insertVariant(tx, p.id, v, req.user.id)
    return p.id
  }).catch((e) => { throw dupMsg(e) })
  const [p] = await loadProducts('WHERE p.id = @id', { id }, true)
  res.status(201).json({ data: p })
}))
api.patch('/products/:id', admin, wrap(async (req, res) => {
  const b = req.body ?? {}
  if (!b.name) fail(422, 'Validation failed.', { name: ['Name is required.'] })
  const r = await one(
    `UPDATE products SET name=@n, description=@d, brand=@b, category_id=@c, is_active=COALESCE(@a, is_active), updated_at=SYSUTCDATETIME()
     OUTPUT INSERTED.id WHERE id=@id`,
    { n: b.name, d: b.description || null, b: b.brand || null, c: b.category_id, a: b.is_active == null ? null : b.is_active ? 1 : 0, id: req.params.id },
  )
  if (!r) fail(404, 'Not found.')
  const [p] = await loadProducts('WHERE p.id = @id', { id: r.id }, true)
  res.json({ data: p })
}))
api.post('/products/:id/image', admin, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) fail(422, 'Image is required.', { image: ['Image is required.'] })
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
  const name = `${randomUUID()}${ext}`
  fs.renameSync(req.file.path, path.join(UPLOADS, name))
  const old = await one('SELECT image_path FROM products WHERE id = @id', { id: req.params.id })
  if (!old) fail(404, 'Not found.')
  if (old.image_path) fs.rmSync(path.join(UPLOADS, path.basename(old.image_path)), { force: true })
  await run('UPDATE products SET image_path = @p WHERE id = @id', { p: name, id: req.params.id })
  res.json({ data: { image_path: name, image_url: imageUrl(name) } })
}))
api.delete('/products/:id/image', admin, wrap(async (req, res) => {
  const old = await one('SELECT image_path FROM products WHERE id = @id', { id: req.params.id })
  if (old?.image_path) fs.rmSync(path.join(UPLOADS, path.basename(old.image_path)), { force: true })
  await run('UPDATE products SET image_path = NULL WHERE id = @id', { id: req.params.id })
  res.sendStatus(204)
}))
api.post('/products/:id/variants', admin, wrap(async (req, res) => {
  const errors = {}
  checkVariant(req.body ?? {}, 'variant', errors)
  if (Object.keys(errors).length) fail(422, 'Validation failed.', errors)
  if (!(await one('SELECT id FROM products WHERE id = @id', { id: req.params.id }))) fail(404, 'Not found.')
  const row = await withTx((tx) => insertVariant(tx, Number(req.params.id), req.body, req.user.id)).catch((e) => { throw dupMsg(e) })
  const v = await one(`${VARIANT_SELECT} WHERE v.id = @id`, { id: row.id })
  res.status(201).json({ data: variantOut(v, true) })
}))

// delete a product/variant, or deactivate it when it already appears on a sale
async function removeVariants(tx, variantIds) {
  if (!variantIds.length) return
  const ids = variantIds.map(Number).join(',')
  await run(`DELETE FROM stock_movements WHERE variant_id IN (${ids})`, {}, tx)
  await run(`DELETE FROM variants WHERE id IN (${ids})`, {}, tx)
}
api.delete('/products/:id', admin, wrap(async (req, res) => {
  const p = await one('SELECT id, image_path FROM products WHERE id = @id', { id: req.params.id })
  if (!p) fail(404, 'Not found.')
  const used = await one('SELECT TOP 1 1 x FROM sale_items i JOIN variants v ON v.id = i.variant_id WHERE v.product_id = @id', { id: p.id })
  if (used) {
    await run('UPDATE products SET is_active = 0 WHERE id = @id', { id: p.id })
    return res.json({ deactivated: true })
  }
  await withTx(async (tx) => {
    await removeVariants(tx, (await run('SELECT id FROM variants WHERE product_id = @id', { id: p.id }, tx)).map((v) => v.id))
    await run('DELETE FROM products WHERE id = @id', { id: p.id }, tx)
  })
  if (p.image_path) fs.rmSync(path.join(UPLOADS, path.basename(p.image_path)), { force: true })
  res.json({ deleted: true })
}))

// ---------- variants / inventory ----------
api.patch('/variants/:id', admin, wrap(async (req, res) => {
  const b = req.body ?? {}
  const errors = {}
  checkVariant(b, 'variant', errors)
  if (Object.keys(errors).length) fail(422, 'Validation failed.', errors)
  const r = await one(`UPDATE variants SET size=@size, color=@color, barcode=@barcode, cost_price=@cost, selling_price=@price,
      low_stock_threshold=@low, is_active=COALESCE(@a, is_active) OUTPUT INSERTED.id WHERE id=@id`,
    { size: b.size, color: b.color, barcode: b.barcode || null, cost: num(b.cost_price), price: num(b.selling_price), low: Math.trunc(num(b.low_stock_threshold, 5)), a: b.is_active == null ? null : b.is_active ? 1 : 0, id: req.params.id }).catch((e) => { throw dupMsg(e) })
  if (!r) fail(404, 'Not found.')
  res.json({ data: variantOut(await one(`${VARIANT_SELECT} WHERE v.id = @id`, { id: r.id }), true) })
}))
api.delete('/variants/:id', admin, wrap(async (req, res) => {
  const v = await one('SELECT id FROM variants WHERE id = @id', { id: req.params.id })
  if (!v) fail(404, 'Not found.')
  if (await one('SELECT TOP 1 1 x FROM sale_items WHERE variant_id = @id', { id: v.id })) {
    await run('UPDATE variants SET is_active = 0 WHERE id = @id', { id: v.id })
    return res.json({ deactivated: true })
  }
  await withTx((tx) => removeVariants(tx, [v.id]))
  res.json({ deleted: true })
}))
api.get('/variants', wrap(async (req, res) => {
  const { per, page, offset } = paging(req, 20)
  const conds = ['1=1']
  const params = {}
  if (req.query.search) { conds.push('(p.name LIKE @s OR v.sku LIKE @s OR v.barcode LIKE @s)'); params.s = like(req.query.search) }
  if (req.query.sellable) conds.push('v.is_active = 1 AND p.is_active = 1')
  if (req.query.low_stock) conds.push('v.stock_quantity <= v.low_stock_threshold')
  const from = `FROM variants v JOIN products p ON p.id = v.product_id WHERE ${conds.join(' AND ')}`
  const total = (await one(`SELECT COUNT(*) n ${from}`, params)).n
  const rows = await run(`SELECT v.*, p.name product_name, p.category_id, p.image_path, (SELECT name FROM categories WHERE id = p.category_id) category_name
    ${from} ORDER BY p.name, v.size, v.color OFFSET @o ROWS FETCH NEXT @p ROWS ONLY`, { ...params, o: offset, p: per })
  res.json({ data: rows.map((v) => variantOut(v, isAdmin(req))), meta: meta(page, per, total) })
}))
api.post('/variants/:id/adjust', admin, wrap(async (req, res) => {
  const change = Math.trunc(num(req.body?.quantity_change))
  if (!change) fail(422, 'Quantity is required.', { quantity_change: ['Quantity is required.'] })
  await withTx(async (tx) => {
    const v = await one('SELECT stock_quantity FROM variants WITH (UPDLOCK) WHERE id = @id', { id: req.params.id }, tx)
    if (!v) fail(404, 'Not found.')
    const after = v.stock_quantity + change
    if (after < 0) fail(422, 'Stock cannot go below zero.', { quantity_change: ['Stock cannot go below zero.'] })
    await run('UPDATE variants SET stock_quantity = @a WHERE id = @id', { a: after, id: req.params.id }, tx)
    await run(`INSERT INTO stock_movements (variant_id, user_id, type, quantity_change, stock_before, stock_after, reason)
      VALUES (@id, @u, 'adjustment', @c, @b, @a, @r)`, { id: req.params.id, u: req.user.id, c: change, b: v.stock_quantity, a: after, r: req.body?.reason || null }, tx)
  })
  const v = await one(`${VARIANT_SELECT} WHERE v.id = @id`, { id: req.params.id })
  res.json({ data: variantOut(v, true) })
}))
api.get('/variants/:id/movements', admin, wrap(async (req, res) => {
  const rows = await run('SELECT TOP 100 * FROM stock_movements WHERE variant_id = @id ORDER BY id DESC', { id: req.params.id })
  res.json({ data: rows.map((m) => ({ id: m.id, type: m.type, quantity_change: m.quantity_change, stock_before: m.stock_before, stock_after: m.stock_after, reason: m.reason, created_at: m.created_at })) })
}))

// ---------- customers ----------
api.get('/customers', wrap(async (req, res) => {
  const { per, page, offset } = paging(req)
  const s = req.query.search ? like(req.query.search) : null
  const where = s ? 'WHERE c.name LIKE @s OR c.phone LIKE @s OR c.email LIKE @s' : ''
  const total = (await one(`SELECT COUNT(*) n FROM customers c ${where}`, { s })).n
  const rows = await run(`SELECT c.*,
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') sales_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') total_spent
    FROM customers c ${where} ORDER BY c.name OFFSET @o ROWS FETCH NEXT @p ROWS ONLY`, { s, o: offset, p: per })
  res.json({ data: rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, sales_count: c.sales_count, total_spent: Number(c.total_spent) })), meta: meta(page, per, total) })
}))
api.post('/customers', wrap(async (req, res) => {
  const b = req.body ?? {}
  if (!b.name) fail(422, 'Name is required.', { name: ['Name is required.'] })
  const c = await one('INSERT INTO customers (name, phone, email, address) OUTPUT INSERTED.* VALUES (@n, @p, @e, @a)', { n: b.name, p: b.phone || null, e: b.email || null, a: b.address || null })
  res.status(201).json({ data: { ...c, sales_count: 0, total_spent: 0 } })
}))

api.patch('/customers/:id', wrap(async (req, res) => {
  const b = req.body ?? {}
  if (!b.name) fail(422, 'Name is required.', { name: ['Name is required.'] })
  const c = await one('UPDATE customers SET name=@n, phone=@p, email=@e, address=@a OUTPUT INSERTED.* WHERE id=@id', { n: b.name, p: b.phone || null, e: b.email || null, a: b.address || null, id: req.params.id })
  if (!c) fail(404, 'Not found.')
  res.json({ data: c })
}))
api.delete('/customers/:id', admin, wrap(async (req, res) => {
  await withTx(async (tx) => {
    await run('UPDATE sales SET customer_id = NULL WHERE customer_id = @id', { id: req.params.id }, tx)
    await run('DELETE FROM customers WHERE id = @id', { id: req.params.id }, tx)
  })
  res.json({ deleted: true })
}))

// ---------- sales ----------
async function loadSale(id, detail = true) {
  const s = await one(`SELECT s.*, u.name cashier_name, c.name customer_name, c.phone customer_phone,
      (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id) item_count
    FROM sales s JOIN users u ON u.id = s.cashier_id LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = @id`, { id })
  return s ? saleOut(s, detail) : null
}
async function saleOut(s, detail) {
  const out = {
    id: s.id, receipt_number: s.receipt_number, status: s.status, payment_status: s.payment_status, currency: s.currency,
    exchange_rate: Number(s.exchange_rate), subtotal: Number(s.subtotal), discount_amount: Number(s.discount_amount),
    tax_amount: Number(s.tax_amount), total_amount: Number(s.total_amount), notes: s.notes, sold_at: s.sold_at,
    cashier: { id: s.cashier_id, name: s.cashier_name },
    customer: s.customer_id ? { id: s.customer_id, name: s.customer_name, phone: s.customer_phone } : null,
    item_count: s.item_count,
  }
  if (detail) {
    out.items = (await run('SELECT * FROM sale_items WHERE sale_id = @id ORDER BY id', { id: s.id })).map((i) => ({
      id: i.id, product_name: i.product_name, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, unit_price: Number(i.unit_price), line_total: Number(i.line_total),
    }))
    out.payments = (await run('SELECT * FROM payments WHERE sale_id = @id', { id: s.id })).map((p) => ({ method: p.method, currency: p.currency, amount: Number(p.amount), status: p.status }))
  }
  return out
}

api.get('/sales', wrap(async (req, res) => {
  const { per, page, offset } = paging(req)
  const conds = ['1=1']
  const params = {}
  if (req.user.role !== 'admin') { conds.push('s.cashier_id = @me'); params.me = req.user.id }
  if (req.query.search) { conds.push('(s.receipt_number LIKE @s OR c.name LIKE @s OR c.phone LIKE @s)'); params.s = like(req.query.search) }
  if (req.query.date) { conds.push('CAST(s.sold_at AS DATE) = @d'); params.d = req.query.date }
  const from = `FROM sales s JOIN users u ON u.id = s.cashier_id LEFT JOIN customers c ON c.id = s.customer_id WHERE ${conds.join(' AND ')}`
  const total = (await one(`SELECT COUNT(*) n ${from}`, params)).n
  const rows = await run(`SELECT s.*, u.name cashier_name, c.name customer_name, c.phone customer_phone,
      (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id) item_count
    ${from} ORDER BY s.id DESC OFFSET @o ROWS FETCH NEXT @p ROWS ONLY`, { ...params, o: offset, p: per })
  res.json({ data: await Promise.all(rows.map((r) => saleOut(r, false))), meta: meta(page, per, total) })
}))
api.get('/sales/:id', wrap(async (req, res) => {
  const s = await loadSale(req.params.id)
  if (!s || (req.user.role !== 'admin' && s.cashier.id !== req.user.id)) fail(404, 'Not found.')
  res.json({ data: s })
}))

api.post('/sales', wrap(async (req, res) => {
  const b = req.body ?? {}
  const items = Array.isArray(b.items) ? b.items : []
  if (!items.length) fail(422, 'Cart is empty.')
  if (!['USD', 'KHR'].includes(b.currency)) fail(422, 'Invalid currency.')
  if (!['cash', 'khqr', 'bank_transfer'].includes(b.payment_method)) fail(422, 'Invalid payment method.')
  if (b.idempotency_key) {
    const dup = await one('SELECT id FROM sales WHERE idempotency_key = @k', { k: b.idempotency_key })
    if (dup) return res.status(200).json({ data: await loadSale(dup.id) })
  }
  const rate = Number((await one('SELECT khr_per_usd FROM settings WHERE id = 1')).khr_per_usd)
  const saleId = await withTx(async (tx) => {
    let subtotal = 0
    const lines = []
    for (const it of items) {
      const qty = Math.trunc(num(it.quantity))
      if (qty < 1) fail(422, 'Invalid quantity.')
      const v = await one(`SELECT v.*, p.name product_name FROM variants v WITH (UPDLOCK) JOIN products p ON p.id = v.product_id WHERE v.id = @id AND v.is_active = 1`, { id: it.variant_id }, tx)
      if (!v) fail(422, 'A cart item is no longer available.')
      if (v.stock_quantity < qty) fail(422, `Not enough stock for ${v.product_name} (${v.size}/${v.color}). Only ${v.stock_quantity} left.`)
      const line = Number(v.selling_price) * qty
      subtotal += line
      lines.push({ v, qty, line })
    }
    const discount = Math.min(Math.max(num(b.discount_amount), 0), subtotal)
    const total = subtotal - discount
    const sale = await one(`INSERT INTO sales (receipt_number, cashier_id, customer_id, currency, exchange_rate, subtotal, discount_amount, tax_amount, total_amount, idempotency_key)
      OUTPUT INSERTED.id VALUES (@rn, @cashier, @cust, @cur, @rate, @sub, @disc, 0, @tot, @idem)`,
      { rn: randomUUID().slice(0, 30), cashier: req.user.id, cust: b.customer_id || null, cur: b.currency, rate, sub: subtotal, disc: discount, tot: total, idem: b.idempotency_key || null }, tx)
    const day = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    await run('UPDATE sales SET receipt_number = @rn WHERE id = @id', { rn: `INV-${day}-${String(sale.id).padStart(5, '0')}`, id: sale.id }, tx)
    for (const { v, qty, line } of lines) {
      await run(`INSERT INTO sale_items (sale_id, variant_id, product_name, sku, size, color, quantity, unit_price, line_total)
        VALUES (@s, @v, @pn, @sku, @size, @color, @q, @up, @lt)`, { s: sale.id, v: v.id, pn: v.product_name, sku: v.sku, size: v.size, color: v.color, q: qty, up: v.selling_price, lt: line }, tx)
      await run('UPDATE variants SET stock_quantity = stock_quantity - @q WHERE id = @id', { q: qty, id: v.id }, tx)
      await run(`INSERT INTO stock_movements (variant_id, user_id, sale_id, type, quantity_change, stock_before, stock_after, reason)
        VALUES (@v, @u, @s, 'sale', @c, @b, @a, 'Sale')`, { v: v.id, u: req.user.id, s: sale.id, c: -qty, b: v.stock_quantity, a: v.stock_quantity - qty }, tx)
    }
    await run('INSERT INTO payments (sale_id, method, currency, amount) VALUES (@s, @m, @c, @a)', { s: sale.id, m: b.payment_method, c: b.currency, a: total }, tx)
    return sale.id
  })
  res.status(201).json({ data: await loadSale(saleId) })
}))

api.post('/sales/:id/void', admin, wrap(async (req, res) => {
  const reason = String(req.body?.reason ?? '').trim()
  if (!reason) fail(422, 'Reason is required.', { reason: ['Reason is required.'] })
  await withTx(async (tx) => {
    const s = await one('SELECT * FROM sales WITH (UPDLOCK) WHERE id = @id', { id: req.params.id }, tx)
    if (!s) fail(404, 'Not found.')
    if (s.status !== 'completed') fail(422, 'Only completed sales can be voided.')
    for (const i of await run('SELECT * FROM sale_items WHERE sale_id = @id', { id: s.id }, tx)) {
      const v = await one('SELECT stock_quantity FROM variants WITH (UPDLOCK) WHERE id = @id', { id: i.variant_id }, tx)
      await run('UPDATE variants SET stock_quantity = stock_quantity + @q WHERE id = @id', { q: i.quantity, id: i.variant_id }, tx)
      await run(`INSERT INTO stock_movements (variant_id, user_id, sale_id, type, quantity_change, stock_before, stock_after, reason)
        VALUES (@v, @u, @s, 'void', @c, @b, @a, @r)`, { v: i.variant_id, u: req.user.id, s: s.id, c: i.quantity, b: v.stock_quantity, a: v.stock_quantity + i.quantity, r: `Void ${s.receipt_number}` }, tx)
    }
    await run(`UPDATE sales SET status = 'voided', payment_status = 'voided', void_reason = @r WHERE id = @id`, { r: reason, id: s.id }, tx)
    await run(`UPDATE payments SET status = 'voided' WHERE sale_id = @id`, { id: s.id }, tx)
  })
  res.json({ data: await loadSale(req.params.id) })
}))

// ---------- dashboard ----------
api.get('/dashboard', admin, wrap(async (_req, res) => {
  const today = await one(`SELECT COALESCE(SUM(total_amount), 0) sales, COUNT(*) orders,
      COALESCE((SELECT SUM(i.quantity) FROM sale_items i JOIN sales s2 ON s2.id = i.sale_id WHERE s2.status = 'completed' AND CAST(s2.sold_at AS DATE) = CAST(SYSUTCDATETIME() AS DATE)), 0) items
    FROM sales WHERE status = 'completed' AND CAST(sold_at AS DATE) = CAST(SYSUTCDATETIME() AS DATE)`)
  const weekRows = await run(`SELECT CONVERT(VARCHAR(10), CAST(sold_at AS DATE), 23) d, SUM(total_amount) revenue, COUNT(*) orders
    FROM sales WHERE status = 'completed' AND sold_at >= DATEADD(DAY, -6, CAST(SYSUTCDATETIME() AS DATE)) GROUP BY CAST(sold_at AS DATE)`)
  const week = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    const r = weekRows.find((x) => x.d === d)
    week.push({ date: d, revenue: r ? Number(r.revenue) : 0, orders: r ? r.orders : 0 })
  }
  const top = await run(`SELECT TOP 5 i.product_name name, SUM(i.quantity) quantity, SUM(i.line_total) revenue
    FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE s.status = 'completed' GROUP BY i.product_name ORDER BY SUM(i.quantity) DESC`)
  const low = await run(`SELECT TOP 20 v.id, p.name, v.sku, v.size, v.color, v.stock_quantity
    FROM variants v JOIN products p ON p.id = v.product_id WHERE v.is_active = 1 AND v.stock_quantity <= v.low_stock_threshold ORDER BY v.stock_quantity`)
  const lowCount = (await one('SELECT COUNT(*) n FROM variants WHERE is_active = 1 AND stock_quantity <= low_stock_threshold')).n
  res.json({ data: {
    today_sales: Number(today.sales), today_orders: today.orders, today_items: today.items, low_stock_count: lowCount, week,
    top_products: top.map((t) => ({ name: t.name, quantity: t.quantity, revenue: Number(t.revenue) })),
    low_stock: low,
  } })
}))

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, errors: err.errors })
  console.error(err)
  res.status(500).json({ message: 'Server error.' })
})

app.listen(PORT, () => console.log(`StylePOS API on http://localhost:${PORT}`))
