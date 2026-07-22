/**
 * 轻量级 Toast 弹窗（框架无关）
 *
 * 设计目的：
 * - 基座与子应用共享同一真实 window/document，二者调用 showToast 时会把 Toast
 *   追加到同一个 document.body 上，因此双向通信时可以「同时弹出」两个方向的提示。
 * - 不依赖任何 UI 框架，纯 DOM 实现，避免与基座/子应用的组件体系耦合。
 *
 * 使用方式：
 *   import { showToast } from '@micro-public/shared'
 *   showToast('收到子应用事件', { type: 'success', title: '基座' })
 */

export type ToastType = 'info' | 'success' | 'warn' | 'error'

export interface ToastOptions {
  /** 语义类型，决定强调色 */
  type?: ToastType
  /** 标题（加粗显示，可用于标注来源，如「基座」「子应用」） */
  title?: string
  /** 自动消失时间（毫秒），默认 3200 */
  duration?: number
}

const CONTAINER_ID = '__micro_toast_container__'

const COLORS: Record<ToastType, string> = {
  info: '#1890ff',
  success: '#52c41a',
  warn: '#fa8c16',
  error: '#ff4d4f',
}

function escapeHtml(input: string): string {
  return String(input).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c] || c
  })
}

function ensureContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.id = CONTAINER_ID
    container.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:2147483647',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(container)
  }
  return container
}

/**
 * 弹出一个 Toast 提示
 * @param message 提示内容
 * @param options 类型 / 标题 / 时长
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const container = ensureContainer()
  if (!container) return

  const { type = 'info', title, duration = 3200 } = options
  const color = COLORS[type] || COLORS.info

  const el = document.createElement('div')
  el.style.cssText = [
    'min-width:220px',
    'max-width:360px',
    'background:#fff',
    `border-left:4px solid ${color}`,
    'box-shadow:0 6px 20px rgba(0,0,0,0.15)',
    'border-radius:6px',
    'padding:12px 14px',
    'font-size:13px',
    'color:#333',
    'pointer-events:auto',
    'transform:translateX(120%)',
    'opacity:0',
    'transition:transform .28s ease,opacity .28s ease',
  ].join(';')

  const titleHtml = title
    ? `<div style="font-weight:600;color:${color};margin-bottom:4px;">${escapeHtml(title)}</div>`
    : ''
  el.innerHTML = `${titleHtml}<div style="word-break:break-all;line-height:1.5;">${escapeHtml(message)}</div>`

  container.appendChild(el)

  // 入场动画
  requestAnimationFrame(() => {
    el.style.transform = 'translateX(0)'
    el.style.opacity = '1'
  })

  // 出场并移除
  const remove = () => {
    el.style.transform = 'translateX(120%)'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }
  setTimeout(remove, duration)
}
