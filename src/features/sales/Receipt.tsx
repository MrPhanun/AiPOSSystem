import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { dateTime, money } from '../../lib/format'
import { useSettings } from '../../lib/useSettings'
import type { Sale } from '../../types'

/** 80mm-style receipt. The Print button prints only this block (see @media print in index.css). */
export default function Receipt({ sale }: { sale: Sale }) {
  const { t } = useTranslation()
  const s = useSettings()
  const fmt = (n: number) => money(n, sale.currency, sale.exchange_rate)
  const pay = sale.payments?.[0]

  return (
    <div>
      <div id="receipt" className="mono mx-auto max-w-[320px] border border-ink bg-paper p-4 text-[12px] text-ink">
        <div className="text-center">
          <div className="heading text-base">{s.store_name}</div>
          {s.address && <div>{s.address}</div>}
          {s.phone && <div>{s.phone}</div>}
        </div>
        <div className="my-3 border-t border-dashed border-ink" />
        <div className="flex justify-between"><span>{t('sales.receipt')}</span><b>{sale.receipt_number}</b></div>
        <div className="flex justify-between"><span>{t('sales.date')}</span><span>{dateTime(sale.sold_at)}</span></div>
        {sale.cashier && <div className="flex justify-between"><span>{t('sales.cashier')}</span><span>{sale.cashier.name}</span></div>}
        {sale.customer && <div className="flex justify-between"><span>{t('sales.customer')}</span><span>{sale.customer.name}</span></div>}
        <div className="my-3 border-t border-dashed border-ink" />
        {sale.items?.map((i) => (
          <div key={i.id} className="mb-1.5">
            <div className="font-bold">{i.product_name}</div>
            <div className="flex justify-between">
              <span>{i.size} / {i.color} · {i.quantity} × {fmt(i.unit_price)}</span>
              <span>{fmt(i.line_total)}</span>
            </div>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-ink" />
        <div className="flex justify-between"><span>{t('pos.subtotal')}</span><span>{fmt(sale.subtotal)}</span></div>
        {sale.discount_amount > 0 && <div className="flex justify-between"><span>{t('pos.discount')}</span><span>-{fmt(sale.discount_amount)}</span></div>}
        <div className="mt-1 flex justify-between text-base font-bold"><span>{t('pos.total')}</span><span>{fmt(sale.total_amount)}</span></div>
        <div className="flex justify-between"><span /><span>{money(sale.total_amount, sale.currency === 'USD' ? 'KHR' : 'USD', sale.exchange_rate)}</span></div>
        {pay && <div className="mt-2 flex justify-between"><span>{t('sales.paidWith')}</span><span>{t(`pay.${pay.method}`)}</span></div>}
        {sale.status === 'voided' && <div className="mt-2 text-center font-bold text-crimson">*** {t('sales.status.voided')} ***</div>}
        <div className="my-3 border-t border-dashed border-ink" />
        <div className="text-center">{s.receipt_footer}</div>
      </div>
      <div className="no-print mt-4 text-center">
        <button type="button" onClick={() => window.print()} className="btn btn-solid"><Printer size={14} /> {t('sales.print')}</button>
      </div>
    </div>
  )
}
