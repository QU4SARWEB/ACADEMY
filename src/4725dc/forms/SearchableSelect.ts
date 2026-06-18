import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

export interface SelectOption {
  value: string
  label: string
}

export interface SearchableSelectConfig {
  name: string
  label: string
  options: SelectOption[]
  value?: string
  placeholder?: string
  required?: boolean
  tooltip?: string
}

export function renderSearchableSelect(config: SearchableSelectConfig): string {
  const selected = config.options.find((o) => o.value === config.value)
  return `
    <div class="searchable-select" data-name="${escapeHtml(config.name)}">
      <label class="mb-1 block text-xs font-medium text-zinc-400">
        ${escapeHtml(config.label)}
        ${config.required ? '<span class="text-red-400 ml-0.5">*</span>' : ''}
        ${config.tooltip ? `<span class="ml-1 cursor-help text-zinc-600" title="${escapeHtml(config.tooltip)}">${Icon('helpCircle', 12)}</span>` : ''}
      </label>
      <div class="ss-control relative">
        <input type="text" readonly
          value="${escapeHtml(selected?.label || '')}"
          placeholder="${escapeHtml(config.placeholder || 'Seleccionar...')}"
          class="ss-display w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none cursor-pointer focus:border-[#8B5CF6]"
          ${config.required ? 'required' : ''} />
        <input type="hidden" name="${escapeHtml(config.name)}" value="${escapeHtml(config.value || '')}" />
        <div class="ss-dropdown absolute left-0 right-0 top-full mt-1 z-50 hidden max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          <div class="sticky top-0 bg-zinc-900 p-2 border-b border-zinc-700">
            <input type="text" class="ss-search w-full rounded-md border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" placeholder="Buscar..." />
          </div>
          <div class="ss-options">
            ${config.options.length === 0
              ? '<p class="p-3 text-xs text-zinc-500">Sin opciones</p>'
              : config.options.map((o) => `
                <div class="ss-option px-3 py-2 text-sm text-zinc-300 cursor-pointer transition hover:bg-zinc-800 hover:text-white ${o.value === config.value ? 'bg-zinc-800 text-white' : ''}"
                  data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</div>
              `).join('')
            }
          </div>
        </div>
      </div>
      <p class="ss-error mt-1 hidden text-xs text-red-400"></p>
    </div>`
}

export function initSearchableSelect(container: HTMLElement): void {
  container.querySelectorAll('.searchable-select').forEach((wrapper) => {
    const display = wrapper.querySelector('.ss-display') as HTMLInputElement
    const hidden = wrapper.querySelector('input[type="hidden"]') as HTMLInputElement
    const dropdown = wrapper.querySelector('.ss-dropdown') as HTMLElement
    const search = wrapper.querySelector('.ss-search') as HTMLInputElement
    const optionsContainer = wrapper.querySelector('.ss-options') as HTMLElement
    if (!display || !hidden || !dropdown) return

    function toggleDropdown(open?: boolean) {
      const show = open ?? !dropdown.classList.contains('hidden')
      dropdown.classList.toggle('hidden', !show)
      if (show && search) { search.value = ''; search.focus(); filterOptions('') }
    }

    function filterOptions(query: string) {
      optionsContainer.querySelectorAll('.ss-option').forEach((opt) => {
        const label = (opt as HTMLElement).textContent?.toLowerCase() || ''
        opt.classList.toggle('hidden', !label.includes(query.toLowerCase()))
      })
    }

    function selectOption(value: string, label: string) {
      hidden.value = value
      display.value = label
      toggleDropdown(false)
      display.dispatchEvent(new Event('change', { bubbles: true }))
    }

    display.addEventListener('click', () => toggleDropdown())
    display.addEventListener('focus', () => toggleDropdown(true))

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target as Node)) toggleDropdown(false)
    })

    search?.addEventListener('input', () => filterOptions(search.value))

    optionsContainer.addEventListener('click', (e) => {
      const opt = (e.target as HTMLElement).closest('.ss-option') as HTMLElement
      if (!opt || opt.classList.contains('hidden')) return
      selectOption(opt.dataset.value || '', opt.textContent || '')
    })

    // Keyboard nav
    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        toggleDropdown(true)
      }
      if (e.key === 'Escape') toggleDropdown(false)
    })

    search?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleDropdown(false)
      if (e.key === 'Enter') {
        const visible = optionsContainer.querySelector('.ss-option:not(.hidden)') as HTMLElement
        if (visible) { selectOption(visible.dataset.value || '', visible.textContent || ''); toggleDropdown(false) }
      }
    })
  })
}

export function getSearchableSelectValue(name: string): string {
  const hidden = document.querySelector<HTMLInputElement>(`.searchable-select input[type="hidden"][name="${name}"]`)
  return hidden?.value || ''
}

export function setSearchableSelectValue(name: string, value: string, options: SelectOption[]): void {
  const wrapper = document.querySelector<HTMLElement>(`.searchable-select[data-name="${name}"]`)
  if (!wrapper) return
  const display = wrapper.querySelector('.ss-display') as HTMLInputElement
  const hidden = wrapper.querySelector('input[type="hidden"]') as HTMLInputElement
  const option = options.find((o) => o.value === value)
  if (display) display.value = option?.label || ''
  if (hidden) hidden.value = value

  wrapper.querySelectorAll('.ss-option').forEach((opt) => {
    const el = opt as HTMLElement
    el.classList.toggle('bg-zinc-800 text-white', el.dataset.value === value)
  })
}
