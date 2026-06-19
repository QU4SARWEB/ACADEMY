import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { store } from '@/9ed39e/8cd892'
import { supabase } from '@/304244'
import type { Profile } from '@/d14a80'
import { signOut } from '@/fa53b9/fa53b9'

export function DashboardLayout(contentHtml: string): string {
  const profile = store.get<Profile>('profile')
  const role = profile?.role || ''
  const prefix = role === 'coach' ? 'coaches' : role === 'student' ? 'students' : 'players'
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
    <div class="flex min-h-screen">
      ${Sidebar(role, prefix, profile)}
      <main id="main-content" class="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
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
  const isCoach = role === 'coach'
  const isStudent = role === 'student'
  const isPlayer = role === 'player'
  const accent = (profile as any)?.role_color || '#8B5CF6'

  let unreadNotifs = 0
  const cachedUnread = (window as any).__unreadNotifs
  if (cachedUnread !== undefined) unreadNotifs = cachedUnread

  type NavItem = { href?: string; icon?: string; label?: string; show?: boolean; sep?: boolean }
  function sep(): NavItem { return { sep: true } }
  function item(href: string, icon: string, label: string, show = true): NavItem { return { href, icon, label: label + (label === 'Notificaciones' && unreadNotifs > 0 ? ` (${unreadNotifs})` : ''), show } }

  const navGroups: NavItem[][] = [
    [item(`/${prefix}/dashboard`, 'layoutDashboard', 'Dashboard'), item('/', 'home', 'Inicio')],
    [sep()],
    [item(`/${prefix}/courses`, 'bookOpen', 'Cursos'), item(`/${prefix}/tasks`, 'clipboardList', 'Tareas', isStudent || isPlayer), item(`/${prefix}/grades`, 'scrollText', 'Calificaciones', isStudent), item(`/${prefix}/schedule`, 'calendar', 'Horario', isStudent || isPlayer)],
    [sep()],
    [item('/members', 'users', 'Miembros'), item(`/${prefix}/team`, 'users', 'Equipo', isPlayer), item(`/${prefix}/scrims`, 'sword', 'Scrims', isPlayer || isCoach), item('/chat', 'mail', 'Mensajes')],
    [sep()],
    [item(`/${prefix}/profile`, 'user', 'Perfil'), item('/payments', 'dollarSign', 'Pagos'), item('/support', 'info', 'Soporte', isStudent || isPlayer), item('/notifications', 'bell', 'Notificaciones')],
  ]

  const coachGroups: NavItem[][] = [
    [item('/coaches/dashboard', 'layoutDashboard', 'Dashboard'), item('/', 'home', 'Inicio')],
    [sep()],
    [item('/coaches/students', 'users', 'Estudiantes'), item('/coaches/players', 'sword', 'Jugadores'), item('/coaches/courses', 'bookOpen', 'Cursos'), item('/coaches/tasks', 'clipboardList', 'Tareas'), item('/coaches/schedules', 'calendar', 'Horarios'), item('/coaches/seasons', 'calendar', 'Temporadas')],
    [sep()],
    [item('/coaches/teams', 'users', 'Equipos'), item('/coaches/scrims', 'sword', 'Scrims'), item('/coaches/promotions', 'trophy', 'Promociones'), item('/members', 'users', 'Miembros')],
    [sep()],
    [item('/chat', 'mail', 'Mensajes'), item('/support', 'info', 'Soporte'), item('/notifications', 'bell', 'Notificaciones')],
    [sep()],
    [item('/coaches/profile', 'user', 'Perfil'), item('/payments', 'dollarSign', 'Pagos')],
    [sep()],
    [item('/logs', 'scrollText', 'Auditoría')],
  ]

  const isExpired = !!(window as any).__isExpired
  let groups = isCoach ? coachGroups : navGroups.map(g => g.filter(i => i.show !== false)).filter(g => g.length > 0)
  if (isExpired && !isCoach) {
    groups = groups.map(g => g.filter(i => i.href === '/payments')).filter(g => g.length > 0)
  }
  const currentHash = location.hash.slice(1)

  let itemsHtml = ''
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    if (gi > 0) itemsHtml += '<div class="my-1 border-t border-zinc-800/60"></div>'
    for (const item of group) {
      if (item.sep) continue
      const active = currentHash.startsWith(item.href!) ? `bg-zinc-800 text-white border-l-2` : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
      itemsHtml += `
        <a href="#${escapeHtml(item.href!)}"
           class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active}"
           style="${currentHash.startsWith(item.href!) ? `border-color:${accent}` : ''}">
          ${Icon(item.icon!, 18)}
          <span>${escapeHtml(item.label!)}</span>
        </a>`
    }
  }

  const userName = profile?.display_name || profile?.full_name || 'Usuario'
  const userRole = role.charAt(0).toUpperCase() + role.slice(1)

  return `
    <aside id="sidebar" class="sticky top-0 h-screen w-64 shrink-0 overflow-hidden border-r border-zinc-800 bg-[#0A0A0A] p-4 flex flex-col">
      <a href="#/${prefix}/dashboard" class="mb-6 flex items-center gap-2 px-3">
        <img src="qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
        <span class="font-heading text-base font-bold text-white">QU<span style="color:${accent}">4</span>SAR</span>
      </a>

      <div class="mb-4 flex items-center gap-3 rounded-lg bg-zinc-900/50 px-3 py-2">
        <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold" style="background:${accent}20;color:${accent}">
          ${profile?.avatar_url
            ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
            : escapeHtml(userName.charAt(0).toUpperCase())
          }
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-white">${escapeHtml(userName)}</p>
          <p class="text-xs text-zinc-500">${escapeHtml(userRole)}</p>
        </div>
      </div>

      <nav class="flex flex-col gap-1">
        ${itemsHtml}
      </nav>

      <div class="mt-auto flex flex-col gap-1 pt-4">
        <a href="#/settings"
           class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white">
          ${Icon('settings', 14)} Personalizar
        </a>
        <button id="logout-btn"
           class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800/50 hover:text-red-400">
          ${Icon('logOut', 18)}
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>`
}

export function initSidebar(): void {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut()
  })

  // Fetch unread notification count
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user?.id) return
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('profile_id', session.user.id)
      .eq('read', false)
      .then(({ count }) => {
        const n = count ?? 0
        ;(window as any).__unreadNotifs = n
        document.querySelectorAll('a[href="#/notifications"]').forEach((a) => {
          const span = a.querySelector('span')
          if (span) span.textContent = n > 0 ? 'Notificaciones (' + n + ')' : 'Notificaciones'
        })
      })
  })
}
