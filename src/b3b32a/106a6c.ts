import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { renderDiscordBanner, renderPublicNavbar, renderPublicFooter, mountPublicNav } from '@/b3b32a/shared/public_nav'

const DISCORD_URL = 'https://discord.gg/wbFm5BVWW'

function embers(): string {
  const positions = [2, 7, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 95]
  return `
    <div class="embers" aria-hidden="true">
      ${positions.map((left, i) => `
        <span class="ember" style="left:${left}%;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;--ex:${((i % 5) - 2) * 14}px;animation-duration:${7 + (i % 6)}s;animation-delay:${(i % 8) * 0.9}s"></span>
      `).join('')}
    </div>`
}

function waves(): string {
  return `
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
    </div>`
}

function hero(session: any): string {
  return `
    <header class="relative z-10 mx-auto flex min-h-[62vh] max-w-6xl flex-col items-center justify-center px-6 pt-8 text-center">
      ${embers()}
      <div class="animate-float mb-6 relative">
        <div class="absolute inset-0 animate-pulse rounded-full bg-[#8B5CF6]/25 blur-2xl"></div>
        <img src="qu4sar.ico" alt="QU4SAR" class="relative h-20 w-20 md:h-24 md:w-24" />
      </div>
      <span class="lbl reveal">Academia de Esports</span>
      <h1 class="font-heading text-4xl font-extrabold leading-tight text-white md:text-7xl reveal" style="--i:1">
        QU<span class="text-[#8B5CF6]">4</span>SAR<br />
        <span class="text-2xl font-light text-zinc-300 md:text-4xl">Gaming Academy</span>
      </h1>
      <p class="mt-5 max-w-xl text-sm text-zinc-300 leading-relaxed md:text-base reveal" style="--i:2">
        La academia de esports que transforma tu pasión en rendimiento competitivo.
        Entrena con coaches profesionales y lleva tu juego al siguiente nivel.
      </p>
      <p class="mt-3 text-xs text-zinc-500 tracking-wide reveal" style="--i:3">Todos los ranks · ES / EN · Online</p>
      <div class="mt-8 flex flex-col gap-4 sm:flex-row reveal" style="--i:4">
        <a href="#/" data-scroll="cursos" class="btn btn-primary">Ver cursos →</a>
        <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">Únete al Discord</a>
      </div>
    </header>`
}

export function renderHome(session?: any): string {
  return `
    <div class="relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      <style>@keyframes wf { 0% { opacity:1; } 50% { opacity:0.6; } 100% { opacity:1; } }</style>
      <div class="fixed inset-0" style='background: url("qu4sarfondoPublico.png") center/cover no-repeat fixed; z-index:-2'></div>
      <div class="fixed inset-0" style="background: rgba(10,10,10,0.6); z-index:-1"></div>
      <div class="pointer-events-none fixed inset-0" style="z-index:-1">
        <div class="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#8B5CF6]/15 blur-3xl"></div>
        <div class="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-[#6D28D9]/15 blur-3xl"></div>
      </div>

      ${renderDiscordBanner()}
      ${renderPublicNavbar(session, { active: 'home' })}

      ${hero(session)}

      ${waves()}

      <div class="bg-[#0A0A0A] relative z-10 pt-8 md:pt-12">

        <!-- Stats -->
        <section class="mx-auto max-w-5xl px-6">
          <div class="stats-bar reveal">
            <div class="stat">
              <div class="stat__num">7<em>+</em></div>
              <div class="stat__label">Niveles de juego</div>
            </div>
            <div class="stat">
              <div class="stat__num">100<em>%</em></div>
              <div class="stat__label">Entrenamiento online</div>
            </div>
            <div class="stat">
              <div class="stat__num">Rookie<em>→</em>Pro</div>
              <div class="stat__label">Método progresivo</div>
            </div>
            <div class="stat">
              <div class="stat__num">PC<em> + </em>Mobile</div>
              <div class="stat__label">Plataformas</div>
            </div>
          </div>
        </section>

        <!-- Roster: Cursos -->
        <section id="cursos" class="mx-auto mt-24 md:mt-28 max-w-5xl scroll-mt-24 px-6">
          <div class="flex flex-col gap-2 mb-10">
            <span class="lbl">El plan de entrenamiento</span>
            <h2 class="s-title">Aprende por <em>niveles.</em></h2>
            <p class="s-title-sub">Cada curso está diseñado para tu rango. Avanza de Rookie a Pro con un método progresivo y seguimiento real de coaches.</p>
          </div>
          <div id="courses-grid" class="roster-grid">
            ${Array.from({ length: 4 }).map((_, i) => `
              <div class="roster-card reveal" style="--i:${i}">
                <div class="roster-card__poster">
                  <span class="poster-fallback">Q</span>
                  <div class="roster-card__shade"></div>
                  <span class="roster-card__corner tl">● Curso</span>
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

        <!-- Briefing -->
        <section class="mx-auto mt-28 md:mt-32 max-w-5xl px-6">
          <div class="flex flex-col gap-2 mb-10">
            <span class="lbl">El briefing</span>
            <h2 class="s-title">Por qué estás <em>estancado.</em></h2>
          </div>
          <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <div class="hud relative overflow-hidden rounded-xl border border-white/10" style="min-height:260px;background:linear-gradient(150deg,rgba(139,92,246,0.25),#0a0a12 70%)">
              <img src="qu4sarfondoPublico.png" alt="Briefing QU4SAR" class="absolute inset-0 h-full w-full object-cover opacity-70" />
              <div class="absolute inset-0 flex items-center justify-center">
                <button class="flex flex-col items-center gap-2 text-white/90 transition hover:scale-105" aria-label="Ver briefing">
                  <span class="flex h-16 w-16 items-center justify-center rounded-full border border-[#8B5CF6]/60 bg-[#8B5CF6]/30 backdrop-blur-md">${Icon('play', 26)}</span>
                  <span class="text-xs tracking-widest uppercase">Ver briefing</span>
                </button>
              </div>
              <span class="absolute bottom-3 left-4 text-[11px] text-zinc-400">QU4SAR · Método de entrenamiento</span>
            </div>
            <div>
              <blockquote class="border-l-2 border-[#8B5CF6] pl-5 text-lg text-zinc-200 leading-relaxed">
                «La diferencia real no era pegar más balas. Era tomar mejores decisiones.»
              </blockquote>
              <p class="mt-3 text-xs text-zinc-500">Coaches QU4SAR · Footage de partidas oficiales</p>
              <a href="#/" data-scroll="precios" class="btn btn-ghost mt-6">Empieza 1 a 1 →</a>
            </div>
          </div>
        </section>

        <!-- Cómo funciona -->
        <section class="mx-auto mt-28 md:mt-32 max-w-5xl px-6">
          <div class="flex flex-col gap-2 mb-10">
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

        <!-- Precios / Offers -->
        <section id="precios" class="mx-auto mt-28 md:mt-32 max-w-5xl scroll-mt-24 px-6">
          <div class="flex flex-col gap-2 mb-10 text-center items-center">
            <span class="lbl">Inversión única por curso</span>
            <h2 class="s-title">Invierte en tu <em>futuro competitivo.</em></h2>
            <p class="s-title-sub">Una inversión única. Sin mensualidades, sin permanencia, sin letra pequeña. Pagas el curso que quieres y accedes a todo el entrenamiento.</p>
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
              <div class="offer-card__price"><span class="offer-card__amount amount-paid">$15</span><span class="offer-card__unit">USD · pago único</span></div>
              <p class="offer-card__save">Sin mensualidades ni permanencia</p>
              <p class="offer-card__blurb">El entrenamiento completo para tu rango: de la teoría a la práctica real, con coaches que siguen tu progreso semana a semana. Es la diferencia entre jugar más y jugar mejor.</p>
              <ul class="offer-card__list">
                ${[
                  'Plan de estudios progresivo diseñado para tu nivel (Rookie a Pro)',
                  'Seguimiento 1 a 1 con coaches certificados',
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
          <div class="compare reveal mt-10" style="--i:2">
            <div class="compare__head">
              <span>Beneficio</span>
              <span>Gratis</span>
              <span>Cursos <em>$15</em></span>
            </div>
            ${[
              { label: 'Evaluación de nivel inicial', free: true, paid: true },
              { label: 'Examen teórico y práctico', free: true, paid: true },
              { label: 'Plan de estudios por rango', free: false, paid: true },
              { label: 'Seguimiento con coaches', free: false, paid: true },
              { label: 'Scrims y torneos', free: false, paid: true },
              { label: 'Comunidad exclusiva', free: false, paid: true },
              { label: 'Certificado oficial', free: false, paid: true },
            ].map((r, i) => `
              <div class="compare__row">
                <span>${escapeHtml(r.label)}</span>
                <span class="${r.free ? 'yes' : 'no'}">${r.free ? '✓' : '—'}</span>
                <span class="yes paid">${r.paid ? '✓' : '—'}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Features: Qué incluye -->
        <section class="mx-auto mt-28 md:mt-32 max-w-5xl px-6">
          <div class="flex flex-col gap-2 mb-10">
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
        <section id="comunidad" class="mx-auto mt-28 md:mt-32 max-w-5xl scroll-mt-24 px-6">
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
            <ul class="community__perks reveal" style="--i:1">
              ${['#anuncios y #reglas', '#general, #clips y #sugerencias', '#guías y #eventos', '#busco-equipo', '#tickets para soporte', 'Salas de voz para clases y coordinación'].map(c => `
                <li class="community__perk"><span class="dot"></span>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>
        </section>

        <!-- Novedades: Valorant Mobile -->
        <section class="mx-auto mt-28 md:mt-32 max-w-5xl px-6">
          <div class="news-banner reveal">
            <img src="Vmobile.jpg" alt="Valorant Mobile en QU4SAR" class="news-banner__img" />
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

          <div class="platform-ticker reveal" style="--i:1">
            <span class="t-label">Cubre ambas plataformas</span>
            <span class="t-item active">${Icon('play', 14)} PC</span>
            <span class="t-item">${Icon('smartphone', 14)} Mobile</span>
            <span class="t-item">${Icon('trophy', 14)} Competitivo</span>
            <span class="t-item">${Icon('target', 14)} Ranked</span>
          </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="mx-auto mt-28 md:mt-32 max-w-5xl scroll-mt-24 px-6">
          <div class="flex flex-col gap-2 mb-10">
            <span class="lbl">FAQ</span>
            <h2 class="s-title">Lo que <em>siempre preguntan.</em></h2>
          </div>
          <div class="faq-b">
            ${[
              { q: '¿Sirve si soy Hierro o Bronce?', a: 'Sí. El método se adapta a tu rango: primero trabajamos aim, crosshair y fundamentos. El coach empieza donde estás, sea cual sea tu nivel.' },
              { q: '¿Ya entrenan Valorant Mobile?', a: 'Sí. Acabamos de integrar Valorant Mobile a la academia: cursos, coaching y comunidad adaptados para que entrenes también desde tu celular (iOS y Android), manteniendo el soporte completo para PC.' },
              { q: '¿Qué incluye la comunidad de Discord?', a: 'Es el hub de QU4SAR: anuncios, clips, guías, eventos, busco-equipo, tickets de soporte y salas de voz para clases y coordinación.' },
              { q: '¿Cómo se paga el curso?', a: 'Pagas una sola vez por curso (USD 15) por PayPal o subiendo tu comprobante. Sin mensualidades ni permanencia.' },
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
        <section class="outro mt-20 md:mt-24">
          <h2>De cero a Pro. <em>Empezamos cuando quieras.</em></h2>
          <div class="outro__ctas">
            <a href="#/" data-scroll="cursos" class="btn btn-primary">Ver cursos →</a>
            <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">Unirse al Discord</a>
          </div>
        </section>

      </div>

      ${renderPublicFooter()}
    </div>`
}

export async function mountHome(): Promise<void> {
  mountPublicNav()

  // Cargar cursos reales para el roster
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, slug, description, duration_months, min_rank, price, display_order, is_active')
    .eq('is_active', true)
    .order('display_order')
  const grid = document.getElementById('courses-grid')
  if (grid) {
    const list = (courses ?? []).filter((c: any) => c.slug !== 'posicionamiento' && c.slug !== 'clase complementaria')
    if (list.length === 0) {
      grid.innerHTML = '<p class="text-sm text-zinc-500 col-span-2">No hay cursos disponibles por ahora.</p>'
    } else {
      grid.innerHTML = list.map((c: any, i: number) => {
        const isFree = !c.price || c.price <= 0
        const initial = (c.name || 'Q').charAt(0).toUpperCase()
        const months = c.duration_months ? `${c.duration_months} mes${c.duration_months > 1 ? 'es' : ''}` : 'Online'
        return `
          <a href="#/register" class="roster-card reveal in" style="--i:${i % 4}">
            <div class="roster-card__poster">
              <span class="poster-fallback">${escapeHtml(initial)}</span>
              <div class="roster-card__shade"></div>
              <span class="roster-card__corner tl">● Curso</span>
              <span class="roster-card__corner tr">VAL · 2026</span>
              <span class="roster-card__name">${escapeHtml(c.name)}</span>
              <span class="roster-card__sub">${escapeHtml(c.min_rank || 'Todos los rangos')}</span>
            </div>
            <div class="roster-card__body">
              <span class="roster-card__creds">${escapeHtml(months)} · Plan progresivo</span>
              <p class="roster-card__tag">${escapeHtml((c.description || 'Programa de entrenamiento para subir tu nivel competitivo.').slice(0, 90))}${(c.description?.length ?? 0) > 90 ? '…' : ''}</p>
              <div class="roster-card__meta"><span>${isFree ? 'Gratis' : `$${c.price} USD`}</span><span>${escapeHtml(c.min_rank || 'Todos')}</span></div>
              <span class="roster-card__cta">Ver curso →</span>
            </div>
          </a>`
      }).join('')
    }
  }
}
