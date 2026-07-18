import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderHome(session?: any): string {
  const loggedIn = !!session?.user
  return `
    <div class="relative min-h-screen overflow-hidden">
      <style>
        @keyframes wf { 0% { opacity:1; } 50% { opacity:0.6; } 100% { opacity:1; } }
      </style>
      <div class="fixed inset-0" style='background: url("qu4sarfondoPublico.png") center/cover no-repeat fixed; z-index:-2'></div>
      <div class="fixed inset-0" style="background: rgba(10,10,10,0.55); z-index:-1"></div>
      <div class="pointer-events-none fixed inset-0" style="z-index:-1">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/15 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/15 blur-3xl"></div>
      </div>

      <nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-zinc-800/60 bg-[#0A0A0A]/60 backdrop-blur-xl px-6 py-4 md:px-12">
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

      <section class="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center px-6 pt-28 pb-16 md:pt-36 md:pb-20 text-center">
        <div class="animate-float mb-8">
          <div class="relative">
            <div class="absolute inset-0 animate-pulse rounded-full bg-[#8B5CF6]/20 blur-xl"></div>
            <img src="qu4sar.ico" alt="QU4SAR" class="relative h-24 w-24 md:h-32 md:w-32" />
          </div>
        </div>
        <div class="mt-10 flex flex-col sm:flex-row gap-4">
          <a href="#/register" class="btn-glow rounded-xl bg-[#8B5CF6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all hover:bg-[#7C3AED] hover:shadow-xl hover:shadow-[#8B5CF6]/30 hover:-translate-y-0.5 active:translate-y-0">
            Comienza ahora
          </a>
          <a href="#/about" class="rounded-xl border border-zinc-700/60 px-8 py-3.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800/50 hover:text-white hover:border-zinc-600">
            Conocer m\u00e1s
          </a>
        </div>
      </section>

      <div class="relative z-10 h-24 md:h-32 -mb-[1px] overflow-hidden pointer-events-none">
        <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 960 120">
          <path fill="#0A0A0A" opacity="0.2" d="M0,40 C80,0 160,80 240,40 C320,0 400,80 480,40 C560,0 640,80 720,40 C800,0 880,80 960,40 V120 H0 Z">
            <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
              M0,40 C80,0 160,80 240,40 C320,0 400,80 480,40 C560,0 640,80 720,40 C800,0 880,80 960,40 V120 H0 Z;
              M0,40 C80,80 160,0 240,40 C320,80 400,0 480,40 C560,80 640,0 720,40 C800,80 880,0 960,40 V120 H0 Z;
              M0,40 C80,0 160,80 240,40 C320,0 400,80 480,40 C560,0 640,80 720,40 C800,0 880,80 960,40 V120 H0 Z
            "/>
          </path>
        </svg>
        <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 960 120">
          <path fill="#0A0A0A" opacity="0.45" d="M0,43 C80,3 160,83 240,43 C320,3 400,83 480,43 C560,3 640,83 720,43 C800,3 880,83 960,43 V120 H0 Z">
            <animate attributeName="d" dur="6s" repeatCount="indefinite" values="
              M0,43 C80,3 160,83 240,43 C320,3 400,83 480,43 C560,3 640,83 720,43 C800,3 880,83 960,43 V120 H0 Z;
              M0,43 C80,83 160,3 240,43 C320,83 400,3 480,43 C560,83 640,3 720,43 C800,83 880,3 960,43 V120 H0 Z;
              M0,43 C80,3 160,83 240,43 C320,3 400,83 480,43 C560,3 640,83 720,43 C800,3 880,83 960,43 V120 H0 Z
            "/>
          </path>
        </svg>
        <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 960 120">
          <path fill="#0A0A0A" opacity="0.75" d="M0,47 C80,7 160,87 240,47 C320,7 400,87 480,47 C560,7 640,87 720,47 C800,7 880,87 960,47 V120 H0 Z">
            <animate attributeName="d" dur="4.5s" repeatCount="indefinite" values="
              M0,47 C80,7 160,87 240,47 C320,7 400,87 480,47 C560,7 640,87 720,47 C800,7 880,87 960,47 V120 H0 Z;
              M0,47 C80,87 160,7 240,47 C320,87 400,7 480,47 C560,87 640,7 720,47 C800,87 880,7 960,47 V120 H0 Z;
              M0,47 C80,7 160,87 240,47 C320,7 400,87 480,47 C560,7 640,87 720,47 C800,7 880,87 960,47 V120 H0 Z
            "/>
          </path>
        </svg>
        <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 960 120">
          <path fill="#0A0A0A" opacity="1" d="M0,50 C80,10 160,90 240,50 C320,10 400,90 480,50 C560,10 640,90 720,50 C800,10 880,90 960,50 V120 H0 Z">
            <animate attributeName="d" dur="3s" repeatCount="indefinite" values="
              M0,50 C80,10 160,90 240,50 C320,10 400,90 480,50 C560,10 640,90 720,50 C800,10 880,90 960,50 V120 H0 Z;
              M0,50 C80,90 160,10 240,50 C320,90 400,10 480,50 C560,90 640,10 720,50 C800,90 880,10 960,50 V120 H0 Z;
              M0,50 C80,10 160,90 240,50 C320,10 400,90 480,50 C560,10 640,90 720,50 C800,10 880,90 960,50 V120 H0 Z
            "/>
          </path>
        </svg>
      </div>

      <div class="bg-[#0A0A0A] pt-12 md:pt-16 pb-4 relative z-10">
      <section class="mx-auto max-w-5xl px-6 text-center">
        <h1 class="font-heading text-4xl font-bold text-white md:text-7xl leading-tight">
          QU<span class="text-[#8B5CF6]">4</span>SAR<br />
          <span class="text-2xl md:text-4xl font-light text-zinc-300">Gaming Academy</span>
        </h1>
        <p class="mt-6 mx-auto max-w-lg text-base text-zinc-400 leading-relaxed">
          La academia de esports que transforma tu pasi\u00f3n en rendimiento competitivo.
          Entrena con coaches profesionales y lleva tu juego al siguiente nivel.
        </p>
      </section>
      <section class="mx-auto mt-20 md:mt-28 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Sobre QU4SAR</h2>
        <p class="mx-auto mb-12 max-w-2xl text-center text-sm text-zinc-400 leading-relaxed">
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
            <div class="group glass rounded-2xl p-7 text-center transition-all duration-300 hover:bg-[#8B5CF6]/5 hover:border-[#8B5CF6]/20 hover:shadow-lg hover:shadow-[#8B5CF6]/5">
              <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/20 transition-all duration-300 group-hover:bg-[#8B5CF6]/30 group-hover:scale-110">
                ${Icon(s.icon, 24)}
              </div>
              <h3 class="mb-2 font-heading text-sm font-bold text-white">${escapeHtml(s.title)}</h3>
              <p class="text-sm text-zinc-400 leading-relaxed">${escapeHtml(s.desc)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="mx-auto mt-28 md:mt-36 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Nuestros servicios</h2>
        <p class="mx-auto mb-12 max-w-2xl text-center text-sm text-zinc-400 leading-relaxed">
          Todo lo que necesitas para desarrollar tu carrera en esports, en un solo lugar.
        </p>
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          ${[
            { icon: 'bookOpen', title: 'Cursos', desc: 'Programas por niveles desde Rookie hasta Pro, con plan de estudios dise\u00f1ado por coaches.' },
            { icon: 'zap', title: 'Coaching', desc: 'Sesiones personalizadas con an\u00e1lisis de VOD, correcci\u00f3n de errores y estrategia.' },
            { icon: 'users', title: 'Scrims', desc: 'Enfrentamientos organizados contra otros equipos para poner a prueba tu nivel.' },
            { icon: 'trophy', title: 'Torneos', desc: 'Competiciones internas y externas para ganar experiencia y visibilidad.' },
          ].map(s => `
            <div class="group glass rounded-2xl p-6 text-center transition-all duration-300 hover:bg-[#8B5CF6]/5 hover:border-[#8B5CF6]/20 hover:shadow-lg hover:shadow-[#8B5CF6]/5">
              <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/20 transition-all duration-300 group-hover:bg-[#8B5CF6]/30 group-hover:scale-110">
                ${Icon(s.icon, 20)}
              </div>
              <h3 class="mb-2 font-heading text-sm font-bold text-white">${escapeHtml(s.title)}</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">${escapeHtml(s.desc)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="mx-auto mt-28 md:mt-36 max-w-5xl px-6">
        <div class="mb-12 text-center">
          <span class="inline-block rounded-full bg-[#8B5CF6]/20 px-4 py-1.5 text-xs font-medium text-[#8B5CF6] tracking-wide">Inversi\u00f3n \u00fanica por curso</span>
          <h2 class="mt-5 font-heading text-3xl font-bold text-white md:text-4xl">Invierte en tu futuro competitivo</h2>
          <p class="mx-auto mt-3 max-w-xl text-sm text-zinc-400 leading-relaxed">
            Sin mensualidades ni suscripciones. Pagas \u00fanicamente el curso que quieres llevar
            y accedes a todos los beneficios de nuestra metodolog\u00eda de entrenamiento.
          </p>
        </div>
        <div class="mx-auto flex max-w-3xl flex-col gap-6 md:flex-row md:items-stretch">
          <div class="flex flex-1 flex-col rounded-2xl border border-zinc-800 bg-[#111]/80 p-7 transition-all duration-300 hover:bg-[#111] hover:border-zinc-700">
            <h3 class="font-heading text-base font-bold text-white">Posicionamiento</h3>
            <p class="mt-5 text-4xl font-bold text-green-400">Gratis</p>
            <p class="mt-2 text-xs text-zinc-500">Evaluaci\u00f3n de nivel sin costo</p>
            <ul class="mt-6 space-y-3">
              ${['Evaluaci\u00f3n de nivel inicial', 'Examen te\u00f3rico de posicionamiento', 'Examen pr\u00e1ctico en juego', 'Asignaci\u00f3n del curso adecuado para ti'].map(f => `
                <li class="flex items-start gap-3 text-sm text-zinc-400">
                  <span class="mt-0.5 text-green-400">${Icon('checkCircle', 14)}</span>
                  <span>${escapeHtml(f)}</span>
                </li>
              `).join('')}
            </ul>
            <p class="mt-4 text-xs text-zinc-500 leading-relaxed">Luego de la evaluaci\u00f3n se te asignar\u00e1 el curso que corresponda a tu nivel y pagar\u00e1s \u00fanicamente ese curso.</p>
            <a href="#/register" class="mt-auto block rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-zinc-300 transition-all duration-300 hover:bg-zinc-800/80 hover:text-white hover:border-zinc-600">
              Comenzar gratis
            </a>
          </div>
          <div class="relative flex flex-1 flex-col rounded-2xl border-2 border-[#8B5CF6]/30 bg-[#111]/80 p-7 transition-all duration-300 hover:bg-[#111] hover:border-[#8B5CF6]/60 hover:shadow-xl hover:shadow-[#8B5CF6]/10">
            <span class="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#8B5CF6] px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[#8B5CF6]/30">M\u00e1s elegido</span>
            <h3 class="font-heading text-base font-bold text-white">Cursos completos</h3>
            <p class="mt-5 text-4xl font-bold text-[#8B5CF6]">
              $4.99 <span class="text-base font-normal text-zinc-500">c/u</span>
            </p>
            <p class="mt-2 text-xs text-zinc-500">Cada nivel incluye todo lo necesario para avanzar</p>
            <ul class="mt-6 space-y-3">
              ${['Plan de estudios progresivo', 'Seguimiento con coaches', 'Scrims y evaluaciones', 'Acceso a la comunidad', 'Certificado al completar'].map(f => `
                <li class="flex items-start gap-3 text-sm text-zinc-400">
                  <span class="mt-0.5 text-[#8B5CF6]">${Icon('checkCircle', 14)}</span>
                  <span>${escapeHtml(f)}</span>
                </li>
              `).join('')}
            </ul>
            <p class="mt-4 text-xs text-zinc-500 leading-relaxed">Paga \u00fanicamente el curso que elijas. Sin mensualidades ni permanencia.</p>
            <a href="#/register" class="mt-auto block rounded-xl bg-[#8B5CF6] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all duration-300 hover:bg-[#7C3AED] hover:shadow-xl hover:shadow-[#8B5CF6]/30">
              Inscribirse
            </a>
          </div>
        </div>
      </section>

      <section class="mx-auto mt-28 md:mt-36 max-w-5xl px-6 pb-16 md:pb-24">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">S\u00edguenos</h2>
        <p class="mx-auto mb-12 max-w-xl text-center text-sm text-zinc-400 leading-relaxed">
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
               class="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#111]/60 px-5 py-3.5 text-sm text-zinc-300 transition-all duration-300 hover:border-zinc-700 hover:text-white hover:bg-zinc-900 hover:shadow-lg hover:shadow-[#8B5CF6]/5">
              <span class="transition-all duration-300 group-hover:scale-110">${Icon(s.icon, 18)}</span>
              <span>${escapeHtml(s.label)}</span>
              <span class="ml-auto transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">${Icon('arrowUpRight', 14)}</span>
            </a>
          `).join('')}
        </div>
      </section>
      </div>

      <footer class="bg-[#0A0A0A] border-t border-zinc-800/60 px-6 py-10 relative z-10">
        <div class="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center md:flex-row md:justify-between">
          <div class="flex items-center gap-2.5">
            <img src="qu4sar.ico" alt="" class="h-7 w-7" />
            <span class="text-sm font-bold text-white">QU4SAR Gaming Academy</span>
          </div>
          <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <a href="https://www.youtube.com/@QU4SAR_ACADEMY" target="_blank" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">YouTube</a>
            <a href="https://www.twitch.tv/qu4sar_academy" target="_blank" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">Twitch</a>
            <a href="https://www.instagram.com/qu4sar._.esports/" target="_blank" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">Instagram</a>
            <a href="https://discord.gg/wbFm5BVWW" target="_blank" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">Discord</a>
            <a href="#/about" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">Sobre nosotros</a>
            <a href="#/login" class="transition-all duration-200 hover:text-zinc-300 hover:underline underline-offset-4">Iniciar sesi\u00f3n</a>
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
