import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const icons: Record<ToastType, string> = {
  success: Icon('checkCircle', 16),
  error: Icon('xCircle', 16),
  warning: Icon('alertTriangle', 16),
  info: Icon('info', 16),
}

const borderColors: Record<ToastType, string> = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  warning: 'border-yellow-500/30',
  info: 'border-blue-500/30',
}

export function toast(type: ToastType, message: string): void {
  const container = document.getElementById('toast-container')
  if (!container) return

  const id = `toast-${Math.random().toString(36).slice(2)}`
  const html = `
    <div id="${id}" class="glass flex items-center gap-3 rounded-lg border ${borderColors[type]} px-4 py-3 text-sm text-white shadow-lg" role="status">
      ${icons[type]}
      <span class="flex-1">${escapeHtml(message)}</span>
      <button class="toast-close text-zinc-500 hover:text-white" data-toast="${id}" aria-label="Cerrar">
        ${Icon('x', 14)}
      </button>
    </div>`

  container.insertAdjacentHTML('beforeend', html)

  const el = document.getElementById(id)
  if (el) {
    el.querySelector('.toast-close')?.addEventListener('click', () => el.remove())
    setTimeout(() => el.remove(), 4000)
  }
}

export function initToastContainer(): void {
  if (!document.getElementById('toast-container')) {
    const div = document.createElement('div')
    div.id = 'toast-container'
    div.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2'
    div.setAttribute('aria-live', 'polite')
    document.body.appendChild(div)
  }
}
