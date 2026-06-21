export function isMobile(): boolean {
  return window.innerWidth < 768
}

export function renderMobileBlocked(): string {
  return `
    <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div class="glass rounded-xl p-8 max-w-sm">
        <h1 class="font-heading text-xl font-bold text-white mb-4">Escritorio requerido</h1>
        <p class="text-sm text-zinc-400 mb-6">Esta sección solo está disponible en computadora. Accede desde un monitor o laptop para usar todas las funciones.</p>
        <p class="text-xs text-zinc-600">QU4SAR Academy</p>
      </div>
    </div>`
}
