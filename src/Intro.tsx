import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import gsap from 'gsap'

interface Props {
  cardRef: RefObject<HTMLDivElement>
  /** Gọi ở khoảnh khắc thiệp "bật" ra (để bắn confetti) */
  onReveal: () => void
  /** Gọi khi intro kết thúc hoặc bị bỏ qua */
  onDone: () => void
}

const CURSORS = [
  { label: 'Quân', color: '#E0B95C' },
  { label: 'AI', color: '#8FB0FF' },
  { label: 'Bố cục', color: '#FF8DB7' },
  { label: 'Motion', color: '#4EE0A0' },
]

// Mỗi con trỏ lần lượt "kéo" các mảnh của thiệp về đúng vị trí
const QUEUES: string[][] = [
  ['paper', 'headline', 'tail'],
  ['frame', 'cap', 'info'],
  ['c-tl', 'c-tr', 'name'],
  ['c-bl', 'c-br', 'lead'],
]
const START_AT = [0.2, 0.45, 0.7, 0.95]

// Vị trí tản mát ban đầu (tỉ lệ theo viewport) cho 12 mảnh
const SLOTS: Array<[number, number]> = [
  [0.2, 0.2], [0.8, 0.16], [0.14, 0.52], [0.86, 0.48],
  [0.22, 0.82], [0.78, 0.84], [0.5, 0.1], [0.52, 0.92],
  [0.32, 0.36], [0.7, 0.34], [0.34, 0.68], [0.66, 0.64],
]

const STATUS: Array<[number, string]> = [
  [0, 'Đang lên ý tưởng…'],
  [1.6, 'Sắp xếp bố cục…'],
  [3.4, 'Thêm họa tiết…'],
]

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function Intro({ cardRef, onReveal, onDone }: Props) {
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const statusRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const fastRef = useRef(false)
  const cbRef = useRef({ onReveal, onDone })
  cbRef.current = { onReveal, onDone }

  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    const curs = cursorRefs.current.filter((c): c is HTMLDivElement => !!c)
    const els = new Map<string, HTMLElement>()
    card.querySelectorAll<HTMLElement>('[data-piece]').forEach((e) => els.set(e.dataset.piece!, e))
    const all = [...els.values()]
    const fx = card.querySelector<HTMLElement>('.fx')
    const order = QUEUES.flat()

    let cancelled = false
    const vw0 = window.innerWidth
    const vh0 = window.innerHeight

    // Ẩn ngay trước khi trình duyệt vẽ để không bị nháy thiệp hoàn chỉnh
    window.scrollTo(0, 0)
    gsap.set(all, { opacity: 0 })
    if (fx) gsap.set(fx, { opacity: 0 })
    gsap.set(curs, {
      opacity: 0,
      x: (i) => [-60, vw0 + 60, vw0 * 0.3, vw0 + 60][i],
      y: (i) => [vh0 * 0.8, vh0 * 0.25, -60, vh0 + 60][i],
    })
    if (barRef.current) gsap.set(barRef.current, { scaleX: 0 })

    const setStatus = (text: string) => {
      if (statusRef.current) statusRef.current.textContent = text
    }
    setStatus(STATUS[0][1])

    const start = () => {
      if (cancelled) return
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Đo vị trí cuối của từng mảnh (không còn transform nào)
      gsap.set(all, { clearProps: 'transform' })
      gsap.set(card, { rotationX: 0, rotationY: 0, scale: 1 })

      const info = new Map<
        string,
        { cx: number; cy: number; sx: number; sy: number; gx: number; gy: number; s: number }
      >()
      order.forEach((key, i) => {
        const el = els.get(key)!
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const s = key === 'paper' || key === 'frame' ? 0.5 : key.startsWith('c-') ? 1 : 0.85
        const hw = (r.width * s) / 2 + 8
        const hh = (r.height * s) / 2 + 8
        const tx = clamp(SLOTS[i][0] * vw + rand(-0.04, 0.04) * vw, Math.min(hw, vw / 2), Math.max(vw - hw, vw / 2))
        const ty = clamp(SLOTS[i][1] * vh + rand(-0.03, 0.03) * vh, Math.min(hh, vh / 2), Math.max(vh - hh, vh / 2))
        const gx = rand(-1, 1) * Math.min(r.width * s * 0.2, 18)
        const gy = rand(-1, 1) * Math.min(r.height * s * 0.2, 14)
        info.set(key, { cx, cy, sx: tx - cx, sy: ty - cy, gx, gy, s })
        gsap.set(el, { x: tx - cx, y: ty - cy, rotation: rand(-26, 26), scale: s })
        el.style.setProperty('--c', CURSORS[QUEUES.findIndex((q) => q.includes(key))].color)
        el.classList.add('is-loose')
      })

      const tl = gsap.timeline({
        onComplete: () => cbRef.current.onDone(),
      })
      tlRef.current = tl
      if (fastRef.current) tl.timeScale(7)

      tl.to(all, { opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power1.out' }, 0)
      tl.to(curs, { opacity: 1, duration: 0.3, stagger: 0.08 }, 0)

      QUEUES.forEach((queue, ci) => {
        const cur = curs[ci]
        let t = START_AT[ci]
        queue.forEach((key) => {
          const d = info.get(key)!
          const el = els.get(key)!
          const small = key.startsWith('c-')
          const approach = small ? 0.5 : 0.65
          const drag = small ? 0.7 : 0.85

          // 1) Con trỏ bay tới mảnh theo đường cong (x, y dùng ease khác nhau)
          tl.to(cur, { x: d.cx + d.sx + d.gx, duration: approach, ease: 'sine.inOut' }, t)
          tl.to(cur, { y: d.cy + d.sy + d.gy, duration: approach, ease: 'power2.inOut' }, t)
          t += approach

          // 2) Nhấn chuột: con trỏ co lại, mảnh nhấc lên
          tl.to(cur, { scale: 0.8, duration: 0.1, ease: 'power1.in' }, t)
          tl.to(cur, { scale: 1, duration: 0.15, ease: 'back.out(3)' }, t + 0.1)
          tl.to(el, { scale: d.s * 1.06, duration: 0.1 }, t)
          t += 0.2

          // 3) Kéo về vị trí cuối. Mảnh và con trỏ dùng chung ease nên dính chặt vào nhau.
          tl.to(el, { x: 0, duration: drag, ease: 'power2.inOut' }, t)
          tl.to(el, { y: 0, duration: drag, ease: 'sine.inOut' }, t)
          tl.to(el, { rotation: 0, scale: 1, duration: drag, ease: 'power2.inOut' }, t)
          tl.to(cur, { x: d.cx + d.gx, duration: drag, ease: 'power2.inOut' }, t)
          tl.to(cur, { y: d.cy + d.gy, duration: drag, ease: 'sine.inOut' }, t)
          t += drag

          // 4) Thả: mảnh "chạm" vào đúng chỗ
          tl.call(() => el.classList.remove('is-loose'), [], t)
          tl.to(el, { scale: 1.04, duration: 0.1, ease: 'power2.out' }, t)
          tl.to(el, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t + 0.1)
          t += 0.1
        })
      })

      const end = tl.duration()

      // Trạng thái "AI đang thiết kế" + thanh tiến trình
      STATUS.slice(1).forEach(([at, text]) => tl.call(setStatus, [text], at))
      if (barRef.current) tl.to(barRef.current, { scaleX: 1, duration: end, ease: 'none' }, 0)
      tl.call(setStatus, ['Hoàn tất ✓'], end)

      // Kết: con trỏ biến mất, ánh kim quét qua, thiệp "bật" lên
      tl.to(curs, { opacity: 0, scale: 0.6, duration: 0.4, stagger: 0.05, ease: 'power2.in' }, end)
      if (fx) tl.to(fx, { opacity: 1, duration: 0.4 }, end)
      tl.to(card, { scale: 1.04, duration: 0.25, ease: 'power2.out' }, end + 0.1)
      tl.call(() => cbRef.current.onReveal(), [], end + 0.3)
      tl.to(card, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, end + 0.35)
    }

    // Chờ font tải xong để đo vị trí chính xác (tối đa 1.5s)
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(start)

    return () => {
      cancelled = true
      tlRef.current?.kill()
      tlRef.current = null
      gsap.killTweensOf([...all, ...curs, card, fx])
      gsap.set(all, { clearProps: 'opacity,transform' })
      all.forEach((el) => {
        el.classList.remove('is-loose')
        el.style.removeProperty('--c')
      })
      if (fx) gsap.set(fx, { clearProps: 'opacity' })
      gsap.set(card, { scale: 1 })
    }
  }, [cardRef])

  const skip = () => {
    fastRef.current = true
    tlRef.current?.timeScale(7)
  }

  return (
    <>
      <div className="intro-ui">
        <div className="intro-status" role="status" aria-live="polite">
          <span className="intro-spark" aria-hidden="true">
            ✦
          </span>
          <span ref={statusRef} />
        </div>
        <div className="intro-progress" aria-hidden="true">
          <span ref={barRef} />
        </div>
        <button type="button" className="btn btn-skip" onClick={skip}>
          Bỏ qua
        </button>
      </div>

      <div className="cursor-layer" aria-hidden="true">
        {CURSORS.map((c, i) => (
          <div
            key={c.label}
            className="cursor"
            style={{ '--c': c.color, opacity: 0 } as CSSProperties}
            ref={(el) => {
              cursorRefs.current[i] = el
            }}
          >
            <svg viewBox="0 0 22 22" width="22" height="22">
              <path
                d="M3 2 L3 17.5 L7.2 13.6 L10.2 20 L12.6 18.9 L9.7 12.6 L15.5 12.4 Z"
                fill={c.color}
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tag">{c.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}
