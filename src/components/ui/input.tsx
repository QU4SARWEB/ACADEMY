'use client'

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const baseClass =
  'w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-[#8B5CF6] focus:shadow-[0_0_0_2px_rgba(139,92,246,0.15)]'

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-400">
            {label}
          </label>
        )}
        <input ref={ref} id={id} className={`${baseClass} ${className ?? ''}`} {...props} />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-400">
            {label}
          </label>
        )}
        <textarea ref={ref} id={id} className={`${baseClass} resize-y ${className ?? ''}`} {...props} />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-400">
            {label}
          </label>
        )}
        <select ref={ref} id={id} className={`${baseClass} ${className ?? ''}`} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Input, Textarea, Select }
export type { InputProps, TextareaProps, SelectProps }
