import { escapeHtml } from '@/2b3583/e0ebc3'

export interface ToggleConfig {
  name: string
  label: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function renderToggle(config: ToggleConfig): string {
  return `
    <label class="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" name="${escapeHtml(config.name)}" value="true"
        ${config.checked ? 'checked' : ''}
        ${config.disabled ? 'disabled' : ''}
        class="toggle-input peer sr-only" />
      <div class="h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#8B5CF6] peer-checked:after:translate-x-full peer-disabled:opacity-50"></div>
      <span class="ml-3 text-sm text-zinc-300">${escapeHtml(config.label)}</span>
    </label>`
}

export function initToggle(container: HTMLElement, onChange?: (checked: boolean) => void): void {
  container.querySelectorAll('.toggle-input').forEach((input) => {
    input.addEventListener('change', () => {
      const cb = input as HTMLInputElement
      if (onChange) onChange(cb.checked)
    })
  })
}

export function getToggleValue(name: string): boolean {
  const input = document.querySelector<HTMLInputElement>(`input.toggle-input[name="${name}"]`)
  return input?.checked ?? false
}

export function setToggleValue(name: string, checked: boolean): void {
  const input = document.querySelector<HTMLInputElement>(`input.toggle-input[name="${name}"]`)
  if (input) input.checked = checked
}
