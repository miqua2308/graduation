import { useRef, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import gsap from 'gsap'
import { content } from './content'
import { prefersReducedMotion, type Resolved } from './storage'
import logoMaskUrl from './assets/logo-iu-mask.png'

let mapOpening = false

/**
 * Bấm vào địa điểm: thiệp thu lại thành một đốm sáng, đốm sáng bay vút lên rồi bản đồ mở ở tab mới.
 * Quay lại tab thiệp thì thiệp nở ra lại như cũ.
 *
 * Toàn bộ hiệu ứng < 1 giây: Safari chỉ cho window.open trong khoảng ~1 giây sau cú chạm,
 * quá thời gian đó tab mới sẽ bị chặn như popup.
 */
function openMap(e: MouseEvent<HTMLAnchorElement>) {
  // Ctrl/Cmd/Shift-click, chuột giữa, reduced-motion: để trình duyệt tự mở tab mới như link thường
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || prefersReducedMotion()) return
  const href = e.currentTarget.href
  const scene = e.currentTarget.closest<HTMLElement>('.card-scene')
  if (!scene) return
  e.preventDefault()
  if (mapOpening) return
  mapOpening = true

  const box = scene.getBoundingClientRect()
  const cx = box.left + box.width / 2
  const cy = box.top + box.height / 2

  const dot = document.createElement('div')
  dot.className = 'light-dot'
  dot.setAttribute('aria-hidden', 'true')
  document.body.appendChild(dot)
  gsap.set(dot, { left: cx, top: cy, xPercent: -50, yPercent: -50, scale: 0, opacity: 0 })

  const restore = () => {
    dot.remove()
    gsap.fromTo(
      scene,
      { scale: 0.04, opacity: 0, filter: 'brightness(1.8)' },
      {
        scale: 1,
        opacity: 1,
        filter: 'brightness(1)',
        duration: 0.7,
        ease: 'back.out(1.4)',
        clearProps: 'transform,opacity,filter',
        onComplete: () => {
          mapOpening = false
        },
      },
    )
  }

  gsap
    .timeline({
      onComplete: () => {
        const tab = window.open(href, '_blank')
        if (tab) {
          try {
            tab.opener = null // không cho trang bản đồ điều khiển ngược tab thiệp
          } catch {
            /* tab đã sang domain khác: bỏ qua */
          }
        } else {
          // Bị chặn (popup blocker, trình duyệt trong app Zalo/Messenger...): mở ngay tại tab này
          location.assign(href)
        }
        // Ticker của GSAP dừng khi tab bị ẩn, nên thiệp sẽ nở lại đúng lúc người xem quay về
        gsap.delayedCall(0.35, restore)
      },
    })
    // 1) Thiệp co lại về tâm, sáng dần lên
    .to(scene, { scale: 0.04, filter: 'brightness(1.8)', duration: 0.3, ease: 'power3.in' }, 0)
    .to(scene, { opacity: 0, duration: 0.1 }, 0.22)
    // 2) Đốm sáng loé lên đúng chỗ thiệp vừa biến mất
    .to(dot, { scale: 1, opacity: 1, duration: 0.16, ease: 'back.out(3)' }, 0.2)
    // 3) Đốm sáng kéo vệt bay lên mép trên màn hình (chỗ thanh tab)
    .to(dot, { top: -40, scaleX: 0.55, scaleY: 1.9, duration: 0.26, ease: 'power3.in' }, 0.34)
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}


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
  floating: boolean
  /** Chạm vào thiệp thì xoay một vòng, lộ mặt sau có logo trường */
  spinEnabled: boolean
}

export function Card({ cardRef, invite, floating, spinEnabled }: Props) {
  const flipRef = useRef<HTMLDivElement>(null)
  const spinning = useRef(false)

  const spin = (e: ReactPointerEvent<HTMLElement>) => {
    const flip = flipRef.current
    if (!flip || !spinEnabled || spinning.current || prefersReducedMotion()) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Chạm vào địa điểm là để mở bản đồ, không xoay
    if ((e.target as Element).closest('.has-map')) return
    spinning.current = true
    const front = flip.querySelector<HTMLElement>('.card')
    const back = flip.querySelector<HTMLElement>('.card-back')
    // Safari (iOS) đôi khi vẫn vẽ mặt bị quay lưng khi bên trong có lớp hiệu ứng riêng:
    // tự ẩn/hiện từng mặt theo góc xoay thay vì chỉ trông vào backface-visibility
    const faces = () => {
      const r = ((Number(gsap.getProperty(flip, 'rotationY')) % 360) + 360) % 360
      const showBack = r > 90 && r < 270
      if (front) front.style.visibility = showBack ? 'hidden' : ''
      if (back) back.style.visibility = showBack ? 'visible' : 'hidden'
    }
    faces()
    gsap
      .timeline({
        onUpdate: faces,
        onComplete: () => {
          gsap.set(flip, { rotationY: 0 })
          faces()
          spinning.current = false
        },
      })
      .set(flip, { transformPerspective: 1400 })
      // Nửa vòng đầu, dừng một nhịp ở mặt sau cho thấy logo, rồi xoay nốt về mặt trước
      .to(flip, { rotationY: 180, duration: 0.7, ease: 'power2.inOut' })
      .to(flip, { y: -10, scale: 1.03, duration: 0.35, ease: 'sine.out' }, 0.2)
      .to(flip, { rotationY: 360, duration: 0.7, ease: 'power2.inOut' }, '+=0.55')
      .to(flip, { y: 0, scale: 1, duration: 0.45, ease: 'sine.inOut' }, '-=0.45')
  }

  // Cỡ chữ tên tự co theo độ dài để không tràn thiệp
  const len = [...invite.name].length
  const nameSize = Math.max(7.5, Math.min(15, 70 / (len * 0.5)))
  const style = { '--name-size': `calc(${nameSize.toFixed(2)} * var(--u))` } as CSSProperties

  return (
    <div className="card-scene">
      <div className={`card-float${floating ? ' is-floating' : ''}`}>
        <div className="card-flip" ref={flipRef}>
          <article
            ref={cardRef}
            className="card"
            style={style}
            aria-label={`Thư mời tốt nghiệp của ${content.host}`}
            onPointerDown={spin}
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
                    const isPlace = s.id === 'place' && !!invite.venue
                    const value = isPlace ? invite.venue! : s.value
                    const map = isPlace ? invite.venueMap : undefined
                    return (
                      <div className={`section${map ? ' has-map' : ''}`} key={s.id}>
                        <dt>{s.label}</dt>
                        <dd className={`value${[...value].length > 22 ? ' is-long' : ''}`}>
                          {map ? (
                            <a className="map-link" href={map} target="_blank" rel="noopener noreferrer" onClick={openMap}>
                              {value}
                            </a>
                          ) : (
                            value
                          )}
                        </dd>
                        {map && (
                          <dd className="map-hint" aria-hidden="true">
                            <PinIcon />
                            Chạm để xem bản đồ
                          </dd>
                        )}
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

          {/* Mặt sau: chỉ thấy khi thiệp đang xoay */}
          <div className="card-back" aria-hidden="true">
            <div className="paper" />
            <div className="frame" />
            {/* Logo in chìm: ảnh chỉ làm mask, màu lấy từ tông vàng của thiệp (styles.css · .back-logo) */}
            <div className="back-emboss">
              <div className="back-logo" style={{ '--logo': `url(${logoMaskUrl})` } as CSSProperties} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
