// DEMO DATA ONLY. Replaced by GET /api/v1/products once the catalog phase exists.
export type Category = 'tops' | 'bottoms' | 'outerwear' | 'accessories'

export interface DemoItem {
  id: number
  name: string
  variant: string
  sku: string
  price: number // USD
  stock: number
  category: Category
}

export const DEMO_ITEMS: DemoItem[] = [
  { id: 1, name: 'Classic Cotton Tee', variant: 'BLK / M', sku: 'TEE-BLK-M', price: 9, stock: 20, category: 'tops' },
  { id: 2, name: 'Classic Cotton Tee', variant: 'WHT / L', sku: 'TEE-WHT-L', price: 9, stock: 4, category: 'tops' },
  { id: 3, name: 'Oversized Graphic Tee', variant: 'BLK / L', sku: 'OGT-BLK-L', price: 14.5, stock: 12, category: 'tops' },
  { id: 4, name: 'Cargo Pants', variant: 'BLK / 32', sku: 'CGO-BLK-32', price: 29, stock: 8, category: 'bottoms' },
  { id: 5, name: 'Wide Denim', variant: 'IND / 30', sku: 'DNM-IND-30', price: 32, stock: 0, category: 'bottoms' },
  { id: 6, name: 'Track Jacket', variant: 'WHT / M', sku: 'TRK-WHT-M', price: 38, stock: 6, category: 'outerwear' },
  { id: 7, name: 'Zip Hoodie', variant: 'BLK / XL', sku: 'HOD-BLK-XL', price: 35, stock: 3, category: 'outerwear' },
  { id: 8, name: 'Bucket Hat', variant: 'BLK / OS', sku: 'HAT-BLK-OS', price: 12, stock: 15, category: 'accessories' },
  { id: 9, name: 'Chain Necklace', variant: 'SLV / OS', sku: 'CHN-SLV-OS', price: 8, stock: 25, category: 'accessories' },
  { id: 10, name: 'Tote Bag', variant: 'WHT / OS', sku: 'TOT-WHT-OS', price: 7.5, stock: 18, category: 'accessories' },
]

// PLACEHOLDER rate (same as the backend seeder). Real rate comes from store_settings.
export const DEMO_KHR_PER_USD = 4000
