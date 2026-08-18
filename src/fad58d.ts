import { supabase } from '@/304244'
import { router } from '@/f3395c'
import { authGuard, getProfile, isDesktopApp } from '@/fa53b9/fa53b9'
import { initToastContainer } from '@/4725dc/4f2900'
import { showLoadingOverlay, removeLoadingOverlay } from '@/4725dc/a14fa2'
import { store } from '@/9ed39e/8cd892'
import { initAutoSave } from '@/4725dc/forms/DraftManager'
import { initDeviceNotifications, notifyDevice } from '@/4725dc/device_notifications'
import { initNotificationCenter } from '@/4725dc/notification_center'
import { initUiGlobals } from '@/4725dc/ui_kit'
import { initResponsiveTables } from '@/2b3583/responsive_tables'
import { dueTs, expiresTs } from '@/2b3583/paydates'

import '@/bc4150/0c54ed.css'

import { renderLogin, mountLogin } from '@/fa53b9/d56b69'
import { renderRegister, mountRegister } from '@/fa53b9/9de4a9'
import { renderResetPassword, mountResetPassword } from '@/fa53b9/037c60'
import { renderHome, mountHome } from '@/b3b32a/106a6c'
import { renderAbout, mountAbout } from '@/b3b32a/9e81e7/about'
import { renderPublicProfile, initPublicProfile } from '@/b3b32a/9e81e7/90b027'
import { renderNotFound } from '@/b3b32a/9e81e7/803f10'

// Los dashboards se cargan de forma perezosa (code-split) para que la web
// pública no descargue el código de la plataforma. Ver dashLazy() más abajo.

router.setBeforeNavigate(async (path) => authGuard(path))

// Public routes
router.on('/', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (isDesktopApp()) {
    if (!session) {
      location.hash = '/login'
      return
    }
    const profile = await getProfile()
    location.hash = profile?.role === 'coach' ? '/coaches/dashboard' : '/students/dashboard'
    return
  }
  document.getElementById('app')!.innerHTML = renderHome(session)
  mountHome()
})

router.on('/about', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (isDesktopApp()) {
    if (!session) {
      location.hash = '/login'
      return
    }
    const profile = await getProfile()
    location.hash = profile?.role === 'coach' ? '/coaches/dashboard' : '/students/dashboard'
    return
  }
  document.getElementById('app')!.innerHTML = renderAbout(session)
  mountAbout()
})

router.on('/login', async () => {
  document.getElementById('app')!.innerHTML = renderLogin()
  mountLogin()
})

router.on('/register', async () => {
  document.getElementById('app')!.innerHTML = renderRegister()
  mountRegister()
})

router.on('/reset-password', async () => {
  document.getElementById('app')!.innerHTML = renderResetPassword()
  mountResetPassword()
})

router.on('/p/:slug', async () => {
  if (isDesktopApp()) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      location.hash = '/login'
      return
    }
    const profile = await getProfile()
    location.hash = profile?.role === 'coach' ? '/coaches/dashboard' : '/students/dashboard'
    return
  }
  document.getElementById('app')!.innerHTML = renderPublicProfile()
  initPublicProfile()
})

// Tables that affect the current page — grouped by route prefix
const REALTIME_TABLES: Record<string, string[]> = {
  coaches: [
    'courses', 'enrollments', 'schedules',
    'teams', 'profiles', 'payments', 'tasks', 'exams', 'call_rooms', 'call_sessions', 'call_room_participants',
  ],
  students: [
    'courses', 'enrollments', 'schedules', 'payments', 'profiles',
    'teams', 'team_members', 'tasks', 'exams', 'call_rooms', 'call_sessions', 'call_room_participants',
  ],

}

const NO_AUTO_REFRESH_PATTERNS = ['/new', '/edit', '/settings']

function shouldAutoRefresh(path: string): boolean {
  if (NO_AUTO_REFRESH_PATTERNS.some(p => path.includes(p))) return false
  return true
}

// Debounced reload of the current route (soft re-render, no full page reload)
function reloadSoon(path: string): void {
  if ((window as any).__blockReload) return
  const key = `_rt_${path}`
  if ((window as any)[key]) return
  ;(window as any)[key] = true
  setTimeout(() => { (window as any)[key] = false }, 3000)
  setTimeout(() => {
    const current = (location.hash.slice(1).split('?')[0]) || '/'
    if (current !== path) return
    try {
      void router.resolve()
    } catch {
      location.reload()
    }
  }, 120)
}

function notifyRealtime(table: string, payload: any, path: string): void {
  if (table === 'profiles' || payload?.eventType === 'DELETE') return
  const role = store.get<any>('profile')?.role
  const isCoach = role === 'coach'
  const destinations: Record<string, string> = {
    courses: isCoach ? '#/coaches/courses' : '#/students/courses',
    tasks: isCoach ? '#/coaches/tasks' : '#/students/tasks',
    exams: isCoach ? '#/coaches/exams' : '#/students/exams',
schedules: isCoach ? '#/coaches/schedules' : '#/students/schedule',
    payments: '#/payments',
    call_rooms: '#/calls',
    call_sessions: '#/calls',
    teams: isCoach ? '#/coaches/teams' : '#/students/team',
    team_members: '#/students/team',
    enrollments: isCoach ? '#/coaches/students' : '#/students/courses',
  }
  const messages: Record<string, string> = {
    courses: 'Hay una actualización en tus cursos.',
    tasks: 'Tienes una actualización en tus tareas.',
    exams: 'Hay una novedad en tus exámenes.',
schedules: 'Tu horario tiene una nueva actualización.',
    payments: 'Tu estado de pagos tiene una actualización.',
    call_rooms: 'Hay una nueva llamada agendada.',
    call_sessions: 'Hay una nueva llamada agendada.',
    teams: 'Tu equipo tiene una nueva actualización.',
    team_members: 'Tu equipo tiene una nueva actualización.',
    enrollments: 'Tu inscripción tiene una nueva actualización.',
  }
  const body = messages[table]
  if (body) void notifyDevice('QU4SAR Academy', body, destinations[table] || path)
}

// Dashboard render helper with lazy loading
type DashRender = () => string
type DashInit = (() => Promise<void>) | (() => void)
type DashLoader = () => Promise<{ render: DashRender; init?: DashInit }>

// Helper: resolves a dynamic import module and returns render/init from named exports
function dashLazy<T extends Record<string, any>>(
  spec: () => Promise<T>,
  renderKey: string,
  initKey?: string
): DashLoader {
  return async () => {
    const mod = await spec()
    return {
      render: mod[renderKey] as DashRender,
      init: initKey ? (mod[initKey] as DashInit) : undefined,
    }
  }
}

function dash(path: string, loader: DashLoader): void {
  router.on(path, async () => {
    const app = document.getElementById('app')!
    showLoadingOverlay()

    // Clean up previous realtime channel and intervals
    if ((window as any).__rtChannel) {
      supabase.removeChannel((window as any).__rtChannel)
      ;(window as any).__rtChannel = null
    }
    // Clear any previous intervals
    ;['__intvCountdown', '__intvSidebar'].forEach(k => {
      if ((window as any)[k]) { clearInterval((window as any)[k]); (window as any)[k] = null }
    })

    try {
      await Promise.race([
        getProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout al cargar perfil')), 15000)),
      ])
      const profile = store.get<any>('profile')

      if (profile && profile.role !== 'coach') {
        const now = Date.now()
        const { data: pays } = await supabase
          .from('payments')
          .select('id, status, paid_at, due_at, expires_at')
          .eq('profile_id', profile.id)
        for (const p of pays ?? []) {
          const due = dueTs(p)
          const exp = expiresTs(p)
          if (p.status === 'paid' && due !== null && now >= due) {
            await supabase.from('payments').update({ status: 'pending', paid_at: null }).eq('id', p.id)
          }
          if (p.status === 'pending' && exp !== null && now >= exp) {
            await supabase.from('payments').update({ status: 'expired' }).eq('id', p.id)
          }
        }
      }
      let isExpired = false
      if (profile && profile.role !== 'coach') {
        const { data: expiredPay } = await supabase
          .from('payments')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('status', 'expired')
          .limit(1)
          .maybeSingle()
        isExpired = !!expiredPay
      }
      ;(window as any).__isExpired = isExpired
      if (isExpired && path !== '/payments') {
        removeLoadingOverlay()
        router.navigate('/payments')
        return
      }
      const { DashboardLayout, initSidebar } = await import('@/34d59f/dc7161')
      const mod = await loader()
      const renderFn = mod.render
      const initFn = mod.init
      app.innerHTML = DashboardLayout(renderFn())
      initToastContainer()
      initSidebar()
      await initDeviceNotifications()
      await initNotificationCenter()
      if (initFn) await initFn()

      initAutoSave()

      if (shouldAutoRefresh(path) && initFn) {
        try {
          if ((window as any).__rtChannel) {
            supabase.removeChannel((window as any).__rtChannel)
          }
          const ch = supabase.channel(`rt-${path.replace(/[^a-z0-9]/g, '-')}`)
          const tables = REALTIME_TABLES[store.get<any>('profile')?.role || 'coach'] || REALTIME_TABLES.coaches
            for (const table of tables) {
              ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                notifyRealtime(table, payload, path)
                reloadSoon(path)
              })
            }
          ch.subscribe()
          ;(window as any).__rtChannel = ch
        } catch (e) {
          console.warn('Realtime not available:', e)
        }
      }
    } catch (err) {
      console.error('Error rendering dashboard:', err)
      app.innerHTML = `<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <p class="text-red-400 text-sm">Error al cargar la página</p>
        <button onclick="location.reload()" class="mt-4 text-xs text-zinc-500 hover:text-white underline">Reintentar</button>
      </div>`
    } finally {
      removeLoadingOverlay()
    }
  })
}

// Coach routes
dash('/coaches/dashboard', dashLazy(() => import('@/b3b32a/8abf18/4866e3'), 'renderCoachDashboard', 'initCoachDashboard'))
dash('/coaches/courses', dashLazy(() => import('@/b3b32a/8abf18/0dfcce'), 'renderCoachCourses', 'mountCoachCourses'))
dash('/coaches/courses/new', dashLazy(() => import('@/b3b32a/8abf18/d74f85'), 'renderCoachNewCourse', 'initCoachNewCourse'))
dash('/coaches/courses/:id', dashLazy(() => import('@/b3b32a/8abf18/ec35bd'), 'renderCoachCourseDetail', 'mountCoachCourseDetail'))
dash('/coaches/courses/:id/edit', dashLazy(() => import('@/b3b32a/8abf18/e2b7c4'), 'renderCoachEditCourse', 'initCoachEditCourse'))

dash('/coaches/profile', dashLazy(() => import('@/b3b32a/8abf18/7d9748'), 'renderCoachProfile', 'initCoachProfile'))
dash('/coaches/students', dashLazy(() => import('@/b3b32a/8abf18/75d37c'), 'renderCoachStudents', 'mountCoachStudents'))
dash('/coaches/students/:id', dashLazy(() => import('@/b3b32a/8abf18/b60dbf'), 'renderCoachStudentDetail', 'mountCoachStudentDetail'))

dash('/coaches/schedules', dashLazy(() => import('@/b3b32a/8abf18/70ec15'), 'renderCoachSchedules', 'initCoachSchedules'))
dash('/coaches/teams', dashLazy(() => import('@/b3b32a/8abf18/8fd6f4'), 'renderCoachTeams', 'initCoachTeams'))
dash('/coaches/codes', dashLazy(() => import('@/b3b32a/8abf18/codes'), 'renderCoachCodes', 'initCoachCodes'))
dash('/coaches/assignments', dashLazy(() => import('@/b3b32a/8abf18/assignments'), 'renderCoachAssignments', 'initCoachAssignments'))
dash('/coaches/grades', dashLazy(() => import('@/b3b32a/8abf18/grades'), 'renderCoachGrades', 'initCoachGrades'))
dash('/coaches/tasks', dashLazy(() => import('@/b3b32a/8abf18/tasks'), 'renderCoachTasks', 'initCoachTasks'))
dash('/coaches/enroll', dashLazy(() => import('@/b3b32a/8abf18/enroll'), 'renderCoachEnroll', 'initCoachEnroll'))
dash('/coaches/exams', dashLazy(() => import('@/b3b32a/8abf18/exams'), 'renderCoachExams', 'initCoachExams'))
dash('/coaches/exams/:id', dashLazy(() => import('@/b3b32a/8abf18/exams'), 'renderCoachExams', 'initCoachExams'))
dash('/coaches/practical', dashLazy(() => import('@/b3b32a/8abf18/practical'), 'renderCoachPractical', 'initCoachPractical'))
dash('/coaches/notes', dashLazy(() => import('@/b3b32a/8abf18/notes'), 'renderCoachNotes', 'initCoachNotes'))




// Student routes
dash('/students/dashboard', dashLazy(() => import('@/b3b32a/75d37c/4866e3'), 'renderStudentDashboard', 'initStudentDashboard'))
dash('/students/profile', dashLazy(() => import('@/b3b32a/75d37c/7d9748'), 'renderStudentProfile', 'initStudentProfile'))
dash('/students/courses', dashLazy(() => import('@/b3b32a/75d37c/0dfcce'), 'renderStudentCourses', 'initStudentCourses'))
dash('/students/tasks', dashLazy(() => import('@/b3b32a/75d37c/tasks'), 'renderStudentTasks', 'initStudentTasks'))
dash('/students/courses/:id', dashLazy(() => import('@/b3b32a/75d37c/ec35bd'), 'renderStudentCourseDetail', 'initStudentCourseDetail'))
dash('/students/schedule', dashLazy(() => import('@/b3b32a/75d37c/799855'), 'renderStudentSchedule', 'initStudentSchedule'))
dash('/students/team', dashLazy(() => import('@/b3b32a/75d37c/f89442'), 'renderStudentTeam', 'initStudentTeam'))
dash('/students/coaches', dashLazy(() => import('@/b3b32a/75d37c/coaches'), 'renderStudentCoaches', 'initStudentCoaches'))
dash('/students/exams', dashLazy(() => import('@/b3b32a/75d37c/exams'), 'renderStudentExamList', 'initStudentExamList'))
dash('/students/exams/:id', dashLazy(() => import('@/b3b32a/75d37c/exams'), 'renderStudentExamDetail', 'initStudentExamDetail'))
dash('/students/grades', dashLazy(() => import('@/b3b32a/75d37c/grades'), 'renderStudentGrades', 'initStudentGrades'))
// Player routes



// Shared routes
dash('/payments', dashLazy(() => import('@/b3b32a/9e81e7/e639e9'), 'renderPayments', 'initPayments'))
dash('/settings', dashLazy(() => import('@/b3b32a/9e81e7/e5d4c3'), 'renderSettings', 'initSettings'))
dash('/members', dashLazy(() => import('@/b3b32a/9e81e7/members'), 'renderMembers', 'initMembers'))
dash('/chat', dashLazy(() => import('@/b3b32a/chat'), 'renderChat', 'initChat'))
dash('/calls', dashLazy(() => import('@/b3b32a/calls'), 'renderCalls', 'initCalls'))

// 404
router.fallbackRoute(async () => {
  const hash = location.hash
  if (/type=recovery|access_token|refresh_token/.test(hash)) {
    const bare = hash.replace(/^#?\/?/, '')
    location.hash = `#/reset-password#${bare}`
    return
  }
  document.getElementById('app')!.innerHTML = renderNotFound()
})

// Init
document.addEventListener('DOMContentLoaded', () => {
  initToastContainer()
  initUiGlobals()
  initResponsiveTables()
  router.start()

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {

    }

    if (session && (!location.hash || location.hash === '#' || location.hash === '#/')) {
      getProfile().then((profile) => {
        if (profile) {
          const prefix = profile.role === 'coach' ? 'coaches' : 'students'
          location.hash = `/${prefix}/dashboard`
        }
      }).catch(() => {})
    }
  }).catch(() => {})
})
