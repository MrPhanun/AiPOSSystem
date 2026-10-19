export type Role = 'admin' | 'cashier'
export type Locale = 'en' | 'km'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  locale: Locale
  created_at: string | null
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export type FieldErrors = Record<string, string[]>

export type Currency = 'USD' | 'KHR'
export type PaymentMethod = 'cash' | 'khqr' | 'bank_transfer'

export interface Settings {
  store_name: string
  address: string | null
  phone: string | null
  khr_per_usd: number
  receipt_footer: string | null
}

export interface Category {
  id: number
  name: string
  is_active: boolean
  products_count: number
}

export interface Variant {
  id: number
  product_id: number
  product_name: string
  category_id: number
  category_name: string | null
  image_url: string | null
  sku: string
  barcode: string | null
  size: string
  color: string
  selling_price: number
  cost_price: number | null // admin only
  stock_quantity: number
  low_stock_threshold: number
  is_active: boolean
}

export interface Product {
  id: number
  name: string
  description: string | null
  brand: string | null
  category_id: number
  category_name: string | null
  image_path: string | null
  image_url: string | null
  is_active: boolean
  total_stock: number
  min_price: number | null
  max_price: number | null
  variants: Variant[]
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  sales_count: number
  total_spent: number
}

export interface SaleItem {
  id: number
  product_name: string
  sku: string
  size: string
  color: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Sale {
  id: number
  receipt_number: string
  status: 'draft' | 'completed' | 'voided' | 'partially_refunded' | 'refunded'
  payment_status: string
  currency: Currency
  exchange_rate: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  notes: string | null
  sold_at: string | null
  cashier?: { id: number; name: string }
  customer?: { id: number; name: string; phone: string | null } | null
  item_count?: number
  items?: SaleItem[]
  payments?: { method: PaymentMethod; currency: Currency; amount: number; status: string }[]
}

export interface StockMovement {
  id: number
  type: string
  quantity_change: number
  stock_before: number
  stock_after: number
  reason: string | null
  created_at: string | null
}

export interface DashboardData {
  today_sales: number
  today_orders: number
  today_items: number
  low_stock_count: number
  week: { date: string; revenue: number; orders: number }[]
  top_products: { name: string; quantity: number; revenue: number }[]
  low_stock: { id: number; name: string; sku: string; size: string; color: string; stock_quantity: number }[]
}
