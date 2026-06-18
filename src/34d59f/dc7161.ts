import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { store } from '@/9ed39e/8cd892'
import type { Profile } from '@/d14a80'
import { signOut } from '@/fa53b9/fa53b9'

export function DashboardLayout(contentHtml: string): string {
  const profile = store.get<Profile>('profile')
  const role = profile?.role || ''
  const prefix = role === 'coach' ? 'coaches' : role === 'student' ? 'students' : 'players'

  return `
    <div class="flex min-h-screen">
      ${Sidebar(role, prefix, profile)}
      <main id="main-content" class="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        ${contentHtml}
      </main>
    </div>`
}

function Sidebar(role: string, prefix: string, profile: Profile | undefined): string {
  const isCoach = role === 'coach'
  const isStudent = role === 'student'
  const isPlayer = role === 'player'

  const navItems: Array<{ href: string; icon: string; label: string; show: boolean }> = [
    { href: `/${prefix}/dashboard`, icon: 'layoutDashboard', label: 'Dashboard', show: true },
    { href: `/${prefix}/profile`, icon: 'user', label: 'Perfil', show: true },
    { href: '/payments', icon: 'dollarSign', label: 'Pagos', show: isStudent || isPlayer },
    { href: `/${prefix}/schedule`, icon: 'calendar', label: 'Horario', show: isStudent || isPlayer },
    { href: `/${prefix}/tasks`, icon: 'clipboardList', label: 'Tareas', show: isStudent || isPlayer },
    { href: `/${prefix}/courses`, icon: 'bookOpen', label: 'Cursos', show: isStudent || isPlayer || isCoach },
    { href: `/${prefix}/evaluations`, icon: 'target', label: 'Evaluaciones', show: isStudent },
    { href: `/${prefix}/grades`, icon: 'scrollText', label: 'Calificaciones', show: isStudent },
    { href: `/${prefix}/team`, icon: 'users', label: 'Equipo', show: isPlayer },
    { href: `/${prefix}/scrims`, icon: 'sword', label: 'Scrims', show: isPlayer || isCoach },
    { href: '/notifications', icon: 'bell', label: 'Notificaciones', show: true },
    { href: '/mail', icon: 'mail', label: 'Mensajes', show: true },
  ]

  const coachItems: Array<{ href: string; icon: string; label: string }> = [
    { href: '/coaches/students', icon: 'users', label: 'Estudiantes' },
    { href: '/coaches/players', icon: 'sword', label: 'Jugadores' },
    { href: '/coaches/courses', icon: 'bookOpen', label: 'Cursos' },
    { href: '/coaches/tasks', icon: 'clipboardList', label: 'Tareas' },
    { href: '/coaches/evaluations', icon: 'target', label: 'Evaluaciones' },
    { href: '/coaches/questions', icon: 'search', label: 'Preguntas' },
    { href: '/coaches/schedules', icon: 'calendar', label: 'Horarios' },
    { href: '/coaches/seasons', icon: 'calendar', label: 'Temporadas' },
    { href: '/coaches/teams', icon: 'users', label: 'Equipos' },
    { href: '/coaches/scrims', icon: 'sword', label: 'Scrims' },
    { href: '/coaches/promotions', icon: 'trophy', label: 'Promociones' },
    { href: '/logs', icon: 'scrollText', label: 'Auditoría' },
  ]

  let items = isCoach ? coachItems : navItems.filter(i => i.show)

  const currentHash = location.hash.slice(1)

  const itemsHtml = items.map(item => {
    const active = currentHash.startsWith(item.href) ? 'bg-zinc-800 text-white border-l-2 border-[#8B5CF6]' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
    return `
      <a href="#${escapeHtml(item.href)}"
         class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active}">
        ${Icon(item.icon, 18)}
        <span>${escapeHtml(item.label)}</span>
      </a>`
  }).join('')

  const userName = profile?.display_name || profile?.full_name || 'Usuario'
  const userRole = role.charAt(0).toUpperCase() + role.slice(1)

  return `
    <aside id="sidebar" class="w-64 shrink-0 border-r border-zinc-800 bg-[#0A0A0A] p-4 flex flex-col">
      <a href="#/${prefix}/dashboard" class="mb-6 flex items-center gap-2 px-3">
        <img src="/qu4sar.ico" alt="QU4SAR" class="h-8 w-8" />
        <span class="font-heading text-base font-bold text-white">QU<span class="text-[#8B5CF6]">4</span>SAR</span>
      </a>

      <div class="mb-4 flex items-center gap-3 rounded-lg bg-zinc-900/50 px-3 py-2">
        <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">
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
        <a href="#/${prefix}/profile"
           class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white">
          ${Icon('settings', 18)}
          <span>Configuración</span>
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
}
