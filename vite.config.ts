import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Danh sách người nhận + địa điểm đọc từ .env (local) hoặc GitHub Secrets (CI), KHÔNG nằm trong repo.
 *
 *   INVITES  mỗi dòng một thiệp:  đường-dẫn | tên | lead (tuỳ chọn) | câu nối (tuỳ chọn)
 *   VENUE    địa điểm hiển thị trên thiệp:  tên | link bản đồ (tuỳ chọn)
 *
 * Khi build, mỗi đường dẫn nhận một index.html riêng chỉ chứa dữ liệu của chính nó.
 * Các trang khác và file JS dùng chung không chứa tên ai hay địa chỉ.
 */
interface Route {
  path: string
  name?: string
  lead?: string
  invitation?: string
}

function parseInvites(input: string): Route[] {
  // Chịu được kiểu dán hay gặp: dán cả dòng `INVITES="..."` từ file .env vào GitHub Secret,
  // hoặc bọc cả khối trong dấu nháy.
  const raw = input
    .trim()
    .replace(/^INVITES\s*=\s*/, '')
    .replace(/^["']/, '')
    .replace(/["']\s*$/, '')

  const seen = new Set<string>()
  return raw
    .split(/\r?\n/)
    .map((line, i) => ({ line: line.trim(), no: i + 1 }))
    .filter(({ line }) => line && !line.startsWith('#'))
    .map(({ line, no }) => {
      const [p = '', name = '', lead = '', invitation = ''] = line.split('|').map((s) => s.trim())
      const path = p.replace(/^\/+|\/+$/g, '').toLowerCase()
      if (!/^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/.test(path)) {
        // Không in nội dung dòng: trên CI GitHub che giá trị secret thành *** và log có thể bị xem.
        const bad = [...p].find((c) => !/[a-z0-9_\-/]/i.test(c))
        const hint = bad ? ` Ký tự đầu tiên không hợp lệ: U+${bad.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}.` : ''
        throw new Error(
          `INVITES dòng ${no}: đường dẫn không hợp lệ (chỉ dùng a-z, 0-9, -, _ và /; mỗi dòng dạng "đường-dẫn | tên").${hint}`,
        )
      }
      if (seen.has(path)) throw new Error(`INVITES dòng ${no}: đường dẫn bị trùng với một dòng trước đó`)
      seen.add(path)
      return { path, name: name || undefined, lead: lead || undefined, invitation: invitation || undefined }
    })
}

/** Làm sạch giá trị dán vào .env/Secret: bỏ `VENUE=`, dấu nháy bao quanh (kể cả nháy cong), khoảng trắng thừa. */
function cleanValue(input: string | undefined, name: string): string {
  return (input ?? '')
    .trim()
    .replace(new RegExp(`^${name}\\s*=\\s*`), '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Venue {
  name: string
  map?: string
}

/** VENUE dạng `tên địa điểm | link bản đồ (tuỳ chọn)`. */
function parseVenue(input: string | undefined): Venue {
  const [name = '', map = ''] = cleanValue(input, 'VENUE')
    .split('|')
    .map((s) => s.trim())
  if (map && !/^https:\/\/\S+$/.test(map)) {
    throw new Error('VENUE: link bản đồ (sau dấu |) phải bắt đầu bằng https:// và không có khoảng trắng')
  }
  return { name, map: map || undefined }
}

function invitePages(routes: Route[], venue: Venue): Plugin {
  // Địa chỉ chỉ có trong trang của người được mời, không có ở trang chủ công khai
  const dataFor = (r?: Route) => ({
    key: r?.path ?? 'home',
    name: r?.name,
    lead: r?.lead,
    invitation: r?.invitation,
    venue: r && venue.name ? venue.name : undefined,
    venueMap: r && venue.name ? venue.map : undefined,
  })
  const inject = (html: string, r?: Route) =>
    html.replace(
      '</head>',
      `<script id="invite-data" type="application/json">${JSON.stringify(dataFor(r)).replace(/</g, '\\u003c')}</script>\n  </head>`,
    )

  let outDir = 'dist'
  return {
    name: 'invite-pages',
    configResolved(cfg) {
      outDir = cfg.build.outDir
    },
    // Dev server: gắn dữ liệu theo đường dẫn đang mở
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html
      const url = (ctx.originalUrl ?? ctx.path).split('?')[0].replace(/index\.html$/, '')
      const joined = url.split('/').filter(Boolean).join('/')
      return inject(html, routes.find((r) => r.path === joined))
    },
    // Build: nhân bản trang cho từng đường dẫn, mỗi trang một bộ dữ liệu riêng
    closeBundle() {
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const r of routes) {
        const prefix = '../'.repeat(r.path.split('/').length)
        const page = inject(html.replace(/(src|href)="\.\//g, `$1="${prefix}`), r)
        const dir = join(outDir, r.path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), page)
      }
      // 404: chuyển về trang chủ (tài nguyên phụ thuộc base của repo nên không dùng lại trang chính)
      writeFileSync(
        join(outDir, '404.html'),
        '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>Thư mời</title><a href="./">Về trang thiệp</a>',
      )
    },
  }
}

// base './' để site chạy được dưới subpath của repo (https://user.github.io/<repo>/)
export default defineConfig(({ mode }) => {
  // '' = đọc mọi biến (không chỉ VITE_*), gồm cả biến môi trường của CI.
  // Nhờ vậy giá trị KHÔNG tự bị đóng vào bundle chung; chỉ plugin trên mới ghi ra từng trang.
  const env = loadEnv(mode, process.cwd(), '')
  const routes = parseInvites(env.INVITES ?? '')
  if (routes.length === 0) {
    console.warn('\n[invite] Chưa có INVITES (.env hoặc GitHub Secret): mọi link sẽ hiển thị thiệp chung.\n')
  }
  return {
    base: './',
    plugins: [react(), invitePages(routes, parseVenue(env.VENUE))],
  }
})
