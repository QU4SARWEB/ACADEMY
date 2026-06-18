import { escapeHtml } from '@/2b3583/e0ebc3'

const baseClass = 'w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]'

export interface InputOptions {
  type?: string
  name: string
  id?: string
  label?: string
  error?: string
  placeholder?: string
  value?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
}

export function Input(opts: InputOptions): string {
  const id = opts.id || opts.name
  const errorMsg = opts.error ? escapeHtml(opts.error) : ''

  return `
    <div>
      ${opts.label ? `<label for="${escapeHtml(id)}" class="mb-1 block text-xs font-medium text-zinc-400">${escapeHtml(opts.label)}</label>` : ''}
      <input
        type="${escapeHtml(opts.type || 'text')}"
        name="${escapeHtml(opts.name)}"
        id="${escapeHtml(id)}"
        class="${baseClass} ${escapeHtml(opts.className || '')}"
        placeholder="${escapeHtml(opts.placeholder || '')}"
        value="${escapeHtml(opts.value || '')}"
        ${opts.required ? 'required' : ''}
        ${opts.disabled ? 'disabled' : ''}
        autocomplete="${escapeHtml(opts.autocomplete || '')}"
      />
      ${errorMsg ? `<p class="mt-1 text-xs text-red-400">${errorMsg}</p>` : ''}
    </div>`
}

export function Textarea(opts: InputOptions & { rows?: number }): string {
  const id = opts.id || opts.name
  const errorMsg = opts.error ? escapeHtml(opts.error) : ''

  return `
    <div>
      ${opts.label ? `<label for="${escapeHtml(id)}" class="mb-1 block text-xs font-medium text-zinc-400">${escapeHtml(opts.label)}</label>` : ''}
      <textarea
        name="${escapeHtml(opts.name)}"
        id="${escapeHtml(id)}"
        class="${baseClass} resize-y ${escapeHtml(opts.className || '')}"
        placeholder="${escapeHtml(opts.placeholder || '')}"
        ${opts.required ? 'required' : ''}
        ${opts.disabled ? 'disabled' : ''}
        rows="${opts.rows || 3}"
      >${escapeHtml(opts.value || '')}</textarea>
      ${errorMsg ? `<p class="mt-1 text-xs text-red-400">${errorMsg}</p>` : ''}
    </div>`
}

export interface SelectOptions {
  name: string
  id?: string
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
  value?: string
  className?: string
  required?: boolean
}

export function Select(opts: SelectOptions): string {
  const id = opts.id || opts.name
  const errorMsg = opts.error ? escapeHtml(opts.error) : ''

  const optHtml = opts.options.map((opt) =>
    `<option value="${escapeHtml(opt.value)}" ${opt.value === opts.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
  ).join('')

  return `
    <div>
      ${opts.label ? `<label for="${escapeHtml(id)}" class="mb-1 block text-xs font-medium text-zinc-400">${escapeHtml(opts.label)}</label>` : ''}
      <select
        name="${escapeHtml(opts.name)}"
        id="${escapeHtml(id)}"
        class="${baseClass} ${escapeHtml(opts.className || '')}"
        ${opts.required ? 'required' : ''}
      >${optHtml}</select>
      ${errorMsg ? `<p class="mt-1 text-xs text-red-400">${errorMsg}</p>` : ''}
    </div>`
}
