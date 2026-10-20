import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DollarSign, ShoppingBag, Shirt, TriangleAlert } from 'lucide-react'
import { api, apiMessage } from '../../lib/api-client'
import { shortDay, usd } from '../../lib/format'
import { useAuth } from '../auth/AuthContext'
import type { DashboardData } from '../../types'

const ICONS = { sales: DollarSign, orders: ShoppingBag, items: Shirt, lowStock: TriangleAlert } as const

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.get<{ data: DashboardData }>('/dashboard').then((r) => setData(r.data.data)).catch((e) => setError(apiMessage(e, t('common.error')))) }, [t])

  const tiles = data && [
    { k: 'sales', v: usd(data.today_sales) },
    { k: 'orders', v: String(data.today_orders) },
    { k: 'items', v: String(data.today_items) },
    { k: 'lowStock', v: String(data.low_stock_count), alert: data.low_stock_count > 0 },
  ]
  const max = Math.max(1, ...(data?.week.map((d) => d.revenue) ?? [1]))

  return (
    <div className="space-y-8 p-4 md:p-8">
      <h1 className="heading text-3xl md:text-4xl">{t('dashboard.welcome', { name: user?.name })}</h1>
      {error && <p role="alert" className="rounded-2xl border border-black px-4 py-2.5 text-sm font-semibold text-crimson">{error}</p>}
      {!data && !error && <p>{t('common.loading')}</p>}

      {data && tiles && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((x, i) => {
              const Icon = ICONS[x.k as keyof typeof ICONS]
              const dark = i === 0
              return (
                <div key={x.k} className={`group relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 ${dark ? 'border-black bg-black text-white shadow-xl shadow-black/30' : 'glass'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`label-caps ${dark ? '!text-white/70' : ''}`}>{t(`dashboard.tiles.${x.k}`)}</span>
                    <span className={`grid h-10 w-10 place-items-center rounded-full ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}><Icon size={18} /></span>
                  </div>
                  <div className={`mono mt-8 text-4xl font-bold ${dark ? '!text-white' : '!text-ink'}`}>{x.v}</div>
                  {x.alert && <span className="absolute right-5 top-16 rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white">!</span>}
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="glass rounded-[2rem] p-6">
              <h2 className="heading text-lg">{t('dashboard.week')}</h2>
              <div className="mt-6 flex h-52 items-end gap-3">
                {data.week.map((d, i) => {
                  const today = i === data.week.length - 1
                  return (
                    <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="mono text-[10px] !text-ink">{d.revenue > 0 ? usd(d.revenue) : ''}</span>
                      <div className={`w-full rounded-full transition-all ${today ? 'bg-black' : 'bg-black/15 hover:bg-black/30'}`} style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 6 : 3)}%` }} />
                      <span className={`mono text-[10px] uppercase ${today ? '!font-bold !text-ink' : ''}`}>{shortDay(d.date)}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="glass rounded-[2rem] p-6">
              <h2 className="heading text-lg">{t('dashboard.top')}</h2>
              {data.top_products.length === 0 ? <p className="mt-4 text-sm text-graphite">{t('dashboard.noSales')}</p> : (
                <ol className="mt-4 space-y-2">
                  {data.top_products.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3 rounded-2xl bg-white/55 px-3 py-2.5 text-sm">
                      <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black !text-white text-xs font-bold">{i + 1}</span>
                      <b className="min-w-0 flex-1 truncate">{p.name}</b>
                      <span className="mono text-xs">{p.quantity} · {usd(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="glass rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="heading text-lg">{t('dashboard.lowStockList')}</h2>
              <Link to="/admin/inventory" className="btn btn-ghost !px-4 !py-1.5">{t('nav.inventory')}</Link>
            </div>
            {data.low_stock.length === 0 ? <p className="mt-4 text-sm text-graphite">{t('dashboard.allGood')}</p> : (
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {data.low_stock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/55 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate"><b>{v.name}</b> <span className="mono text-xs">{v.sku} · {v.size}/{v.color}</span></span>
                    <span className="mono grid h-8 min-w-8 place-items-center rounded-full bg-black px-2 font-bold !text-white">{v.stock_quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
