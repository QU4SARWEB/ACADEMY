import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderHome(): string {
  return `
    <div class="relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <div class="pointer-events-none fixed inset-0">
        <div class="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/10 blur-3xl"></div>
      </div>

      <nav class="relative z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 md:px-12">
        <div class="flex items-center gap-2">
          <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
          <span class="font-heading text-lg font-bold text-white">QU4SAR</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <a href="#/login" class="text-zinc-400 hover:text-white transition">Iniciar sesi\u00f3n</a>
          <a href="#/register" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED] transition">Registrarse</a>
        </div>
      </nav>

      <section class="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-24 text-center md:pt-32">
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

      <section class="relative z-10 mx-auto mt-32 max-w-5xl px-6">
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
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Planes</h2>
        <p class="mx-auto mb-10 max-w-2xl text-center text-sm text-zinc-400">
          Elige el plan que mejor se adapte a tu nivel y objetivos.
        </p>
        <div class="grid gap-6 md:grid-cols-3">
          ${[
            { name: 'Rookie', price: 'Gratuito', features: ['Acceso a cursos gratuitos', 'Perfil p\u00fablico', 'Seguimiento b\u00e1sico', 'Comunidad'], accent: '#8B5CF6' },
            { name: 'Academy', price: 'S/. 1.54 / mes', features: ['Todos los cursos', 'Coaching personal', 'Scrims semanales', 'Estad\u00edsticas detalladas', 'Certificado por nivel'], accent: '#8B5CF6', featured: true },
            { name: 'Pro', price: 'S/. 2.99 / mes', features: ['Todo Academy', 'Torneos exclusivos', 'An\u00e1lisis avanzado', 'Prioridad en scrims', 'Mentor\u00eda 1:1'], accent: '#8B5CF6' },
          ].map((p, i) => `
            <div class="glass rounded-xl p-6 ${p.featured ? 'relative border-2 border-[#8B5CF6]/40' : ''}">
              ${p.featured ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#8B5CF6] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white">M\u00e1s popular</span>' : ''}
              <h3 class="font-heading text-lg font-bold text-white">${escapeHtml(p.name)}</h3>
              <p class="mt-2 text-2xl font-bold" style="color:${p.accent}">${escapeHtml(p.price)}</p>
              <ul class="mt-4 space-y-2">
                ${p.features.map(f => `
                  <li class="flex items-center gap-2 text-sm text-zinc-400">
                    ${Icon('checkCircle', 14)}
                    <span>${escapeHtml(f)}</span>
                  </li>
                `).join('')}
              </ul>
              <a href="#/register" class="mt-6 block rounded-lg ${p.featured ? 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'} px-4 py-2 text-center text-sm font-medium transition">
                ${i === 0 ? 'Comenzar gratis' : 'Elegir plan'}
              </a>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="relative z-10 mx-auto mt-32 max-w-5xl px-6">
        <h2 class="mb-4 text-center font-heading text-2xl font-bold text-white">Contacto</h2>
        <p class="mx-auto mb-10 max-w-xl text-center text-sm text-zinc-400">
          \u00bfTienes preguntas o quieres saber m\u00e1s? Escr\u00edbenos y te responderemos a la brevedad.
        </p>
        <div class="mx-auto max-w-md space-y-4">
          <a href="mailto:contacto@qu4sar.com" class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white">
            ${Icon('mail', 18)}
            <span>contacto@qu4sar.com</span>
          </a>
          <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3 text-sm text-zinc-500">
            ${Icon('mapPin', 18)}
            <span>Lima, Per\u00fa</span>
          </div>
        </div>
      </section>

      <footer class="relative z-10 mt-32 border-t border-zinc-800 px-6 py-8">
        <div class="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center md:flex-row md:justify-between">
          <div class="flex items-center gap-2">
            <img src="qu4sar.ico" alt="" class="h-6 w-6" />
            <span class="text-sm font-bold text-white">QU4SAR Gaming Academy</span>
          </div>
          <div class="flex gap-6 text-xs text-zinc-600">
            <a href="#/about" class="hover:text-zinc-400 transition">Sobre nosotros</a>
            <a href="#/members" class="hover:text-zinc-400 transition">Miembros</a>
            <a href="#/login" class="hover:text-zinc-400 transition">Iniciar sesi\u00f3n</a>
          </div>
          <p class="text-xs text-zinc-600">&copy; ${new Date().getFullYear()} QU4SAR Gaming Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>`
}

export function mountHome(): void {
}
