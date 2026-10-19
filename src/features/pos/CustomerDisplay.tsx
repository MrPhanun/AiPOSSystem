import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Angel444Badge, MaskLogo } from '../../components/Brand'
import type { PaymentMethod } from '../../types'

interface Props {
  totalText: string
  altTotalText: string
  itemCount: number
  method: PaymentMethod
  busy: boolean
  error: string | null
  onBack: () => void
  onConfirm: () => void
}

/** Customer-facing screen shown while the cashier confirms payment. */
export default function CustomerDisplay({ totalText, altTotalText, itemCount, method, busy, error, onBack, onConfirm }: Props) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-6 py-3">
        <span className="mono text-[11px] uppercase tracking-[0.2em]">HORANGI / STYLEPOS</span>
        <span className="mono text-[11px] uppercase tracking-[0.2em]">{t('pos.items', { count: itemCount })}</span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <MaskLogo size={96} className="absolute right-8 top-6 opacity-90" />
        <Angel444Badge width={300} />
        <div className="label-caps mt-10 flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse bg-crimson" />
          {t('customer.awaiting')} · {t(`pay.${method}`)}
        </div>
        <div className="mono mt-2 text-6xl font-bold text-ink sm:text-8xl">{totalText}</div>
        <div className="mono mt-2 text-lg">{altTotalText}</div>
        <div className="heading mt-6 text-2xl">{t('customer.total')}</div>
        {error && <p role="alert" className="mt-4 border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{error}</p>}
      </div>

      <div className="flex justify-between gap-3 border-t border-ink bg-tile px-6 py-3">
        <button type="button" onClick={onBack} disabled={busy} className="btn btn-ghost">{t('customer.back')}</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-solid">
          {busy && <Loader2 size={13} className="animate-spin" />} {t('customer.confirmPaid')}
        </button>
      </div>
    </div>
  )
}
