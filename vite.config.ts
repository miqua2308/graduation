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

/**
 * Trang cho đường dẫn không phải lời mời (trang chủ, link sai): tĩnh, không tải app, không chứa dữ liệu.
 * Không dùng đường dẫn tương đối vì 404.html được GitHub Pages trả về ở mọi độ sâu.
 */
const NOT_INVITED_HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0B1B3A">
<title>Thư mời tốt nghiệp</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400&family=Cormorant+Garamond:wght@600&display=swap" rel="stylesheet">
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: grid; place-items: center; padding: 24px; box-sizing: border-box;
    background: radial-gradient(800px 500px at 50% 20%, #1c3566, #0b1b3a 60%, #060f22);
    color: #f6f0e4; text-align: center;
    font: 400 16px/1.6 'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  main { max-width: 340px; }
  h1 { margin: 0 0 12px; font: 600 30px/1.2 'Cormorant Garamond', Georgia, 'Times New Roman', serif; color: #e8c979; }
  p { margin: 0; color: rgba(246, 240, 228, 0.78); }
</style>
</head>
<body>
<main>
  <h1>Thư mời tốt nghiệp</h1>
  <p>Mỗi thiệp được gửi riêng cho từng người. Bạn hãy mở đúng đường link đã nhận nhé.</p>
</main>
</body>
</html>
`

function invitePages(routes: Route[], venue: Venue): Plugin {
  const dataFor = (r: Route) => ({
    key: r.path,
    name: r.name,
    lead: r.lead,
    invitation: r.invitation,
    venue: venue.name || undefined,
    venueMap: venue.name ? venue.map : undefined,
  })
  const inject = (html: string, r: Route) =>
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
      const route = routes.find((r) => r.path === joined)
      return route ? inject(html, route) : NOT_INVITED_HTML
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
      // Không có trang chủ: gốc site và mọi link sai chỉ hiện lời nhắc mở đúng link đã nhận
      writeFileSync(join(outDir, 'index.html'), NOT_INVITED_HTML)
      writeFileSync(join(outDir, '404.html'), NOT_INVITED_HTML)
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
    console.warn('\n[invite] Chưa có INVITES (.env hoặc GitHub Secret): chưa có thiệp nào, mọi link chỉ hiện lời nhắc mở đúng link.\n')
  }
  return {
    base: './',
    plugins: [react(), invitePages(routes, parseVenue(env.VENUE))],
  }
})
