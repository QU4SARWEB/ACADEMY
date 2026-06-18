// Auto-save drafts for all forms across the app
// Saves to localStorage, restores on page load, clears on submit

const PREFIX = 'draft_'

export function initAutoSave(): void {
  // Skip chat page — it has its own per-conversation draft system
  if (location.hash.startsWith('#/chat')) return

  const key = PREFIX + location.hash

  // Restore saved values
  restoreDrafts(key)

  // Watch all forms for changes
  document.querySelectorAll('form').forEach((form) => {
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input[type="text"], input[type="number"], input[type="email"], input[type="password"], input[type="date"], input[type="datetime-local"], input[type="time"], input[type="url"], textarea, select:not([multiple])'
    )

    inputs.forEach((input) => {
      input.addEventListener('input', () => saveDraft(key, form))
      input.addEventListener('change', () => saveDraft(key, form))
    })

    // Clear on successful submit
    form.addEventListener('submit', () => {
      setTimeout(() => {
        // Check if there's an error shown — if not, clear draft
        if (!form.querySelector('.text-red-400:not(.hidden)')) {
          localStorage.removeItem(key)
        }
      }, 500)
    })
  })
}

function saveDraft(key: string, form: HTMLFormElement): void {
  const data: Record<string, string> = {}
  const fd = new FormData(form)
  for (const [name, value] of fd.entries()) {
    if (typeof value === 'string' && value.trim()) {
      data[name] = value
    }
  }
  if (Object.keys(data).length > 0) {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

function restoreDrafts(key: string): void {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return

    const data = JSON.parse(saved) as Record<string, string>

    document.querySelectorAll('form').forEach((form) => {
      const fd = new FormData(form)
      for (const [name, value] of Object.entries(data)) {
        // Only restore if the field is empty (user hasn't typed yet)
        const existing = fd.get(name)
        if (existing && typeof existing === 'string' && existing.trim()) continue

        const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          `[name="${CSS.escape(name)}"]`
        )
        if (!input) continue

        if (input instanceof HTMLSelectElement) {
          // Find option by value or text
          const opt = Array.from(input.options).find(
            (o) => o.value === value || o.text === value
          )
          if (opt) input.value = opt.value
        } else {
          input.value = value
        }
      }
    })
  } catch {
    // Invalid JSON, ignore
  }
}

export function clearDraft(): void {
  localStorage.removeItem(PREFIX + location.hash)
}
