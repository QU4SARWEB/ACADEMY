import { Icon } from '@/2b3583/bd2119'

export function renderAbout(): string {
  return `
    <div class="relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
        <div class="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      <nav class="relative z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 md:px-12">
        <div class="flex items-center gap-2">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
          <span class="font-heading text-lg font-bold text-white">QU4SAR</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <a href="#/" class="text-zinc-400 hover:text-white transition">Inicio</a>
          <a href="#/register" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition">Registrarse</a>
        </div>
      </nav>

      <section class="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-32">
        <div class="text-center mb-16">
          <h1 class="font-heading text-4xl font-bold text-white md:text-5xl">
            Sobre <span class="text-[#8B5CF6]">QU4SAR</span>
          </h1>
          <p class="mt-4 max-w-2xl mx-auto text-base text-zinc-400">
            Conoce nuestra historia, equipo y visi\u00f3n para el futuro de los esports.
          </p>
        </div>

        <div class="glass rounded-xl p-8 mb-8">
          <h2 class="font-heading text-2xl font-bold text-white mb-4">Nuestra historia</h2>
          <div class="space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              QU4SAR Gaming Academy naci\u00f3 este a\u00f1o con una visi\u00f3n clara: democratizar el entrenamiento
              de esports y hacer accesible la formaci\u00f3n competitiva de alto nivel para cualquier persona
              con talento y dedicaci\u00f3n.
            </p>
            <p>
              Desde nuestros inicios, hemos trabajado con coaches profesionales y jugadores de alto
              rendimiento para desarrollar una metodolog\u00eda de ense\u00f1anza \u00fanica que combina
              t\u00e9cnica, estrategia y desarrollo mental.
            </p>
            <p>
              Hoy, QU4SAR es una comunidad en crecimiento de jugadores apasionados que buscan llevar
              su rendimiento al siguiente nivel, con programas estructurados para todas las etapas
              de desarrollo competitivo.
            </p>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2 mb-8">
          <div class="glass rounded-xl p-8">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('target', 24)}
            </div>
            <h2 class="font-heading text-xl font-bold text-white mb-3">Misi\u00f3n</h2>
            <p class="text-sm text-zinc-400 leading-relaxed">
              Formar jugadores de esports integrales, con habilidades t\u00e9cnicas, t\u00e1cticas y
              mentales s\u00f3lidas, prepar\u00e1ndolos para competir al m\u00e1s alto nivel y
              desarrollarse como profesionales dentro y fuera del juego.
            </p>
          </div>
          <div class="glass rounded-xl p-8">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('eye', 24)}
            </div>
            <h2 class="font-heading text-xl font-bold text-white mb-3">Visi\u00f3n</h2>
            <p class="text-sm text-zinc-400 leading-relaxed">
              Ser la academia de esports de referencia en Latinoam\u00e9rica, reconocida por la
              excelencia de nuestros egresados y por transformar la pasi\u00f3n por los videojuegos
              en carreras profesionales sostenibles.
            </p>
          </div>
        </div>

        <div class="glass rounded-xl p-8 mb-8">
          <h2 class="font-heading text-2xl font-bold text-white mb-6">Nuestro equipo</h2>
          <div class="grid gap-6 md:grid-cols-3">
            ${[
              { name: 'Coaches', role: 'Entrenadores certificados', icon: 'users' },
              { name: 'Analistas', role: 'Especialistas en rendimiento', icon: 'zap' },
              { name: 'Mentores', role: 'Jugadores con experiencia competitiva', icon: 'trophy' },
            ].map(m => `
              <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                  ${Icon(m.icon, 24)}
                </div>
                <h3 class="font-heading text-base font-bold text-white">${m.name}</h3>
                <p class="mt-1 text-xs text-zinc-500">${m.role}</p>
                <p class="mt-3 text-xs text-zinc-500">Contamos con profesionales apasionados por formar nuevo talento.</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="text-center">
          <a href="#/register" class="btn-glow inline-block rounded-lg bg-[#8B5CF6] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            \u00danete a QU4SAR
          </a>
          <p class="mt-3 text-xs text-zinc-600">Comienza tu viaje hoy. Sin compromiso.</p>
        </div>
      </section>

      <footer class="relative z-10 border-t border-zinc-800 px-6 py-8">
        <div class="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center md:flex-row md:justify-between">
          <div class="flex items-center gap-2">
            <img src="qu4sar.ico" alt="" class="h-6 w-6" />
            <span class="text-sm font-bold text-white">QU4SAR Gaming Academy</span>
          </div>
          <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-zinc-600">
            <a href="https://www.youtube.com/@QU4SAR_ACADEMY" target="_blank" class="hover:text-zinc-400 transition">YouTube</a>
            <a href="https://www.twitch.tv/qu4sar_academy" target="_blank" class="hover:text-zinc-400 transition">Twitch</a>
            <a href="https://www.instagram.com/qu4sar._.esports/" target="_blank" class="hover:text-zinc-400 transition">Instagram</a>
            <a href="https://discord.gg/wbFm5BVWW" target="_blank" class="hover:text-zinc-400 transition">Discord</a>
            <a href="#/" class="hover:text-zinc-400 transition">Inicio</a>
            <a href="#/login" class="hover:text-zinc-400 transition">Iniciar sesi\u00f3n</a>
          </div>
          <p class="text-xs text-zinc-600">&copy; ${new Date().getFullYear()} QU4SAR Gaming Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>`
}

export function mountAbout(): void {
}
