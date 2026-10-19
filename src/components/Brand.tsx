import tiger from '../assets/tiger.jpg'
import mask from '../assets/mask.jpg'
import angel from '../assets/angel444.jpg'

// mix-blend-multiply makes the white JPG background vanish on #F4F4F4 tiles.
const base = 'select-none object-contain mix-blend-multiply'

export function TigerLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <img src={tiger} alt="Horangi tiger" width={size} height={size} style={{ width: size, height: size }} className={`${base} ${className}`} draggable={false} />
}

export function MaskLogo({ size = 80, className = '' }: { size?: number; className?: string }) {
  return <img src={mask} alt="" width={size} height={size} style={{ width: size, height: size }} className={`${base} ${className}`} draggable={false} />
}

export function Angel444Badge({ width = 260, className = '' }: { width?: number; className?: string }) {
  return <img src={angel} alt="Angel 444" style={{ width }} className={`${base} ${className}`} draggable={false} />
}

/** Wordmark: tiger + heavy uppercase brand name. */
export function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <TigerLogo size={size} />
      <div className="leading-none">
        <div className="heading text-lg">HORANGI</div>
        <div className="mono mt-1 text-[10px] uppercase tracking-[0.2em]">StylePOS</div>
      </div>
    </div>
  )
}
