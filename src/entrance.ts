import gsap from 'gsap'

/** Hiệu ứng hiện lần lượt khi vào thẳng thiệp (đã xem intro). Trả về hàm dọn dẹp. */
export function playEntrance(card: HTMLElement): () => void {
  const q = (k: string) => card.querySelector<HTMLElement>(`[data-piece="${k}"]`)!
  const paper = q('paper')
  const frame = q('frame')
  const corners = ['c-tl', 'c-tr', 'c-bl', 'c-br'].map(q)
  const body = ['cap', 'headline', 'lead', 'name', 'tail', 'info'].map(q)
  const all = [paper, frame, ...corners, ...body]
  const clear = () => gsap.set(all, { clearProps: 'opacity,transform' })

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: clear })
  tl.fromTo(paper, { opacity: 0, y: 36, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 }, 0)
  tl.fromTo(frame, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.8 }, 0.25)
  tl.fromTo(
    corners,
    { opacity: 0, scale: 0.5 },
    { opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(2)' },
    0.5,
  )
  tl.fromTo(body, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.65)

  return () => {
    tl.kill()
    clear()
  }
}
