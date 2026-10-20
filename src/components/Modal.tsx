import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="no-print fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/60 px-4 py-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`panel w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-[2rem] p-6 shadow-[6px_6px_0_0_#000]`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="heading text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="close" className="rounded-full p-1.5 hover:bg-white/80"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
