import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface FxApi {
  burst: (x: number, y: number, count?: number) => void
}

interface Confetti {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  flip: number
  vf: number
  age: number
  life: number
  color: string
}

interface Spark {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
  speed: number
}

const COLORS = ['#C9A24B', '#E8C979', '#F6F0E4', '#8FB0FF', '#FFD98A', '#FF8DB7']
const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Canvas toàn màn hình: hạt sáng lơ lửng liên tục + confetti theo lệnh burst(). */
export const FxCanvas = forwardRef<FxApi, { enabled: boolean }>(function FxCanvas({ enabled }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confetti = useRef<Confetti[]>([])

  useImperativeHandle(
    ref,
    () => ({
      burst(x, y, count = 90) {
        if (!enabled) return
        const list = confetti.current
        for (let i = 0; i < count; i++) {
          const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08)
          const speed = rand(320, 760)
          list.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            w: rand(5, 10),
            h: rand(8, 15),
            rot: rand(0, TAU),
            vr: rand(-8, 8),
            flip: rand(0, TAU),
            vf: rand(4, 10),
            age: 0,
            life: rand(2.4, 3.8),
            color: COLORS[(Math.random() * COLORS.length) | 0],
          })
        }
        if (list.length > 400) list.splice(0, list.length - 400)
      },
    }),
    [enabled],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let raf = 0
    let last = performance.now()
    let sparks: Spark[] = []

    const makeSparks = () => {
      const n = Math.max(18, Math.min(44, Math.floor((W * H) / 22000)))
      sparks = Array.from({ length: n }, () => ({
        x: rand(0, W),
        y: rand(0, H),
        r: rand(0.8, 2.3),
        vx: rand(-4, 4),
        vy: -rand(5, 16),
        phase: rand(0, TAU),
        speed: rand(0.8, 2.2),
      }))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const prevW = W
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Thanh địa chỉ trên mobile co giãn chỉ đổi chiều cao: giữ nguyên hạt sáng, tránh nháy
      if (W !== prevW) makeSparks()
    }
    resize()
    addEventListener('resize', resize)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, W, H)

      // Hạt sáng
      ctx.fillStyle = '#E8C979'
      ctx.strokeStyle = '#E8C979'
      for (const s of sparks) {
        s.phase += s.speed * dt
        s.x += (s.vx + Math.sin(s.phase * 0.7) * 6) * dt
        s.y += s.vy * dt
        if (s.y < -8) {
          s.y = H + 8
          s.x = rand(0, W)
        }
        if (s.x < -8) s.x = W + 8
        if (s.x > W + 8) s.x = -8
        const a = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(s.phase))
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, TAU)
        ctx.fill()
        if (s.r > 1.7) {
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(s.x - s.r * 3, s.y)
          ctx.lineTo(s.x + s.r * 3, s.y)
          ctx.moveTo(s.x, s.y - s.r * 3)
          ctx.lineTo(s.x, s.y + s.r * 3)
          ctx.stroke()
        }
      }

      // Confetti
      const list = confetti.current
      const damp = Math.exp(-2.2 * dt)
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.age += dt
        if (p.age >= p.life || p.y > H + 40) {
          list.splice(i, 1)
          continue
        }
        p.vx *= damp
        p.vy = p.vy * damp + 1100 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        p.flip += p.vf * dt
        const t = p.age / p.life
        ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(1, Math.cos(p.flip))
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [enabled])

  return enabled ? <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" /> : null
})
