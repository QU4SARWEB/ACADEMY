import { Icon } from '@/2b3583/bd2119'
import { renderDiscordBanner, renderPublicNavbar, renderPublicFooter, mountPublicNav } from '@/b3b32a/shared/public_nav'

export function renderAbout(session?: any): string {
  return `
     <div class="public-page relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
        <div class="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      ${renderDiscordBanner()}
      ${renderPublicNavbar(session, { active: 'about', links: false })}

      <section class="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-28">
         <div class="text-center mb-14 reveal">
          <span class="lbl">Sobre nosotros</span>
          <h1 class="s-title">Sobre <em>QU4SAR</em></h1>
          <p class="s-title-sub mx-auto">Conoce nuestra historia, equipo y visión para el futuro de los esports.</p>
        </div>

        <div class="hud glass rounded-xl p-8 mb-8 reveal">
          <span class="lbl">Nuestra historia</span>
          <div class="space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              QU4SAR Gaming Academy nació este año con una visión clara: democratizar el entrenamiento
              de esports y hacer accesible la formación competitiva de alto nivel para cualquier persona
              con talento y dedicación.
            </p>
            <p>
              Desde nuestros inicios, hemos trabajado con coaches profesionales y jugadores de alto
              rendimiento para desarrollar una metodología de enseñanza única que combina
              técnica, estrategia y desarrollo mental.
            </p>
            <p>
              Hoy, QU4SAR es una comunidad en crecimiento de jugadores apasionados que buscan llevar
              su rendimiento al siguiente nivel, con programas estructurados para todas las etapas
              de desarrollo competitivo.
            </p>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2 mb-8">
          <div class="glass rounded-xl p-8 reveal" style="--i:0">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('target', 24)}
            </div>
            <h2 class="font-heading text-xl font-bold text-white mb-3">Misión</h2>
            <p class="text-sm text-zinc-400 leading-relaxed">
              Formar jugadores de esports integrales, con habilidades técnicas, tácticas y
              mentales sólidas, preparándolos para competir al más alto nivel y
              desarrollarse como profesionales dentro y fuera del juego.
            </p>
          </div>
          <div class="glass rounded-xl p-8 reveal" style="--i:1">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('eye', 24)}
            </div>
            <h2 class="font-heading text-xl font-bold text-white mb-3">Visión</h2>
            <p class="text-sm text-zinc-400 leading-relaxed">
              Ser la academia de esports de referencia en Latinoamérica, reconocida por la
              excelencia de nuestros egresados y por transformar la pasión por los videojuegos
              en carreras profesionales sostenibles.
            </p>
          </div>
        </div>

        <div class="glass rounded-xl p-8 mb-8 reveal">
          <h2 class="font-heading text-2xl font-bold text-white mb-6">Nuestro equipo</h2>
          <div class="grid gap-6 md:grid-cols-3">
            ${[
              { name: 'Coaches', role: 'Entrenadores certificados', icon: 'users' },
              { name: 'Analistas', role: 'Especialistas en rendimiento', icon: 'zap' },
              { name: 'Mentores', role: 'Jugadores con experiencia competitiva', icon: 'trophy' },
             ].map((m, i) => `
               <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center reveal" style="--i:${i}">
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
          <a href="#/register" class="btn btn-primary inline-flex">Únete a QU4SAR</a>
          <p class="mt-3 text-xs text-zinc-600">Comienza tu viaje hoy. Sin compromiso.</p>
        </div>
      </section>

      ${renderPublicFooter()}
    </div>`
}

export function mountAbout(): void {
  mountPublicNav()
}
