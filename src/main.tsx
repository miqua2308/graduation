import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { resolveInvitation } from './storage'
import './styles.css'

// Chỉ trang lời mời mới có thiệp. Trang chủ và link sai được thay bằng trang tĩnh lúc build (vite.config.ts).
const invite = resolveInvitation()
if (invite) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App invite={invite} />
    </StrictMode>,
  )
}
