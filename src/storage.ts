import { content } from './content'

const KEY_PREFIX = 'graduation-invite:introSeen:v1:'

export interface Resolved {
  /** Định danh thiệp, dùng làm khoá lưu "đã xem intro" riêng cho từng link */
  key: string
  name: string
  lead: string
  invitation: string
  /** Địa điểm (từ VENUE trong .env), chỉ có trên trang của người được mời */
  venue?: string
  /** Link bản đồ của địa điểm (phần sau dấu | trong VENUE) */
  venueMap?: string
}

/** Dữ liệu do bước build gắn vào đúng trang này (xem vite.config.ts). Chỉ trang lời mời mới có. */
interface PageData {
  key?: string
  name?: string
  lead?: string
  invitation?: string
  venue?: string
  venueMap?: string
}

function readPageData(): PageData {
  try {
    const raw = document.getElementById('invite-data')?.textContent
    return raw ? (JSON.parse(raw) as PageData) : {}
  } catch {
    return {}
  }
}

/**
 * Thiệp của trang hiện tại. ?to=Tên (nếu có) ghi đè tên hiển thị.
 * Không phải trang lời mời (không có dữ liệu) thì trả về null: không hiện thiệp.
 */
export function resolveInvitation(): Resolved | null {
  const data = readPageData()
  if (!data.key) return null

  const raw = new URLSearchParams(location.search).get('to')?.trim().replace(/\s+/g, ' ') ?? ''
  const fromQuery = [...raw].slice(0, 40).join('')
  const name = fromQuery || data.name || ''

  return {
    key: data.key,
    name: name || content.guestFallback,
    lead: (fromQuery ? undefined : data.lead) ?? (name ? content.lead : content.leadFallback),
    invitation: data.invitation ?? content.invitation,
    venue: data.venue,
    venueMap: data.venue && data.venueMap?.startsWith('https://') ? data.venueMap : undefined,
  }
}

export function hasSeenIntro(key: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + key) === '1'
  } catch {
    return false
  }
}

export function markIntroSeen(key: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + key, '1')
  } catch {
    /* localStorage bị chặn (chế độ riêng tư...): bỏ qua, intro sẽ chạy lại lần sau */
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Intro chạy khi: không bật reduced-motion và (chưa xem, hoặc URL có ?intro). */
export function shouldPlayIntro(key: string): boolean {
  if (prefersReducedMotion()) return false
  if (new URLSearchParams(location.search).has('intro')) return true
  return !hasSeenIntro(key)
}
