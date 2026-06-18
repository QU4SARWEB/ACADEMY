import { escapeHtml } from '@/2b3583/e0ebc3'
import { IconSpinner } from '@/2b3583/bd2119'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] btn-glow',
  secondary: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800',
  ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-700 btn-glow',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export interface ButtonOptions {
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: string
  id?: string
  label: string
}

export function Button(opts: ButtonOptions): string {
  const variant = opts.variant || 'primary'
  const size = opts.size || 'md'
  const loading = opts.loading ? 'true' : undefined
  const disabled = opts.disabled || opts.loading

  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
    variantClasses[variant],
    sizeClasses[size],
    opts.className || '',
  ].filter(Boolean).join(' ')

  const spinner = opts.loading ? IconSpinner(16) : ''

  return `<button
    type="${escapeHtml(opts.type || 'button')}"
    id="${escapeHtml(opts.id || '')}"
    class="${classes}"
    ${disabled ? 'disabled' : ''}
    data-loading="${loading || ''}"
  >${spinner}${escapeHtml(opts.label)}</button>`
}

export function ButtonLink(opts: { href: string; label: string; variant?: Variant; size?: Size; className?: string }): string {
  const variant = opts.variant || 'primary'
  const size = opts.size || 'md'
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition no-underline',
    variantClasses[variant],
    sizeClasses[size],
    opts.className || '',
  ].filter(Boolean).join(' ')

  return `<a href="#${escapeHtml(opts.href)}" class="${classes}">${escapeHtml(opts.label)}</a>`
}
