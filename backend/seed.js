// Sample data: T-Shirts, Pants, Shoes + customers + a cashier + past sales.  Run: node seed.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'

const dir = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.join(dir, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
}
const UPLOADS = path.join(dir, 'uploads')
fs.mkdirSync(UPLOADS, { recursive: true })

const pool = await new sql.ConnectionPool({
  server: process.env.DB_SERVER, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  options: { trustServerCertificate: true, encrypt: false },
}).connect()
const q = async (text, params = {}) => {
  const r = pool.request()
  for (const [k, v] of Object.entries(params)) r.input(k, v)
  return (await r.query(text)).recordset ?? []
}

if ((await q('SELECT COUNT(*) n FROM products'))[0].n > 0) {
  console.log('Products already exist - seed skipped.')
  process.exit(0)
}

// ---------- placeholder product pictures (SVG) ----------
const FILL = { black: '#161616', white: '#f6f6f6', grey: '#8d8d8d', beige: '#d8c7a3' }
const SHAPES = {
  tee: '<path d="M62 34 L88 22 Q100 40 112 22 L138 34 L176 66 L154 92 L140 78 L140 172 L60 172 L60 78 L46 92 L24 66 Z"/>',
  pants: '<path d="M60 22 H140 L152 178 H108 L100 84 L92 178 H48 Z"/>',
  shoe: '<path d="M18 128 Q18 100 44 98 L68 94 L84 68 L112 84 Q142 94 176 114 Q188 122 184 140 L18 140 Z"/><rect x="16" y="140" width="170" height="14" rx="7" fill="#d9d9d9" stroke="#161616" stroke-width="3"/>',
}
function svg(shape, color) {
  const f = FILL[color.toLowerCase()] ?? '#bbbbbb'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dcdcdc"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><g fill="${f}" stroke="#161616" stroke-width="3" stroke-linejoin="round">${SHAPES[shape]}</g></svg>`
}

// ---------- categories ----------
const cats = {}
await q("UPDATE categories SET name = N'T-Shirts' WHERE name = N'Tops'")
for (const name of ['T-Shirts', 'Pants', 'Shoes']) {
  const ex = (await q('SELECT id FROM categories WHERE name = @n', { n: name }))[0]
  cats[name] = ex ? ex.id : (await q('INSERT INTO categories (name) OUTPUT INSERTED.id VALUES (@n)', { n: name }))[0].id
}

// ---------- products ----------
const P = [
  ['T-Shirts', 'tee', 'TEE-CLS', 'Classic Cotton Tee', 'Horangi', 'Soft 100% cotton crew-neck tee for everyday wear.', 6, 12, ['Black', 'White'], ['S', 'M', 'L', 'XL']],
  ['T-Shirts', 'tee', 'TEE-OVR', 'Oversized Graphic Tee', 'Horangi', 'Relaxed oversized fit with tiger graphic print.', 8, 18, ['Black', 'Grey'], ['M', 'L', 'XL']],
  ['T-Shirts', 'tee', 'TEE-TGR', 'Tiger Print Tee', 'Horangi', 'Limited tiger print tee, heavyweight cotton.', 9, 20, ['White', 'Black'], ['S', 'M', 'L']],
  ['T-Shirts', 'tee', 'POL-PIQ', 'Pique Polo Shirt', 'Horangi', 'Smart-casual polo with ribbed collar.', 11, 22, ['Black', 'White', 'Grey'], ['M', 'L', 'XL']],
  ['Pants', 'pants', 'JNS-SLM', 'Slim Fit Jeans', 'Horangi', 'Stretch denim, slim through the leg.', 18, 35, ['Black', 'Grey'], ['28', '30', '32', '34']],
  ['Pants', 'pants', 'CRG-PNT', 'Cargo Pants', 'Horangi', 'Utility cargo with six pockets.', 20, 38, ['Black', 'Beige'], ['30', '32', '34']],
  ['Pants', 'pants', 'JOG-PNT', 'Jogger Pants', 'Horangi', 'Comfort fleece joggers with tapered cuff.', 14, 28, ['Black', 'Grey'], ['S', 'M', 'L', 'XL']],
  ['Pants', 'pants', 'CHN-PNT', 'Chino Pants', 'Horangi', 'Classic chino, office to weekend.', 16, 32, ['Beige', 'Black'], ['30', '32', '34']],
  ['Shoes', 'shoe', 'SNK-STR', 'Street Sneakers', 'Horangi', 'Cushioned everyday sneakers.', 30, 59, ['White', 'Black'], ['39', '40', '41', '42', '43']],
  ['Shoes', 'shoe', 'RUN-PRO', 'Running Shoes', 'Horangi', 'Lightweight breathable running shoes.', 35, 69, ['Black', 'Grey'], ['40', '41', '42', '43']],
  ['Shoes', 'shoe', 'CNV-LOW', 'Canvas Low Top', 'Horangi', 'Timeless low-top canvas sneaker.', 19, 39, ['White', 'Black'], ['38', '39', '40', '41', '42']],
  ['Shoes', 'shoe', 'SLD-SND', 'Slide Sandals', 'Horangi', 'Easy slip-on slides for hot days.', 8, 19, ['Black'], ['40', '41', '42']],
]
let seedN = 7
const rnd = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280)
const variants = []
for (const [cat, shape, code, name, brand, desc, cost, price, colors, sizes] of P) {
  const file = `seed-${code.toLowerCase()}.svg`
  fs.writeFileSync(path.join(UPLOADS, file), svg(shape, colors[0]))
  const pid = (await q('INSERT INTO products (category_id, name, description, brand, image_path) OUTPUT INSERTED.id VALUES (@c,@n,@d,@b,@i)', { c: cats[cat], n: name, d: desc, b: brand, i: file }))[0].id
  for (const color of colors) for (const size of sizes) {
    const stock = Math.floor(rnd() * 28) + 4
    const sku = `${code}-${color.slice(0, 3).toUpperCase()}-${size}`
    const v = (await q(`INSERT INTO variants (product_id, sku, size, color, cost_price, selling_price, stock_quantity, low_stock_threshold)
      OUTPUT INSERTED.* VALUES (@p,@sku,@size,@color,@cost,@price,@stock,5)`, { p: pid, sku, size, color, cost, price, stock }))[0]
    await q(`INSERT INTO stock_movements (variant_id, type, quantity_change, stock_before, stock_after, reason) VALUES (@v,'initial',@s,0,@s,'Initial stock')`, { v: v.id, s: stock })
    variants.push({ ...v, name })
  }
}
// a couple of low / sold-out items so the dashboard and inventory show alerts
await q("UPDATE variants SET stock_quantity = 2 WHERE sku IN ('TEE-CLS-BLK-M','SNK-STR-WHI-42')")
await q("UPDATE variants SET stock_quantity = 0 WHERE sku = 'SLD-SND-BLA-41'")

// ---------- customers ----------
const custs = [
  ['Sokha Chan', '012 345 678', 'sokha@example.com', 'Phnom Penh'],
  ['Dara Kim', '096 111 2233', 'dara@example.com', 'Siem Reap'],
  ['Srey Neang', '098 765 432', null, 'Phnom Penh'],
  ['Vannak Sok', '077 888 999', 'vannak@example.com', 'Battambang'],
  ['Maly Heng', '010 222 333', null, 'Kampot'],
]
const custIds = []
for (const [name, phone, email, address] of custs)
  custIds.push((await q('INSERT INTO customers (name, phone, email, address) OUTPUT INSERTED.id VALUES (@n,@p,@e,@a)', { n: name, p: phone, e: email, a: address }))[0].id)

// ---------- cashier ----------
const HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // "password"
let cashier = (await q("SELECT id FROM users WHERE email = N'cashier@stylepos.test'"))[0]
if (!cashier) cashier = (await q("INSERT INTO users (name,email,password_hash,role) OUTPUT INSERTED.id VALUES (N'Cashier',N'cashier@stylepos.test',@h,N'cashier')", { h: HASH }))[0]
const adminId = (await q("SELECT TOP 1 id FROM users WHERE role = 'admin' ORDER BY id"))[0].id

// ---------- past sales (last 7 days) ----------
const rate = Number((await q('SELECT khr_per_usd FROM settings WHERE id = 1'))[0].khr_per_usd)
const methods = ['cash', 'khqr', 'bank_transfer']
for (let i = 0; i < 16; i++) {
  const daysAgo = Math.floor(rnd() * 7)
  const when = new Date(Date.now() - daysAgo * 864e5 - Math.floor(rnd() * 8) * 36e5)
  const lines = []
  for (let n = 1 + Math.floor(rnd() * 3); n > 0; n--) {
    const v = variants[Math.floor(rnd() * variants.length)]
    if (!lines.some((l) => l.v.id === v.id)) lines.push({ v, qty: 1 + Math.floor(rnd() * 2) })
  }
  const subtotal = lines.reduce((a, l) => a + Number(l.v.selling_price) * l.qty, 0)
  const discount = rnd() < 0.25 ? 5 : 0
  const total = subtotal - discount
  const sale = (await q(`INSERT INTO sales (receipt_number, cashier_id, customer_id, currency, exchange_rate, subtotal, discount_amount, total_amount, sold_at)
    OUTPUT INSERTED.id VALUES (@rn,@c,@cu,'USD',@r,@s,@d,@t,@w)`, {
    rn: `TMP-${i}-${Date.now()}`, c: rnd() < 0.5 ? cashier.id : adminId, cu: rnd() < 0.6 ? custIds[Math.floor(rnd() * custIds.length)] : null,
    r: rate, s: subtotal, d: discount, t: total, w: when,
  }))[0].id
  await q('UPDATE sales SET receipt_number = @rn WHERE id = @id', { rn: `INV-${when.toISOString().slice(0, 10).replaceAll('-', '')}-${String(sale).padStart(5, '0')}`, id: sale })
  for (const { v, qty } of lines) {
    await q(`INSERT INTO sale_items (sale_id, variant_id, product_name, sku, size, color, quantity, unit_price, line_total) VALUES (@s,@v,@pn,@sku,@sz,@co,@q,@u,@l)`,
      { s: sale, v: v.id, pn: v.name, sku: v.sku, sz: v.size, co: v.color, q: qty, u: v.selling_price, l: Number(v.selling_price) * qty })
    await q(`UPDATE variants SET stock_quantity = CASE WHEN stock_quantity >= @q THEN stock_quantity - @q ELSE stock_quantity END WHERE id = @v`, { q: qty, v: v.id })
    await q(`INSERT INTO stock_movements (variant_id, sale_id, type, quantity_change, stock_before, stock_after, reason, created_at)
      SELECT @v, @s, 'sale', -@q, stock_quantity + @q, stock_quantity, 'Sale', @w FROM variants WHERE id = @v`, { v: v.id, s: sale, q: qty, w: when })
  }
  await q('INSERT INTO payments (sale_id, method, currency, amount, paid_at) VALUES (@s,@m,\'USD\',@a,@w)', { s: sale, m: methods[Math.floor(rnd() * 3)], a: total, w: when })
}

console.log(`Seeded: ${P.length} products, ${variants.length} variants, ${custs.length} customers, 16 sales, cashier@stylepos.test / password`)
process.exit(0)
