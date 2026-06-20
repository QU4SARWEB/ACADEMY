export function confirmDialog(message: string, confirmText = 'Eliminar'): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.getElementById('confirm-dialog-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = 'confirm-dialog-overlay'
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60'

    overlay.innerHTML = `
      <div class="glass mx-4 w-full max-w-sm rounded-xl p-6 shadow-2xl">
        <p class="mb-6 text-sm text-zinc-300">${message}</p>
        <div class="flex justify-end gap-3">
          <button id="confirm-cancel-btn" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
          <button id="confirm-ok-btn" class="rounded-lg ${confirmText === 'Eliminar' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#8B5CF6] hover:bg-[#7C3AED]'} px-4 py-2 text-sm font-medium text-white transition">${confirmText}</button>
        </div>
      </div>`

    document.body.appendChild(overlay)

    document.getElementById('confirm-cancel-btn')!.addEventListener('click', () => {
      overlay.remove()
      resolve(false)
    })

    document.getElementById('confirm-ok-btn')!.addEventListener('click', () => {
      overlay.remove()
      resolve(true)
    })

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove()
        resolve(false)
      }
    })
  })
}
