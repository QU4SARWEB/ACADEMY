import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { supabase } from '@/304244'
import { getProfile } from '@/fa53b9/fa53b9'
import { router } from '@/f3395c'

const DISCORD_URL = 'https://discord.gg/jmP2wJVf4N'
const SOCIALS = {
  youtube: 'https://www.youtube.com/@QU4SAR_ACADEMY',
  twitch: 'https://www.twitch.tv/qu4sar_academy',
  instagram: 'https://www.instagram.com/qu4sar._.esports/',
  discord: DISCORD_URL,
}

export function renderDiscordBanner(): string {
  return `
    <a class="discord-banner public-enter public-enter--banner" href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">
      <span class="dot pulse-dot"></span>
      <span>La comunidad vive en el Discord: guías, eventos, clips, tickets y busco-equipo.</span>
      <em>Unirse →</em>
    </a>`
}

export function renderPublicNavbar(session?: any, opts: { active?: string; links?: boolean } = {}): string {
  const active = opts.active || ''
  const links = opts.links ?? true
  const loggedIn = !!session?.user

  const navLinks = links
    ? [
        { label: 'Coaches', dataScroll: 'coaches' },
        { label: 'Precios', dataScroll: 'precios' },
        { label: 'Comunidad', dataScroll: 'comunidad' },
        { label: 'FAQ', dataScroll: 'faq' },
      ]
    : []

  return `
    <nav class="nav-b public-enter public-enter--nav">
      <a class="mark brand-logo" href="#/">
        <img src="QU4SARreducido.png" alt="QU4SAR" width="32" height="32" />
        <span>QU<span class="q">4</span>SAR</span>
      </a>
      <ul class="nav-b__links">
        <li><a href="#/" class="${active === 'home' ? 'active' : ''}">Inicio</a></li>
        ${navLinks.map(l => `
          <li><a href="#/" data-scroll="${l.dataScroll}" class="${active === l.dataScroll ? 'active' : ''}">${escapeHtml(l.label)}</a></li>
        `).join('')}
      </ul>
      <div class="nav-b__right">
        ${loggedIn
          ? '<a href="#/coaches/dashboard" id="nav-platform-link" class="btn btn-primary nav-cta">Plataforma</a>'
          : '<a href="#/login" class="btn btn-ghost nav-cta">Iniciar sesión</a>\n        <a href="#/register" class="btn btn-primary nav-cta">Registrarse</a>'
        }
        <button class="nav-b__burger" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>

    <div class="nav-drawer" aria-hidden="true">
      <button class="nav-drawer__close" aria-label="Cerrar menú">${Icon('x', 22)}</button>
      <div class="flex items-center gap-2 mt-2 mb-6">
        <img src="QU4SARreducido.png" alt="QU4SAR" class="h-8 w-8" />
        <span class="font-heading text-lg font-bold text-white">QU<span class="text-[#8B5CF6]">4</span>SAR</span>
      </div>
      <a href="#/">Inicio</a>
      ${navLinks.map(l => `<a href="#/" data-scroll="${l.dataScroll}">${escapeHtml(l.label)}</a>`).join('')}
      ${loggedIn
        ? '<a href="#/coaches/dashboard" class="btn btn-primary drawer-cta">Plataforma</a>'
        : '<a href="#/login" class="btn btn-ghost drawer-cta" style="border-radius:.6rem;text-align:center;border:1px solid rgba(255,255,255,.14)">Iniciar sesión</a>\n      <a href="#/register" class="btn btn-primary drawer-cta">Registrarse</a>'
      }
    </div>`
}

export function renderPublicFooter(): string {
  return `
    <footer class="foot-b public-enter public-enter--footer">
      <div class="foot-b__inner">
        <div class="brand-col">
          <a class="mark" href="#/">
            <img src="QU4SARreducido.png" alt="QU4SAR" class="h-7 w-7" />
            <span>QU<span class="q">4</span>SAR</span>
          </a>
          <p class="brand-tagline">Gaming Academy. Formamos la próxima generación de talento competitivo en esports.</p>
        </div>
        <div>
          <span class="h">Academia</span>
          <a href="#/">Inicio</a>
          <a href="#/about">Sobre nosotros</a>
          <a href="#/" data-scroll="coaches">Coaches</a>
          <a href="#/" data-scroll="precios">Precios</a>
        </div>
        <div>
          <span class="h">Comunidad</span>
          <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="${SOCIALS.youtube}" target="_blank" rel="noopener noreferrer">YouTube</a>
          <a href="${SOCIALS.twitch}" target="_blank" rel="noopener noreferrer">Twitch</a>
          <a href="${SOCIALS.instagram}" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
        <div>
          <span class="h">Cuenta</span>
          <a href="#/login">Iniciar sesión</a>
          <a href="#/register">Registrarse</a>
          <a href="#/reset-password">Recuperar contraseña</a>
        </div>
        <div>
          <span class="h">Contacto</span>
          <a href="mailto:qu4saracademyla@gmail.com">qu4saracademyla@gmail.com</a>
          <a href="#/" data-scroll="comunidad">Únete a la comunidad</a>
        </div>
      </div>
      <div class="foot-b__copy">
        <span>© ${new Date().getFullYear()} QU4SAR Gaming Academy · Todos los derechos reservados.</span>
        <span>HECHO EN LATAM · PARA LATAM</span>
      </div>
    </footer>`
}

function isOnHome(): boolean {
  const h = location.hash.slice(1).split('?')[0]
  return h === '' || h === '/' || h === '/home'
}

function scrollToId(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function mountPublicNav(): void {
  // Burger toggle
  const burger = document.querySelector<HTMLButtonElement>('.nav-b__burger')
  const drawer = document.querySelector<HTMLElement>('.nav-drawer')
  const closeBtn = document.querySelector<HTMLButtonElement>('.nav-drawer__close')

  const closeDrawer = () => {
    drawer?.classList.remove('open')
    drawer?.setAttribute('aria-hidden', 'true')
    burger?.classList.remove('open')
    burger?.setAttribute('aria-expanded', 'false')
  }

  burger?.addEventListener('click', () => {
    const isOpen = drawer?.classList.toggle('open') ?? false
    burger.classList.toggle('open', isOpen)
    drawer?.setAttribute('aria-hidden', String(!isOpen))
    burger.setAttribute('aria-expanded', String(isOpen))
  })
  closeBtn?.addEventListener('click', closeDrawer)

  // Data-scroll links (secciones dentro de la landing)
  document.querySelectorAll<HTMLElement>('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      closeDrawer()
      const id = el.dataset.scroll || ''
      if (isOnHome()) {
        scrollToId(id)
      } else {
        router.navigate('/').then(() => {
          setTimeout(() => scrollToId(id), 120)
        })
      }
    })
  })

  // Ocultar al bajar / mostrar al subir (navbar + cintillo + notificación)
  const hideEls = document.querySelectorAll<HTMLElement>('.nav-b, .discord-banner, .alert-toast')
  if (hideEls.length > 0) {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const goingDown = y > lastY && y > 80
      lastY = y
      hideEls.forEach(el => el.classList.toggle('nav-hidden', goingDown))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  // Reveal on scroll: aparece después de entrar al viewport y en ambas direcciones
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement
        if (!entry.isIntersecting) {
          delete target.dataset.revealPending
          target.classList.remove('in')
          continue
        }

        // Let the hidden state paint before starting the fade-in transition.
        target.dataset.revealPending = '1'
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (target.isConnected && target.dataset.revealPending === '1') {
              delete target.dataset.revealPending
              target.classList.add('in')
            }
          })
        })
      }
    }, { threshold: 0.2 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'))
  }

  // Session swap: if logged in, point "Plataforma" to the user's dashboard
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session?.user) return
    const profile = await getProfile()
    const prefix = profile?.role === 'coach' ? 'coaches' : 'students'
    document.querySelectorAll('#nav-platform-link, .drawer-cta[href="#/coaches/dashboard"]').forEach(a => {
      a.setAttribute('href', `#/${prefix}/dashboard`)
    })
  }).catch(() => {})
}
