import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { store } from '@/9ed39e/8cd892'
import { supabase } from '@/304244'
import type { Profile } from '@/d14a80'
import { signOut } from '@/fa53b9/fa53b9'
import { router } from '@/f3395c'

export function DashboardLayout(contentHtml: string): string {
  const profile = store.get<Profile>('profile')
  // Preview mode: a coach can preview student/player views
  const previewRole = sessionStorage.getItem('previewRole') || ''
  const effectiveRole = previewRole || profile?.role || ''
  const role = effectiveRole
  const prefix = role === 'coach' ? 'coaches' : 'students'
  const accent = (profile as any)?.role_color || '#8B5CF6'
  const bgUrl = (profile as any)?.custom_bg_url || ''

  // Inject CSS variables for accent color + custom bg
  const style = `
    <style id="theme-vars">
      :root { --accent: ${accent}; --accent-rgb: ${hexToRgb(accent)}; --accent-bg: ${accent}20; }
      ${bgUrl ? `
        body, #app, .min-h-screen { background: url(${bgUrl}) center/cover fixed !important; }
        #sidebar { background: rgba(10,10,10,0.92) !important; backdrop-filter: blur(12px) !important; }
        #main-content > .mx-auto { background: rgba(10,10,10,0.85) !important; backdrop-filter: blur(8px) !important; border-radius: 16px !important; padding: 0.75rem 1rem !important; margin-bottom: 0.5rem !important; margin-top: 0.5rem !important; }
        #main-content .glass { background: rgba(20,20,30,0.9) !important; }
        #main-content > .overflow-x-auto, #main-content > div:not(.mx-auto) { background: rgba(10,10,10,0.85) !important; backdrop-filter: blur(8px) !important; border-radius: 16px !important; padding: 0.75rem 1rem !important; margin-bottom: 0.5rem !important; }
        #main-content table { background: transparent !important; backdrop-filter: none !important; border-radius: 0 !important; padding: 0 !important; }
        #main-content .overflow-x-auto .glass, #main-content .glass { background: rgba(20,20,30,0.9) !important; }
      ` : ''}
    </style>`

  return `
    ${style}
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-zinc-900 focus:text-white focus:text-sm focus:border focus:border-zinc-700">Saltar al contenido</a>
    <div class="flex min-h-screen">
      ${Sidebar(role, prefix, profile)}
      <main id="main-content" class="flex-1 overflow-auto p-4 md:p-6 lg:p-8" tabindex="-1">
        ${contentHtml}
      </main>
    </div>`
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function Sidebar(role: string, prefix: string, profile: Profile | undefined): string {
  const previewRole = sessionStorage.getItem('previewRole') || ''
  const effectiveRole = previewRole || role
  const isCoach = effectiveRole === 'coach'
  const isStudent = effectiveRole === 'student'


  const accent = (profile as any)?.role_color || '#8B5CF6'

  type NavItem = { href?: string; icon?: string; label?: string; show?: boolean }
  function item(href: string, icon: string, label: string, show = true): NavItem { return { href, icon, label, show } }

  const navGroups: NavItem[][] = [
    [item(`/${prefix}/dashboard`, 'layoutDashboard', 'Dashboard')],
    [item(`/${prefix}/courses`, 'bookOpen', 'Cursos'), item(`/${prefix}/schedule`, 'calendar', 'Horario', isStudent)],
    [item(`/${prefix}/tasks`, 'clipboardList', 'Tareas', isStudent), item(`/${prefix}/exams`, 'scrollText', 'Ex\u00e1menes', isStudent)],
    [item('/members', 'users', 'Miembros'), item(`/${prefix}/team`, 'users', 'Equipo', isStudent)],
    [item(`/${prefix}/profile`, 'user', 'Perfil'), item('/payments', 'dollarSign', 'Pagos'), item(`/${prefix}/grades`, 'scrollText', 'Notas', isStudent)],
  ]

  const coachGroups: NavItem[][] = [
    [item('/coaches/dashboard', 'layoutDashboard', 'Dashboard')],
    [item('/coaches/students', 'users', 'Estudiantes'), item('/coaches/courses', 'bookOpen', 'Cursos')],
    [item('/coaches/enroll', 'plus', 'Inscribir'), item('/coaches/tasks', 'clipboardList', 'Tareas'), item('/coaches/schedules', 'calendar', 'Horarios')],
    [item('/coaches/exams', 'scrollText', 'Ex\u00e1menes'), item('/coaches/practical', 'target', 'Ex\u00e1menes Pr\u00e1ctico'), item('/coaches/attendance', 'clipboardList', 'Asistencia'), item('/coaches/grades', 'scrollText', 'Notas')],
    [item('/coaches/teams', 'users', 'Equipos'), item('/members', 'users', 'Miembros')],
    [item('/coaches/profile', 'user', 'Perfil'), item('/payments', 'dollarSign', 'Pagos'), item('/coaches/codes', 'fileText', 'C\u00f3digos'), item('/coaches/assignments', 'users', 'Asignaciones')],
  ]

  const isExpired = !!(window as any).__isExpired
  const rawGroups = isCoach ? coachGroups : navGroups.map(g => g.filter(i => i.show !== false)).filter(g => g.length > 0)
  const groups = isExpired && !isCoach
    ? rawGroups.map(g => g.filter(i => i.href === '/payments')).filter(g => g.length > 0)
    : rawGroups
  const currentHash = location.hash.slice(1)

  let itemsHtml = ''
  // Etiquetas de grupo alineadas al contenido de cada sección
  const coachGroupLabels = ['Resumen', 'Academia', 'Entrenamiento', 'Evaluación', 'Comunidad', 'Cuenta']
  const studentGroupLabels = ['Resumen', 'Academia', 'Entrenamiento', 'Comunidad', 'Cuenta']
  const groupLabels = isCoach ? coachGroupLabels : studentGroupLabels
  for (let gi = 0; gi < groups.length; gi++) {
    if (gi > 0) itemsHtml += `<div class="sb-section-label mt-2 mb-1 px-3 pt-3" style="color:${accent}">${groupLabels[gi] || ''}</div>`
    for (const it of groups[gi]) {
      const href = it.href!
      const isActive = currentHash === href || currentHash.startsWith(href + '/')
      const active = isActive
        ? 'active text-white'
        : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
      itemsHtml += `
        <a href="#${escapeHtml(it.href!)}"
           class="sb-nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active}"
           style="${isActive ? `--accent:${accent};background:${accent}12;border:1px solid ${accent}1f` : ''}">
          ${Icon(it.icon!, 18)}
          <span>${escapeHtml(it.label!)}</span>
        </a>`
    }
  }

  const userName = profile?.display_name || profile?.full_name || 'Usuario'
  const userRole = role.charAt(0).toUpperCase() + role.slice(1)

  return `
    <aside id="sidebar" class="sticky top-0 h-screen w-64 shrink-0 overflow-hidden flex flex-col">
      <a href="#/" class="sb-brand mb-4 flex items-center gap-2.5">
        <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
        <span class="font-heading text-base font-bold" style="background:linear-gradient(90deg,#fff,${accent});-webkit-background-clip:text;background-clip:text;color:transparent">QU<span>4</span>SAR</span>
        <span class="ml-auto text-[9px] font-bold tracking-widest uppercase" style="color:${accent}">Academy</span>
      </a>

      <div class="sb-profile mb-4 flex items-center gap-3">
        <div class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold ring-2 ring-[#8B5CF6]/30" style="background:${accent}20;color:${accent}">
          ${profile?.avatar_url
            ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
            : escapeHtml(userName.charAt(0).toUpperCase())
          }
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-white">${escapeHtml(userName)}</p>
          <span class="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style="background:${accent}18;color:${accent}">${escapeHtml(userRole)}</span>
        </div>
      </div>

      ${previewRole ? `
      <div class="mb-2 rounded-lg px-3 py-2 text-xs text-center" style="background:${accent}20;color:${accent};border:1px solid ${accent}30">
        <p class="font-medium mb-1">Vista previa: ${previewRole === 'student' ? 'Alumno' : 'Player'}</p>
        <button id="exit-preview" class="underline opacity-80 hover:opacity-100">Salir de vista previa</button>
      </div>` : ''}
      <nav class="sb-nav flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1">
        ${itemsHtml}
      </nav>

      ${!isCoach ? `
      <div id="sidebar-payment-countdown" class="mt-2 hidden rounded-lg px-3 py-3 transition text-center" style="background:${accent}15;color:${accent};border:1px solid ${accent}30">
        <a href="#/payments" class="flex flex-col items-center gap-1">
          <span class="text-xs font-medium opacity-80">Su inscripción<br>se vence en</span>
          <span id="sidebar-countdown-time" class="text-lg font-bold tracking-wide" style="color:${accent}">—</span>
        </a>
      </div>` : ''}

      <div class="mt-2 flex flex-col gap-1 border-t border-white/5 pt-3">
        <a href="#/settings"
           class="sb-nav-link flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white">
          ${Icon('settings', 14)} Personalizar
        </a>
      </div>
    </aside>
    ${isCoach ? `
    <!-- Coach quick actions panel (retractable, bottom-right) -->
    <div id="coach-panel" class="fixed bottom-4 right-0 z-50 flex items-end transition-transform duration-300" style="transform:translateX(0)">
      <button id="cp-toggle" class="flex items-center justify-center w-7 h-16 rounded-l-lg border border-zinc-700 bg-zinc-900/90 text-zinc-400 hover:text-white transition cursor-pointer mb-1" title="Mostrar/Ocultar">
        <span id="cp-chevron" style="transition:transform 0.3s">${Icon('chevronRight', 14)}</span>
      </button>
      <div class="flex flex-col gap-1.5 rounded-l-lg border border-zinc-700 bg-zinc-900/90 px-2.5 py-2.5 shadow-lg backdrop-blur-md">
        <button class="preview-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white whitespace-nowrap w-full text-left" data-role="student">
          ${Icon('eye', 14)} Vista Alumno
        </button>
        <button class="preview-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white whitespace-nowrap w-full text-left" data-role="player">
          ${Icon('eye', 14)} Vista Player
        </button>
        <button id="logout-btn"
           class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-red-600 hover:text-white whitespace-nowrap">
          ${Icon('logOut', 14)} Cerrar sesión
        </button>
      </div>
    </div>` : `
    <button id="logout-btn"
       class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-zinc-900/95 px-4 py-3 text-sm text-zinc-400 shadow-lg backdrop-blur-md transition hover:bg-red-600 hover:text-white border border-white/10 hover:border-red-500/40">
      ${Icon('logOut', 18)}
      <span>Cerrar sesión</span>
    </button>`}`
}

export function initSidebar(): void {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut()
  })

  // Coach panel toggle
  const coachPanel = document.getElementById('coach-panel')
  const cpToggle = document.getElementById('cp-toggle')
  let panelExpanded = true
  cpToggle?.addEventListener('click', () => {
    panelExpanded = !panelExpanded
    if (coachPanel) {
      coachPanel.style.transform = panelExpanded ? 'translateX(0)' : 'translateX(calc(100% - 28px))'
    }
    const chevron = document.getElementById('cp-chevron')
    if (chevron) chevron.style.transform = panelExpanded ? 'rotate(0deg)' : 'rotate(180deg)'
  })

  // Preview buttons
  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = (btn as HTMLElement).dataset.role
      if (role) {
        sessionStorage.setItem('previewRole', role)
        router.navigate(`/${role}/dashboard`)
      }
    })
  })

  // Exit preview
  document.getElementById('exit-preview')?.addEventListener('click', () => {
    sessionStorage.removeItem('previewRole')
    location.reload()
  })

  // Sidebar payment countdown for non-coach
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user?.id) return
    const profile = store.get<any>('profile')
    if (profile?.role === 'coach') return
    const countdownEl = document.getElementById('sidebar-payment-countdown')
    if (!countdownEl) return

    const tick = async () => {
      const { data: pendingPays } = await supabase
        .from('payments')
        .select('created_at')
        .eq('profile_id', session.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)

      const pay = pendingPays?.[0]
      if (!pay?.created_at) {
        countdownEl.classList.add('hidden')
        return
      }
      const EXPIRE_MS = 172800000

      const expiresAt = new Date(pay.created_at).getTime() + EXPIRE_MS
      const diff = expiresAt - Date.now()

      if (diff <= 0) {
        countdownEl.classList.add('hidden')
        return
      }

      countdownEl.classList.remove('hidden')
      const timeEl = document.getElementById('sidebar-countdown-time')
      if (!timeEl) return

      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      let text = ''
      if (days > 0) text += `${days}d `
      text += `${hours}h ${mins}m`
      if (days === 0) text += ` ${secs}s`
      timeEl.textContent = text
    }

    tick()
    if ((window as any).__intvSidebar) clearInterval((window as any).__intvSidebar)
    ;(window as any).__intvSidebar = setInterval(tick, 1000)
  })
}
