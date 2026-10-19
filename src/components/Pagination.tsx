import { useTranslation } from 'react-i18next'
import type { Paginated } from '../types'

export default function Pagination({ meta, page, onPage }: { meta: Paginated<unknown>['meta']; page: number; onPage: (p: number) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="mono">{t('common.total', { count: meta.total })}</span>
      <div className="flex items-center gap-3">
        <span className="mono">{t('common.page', { current: meta.current_page, last: meta.last_page })}</span>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn btn-ghost !px-3 !py-1">{t('common.previous')}</button>
        <button type="button" disabled={page >= meta.last_page} onClick={() => onPage(page + 1)} className="btn btn-ghost !px-3 !py-1">{t('common.next')}</button>
      </div>
    </div>
  )
}
