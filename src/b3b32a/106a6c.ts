import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { rankBadge } from '@/2b3583/ranks'
import { renderDiscordBanner, renderPublicNavbar, renderPublicFooter, mountPublicNav } from '@/b3b32a/shared/public_nav'

const DISCORD_URL = 'https://discord.gg/jmP2wJVf4N'

function embers(): string {
  const positions = [2, 7, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 95]
  return `
    <div class="embers" aria-hidden="true">
      ${positions.map((left, i) => `
        <span class="ember" style="left:${left}%;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;--ex:${((i % 5) - 2) * 14}px;animation-duration:${7 + (i % 6)}s;animation-delay:${(i % 8) * 0.9}s"></span>
      `).join('')}
    </div>`
}

function stellarField(): string {
  return `
    <div class="stellar-field" aria-hidden="true">
      ${embers()}
      <svg class="stellar-field__magnetic" viewBox="0 0 960 900" preserveAspectRatio="none">
        <path d="M80,860 C180,560 270,250 480,90 C690,250 780,560 880,860" />
        <path d="M160,900 C265,610 330,330 480,160 C630,330 695,610 800,900" />
        <path d="M15,720 C220,520 315,445 480,360 C645,445 740,520 945,720" />
      </svg>
    </div>`
}

function waves(): string {
  return `
    <div class="stellar-bridge relative z-10 h-32 md:h-44 -mb-[1px] overflow-visible pointer-events-none">
      <svg class="stellar-bridge__lines absolute inset-0 h-full w-full" viewBox="0 0 960 180" preserveAspectRatio="none" aria-hidden="true">
        <path class="stellar-bridge__line stellar-bridge__line--glow" d="M40,174 C160,100 230,26 360,70 S600,164 770,58 S900,18 960,28" />
        <path class="stellar-bridge__line" d="M40,174 C160,100 230,26 360,70 S600,164 770,58 S900,18 960,28" />
        <path class="stellar-bridge__line stellar-bridge__line--second" d="M0,134 C140,55 240,120 355,96 S570,34 690,96 S850,152 960,82" />
      </svg>
    </div>`
}

function hero(session: any): string {
  return `
     <header class="public-enter public-enter--hero relative z-10 mx-auto flex min-h-[62vh] max-w-6xl flex-col items-center justify-center px-6 pt-8 text-center">
      ${embers()}
      <div class="stellar-core animate-float mb-6 relative">
        <div class="absolute inset-0 animate-pulse rounded-full bg-[#8B5CF6]/25 blur-2xl"></div>
        <img src="QU4SARreducido.png" alt="QU4SAR" class="relative h-20 w-20 md:h-24 md:w-24" decoding="async" />
      </div>
      <span class="lbl reveal">Academia de Esports</span>
      <h1 class="font-heading text-4xl font-extrabold leading-tight text-white md:text-7xl reveal" style="--i:1">
        QU<span class="text-[#8B5CF6]">4</span>SAR<br />
        <span class="text-2xl font-light text-zinc-300 md:text-4xl">Gaming Academy</span>
      </h1>
      <p class="mt-5 max-w-xl text-sm text-zinc-300 leading-relaxed md:text-base reveal" style="--i:2">
        <span class="typewriter" data-typewriter="La academia de esports que transforma tu pasión en rendimiento competitivo. Entrena con coaches profesionales y lleva tu juego al siguiente nivel."></span>
        <span class="typewriter-caret" aria-hidden="true">|</span>
      </p>
      <p class="mt-3 text-xs text-zinc-500 tracking-wide reveal" style="--i:3">Todos los ranks · ES / EN · Online</p>
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2 reveal" style="--i:3.5">
        ${['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiante'].map(r => `
          <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
            ${rankBadge(r, 16)} ${escapeHtml(r)}
          </span>`).join('')}
      </div>
      <div class="mt-8 flex flex-col gap-4 sm:flex-row reveal" style="--i:4">
            <a href="#/" data-scroll="coaches" class="btn btn-primary">Ver coaches →</a>
        <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">Únete al Discord</a>
      </div>
    </header>`
}

export function renderHome(session?: any): string {
  const mobileAlertSeen = localStorage.getItem('qu4sar-mobile-alert-seen') === '1'
  return `
     <div class="public-page relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <style>@keyframes wf { 0% { opacity:1; } 50% { opacity:0.6; } 100% { opacity:1; } }</style>
      <div class="fixed inset-0" style='background: url("qu4sarfondoPublico.jpg") center/cover no-repeat fixed; z-index:-2'></div>
      <div class="fixed inset-0" style="background: rgba(10,10,10,0.35); z-index:-1"></div>
      <div class="pointer-events-none fixed inset-0" style="z-index:-1">
        <div class="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#8B5CF6]/15 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/15 blur-3xl"></div>
      </div>
      ${stellarField()}

      ${renderDiscordBanner()}
      ${renderPublicNavbar(session, { active: 'home' })}

       ${!mobileAlertSeen ? `
       <!-- Notificación flotante: Valorant Mobile -->
       <div class="alert-toast fixed right-4 top-36 z-[70] w-[300px]">
        <div class="alert-toast__box rounded-2xl border border-[#8B5CF6]/35 bg-[#141019]/95 p-4 shadow-2xl shadow-[#8B5CF6]/20 backdrop-blur-md">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD]">${Icon('smartphone', 18)}</span>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-bold uppercase tracking-widest text-amber-400">Alerta</p>
              <p class="mt-1 text-sm leading-snug text-zinc-200">Valorant Mobile ya está integrado a QU4SAR.</p>
               <a href="#/" data-scroll="precios" class="mt-2 inline-block text-xs font-medium text-[#8B5CF6] hover:text-[#C4B5FD] transition">Únete ahora →</a>
             </div>
             <button class="alert-toast__close shrink-0 text-zinc-500 transition hover:text-white" aria-label="Cerrar">${Icon('x', 16)}</button>
           </div>
         </div>
       </div>` : ''}

      ${hero(session)}

       ${waves()}

        <div class="stellar-content relative z-10 pt-2 md:pt-4">
        <!-- Briefing -->
        <section class="mx-auto mt-4 md:mt-8 max-w-5xl px-6">
           <div class="flex flex-col gap-2 mb-10 reveal">
            <span class="lbl">El briefing</span>
            <h2 class="s-title">Por qué estás <em>estancado.</em></h2>
          </div>
          <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <div class="hud reveal relative overflow-hidden rounded-xl border border-white/10" style="min-height:300px;background:linear-gradient(150deg,rgba(139,92,246,0.25),#0a0a12 70%)">
              <img src="qu4sarfondoPublico.jpg" alt="Briefing QU4SAR" class="absolute inset-0 h-full w-full object-cover opacity-70" loading="lazy" decoding="async" />
              <div class="absolute inset-0 flex items-center justify-center">
                <button class="flex flex-col items-center gap-2 text-white/90 transition hover:scale-105" aria-label="Ver briefing">
                  <span class="flex h-16 w-16 items-center justify-center rounded-full border border-[#8B5CF6]/60 bg-[#8B5CF6]/30 backdrop-blur-md">${Icon('play', 26)}</span>
                  <span class="text-xs tracking-widest uppercase">Ver briefing</span>
                </button>
              </div>
              <span class="absolute bottom-3 left-4 text-[11px] text-zinc-400">QU4SAR · Método de entrenamiento</span>
            </div>
            <div>
              <blockquote class="reveal border-l-2 border-[#8B5CF6] pl-5 text-lg text-zinc-200 leading-relaxed" style="--i:1">
                «La diferencia real no era pegar más balas. Era tomar mejores decisiones.»
              </blockquote>
              <p class="reveal mt-3 text-xs text-zinc-500" style="--i:2">Coaches QU4SAR · Footage de partidas oficiales</p>
              <a href="#/" data-scroll="precios" class="reveal btn btn-ghost mt-6" style="--i:3">Empieza 1 a 1 →</a>
            </div>
          </div>
        </section>

        <!-- Cómo funciona -->
        <section class="mx-auto mt-16 md:mt-20 max-w-5xl px-6">
           <div class="flex flex-col gap-2 mb-10 reveal">
            <span class="lbl">El método</span>
            <h2 class="s-title">Cómo <em>funciona.</em></h2>
          </div>
          <div class="steps-grid">
            ${[
              { title: 'Posicionamiento', body: 'Entras gratis y evaluamos tu nivel con exámenes teóricos y prácticos en juego. Sabes exactamente dónde empezar.' },
              { title: 'Entrena tu nivel', body: 'Accedes a tu curso por rango con plan de estudios, seguimiento de coaches, tareas y análisis de tu gameplay.' },
              { title: 'Compite y asciende', body: 'Aplica lo aprendido en scrims y torneos. Mide tu progreso y asciende al siguiente nivel de la academia.' },
            ].map((s, i) => `
              <article class="step reveal" style="--i:${i}">
                <span class="step__num">PASO ${i + 1}</span>
                <h3 class="step__title">${escapeHtml(s.title)}</h3>
                <p class="step__body">${escapeHtml(s.body)}</p>
              </article>
            `).join('')}
          </div>
        </section>

        <!-- Coaches -->
        <section id="coaches" class="mx-auto mt-16 md:mt-20 max-w-5xl scroll-mt-24 px-6">
           <div class="flex flex-col gap-2 mb-10 reveal">
            <span class="lbl">El staff</span>
            <h2 class="s-title">Entrena con <em>nuestros coaches.</em></h2>
            <p class="s-title-sub">Profesionales con experiencia competitiva real, listos para llevarte al siguiente nivel.</p>
          </div>
          <div id="coaches-grid" class="roster-grid roster-grid--coaches">
            ${Array.from({ length: 3 }).map((_, i) => `
              <div class="roster-card reveal" style="--i:${i}">
                <div class="roster-card__poster">
                  <span class="poster-fallback">Q</span>
                  <div class="roster-card__shade"></div>
                  <span class="roster-card__corner tl">● Coach</span>
                  <span class="roster-card__corner tr">VAL · 2026</span>
                  <span class="roster-card__name">Cargando…</span>
                </div>
                <div class="roster-card__body">
                  <span class="roster-card__creds">QU4SAR Gaming Academy</span>
                  <span class="roster-card__meta"><span>—</span><span>—</span></span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Precios / Offers -->
        <section id="precios" class="mx-auto mt-16 md:mt-20 max-w-5xl scroll-mt-24 px-6">
           <div class="flex flex-col gap-2 mb-10 text-center items-center reveal">
            <span class="lbl">Mensualidad única · acceso total</span>
            <h2 class="s-title">Invierte en tu <em>futuro competitivo.</em></h2>
            <p class="s-title-sub">Una mensualidad simple y flexible. Accedes a tu curso por rango y a todos los beneficios de la academia mientras entrenes con nosotros.</p>
          </div>
          <div class="offer-grid">
            <article class="offer-card offer-card--free reveal" style="--i:0">
              <h3 class="offer-card__title">Posicionamiento</h3>
              <div class="offer-card__price"><span class="offer-card__amount amount-free">Gratis</span></div>
              <p class="offer-card__blurb">Evaluación de nivel para saber dónde empiezas.</p>
              <ul class="offer-card__list">
                ${['Evaluación de nivel inicial', 'Examen teórico de posicionamiento', 'Examen práctico en juego'].map(f => `
                  <li>${Icon('checkCircle', 16)}<span>${escapeHtml(f)}</span></li>`).join('')}
              </ul>
              <p class="offer-card__hint">Solo el primer paso.</p>
              <div class="offer-card__cta"><a href="#/register" class="btn btn-ghost w-full">Comenzar gratis</a></div>
            </article>
            <article class="offer-card featured reveal" style="--i:1">
              <span class="offer-card__badge">Más elegido</span>
              <span class="offer-card__badge--secondary">Mejor valor</span>
              <h3 class="offer-card__title">Cursos completos</h3>
              <div class="offer-card__price"><span class="offer-card__amount amount-paid">$15</span><span class="offer-card__unit">USD · por mes</span></div>
              <p class="offer-card__save">Mensualidad · sin permanencia</p>
              <p class="offer-card__blurb">El entrenamiento completo para tu rango: de la teoría a la práctica real, con coaches que siguen tu progreso semana a semana. Es la diferencia entre jugar más y jugar mejor.</p>
              <ul class="offer-card__list">
                ${[
                  'Plan de estudios progresivo diseñado para tu nivel (Rookie a Pro)',
                  'Clases en vivo con coaches certificados',
                  'Clases grabadas y material para repasar cuando quieras',
                  'Scrims y evaluaciones semanales para medir tu avance',
                  'Análisis de tu gameplay con feedback accionable',
                  'Comunidad exclusiva en Discord con eventos y torneos',
                  'Certificado oficial QU4SAR al completar',
                  'Acceso en PC y Valorant Mobile',
                ].map(f => `
                  <li>${Icon('checkCircle', 16)}<span>${escapeHtml(f)}</span></li>`).join('')}
              </ul>
              <div class="offer-card__cta"><a href="#/register" class="btn btn-primary w-full">Inscribirse →</a></div>
            </article>
          </div>

          <!-- Mini comparador -->
          <div class="compare mt-10">
            <div class="compare__head">
              <span>Beneficio</span>
              <span>Gratis</span>
              <span>Cursos <em>$15</em></span>
            </div>
            ${[
              { label: 'Evaluación de nivel inicial', free: true, paid: true },
              { label: 'Examen teórico y práctico', free: true, paid: true },
              { label: 'Plan de estudios por rango', free: false, paid: true },
              { label: 'Clases en vivo con coaches', free: false, paid: true },
              { label: 'Clases grabadas y material', free: false, paid: true },
              { label: 'Seguimiento con coaches', free: false, paid: true },
              { label: 'Scrims y torneos', free: false, paid: true },
              { label: 'Comunidad exclusiva', free: false, paid: true },
              { label: 'Certificado oficial', free: false, paid: true },
            ].map((r, i) => `
              <div class="compare__row reveal" style="--i:${i}">
                <span>${escapeHtml(r.label)}</span>
                <span class="${r.free ? 'yes' : 'no'}">${r.free ? '✓' : '—'}</span>
                <span class="yes ${r.paid ? 'paid' : 'no'}">${r.paid ? '✓' : '—'}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Features: Qué incluye -->
        <section class="mx-auto mt-16 md:mt-20 max-w-5xl px-6">
           <div class="flex flex-col gap-2 mb-10 reveal">
            <span class="lbl">Qué incluye</span>
            <h2 class="s-title">Todo lo que necesitas <em>para subir.</em></h2>
          </div>
          <div class="features-grid">
            ${[
              { tag: 'Cursos', title: 'Programas por nivel', body: 'Estructura por rango con plan de estudios diseñado por coaches, desde Rookie hasta Pro.' },
              { tag: 'Coaching', title: 'Sesiones personalizadas', body: 'Análisis de VOD, corrección de errores y estrategia para tu estilo de juego.' },
              { tag: 'Scrims', title: 'Práctica real', body: 'Enfrentamientos organizados contra otros equipos para poner a prueba tu nivel.' },
              { tag: 'Torneos', title: 'Competencia', body: 'Competiciones internas y externas para ganar experiencia y visibilidad.' },
            ].map((f, i) => `
              <article class="feature reveal" style="--i:${i}">
                <span class="feature__tag">${f.tag}</span>
                <h3 class="feature__title">${escapeHtml(f.title)}</h3>
                <p class="feature__body">${escapeHtml(f.body)}</p>
              </article>
            `).join('')}
          </div>
        </section>

        <!-- Comunidad -->
        <section id="comunidad" class="mx-auto mt-16 md:mt-20 max-w-5xl scroll-mt-24 px-6">
          <div class="community-grid">
            <div class="reveal">
              <span class="lbl">Comunidad · Discord</span>
              <h2 class="s-title">No subas de rango <em>solo.</em></h2>
              <p class="s-title-sub">
                Entre clase y clase, todo pasa en el Discord: comparte tus clips, pregunta lo que quieras,
                encuentra equipo para tus ranked y entérate primero de los eventos. Entrar es gratis.
              </p>
              <div class="mt-6 flex flex-wrap gap-3">
                <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Unirse al Discord →</a>
              </div>
            </div>
            <ul class="community__perks">
              ${['#anuncios y #reglas', '#general, #clips y #sugerencias', '#guías y #eventos', '#busco-equipo', '#tickets para soporte', 'Salas de voz para clases y coordinación'].map((c, i) => `
                <li class="community__perk reveal" style="--i:${i}"><span class="dot"></span>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>
        </section>

        <!-- Novedades: Valorant Mobile -->
        <section class="mx-auto mt-16 md:mt-20 max-w-5xl px-6">
          <div class="news-banner reveal">
            <img src="Vmobile.jpg" alt="Valorant Mobile en QU4SAR" class="news-banner__img" loading="lazy" decoding="async" />
            <div class="min-w-0 flex-1 relative">
              <span class="news-banner__badge"><span class="pulse-dot"></span>Novedades</span>
              <h2 class="news-banner__title">Ahora integramos <em>Valorant Mobile.</em></h2>
              <p class="news-banner__body">
                QU4SAR siempre está en evolución. Ampliamos nuestra academia para que también entrenes
                y compitas desde tu teléfono: cursos, coaching y comunidad ahora cubren Valorant Mobile,
                sin dejar de lado el juego en PC.
              </p>
              <div class="news-banner__meta">
                <span>${Icon('smartphone', 16)} Valorant Mobile · iOS y Android</span>
                <span>${Icon('checkCircle', 16)} Cursos y coaching adaptados</span>
                <span>${Icon('zap', 16)} Siempre en actualización</span>
              </div>
              <div class="news-banner__ctas">
                <a href="#/register" class="btn btn-primary">Únete a la academia →</a>
                <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">Entérate primero</a>
              </div>
            </div>
          </div>

          <div class="platform-ticker">
            <span class="t-label">Cubre ambas plataformas</span>
            <span class="t-item reveal active" style="--i:0">${Icon('play', 14)} PC</span>
            <span class="t-item reveal" style="--i:1">${Icon('smartphone', 14)} Mobile</span>
            <span class="t-item reveal" style="--i:2">${Icon('trophy', 14)} Competitivo</span>
          </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="mx-auto mt-16 md:mt-20 max-w-5xl scroll-mt-24 px-6">
           <div class="flex flex-col gap-2 mb-10 reveal">
            <span class="lbl">FAQ</span>
            <h2 class="s-title">Lo que <em>siempre preguntan.</em></h2>
          </div>
          <div class="faq-b">
            ${[
              { q: '¿Sirve si soy Hierro o Bronce?', a: 'Sí. El método se adapta a tu rango: primero trabajamos aim, crosshair y fundamentos. El coach empieza donde estás, sea cual sea tu nivel.' },
              { q: '¿Ya entrenan Valorant Mobile?', a: 'Sí. Acabamos de integrar Valorant Mobile a la academia: cursos, coaching y comunidad adaptados para que entrenes también desde tu celular (iOS y Android), manteniendo el soporte completo para PC.' },
              { q: '¿Qué incluye la comunidad de Discord?', a: 'Es el hub de QU4SAR: anuncios, clips, guías, eventos, busco-equipo, tickets de soporte y salas de voz para clases y coordinación.' },
              { q: '¿Cómo se paga el curso?', a: 'Pagas una mensualidad de USD 15 por PayPal o subiendo tu comprobante. Sin permanencia: renuevas mientras sigas entrenando con nosotros.' },
              { q: '¿Qué necesito para mi primera clase?', a: 'Tu rango actual, Valorant instalado (PC o Mobile), Discord y ganas de mejorar. Los coaches te guían en el resto.' },
              { q: '¿Los cursos son online?', a: 'Sí. Todo el entrenamiento es online vía Discord: clases, scrims, evaluaciones y seguimiento, en las dos plataformas.' },
            ].map((f, i) => `
              <details class="reveal" style="--i:${i}">
                <summary><span class="num">Q · ${String(i + 1).padStart(2, '0')}</span><span>${escapeHtml(f.q)}</span><span class="chev">+</span></summary>
                <div class="faq-b__body">${escapeHtml(f.a)}</div>
              </details>
            `).join('')}
          </div>
        </section>

        <!-- Outro -->
        <section class="outro mt-16 md:mt-20">
          <h2 class="reveal">De cero a Pro. <em>Empezamos cuando quieras.</em></h2>
          <div class="outro__ctas">
            <a href="#/" data-scroll="coaches" class="reveal btn btn-primary" style="--i:1">Ver coaches →</a>
            <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="reveal btn btn-ghost" style="--i:2">Unirse al Discord</a>
          </div>
        </section>

        <section class="public-stats mx-auto mt-8 mb-8 md:mb-10 max-w-5xl px-6 reveal" style="--i:0">
          <div id="public-stats" class="stats-bar">
            <div class="stat">
              <div class="stat__num" data-stat-value="visits">—</div>
              <div class="stat__label">Visitas</div>
            </div>
            <div class="stat">
              <div class="stat__num" data-stat-value="students">—</div>
              <div class="stat__label">Alumnos</div>
            </div>
            <div class="stat">
              <div class="stat__num" data-stat-value="registrations">—</div>
              <div class="stat__label">Registros</div>
            </div>
          </div>
        </section>

      </div>

      ${renderPublicFooter()}
    </div>`
}

export async function mountHome(): Promise<void> {
  mountPublicNav()
  void loadPublicStats()
  if (document.querySelector('.alert-toast')) localStorage.setItem('qu4sar-mobile-alert-seen', '1')

  // Efecto de máquina de escribir en el hero
  const tw = document.querySelector<HTMLElement>('.typewriter')
  if (tw) {
    const text = tw.dataset.typewriter || ''
    let i = 0
    const tick = () => {
      if (i <= text.length) {
        tw.textContent = text.slice(0, i)
        i++
        setTimeout(tick, 28)
      } else {
        // Pausa y reinicia para efecto continuo
        setTimeout(() => {
          i = 0
          tw.textContent = ''
          setTimeout(tick, 400)
        }, 4000)
      }
    }
    setTimeout(tick, 600)
  }

  // Cerrar notificación flotante
  document.querySelector('.alert-toast__close')?.addEventListener('click', () => {
    document.querySelector('.alert-toast')?.classList.add('hidden-toast')
  })

  // Cargar coaches reales (rol coach) con su avatar
  const { data: coaches } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, presentation_image, riot_id, in_game_role, rank, quote')
    .eq('role', 'coach')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  const cgrid = document.getElementById('coaches-grid')
  if (cgrid) {
    cgrid.addEventListener('click', (event) => {
      const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-coach-courses]')
      if (!trigger) return
      event.preventDefault()
      event.stopPropagation()
      void showCoachCoursesModal(trigger.dataset.coachId || '', trigger.dataset.coachName || 'Coach')
    })

    // QU4SAR es la cuenta general admin: nunca se muestra como coach
    const ADMIN_IDS = ['3a7fd441-6b64-4684-94db-660721bf9367']
    const list = (coaches ?? []).filter((c: any) => {
      if (ADMIN_IDS.includes(c.id)) return false
      const n = String(c.full_name || c.display_name || '').trim().toLowerCase()
      return n !== 'qu4sar'
    })
    if (list.length === 0) {
      cgrid.innerHTML = '<p class="text-sm text-zinc-500 col-span-3">Los coaches se anuncian pronto. Únete al Discord para conocerlos primero.</p>'
    } else {
      cgrid.innerHTML = list.map((co: any, i: number) => {
        const name = co.display_name || co.full_name || 'Coach'
        const tag = [co.riot_id, co.in_game_role].filter(Boolean).join(' · ') || (co.rank || 'Coach QU4SAR')
        const initial = name.charAt(0).toUpperCase()
        const presentation = co.presentation_image || co.avatar_url
        return `
          <a href="#/" data-scroll="precios" class="roster-card reveal" style="--i:${i % 3}">
            <div class="roster-card__poster">
              ${presentation
                ? `<img src="${escapeHtml(presentation)}" alt="${escapeHtml(name)}" class="poster-art" />`
                : `<span class="poster-fallback">${escapeHtml(initial)}</span>`}
              <div class="roster-card__shade"></div>
              <span class="roster-card__corner tl">● Coach</span>
              <span class="roster-card__corner tr">VAL · 2026</span>
              <span class="roster-card__name">${escapeHtml(name)}</span>
              <span class="roster-card__sub">${escapeHtml(tag)}</span>
            </div>
            <div class="roster-card__body">
              <span class="roster-card__creds">QU4SAR Gaming Academy</span>
              <p class="roster-card__tag">${escapeHtml(co.quote || 'Coach certificado listo para ayudarte a subir de rango con un plan a tu medida.')}</p>
              <div class="roster-card__meta"><span>Coach</span><span class="inline-flex items-center gap-1.5">${co.rank ? `${rankBadge(co.rank, 16)} ${escapeHtml(co.rank)}` : '—'}</span></div>
              <span class="roster-card__cta" data-coach-courses data-coach-id="${escapeHtml(co.id)}" data-coach-name="${escapeHtml(name)}">Ver sus cursos →</span>
            </div>
          </a>`
      }).join('')
      // Observar las tarjetas recién creadas para el reveal en scroll
      // Esperar 2 frames para que el estado inicial (opacity 0) se pinte
      // y así el reveal haga un fade real, no un pop.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  entry.target.classList.add('in')
                } else {
                  entry.target.classList.remove('in')
                }
              }
            }, { threshold: 0.2 })
            cgrid.querySelectorAll<HTMLElement>('.reveal').forEach(el => io.observe(el))
          } else {
            cgrid.querySelectorAll<HTMLElement>('.reveal').forEach(el => el.classList.add('in'))
          }
        })
      })
    }
  }
}

async function showCoachCoursesModal(coachId: string, coachName: string): Promise<void> {
  if (!coachId) return
  document.getElementById('public-coach-courses-modal')?.remove()

  const modal = document.createElement('div')
  modal.id = 'public-coach-courses-modal'
  modal.className = 'public-courses-modal'
  modal.innerHTML = `
    <div class="public-courses-modal__card" role="dialog" aria-modal="true" aria-labelledby="public-coach-courses-title">
      <div class="public-courses-modal__head">
        <div>
          <span class="lbl">Staff QU4SAR</span>
          <h2 id="public-coach-courses-title">Cursos de ${escapeHtml(coachName)}</h2>
        </div>
        <button type="button" class="public-courses-modal__close" aria-label="Cerrar cursos">${Icon('x', 18)}</button>
      </div>
      <div class="public-courses-modal__body" id="public-coach-courses-list">
        <div class="public-courses-modal__loading"><span></span><span></span><span></span></div>
      </div>
      <div class="public-courses-modal__foot">
        <span>Encuentra tu siguiente nivel.</span>
        <a href="#/register" class="btn btn-primary">Empezar ahora →</a>
      </div>
    </div>`

  const root = document.getElementById('modal-root') || document.body
  root.appendChild(modal)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  }
  const close = () => {
    modal.remove()
    document.removeEventListener('keydown', onKeyDown)
  }
  modal.querySelector('.public-courses-modal__close')?.addEventListener('click', close)
  modal.querySelector<HTMLAnchorElement>('.public-courses-modal__foot a')?.addEventListener('click', close)
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close()
  })
  document.addEventListener('keydown', onKeyDown)

  const { data, error } = await supabase.rpc('get_public_coach_courses', { p_coach_id: coachId })
  if (!modal.isConnected) return
  const list = modal.querySelector<HTMLElement>('#public-coach-courses-list')
  if (!list) return

  if (error) {
    list.innerHTML = '<p class="public-courses-modal__empty">No pudimos cargar los cursos en este momento.</p>'
    return
  }

  const courses = Array.isArray(data) ? data : []
  if (courses.length === 0) {
    list.innerHTML = '<p class="public-courses-modal__empty">Este coach está preparando sus cursos. Únete a la academia para conocer su próxima ruta de entrenamiento.</p>'
    return
  }

  list.innerHTML = courses.map((course: any, index: number) => {
    const duration = course.duration_months === 0.5 ? '15 días' : course.duration_months ? `${course.duration_months} meses` : 'Ruta continua'
    const price = Number(course.price) > 0 ? `$${Number(course.price).toLocaleString('en-US')} / mes` : 'Gratis'
    return `
      <article class="public-course-item" style="--course-index:${index}">
        <div class="public-course-item__mark">${String(index + 1).padStart(2, '0')}</div>
        <div class="public-course-item__content">
          <h3>${escapeHtml(course.name || 'Curso QU4SAR')}</h3>
          <p>${escapeHtml(course.description || 'Entrenamiento estructurado para avanzar con un plan claro.')}</p>
<div class="public-course-item__meta">
            <span>${rankBadge(course.min_rank, 16)} ${escapeHtml(course.min_rank || 'Todos los rangos')}</span>
            <span>${escapeHtml(duration)}</span>
            <strong>${escapeHtml(price)}</strong>
          </div>
        </div>
      </article>`
  }).join('')
}

async function loadPublicStats(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const visitKey = 'qu4sar-public-visit-day'
  const countedToday = localStorage.getItem(visitKey) === today
  const rpc = countedToday ? 'get_public_site_stats' : 'register_public_site_visit'
  const { data, error } = await supabase.rpc(rpc)
  if (error || !data) return

  const stats = Array.isArray(data) ? data[0] : data
  if (!stats) return
  if (!countedToday) localStorage.setItem(visitKey, today)

  const values: Record<string, number> = {
    visits: Number(stats.visits) || 0,
    students: Number(stats.students) || 0,
    registrations: Number(stats.registrations) || 0,
  }

  Object.entries(values).forEach(([key, value]) => {
    const element = document.querySelector<HTMLElement>(`[data-stat-value="${key}"]`)
    if (!element) return
    animateStat(element, value)
  })
}

function animateStat(element: HTMLElement, target: number): void {
  const duration = 900
  const start = performance.now()
  const tick = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    element.textContent = Math.round(target * eased).toLocaleString('es-PE')
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
