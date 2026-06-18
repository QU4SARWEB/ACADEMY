import { escapeHtml } from './e0ebc3'

export function $<T extends HTMLElement>(selector: string, parent: HTMLElement | Document = document): T | null {
  return parent.querySelector<T>(selector)
}

export function $$<T extends HTMLElement>(selector: string, parent: HTMLElement | Document = document): NodeListOf<T> {
  return parent.querySelectorAll<T>(selector)
}

export function el(tag: string, attrs?: Record<string, string>, children?: string): string {
  const attrStr = attrs
    ? ' ' + Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
        .join(' ')
    : ''
  return `<${tag}${attrStr}>${children ?? ''}</${tag}>`
}

export function renderInto(containerId: string, html: string): void {
  const container = document.getElementById(containerId)
  if (container) container.innerHTML = html
}

export function showError(containerId: string, message: string): void {
  renderInto(containerId, `
    <div class="flex flex-col items-center justify-center p-12 text-center">
      <p class="text-red-400 text-sm">${escapeHtml(message)}</p>
      <button onclick="location.reload()" class="mt-4 text-xs text-zinc-500 hover:text-white underline">
        Reintentar
      </button>
    </div>
  `)
}
