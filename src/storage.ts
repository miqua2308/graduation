import { content } from './content'

const KEY = 'graduation-invite:introSeen:v1'

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* localStorage bị chặn (chế độ riêng tư...): bỏ qua, intro sẽ chạy lại lần sau */
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Intro chạy khi: không bật reduced-motion và (chưa xem, hoặc URL có ?intro). */
export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false
  if (new URLSearchParams(location.search).has('intro')) return true
  return !hasSeenIntro()
}

/** Tên khách lấy từ ?to=, cắt tối đa 40 ký tự. React tự escape khi render. */
export function readGuest(): { name: string; isFallback: boolean } {
  const raw = new URLSearchParams(location.search).get('to')?.trim().replace(/\s+/g, ' ') ?? ''
  const name = [...raw].slice(0, 40).join('')
  return name ? { name, isFallback: false } : { name: content.guestFallback, isFallback: true }
}
