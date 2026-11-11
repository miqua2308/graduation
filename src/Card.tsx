import { useEffect, type CSSProperties, type RefObject } from 'react'
import gsap from 'gsap'
import { content } from './content'
import type { Resolved } from './storage'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

type Corner = 'tl' | 'tr' | 'bl' | 'br'

function CornerOrnament({ pos }: { pos: Corner }) {
  return (
    <div className={`piece corner corner-${pos}`} data-piece={`c-${pos}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M1 47V13C1 6.4 6.4 1 13 1H47" strokeWidth="2" />
        <path d="M8 47V18C8 12.5 12.5 8 18 8H47" strokeWidth="0.8" opacity=".6" />
        <path d="M19 19l4 4" strokeWidth="1" opacity=".7" />
        <circle cx="13" cy="13" r="2.2" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}

function CapIcon() {
  return (
    <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M32 4 L62 18 L32 32 L2 18 Z" fill="currentColor" fillOpacity=".12" />
      <path d="M14 25 V36 C14 41 22 45 32 45 C42 45 50 41 50 36 V25" />
      <path d="M58 20 V36" />
      <circle cx="58" cy="39" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

interface Props {
  cardRef: RefObject<HTMLDivElement>
  invite: Resolved
  tiltEnabled: boolean
  floating: boolean
  onTap: (x: number, y: number) => void
}

export function Card({ cardRef, invite, tiltEnabled, floating, onTap }: Props) {
  // Cỡ chữ tên tự co theo độ dài để không tràn thiệp
  const len = [...invite.name].length
  const nameSize = Math.max(7.5, Math.min(15, 70 / (len * 0.5)))
  const style = { '--name-size': `calc(${nameSize.toFixed(2)} * var(--u))` } as CSSProperties

  // Nghiêng 3D theo con trỏ (desktop) / ngón tay / con quay hồi chuyển (mobile)
  useEffect(() => {
    const card = cardRef.current
    if (!card || !tiltEnabled) return

    const glare = card.querySelector<HTMLElement>('.glare')
    gsap.set(card, { transformPerspective: 900 })
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' })
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' })
    const gx = glare ? gsap.quickTo(glare, 'xPercent', { duration: 0.7, ease: 'power3.out' }) : null
    const gy = glare ? gsap.quickTo(glare, 'yPercent', { duration: 0.7, ease: 'power3.out' }) : null

    const apply = (nx: number, ny: number) => {
      rx(-ny * 9)
      ry(nx * 11)
      gx?.(nx * 22)
      gy?.(ny * 22)
    }
    const reset = () => apply(0, 0)
    const onMove = (e: PointerEvent) =>
      apply((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2)
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') reset()
    }

    // Con quay hồi chuyển: lấy tư thế ban đầu làm mốc, mốc trôi chậm theo tư thế cầm máy
    let base: { b: number; g: number } | null = null
    let listening = false
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      if (!base) base = { b: e.beta, g: e.gamma }
      base.b += (e.beta - base.b) * 0.01
      base.g += (e.gamma - base.g) * 0.01
      apply(clamp((e.gamma - base.g) / 25, -1, 1), clamp((e.beta - base.b) / 25, -1, 1))
    }
    const startOrientation = () => {
      if (listening) return
      listening = true
      addEventListener('deviceorientation', onOrientation)
    }

    type IOSOrientation = { requestPermission?: () => Promise<'granted' | 'denied'> }
    const DOE = (window as unknown as { DeviceOrientationEvent?: IOSOrientation }).DeviceOrientationEvent
    const coarse = matchMedia('(pointer: coarse)').matches
    const needsPermission = typeof DOE?.requestPermission === 'function'
    if (coarse && !needsPermission) startOrientation()

    const onDown = () => {
      if (coarse && needsPermission && !listening) {
        DOE!
          .requestPermission!()
          .then((r) => r === 'granted' && startOrientation())
          .catch(() => undefined)
      }
    }

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerup', onPointerEnd)
    addEventListener('pointercancel', onPointerEnd)
    document.documentElement.addEventListener('pointerleave', reset)
    card.addEventListener('pointerdown', onDown)

    return () => {
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onPointerEnd)
      removeEventListener('pointercancel', onPointerEnd)
      removeEventListener('deviceorientation', onOrientation)
      document.documentElement.removeEventListener('pointerleave', reset)
      card.removeEventListener('pointerdown', onDown)
      gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.4, overwrite: 'auto' })
    }
  }, [cardRef, tiltEnabled])

  return (
    <div className="card-scene">
      <div className={`card-float${floating ? ' is-floating' : ''}`}>
        <article
          ref={cardRef}
          className="card"
          style={style}
          aria-label={`Thư mời tốt nghiệp của ${content.host}`}
          onPointerDown={(e) => onTap(e.clientX, e.clientY)}
        >
          <div className="piece paper" data-piece="paper" />
          <div className="piece frame" data-piece="frame" aria-hidden="true" />
          <CornerOrnament pos="tl" />
          <CornerOrnament pos="tr" />
          <CornerOrnament pos="bl" />
          <CornerOrnament pos="br" />

          <div className="content">
            <div className="piece cap" data-piece="cap" aria-hidden="true">
              <CapIcon />
            </div>

            <div className="piece headline" data-piece="headline">
              <p className="title-small">{content.titleSmall}</p>
              <h1 className="title">{content.titleMain}</h1>
            </div>

            <p className="piece lead" data-piece="lead">
              {invite.lead}
            </p>
            <p className="piece name" data-piece="name">
              {invite.name}
            </p>

            <div className="piece tail" data-piece="tail">
              <p className="invitation">{invite.invitation}</p>
              <p className="host">{content.host}</p>
            </div>

            <div className="piece info" data-piece="info">
              <div className="divider" aria-hidden="true">
                <i />
              </div>
              <dl className="sections">
                {content.sections.map((s) => {
                  const value = s.id === 'place' && invite.venue ? invite.venue : s.value
                  return (
                    <div className="section" key={s.id}>
                      <dt>{s.label}</dt>
                      <dd className={`value${[...value].length > 22 ? ' is-long' : ''}`}>{value}</dd>
                      {s.note && <dd className="note">{s.note}</dd>}
                    </div>
                  )
                })}
              </dl>
            </div>
          </div>

          {/* Lớp ánh kim + glare, nằm trên cùng, không chặn thao tác */}
          <div className="fx" aria-hidden="true">
            <div className="glare" />
            <div className="sheen" />
          </div>
        </article>
      </div>
    </div>
  )
}
