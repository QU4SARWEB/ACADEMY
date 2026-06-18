import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

let modalRoot: HTMLElement | null = null

export function Modal(title: string, bodyHtml: string, onMount?: (el: HTMLElement) => void): string {
  return `
    <div id="modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div id="modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div id="modal-content" class="glass relative z-10 w-full max-w-lg rounded-xl p-6 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-heading text-lg font-bold text-white">${escapeHtml(title)}</h2>
          <button id="modal-close" class="ml-auto rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white">
            ${Icon('x', 18)}
          </button>
        </div>
        ${bodyHtml}
      </div>
    </div>`
}

export function openModal(title: string, bodyHtml: string, onMount?: (el: HTMLElement) => void): void {
  closeModal()
  const html = Modal(title, bodyHtml)
  const div = document.createElement('div')
  div.id = 'modal-instance'
  div.innerHTML = html
  document.body.appendChild(div)
  document.body.style.overflow = 'hidden'

  const close = () => closeModal()

  document.getElementById('modal-backdrop')?.addEventListener('click', close)
  document.getElementById('modal-close')?.addEventListener('click', close)

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  window.addEventListener('keydown', handleKey)

  if (onMount) onMount(div)
}

export function closeModal(): void {
  const existing = document.getElementById('modal-instance')
  if (existing) {
    existing.remove()
  }
  document.body.style.overflow = ''
}
