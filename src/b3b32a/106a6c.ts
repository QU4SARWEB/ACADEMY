import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderHome(session?: any): string {
  const loggedIn = !!session?.user
  return `
    <div class="relative min-h-screen overflow-hidden">
      <div class="fixed inset-0" style="background: url('/qu4sarfondoPublico.png') center/cover no-repeat fixed; z-index:-2"></div>
      <div class="fixed inset-0" style="background: rgba(10,10,10,0.55); z-index:-1"></div>
      <div class="pointer-events-none fixed inset-0" style="z-index:-1">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      <nav class="relative z-10 flex items-center justify-between border-b border-zinc-800 bg-[#0A0A0A]/70 backdrop-blur-md px-6 py-4 md:px-12">
        <div class="flex items-center gap-2">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
          <span class="font-heading text-lg font-bold text-white">QU4SAR</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          ${loggedIn
            ? '<a href="#/coaches/dashboard" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition">Plataforma</a>'
            : '<a href="#/login" class="text-zinc-400 hover:text-white transition">Iniciar sesi\u00f3n</a>\n          <a href="#/register" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition">Registrarse</a>'
          }
        </div>
      </nav>

      <section class="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center px-6 pt-24 text-center md:pt-32">
        <div class="animate-float mb-6">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-24 w-24 md:h-32 md:w-32" />
        </div>
        <h1 class="font-heading text-4xl font-bold text-white md:text-6xl">
          QU<span class="text-[#8B5CF6]">4</span>SAR Gaming Academy
        </h1>
        <p class="mt-4 max-w-xl text-base text-zinc-400">
          La academia de esports que transforma tu pasi\u00f3n en rendimiento competitivo.
          Entrena con coaches profesionales y lleva tu juego al siguiente nivel.
        </p>
        <div class="mt-8 flex gap-4">
          <a href="#/register" class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            Comienza ahora
          </a>
          <a href="#/about" class="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
            Conocer m\u00e1s
          </a>
        </div>
      </section>

      <div class="bg-[#0A0A0A] pt-8 rounded-t-[40px] -mt-8 relative z-10">
      <section class="mx-auto mt-24 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Sobre QU4SAR</h2>
        <p class="mx-auto mb-10 max-w-2xl text-center text-sm text-zinc-400">
          QU4SAR Gaming Academy nace con la misi\u00f3n de formar a la pr\u00f3xima generaci\u00f3n de talento competitivo.
          Combinamos entrenamiento t\u00e9cnico, an\u00e1lisis de rendimiento y desarrollo personal
          para crear jugadores completos, dentro y fuera del juego.
        </p>
        <div class="grid gap-6 md:grid-cols-3">
          ${[
            { icon: 'target', title: 'Misi\u00f3n', desc: 'Formar jugadores de esports con habilidades t\u00e9cnicas, t\u00e1cticas y mentales para competir al m\u00e1s alto nivel.' },
            { icon: 'eye', title: 'Visi\u00f3n', desc: 'Ser la academia de esports de referencia en habla hispana, reconocida por la calidad de nuestros egresados.' },
            { icon: 'shield', title: 'Valores', desc: 'Disciplina, trabajo en equipo, respeto, perseverancia y pasi\u00f3n por la mejora continua.' },
          ].map(s => `
            <div class="glass rounded-xl p-6 text-center">
              <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
                ${Icon(s.icon, 24)}
              </div>
              <h3 class="mb-2 font-heading text-sm font-bold text-white">${escapeHtml(s.title)}</h3>
              <p class="text-sm text-zinc-400">${escapeHtml(s.desc)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Nuestros servicios</h2>
        <p class="mx-auto mb-10 max-w-2xl text-center text-sm text-zinc-400">
          Todo lo que necesitas para desarrollar tu carrera en esports, en un solo lugar.
        </p>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          ${[
            { icon: 'bookOpen', title: 'Cursos', desc: 'Programas por niveles desde Rookie hasta Pro, con plan de estudios dise\u00f1ado por coaches.' },
            { icon: 'zap', title: 'Coaching', desc: 'Sesiones personalizadas con an\u00e1lisis de VOD, correcci\u00f3n de errores y estrategia.' },
            { icon: 'users', title: 'Scrims', desc: 'Enfrentamientos organizados contra otros equipos para poner a prueba tu nivel.' },
            { icon: 'trophy', title: 'Torneos', desc: 'Competiciones internas y externas para ganar experiencia y visibilidad.' },
          ].map(s => `
            <div class="glass rounded-xl p-5 text-center">
              <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
                ${Icon(s.icon, 20)}
              </div>
              <h3 class="mb-1 font-heading text-sm font-bold text-white">${escapeHtml(s.title)}</h3>
              <p class="text-xs text-zinc-400">${escapeHtml(s.desc)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <div class="mb-10 text-center">
          <span class="inline-block rounded-full bg-[#8B5CF6]/20 px-4 py-1 text-xs font-medium text-[#8B5CF6]">Inversi\u00f3n \u00fanica por curso</span>
          <h2 class="mt-4 font-heading text-3xl font-bold text-white md:text-4xl">Invierte en tu futuro competitivo</h2>
          <p class="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            Sin mensualidades ni suscripciones. Pagas \u00fanicamente el curso que quieres llevar
            y accedes a todos los beneficios de nuestra metodolog\u00eda de entrenamiento.
          </p>
        </div>
        <div class="mx-auto flex max-w-2xl flex-col gap-6 md:flex-row md:items-stretch">
          <div class="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-[#111] p-6">
            <h3 class="font-heading text-base font-bold text-white">Posicionamiento</h3>
            <p class="mt-4 text-3xl font-bold text-green-400">Gratis</p>
            <p class="mt-2 text-xs text-zinc-500">Evaluaci\u00f3n de nivel sin costo</p>
            <ul class="mt-6 space-y-2">
              ${['Evaluaci\u00f3n de nivel inicial', 'Examen te\u00f3rico de posicionamiento', 'Examen pr\u00e1ctico en juego', 'Asignaci\u00f3n del curso adecuado para ti'].map(f => `
                <li class="flex items-start gap-2 text-sm text-zinc-400">
                  ${Icon('checkCircle', 14)}
                  <span>${escapeHtml(f)}</span>
                </li>
              `).join('')}
            </ul>
            <p class="mt-3 text-xs text-zinc-500">Luego de la evaluaci\u00f3n se te asignar\u00e1 el curso que corresponda a tu nivel y pagar\u00e1s \u00fanicamente ese curso.</p>
            <a href="#/register" class="mt-auto block rounded-lg border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
              Comenzar gratis
            </a>
          </div>
          <div class="relative flex flex-1 flex-col rounded-xl border-2 border-[#8B5CF6]/40 bg-[#111] p-6">
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#8B5CF6] px-5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-[#8B5CF6]/30">M\u00e1s elegido</span>
            <h3 class="font-heading text-base font-bold text-white">Cursos completos</h3>
            <p class="mt-4 text-3xl font-bold text-[#8B5CF6]">
              S/. 4.99 <span class="text-base font-normal text-zinc-500">c/u</span>
            </p>
            <p class="mt-2 text-xs text-zinc-500">Cada nivel incluye todo lo necesario para avanzar</p>
            <ul class="mt-6 space-y-2">
              ${['Plan de estudios progresivo', 'Seguimiento con coaches', 'Scrims y evaluaciones', 'Acceso a la comunidad', 'Certificado al completar'].map(f => `
                <li class="flex items-start gap-2 text-sm text-zinc-400">
                  ${Icon('checkCircle', 14)}
                  <span>${escapeHtml(f)}</span>
                </li>
              `).join('')}
            </ul>
            <p class="mt-4 text-xs text-zinc-500">Paga \u00fanicamente el curso que elijas. Sin mensualidades ni permanencia.</p>
            <a href="#/register" class="mt-auto block rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-[#8B5CF6]/20 transition hover:bg-[#7C3AED]">
              Inscribirse
            </a>
          </div>
        </div>
      </section>

      <section class="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">S\u00edguenos</h2>
        <p class="mx-auto mb-10 max-w-xl text-center text-sm text-zinc-400">
          \u00danete a nuestra comunidad y sigue nuestro contenido en todas las plataformas.
        </p>
        <div class="mx-auto grid max-w-lg gap-3 md:grid-cols-2">
          ${[
            { href: 'https://www.youtube.com/@QU4SAR_ACADEMY', label: 'YouTube', icon: 'play' },
            { href: 'https://www.twitch.tv/qu4sar_academy', label: 'Twitch', icon: 'eye' },
            { href: 'https://kick.com/qu4sar-academy', label: 'Kick', icon: 'zap' },
            { href: 'https://www.instagram.com/qu4sar._.esports/', label: 'Instagram', icon: 'image' },
            { href: 'https://www.tiktok.com/@qu4sar.esports', label: 'TikTok', icon: 'music' },
            { href: 'mailto:qu4saracademyla@gmail.com', label: 'Correo', icon: 'mail' },
            { href: 'https://discord.gg/wbFm5BVWW', label: 'Discord', icon: 'users' },
          ].map(s => `
            <a href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white hover:bg-zinc-900">
              ${Icon(s.icon, 18)}
              <span>${escapeHtml(s.label)}</span>
              ${Icon('arrowUpRight', 14)}
            </a>
          `).join('')}
        </div>
      </section>
      </div>

      <footer class="bg-[#0A0A0A] border-t border-zinc-800 px-6 py-8 relative z-10">
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
            <a href="#/about" class="hover:text-zinc-400 transition">Sobre nosotros</a>
            <a href="#/login" class="hover:text-zinc-400 transition">Iniciar sesi\u00f3n</a>
          </div>
          <p class="text-xs text-zinc-600">&copy; ${new Date().getFullYear()} QU4SAR Gaming Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>`
}

export function mountHome(): void {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      const btn = document.querySelector('nav a[href="#/login"]')
      const register = document.querySelector('nav a[href="#/register"]')
      const container = btn?.parentElement
      if (container && btn && register) {
        btn.remove()
        register.remove()
        const a = document.createElement('a')
        a.href = '#/coaches/dashboard'
        a.className = 'rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition'
        a.textContent = 'Plataforma'
        container.appendChild(a)
      }
    }
  })
}
