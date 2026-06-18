import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderHome(): string {
  return `
    <div class="relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <!-- Background effects -->
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      <!-- Navbar -->
      <nav class="relative z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 md:px-12">
        <div class="flex items-center gap-2">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
          <span class="font-heading text-lg font-bold text-white">QU4SAR</span>
        </div>
      </nav>

      <!-- Hero -->
      <section class="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-24 text-center md:pt-32">
        <div class="animate-float mb-6">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-24 w-24 md:h-32 md:w-32" />
        </div>
        <h1 class="font-heading text-4xl font-bold text-white md:text-6xl">
          QU<span class="text-[#8B5CF6]">4</span>SAR Gaming Academy
        </h1>
        <p class="mt-4 max-w-xl text-base text-zinc-400">
          La academia de esports que transforma tu pasión en rendimiento competitivo. 
          Entrena con coaches profesionales y lleva tu juego al siguiente nivel.
        </p>
        <div class="mt-8 flex gap-4">
          <a href="#/register" class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            Comienza ahora
          </a>
          <a href="#/login" class="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
            Ya tengo cuenta
          </a>
        </div>
      </section>

      <!-- Features -->
      <section class="relative z-10 mx-auto mt-32 grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        ${[
          { icon: 'bookOpen', title: 'Cursos estructurados', desc: 'Programas de entrenamiento diseñados por coaches profesionales para maximizar tu rendimiento.' },
          { icon: 'target', title: 'Seguimiento personal', desc: 'Evaluaciones periódicas y retroalimentación detallada para medir tu progreso.' },
          { icon: 'trophy', title: 'Competitivo', desc: 'Prepárate para torneos y scrims con herramientas diseñadas para el alto rendimiento.' },
        ].map(f => `
          <div class="glass rounded-xl p-6 text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon(f.icon, 24)}
            </div>
            <h3 class="mb-2 font-heading text-sm font-bold text-white">${escapeHtml(f.title)}</h3>
            <p class="text-sm text-zinc-400">${escapeHtml(f.desc)}</p>
          </div>
        `).join('')}
      </section>

      <!-- Footer -->
      <footer class="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-600">
        &copy; ${new Date().getFullYear()} QU4SAR Gaming Academy. Todos los derechos reservados.
      </footer>
    </div>`
}

export function mountHome(): void {
  // no client interactions needed
}
