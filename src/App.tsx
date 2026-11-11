import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card } from './Card'
import { FxCanvas, type FxApi } from './Effects'
import { Intro } from './Intro'
import { playEntrance } from './entrance'
import { content } from './content'
import { markIntroSeen, prefersReducedMotion, readGuest, shouldPlayIntro } from './storage'

type Phase = 'intro' | 'card'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export default function App() {
  const reduced = useReducedMotion()
  const guest = useMemo(readGuest, [])
  const cardRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<FxApi>(null)
  const [phase, setPhase] = useState<Phase>(() => (shouldPlayIntro() ? 'intro' : 'card'))
  const startedInCard = useRef(phase === 'card')

  useEffect(() => {
    document.title = `Thư mời tốt nghiệp · ${content.host}`
  }, [])

  // Khoá cuộn trong lúc intro
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('intro-active', phase === 'intro')
    return () => root.classList.remove('intro-active')
  }, [phase])

  // Vào thẳng thiệp (đã xem intro): các lớp hiện lần lượt
  useLayoutEffect(() => {
    if (!startedInCard.current || reduced || !cardRef.current) return
    return playEntrance(cardRef.current)
    // chỉ chạy một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDone = () => {
    markIntroSeen()
    setPhase('card')
  }

  const handleReveal = () => {
    fxRef.current?.burst(window.innerWidth / 2, window.innerHeight * 0.5, 150)
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true" />

      <main className="page">
        <Card
          cardRef={cardRef}
          guest={guest}
          tiltEnabled={phase === 'card' && !reduced}
          floating={phase === 'card' && !reduced}
          onTap={(x, y) => phase === 'card' && fxRef.current?.burst(x, y, 36)}
        />
      </main>

      <FxCanvas ref={fxRef} enabled={!reduced} />

      {phase === 'intro' && <Intro cardRef={cardRef} onReveal={handleReveal} onDone={handleDone} />}

      {phase === 'card' && !reduced && (
        <button type="button" className="btn btn-replay" onClick={() => setPhase('intro')} aria-label="Xem lại intro">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
          </svg>
          Intro
        </button>
      )}
    </>
  )
}
