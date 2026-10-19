import type { ReactNode } from 'react'

const tones = {
  solid: 'bg-ink text-paper border-ink',
  outline: 'bg-paper text-ink border-ink',
  acid: 'bg-acid text-ink border-ink',
  muted: 'bg-tile text-graphite border-graphite/40',
  alert: 'bg-paper text-crimson border-crimson',
}

export default function Badge({ tone = 'outline', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-[2px] border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  )
}
