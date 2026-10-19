import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { api, apiFieldErrors, apiMessage } from '../../lib/api-client'
import type { FieldErrors, Role } from '../../types'

export default function AddUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' as Role })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError(null)
    try {
      await api.post('/users', form)
      onCreated()
    } catch (err) {
      const fields = apiFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setFormError(apiMessage(err, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  const err = (k: string) => errors[k]?.[0] && <span className="mt-1 block text-xs font-semibold text-crimson">{errors[k][0]}</span>

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/60 px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md space-y-4 p-6 shadow-[6px_6px_0_0_#000]">
        <h2 className="heading text-xl">{t('users.createTitle')}</h2>

        <label className="block"><span className="label-caps">{t('users.name')}</span>
          <input required className="field mt-1.5" value={form.name} onChange={set('name')} />{err('name')}</label>
        <label className="block"><span className="label-caps">{t('users.email')}</span>
          <input required type="email" className="field mt-1.5" value={form.email} onChange={set('email')} />{err('email')}</label>
        <label className="block"><span className="label-caps">{t('users.password')}</span>
          <input required type="password" minLength={8} autoComplete="new-password" className="field mt-1.5" value={form.password} onChange={set('password')} />{err('password')}</label>
        <label className="block"><span className="label-caps">{t('users.role')}</span>
          <select className="field mt-1.5" value={form.role} onChange={set('role')}>
            <option value="cashier">{t('role.cashier')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>{err('role')}</label>

        {formError && <p role="alert" className="border border-crimson px-3 py-2 text-sm font-semibold text-crimson">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="btn btn-solid">
            {busy && <Loader2 size={13} className="animate-spin" />} {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
