import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, apiMessage } from '../../lib/api-client'
import { shortDay, usd } from '../../lib/format'
import { useAuth } from '../auth/AuthContext'
import type { DashboardData } from '../../types'

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
      <h1 className="heading text-3xl">{t('dashboard.welcome', { name: user?.name })}</h1>
      {error && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}
      {!data && !error && <p>{t('common.loading')}</p>}

      {data && tiles && (
        <>
          <div className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((x) => (
              <div key={x.k} className="bg-tile p-5">
                <div className="label-caps">{t(`dashboard.tiles.${x.k}`)}</div>
                <div className={`mono mt-6 text-4xl font-bold ${x.alert ? 'text-crimson' : 'text-ink'}`}>{x.v}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="panel p-5">
              <h2 className="heading text-lg">{t('dashboard.week')}</h2>
              <div className="mt-6 flex h-48 items-end gap-3">
                {data.week.map((d) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="mono text-[10px] text-ink">{d.revenue > 0 ? usd(d.revenue) : ''}</span>
                    <div className="w-full border border-ink bg-acid" style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 1)}%` }} />
                    <span className="mono text-[10px] uppercase">{shortDay(d.date)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="heading text-lg">{t('dashboard.top')}</h2>
              {data.top_products.length === 0 ? <p className="mt-4 text-sm text-graphite">{t('dashboard.noSales')}</p> : (
                <ol className="mt-4 divide-y divide-ink/15">
                  {data.top_products.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span><span className="mono mr-2">{i + 1}.</span><b>{p.name}</b></span>
                      <span className="mono text-xs">{p.quantity} · {usd(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="heading text-lg">{t('dashboard.lowStockList')}</h2>
              <Link to="/admin/inventory" className="btn btn-ghost !px-3 !py-1">{t('nav.inventory')}</Link>
            </div>
            {data.low_stock.length === 0 ? <p className="mt-4 text-sm text-graphite">{t('dashboard.allGood')}</p> : (
              <ul className="mt-4 divide-y divide-ink/15">
                {data.low_stock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <span><b>{v.name}</b> <span className="mono text-xs">{v.sku} · {v.size}/{v.color}</span></span>
                    <span className="mono font-bold text-crimson">{v.stock_quantity}</span>
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
