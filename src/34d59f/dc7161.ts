import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { store } from '@/9ed39e/8cd892'
import { supabase } from '@/304244'
import type { Profile } from '@/d14a80'
import { signOut } from '@/fa53b9/fa53b9'
import { toast } from '@/4725dc/4f2900'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

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
      ${bgUrl ? `body, #app, .min-h-screen { background: url(${bgUrl}) center/cover fixed !important; } #sidebar, .glass { background: rgba(10,10,10,0.92) !important; backdrop-filter: blur(12px) !important; }` : ''}
    </style>`

  return `
    ${style}
    <div class="flex min-h-screen">
      ${Sidebar(role, prefix, profile)}
      <main id="main-content" class="flex-1 overflow-auto p-4 md:p-6 lg:p-8 ${bgUrl ? 'bg-transparent' : ''}">
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

  const navItems: Array<{ href: string; icon: string; label: string; show: boolean }> = [
    { href: `/${prefix}/dashboard`, icon: 'layoutDashboard', label: 'Dashboard', show: true },
    { href: `/${prefix}/profile`, icon: 'user', label: 'Perfil', show: true },
    { href: '/payments', icon: 'dollarSign', label: 'Pagos', show: isStudent || isPlayer },
    { href: `/${prefix}/schedule`, icon: 'calendar', label: 'Horario', show: isStudent || isPlayer },
    { href: `/${prefix}/tasks`, icon: 'clipboardList', label: 'Tareas', show: isStudent || isPlayer },
    { href: `/${prefix}/courses`, icon: 'bookOpen', label: 'Cursos', show: isStudent || isPlayer || isCoach },
    { href: `/${prefix}/grades`, icon: 'scrollText', label: 'Calificaciones', show: isStudent },
    { href: `/${prefix}/team`, icon: 'users', label: 'Equipo', show: isPlayer },
    { href: `/${prefix}/scrims`, icon: 'sword', label: 'Scrims', show: isPlayer || isCoach },
    { href: '/support', icon: 'info', label: 'Soporte', show: isStudent || isPlayer },
    { href: '/notifications', icon: 'bell', label: 'Notificaciones' + (unreadNotifs > 0 ? ` (${unreadNotifs})` : ''), show: true },
    { href: '/chat', icon: 'mail', label: 'Mensajes', show: true },
  ]

  const coachItems: Array<{ href: string; icon: string; label: string }> = [
    { href: '/coaches/dashboard', icon: 'layoutDashboard', label: 'Dashboard' },
    { href: '/coaches/profile', icon: 'user', label: 'Perfil' },
    { href: '/coaches/students', icon: 'users', label: 'Estudiantes' },
    { href: '/coaches/players', icon: 'sword', label: 'Jugadores' },
    { href: '/coaches/courses', icon: 'bookOpen', label: 'Cursos' },
    { href: '/coaches/tasks', icon: 'clipboardList', label: 'Tareas' },
    { href: '/coaches/schedules', icon: 'calendar', label: 'Horarios' },
    { href: '/coaches/seasons', icon: 'calendar', label: 'Temporadas' },
    { href: '/coaches/teams', icon: 'users', label: 'Equipos' },
    { href: '/coaches/scrims', icon: 'sword', label: 'Scrims' },
    { href: '/coaches/promotions', icon: 'trophy', label: 'Promociones' },
    { href: '/chat', icon: 'mail', label: 'Mensajes' },
    { href: '/support', icon: 'info', label: 'Soporte' },
    { href: '/notifications', icon: 'bell', label: 'Notificaciones' + (unreadNotifs > 0 ? ` (${unreadNotifs})` : '') },
    { href: '/logs', icon: 'scrollText', label: 'Auditoría' },
  ]

  let items = isCoach ? coachItems : navItems.filter(i => i.show)
  const currentHash = location.hash.slice(1)

  const itemsHtml = items.map(item => {
    const active = currentHash.startsWith(item.href) ? `bg-zinc-800 text-white border-l-2` : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
    return `
      <a href="#${escapeHtml(item.href)}"
         class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active}"
         style="${currentHash.startsWith(item.href) ? `border-color:${accent}` : ''}">
        ${Icon(item.icon, 18)}
        <span>${escapeHtml(item.label)}</span>
      </a>`
  }).join('')

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
        <button id="settings-btn"
           class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white">
          ${Icon('settings', 14)} Personalizar
        </button>
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

  // Settings modal
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    const profile = store.get<any>('profile')
    const currentColor = profile?.role_color || '#8B5CF6'
    const existing = document.getElementById('settings-modal')
    if (existing) { existing.classList.toggle('hidden'); return }
    const html = `
      <div id="settings-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="glass max-w-md w-full mx-4 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-heading text-lg font-bold text-white">Personalizar</h3>
            <button onclick="this.closest('#settings-modal').classList.add('hidden')" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1">Color de acento</label>
              <div class="flex gap-2 items-center">
                <input type="color" id="pick-accent" value="${currentColor}" class="h-10 w-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer" />
                <input type="text" id="pick-accent-hex" value="${currentColor}" maxlength="7" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)] font-mono" />
              </div>
              <div class="flex gap-1.5 mt-2">
                ${['#8B5CF6','#6D28D9','#EC4899','#EF4444','#F59E0B','#10B981','#3B82F6','#06B6D4','#14B8A6','#F97316'].map(c =>
                  `<button class="preset-color w-7 h-7 rounded-full border-2 transition hover:scale-110 ${c === currentColor ? 'border-white scale-110' : 'border-transparent'}" style="background:${c}" data-color="${c}"></button>`
                ).join('')}
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-zinc-400 mb-1">Fondo personalizado</label>
              <input type="file" id="pick-bg" accept="image/*" class="w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-white" />
              <p class="mt-1 text-[10px] text-zinc-600">Recomendado: 1920x1080, max 2MB</p>
            </div>
            <div>
              <button id="remove-bg-btn" class="text-xs text-zinc-500 hover:text-white underline">Quitar fondo personalizado</button>
            </div>
            <p id="settings-error" class="hidden text-xs text-red-400"></p>
            <button id="save-settings" class="btn-glow w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition" style="background:var(--accent, #8B5CF6)">Guardar cambios</button>
          </div>
        </div>
      </div>`
    document.body.insertAdjacentHTML('beforeend', html)

    // Color presets
    document.querySelectorAll('.preset-color').forEach(b => {
      b.addEventListener('click', () => {
        const c = (b as HTMLElement).dataset.color || '#8B5CF6'
        ;(document.getElementById('pick-accent') as HTMLInputElement).value = c
        ;(document.getElementById('pick-accent-hex') as HTMLInputElement).value = c
        document.querySelectorAll('.preset-color').forEach(p => p.classList.remove('border-white', 'scale-110'))
        b.classList.add('border-white', 'scale-110')
      })
    })
    // Hex input sync
    document.getElementById('pick-accent-hex')?.addEventListener('input', function(this: HTMLInputElement) {
      if (/^#[0-9a-fA-F]{6}$/.test(this.value)) {
        (document.getElementById('pick-accent') as HTMLInputElement).value = this.value
      }
    })
    document.getElementById('pick-accent')?.addEventListener('input', function(this: HTMLInputElement) {
      (document.getElementById('pick-accent-hex') as HTMLInputElement).value = this.value
    })

    document.getElementById('save-settings')?.addEventListener('click', async () => {
      const err = document.getElementById('settings-error')!
      err.classList.add('hidden')
      const color = (document.getElementById('pick-accent-hex') as HTMLInputElement)?.value?.trim()
      if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        err.textContent = 'Color inválido (usa formato #RRGGBB)'; err.classList.remove('hidden'); return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      // Upload background if selected
      const bgInput = document.getElementById('pick-bg') as HTMLInputElement
      let bgUrl: string | null = null
      if (bgInput?.files?.[0]) {
        bgUrl = await uploadFileFromInput('uploads', session.user.id, 'backgrounds', bgInput.files[0])
      }

      const update: any = { role_color: color }
      if (bgUrl) update.custom_bg_url = bgUrl

      const { error } = await supabase.from('profiles').update(update).eq('id', session.user.id)
      if (error) { err.textContent = error.message; err.classList.remove('hidden'); return }
      toast('success', 'Preferencias guardadas')
      document.getElementById('settings-modal')?.classList.add('hidden')
      setTimeout(() => location.reload(), 300)
    })

    document.getElementById('remove-bg-btn')?.addEventListener('click', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return
      await supabase.from('profiles').update({ custom_bg_url: null }).eq('id', session.user.id)
      toast('success', 'Fondo eliminado')
      document.getElementById('settings-modal')?.classList.add('hidden')
      setTimeout(() => location.reload(), 300)
    })
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
