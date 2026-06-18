export function renderNotFound(): string {
  return `
    <div class="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] p-8 text-center">
      <span class="font-heading text-8xl font-bold text-zinc-800">404</span>
      <h1 class="mt-4 font-heading text-xl font-bold text-white">Página no encontrada</h1>
      <p class="mt-2 text-sm text-zinc-500">La página que buscas no existe o ha sido movida.</p>
      <a href="#/" class="btn-glow mt-6 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
        Volver al inicio
      </a>
    </div>`
}
