import { supabase } from '@/304244'
import { router } from '@/f3395c'
import { authGuard, getProfile } from '@/fa53b9/fa53b9'
import { initToastContainer } from '@/4725dc/4f2900'
import { FullPageSpinner } from '@/4725dc/a14fa2'

import '@/bc4150/0c54ed.css'

import { renderLogin, mountLogin } from '@/fa53b9/d56b69'
import { renderRegister, mountRegister } from '@/fa53b9/9de4a9'
import { renderResetPassword, mountResetPassword } from '@/fa53b9/037c60'
import { renderHome, mountHome } from '@/b3b32a/106a6c'
import { renderPublicProfile, initPublicProfile } from '@/b3b32a/9e81e7/90b027'
import { renderNotFound } from '@/b3b32a/9e81e7/803f10'

import { renderCoachDashboard, initCoachDashboard } from '@/b3b32a/8abf18/4866e3'
import { renderCoachCourses, mountCoachCourses } from '@/b3b32a/8abf18/0dfcce'
import { renderCoachCourseDetail, mountCoachCourseDetail } from '@/b3b32a/8abf18/ec35bd'
import { renderCoachNewCourse, initCoachNewCourse } from '@/b3b32a/8abf18/d74f85'
import { renderCoachProfile, initCoachProfile } from '@/b3b32a/8abf18/7d9748'
import { renderCoachStudents, mountCoachStudents } from '@/b3b32a/8abf18/75d37c'
import { renderCoachTasks, initCoachTasks } from '@/b3b32a/8abf18/2cb1ad'
import { renderCoachSchedules, initCoachSchedules } from '@/b3b32a/8abf18/70ec15'
import { renderCoachSeasons, initCoachSeasons } from '@/b3b32a/8abf18/85ed15'
import { renderCoachStudentDetail, mountCoachStudentDetail } from '@/b3b32a/8abf18/b60dbf'
import { renderCoachTeams, initCoachTeams } from '@/b3b32a/8abf18/8fd6f4'
import { renderCoachScrims, initCoachScrims } from '@/b3b32a/8abf18/634637'
import { renderCoachAttendance, initCoachAttendance } from '@/b3b32a/8abf18/64c62c'
import { renderCoachPromotions, initCoachPromotions } from '@/b3b32a/8abf18/ea6aeb'
import { renderCoachPlayers, initCoachPlayers } from '@/b3b32a/8abf18/a2bbab'
import { renderCoachQuestions, initCoachQuestions } from '@/b3b32a/8abf18/478669'
import { renderCoachEditCourse, initCoachEditCourse } from '@/b3b32a/8abf18/e2b7c4'
import { renderCoachExams, initCoachExams } from '@/b3b32a/8abf18/a9f8d1'
import { renderCoachGrades, initCoachGrades } from '@/b3b32a/8abf18/c5e3f2'
import { renderCoachNewModule, initCoachNewModule } from '@/b3b32a/8abf18/b7d4a6'
import { renderCoachModuleDetail, initCoachModuleDetail } from '@/b3b32a/8abf18/201980'
import { renderCoachNewTask, initCoachNewTask } from '@/b3b32a/8abf18/cdc0b9'
import { renderCoachTaskDetail, initCoachTaskDetail } from '@/b3b32a/8abf18/2f2d16'
import { renderCoachQuestionDetail, initCoachQuestionDetail } from '@/b3b32a/8abf18/2784c7'

import { renderStudentDashboard, initStudentDashboard } from '@/b3b32a/75d37c/4866e3'
import { renderStudentCourses, initStudentCourses } from '@/b3b32a/75d37c/0dfcce'
import { renderStudentProfile, initStudentProfile } from '@/b3b32a/75d37c/7d9748'
import { renderStudentTasks, initStudentTasks } from '@/b3b32a/75d37c/2cb1ad'
import { renderStudentTaskDetail, initStudentTaskDetail } from '@/b3b32a/75d37c/2f2d16'
import { renderStudentGrades, initStudentGrades } from '@/b3b32a/75d37c/fce448'
import { renderStudentSchedule, initStudentSchedule } from '@/b3b32a/75d37c/799855'
import { renderStudentCourseDetail, initStudentCourseDetail } from '@/b3b32a/75d37c/ec35bd'
import { renderStudentExamList, initStudentExamList } from '@/b3b32a/75d37c/e1760f'
import { renderStudentExamTake, initStudentExamTake } from '@/b3b32a/75d37c/916e16'

import { renderPlayerDashboard, initPlayerDashboard } from '@/b3b32a/a2bbab/4866e3'
import { renderPlayerProfile, initPlayerProfile } from '@/b3b32a/a2bbab/7d9748'
import { renderPlayerSchedule, initPlayerSchedule } from '@/b3b32a/a2bbab/799855'
import { renderPlayerTaskDetail, initPlayerTaskDetail } from '@/b3b32a/a2bbab/f8c5e7'
import { renderPlayerCourseDetail, initPlayerCourseDetail } from '@/b3b32a/a2bbab/a3b2c1'
import { renderPlayerTasks, initPlayerTasks } from '@/b3b32a/a2bbab/e8f6c1'
import { renderPlayerCourses, initPlayerCourses } from '@/b3b32a/a2bbab/d1e5f3'
import { renderPlayerScrims, initPlayerScrims } from '@/b3b32a/a2bbab/634637'
import { renderPlayerTeam, initPlayerTeam } from '@/b3b32a/a2bbab/f89442'

import { renderPayments, initPayments } from '@/b3b32a/9e81e7/e639e9'
import { renderNotifications, initNotifications } from '@/b3b32a/9e81e7/f37bd2'
import { renderChat, initChat } from '@/b3b32a/9e81e7/a7b8c9'
import { renderTickets, initTickets } from '@/b3b32a/9e81e7/d2e1a4'
import { renderNewTicket, initNewTicket } from '@/b3b32a/9e81e7/f4b5c6'
import { renderLogs, initLogs } from '@/b3b32a/9e81e7/2165e4'

router.setBeforeNavigate(async () => authGuard())

// Public routes
router.on('/', async () => {
  document.getElementById('app')!.innerHTML = renderHome()
  mountHome()
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
  document.getElementById('app')!.innerHTML = renderPublicProfile()
  initPublicProfile()
})

// Dashboard render helper
function dash(path: string, renderFn: () => string, initFn?: (() => Promise<void>) | (() => void)): void {
  router.on(path, async () => {
    const app = document.getElementById('app')!
    app.innerHTML = FullPageSpinner()
    try {
      await getProfile()
      const { DashboardLayout, initSidebar } = await import('@/34d59f/dc7161')
      app.innerHTML = DashboardLayout(renderFn())
      initToastContainer()
      initSidebar()
      if (initFn) await initFn()
    } catch (err) {
      console.error('Error rendering dashboard:', err)
      app.innerHTML = `<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <p class="text-red-400 text-sm">Error al cargar la página</p>
        <button onclick="location.reload()" class="mt-4 text-xs text-zinc-500 hover:text-white underline">Reintentar</button>
      </div>`
    }
  })
}

// Coach routes
dash('/coaches/dashboard', () => renderCoachDashboard(), initCoachDashboard)
dash('/coaches/courses', () => renderCoachCourses(), mountCoachCourses)
dash('/coaches/courses/new', () => renderCoachNewCourse(), initCoachNewCourse)
dash('/coaches/courses/:id', () => renderCoachCourseDetail(), mountCoachCourseDetail)
dash('/coaches/courses/:id/edit', () => renderCoachEditCourse(), initCoachEditCourse)
dash('/coaches/courses/:id/exams', () => renderCoachExams(), initCoachExams)
dash('/coaches/courses/:id/attendance', () => renderCoachAttendance(), initCoachAttendance)
dash('/coaches/courses/:id/grades', () => renderCoachGrades(), initCoachGrades)
dash('/coaches/courses/:id/modules/new', () => renderCoachNewModule(), initCoachNewModule)
dash('/coaches/courses/:id/modules/:mid', () => renderCoachModuleDetail(), initCoachModuleDetail)
dash('/coaches/profile', () => renderCoachProfile(), initCoachProfile)
dash('/coaches/students', () => renderCoachStudents(), mountCoachStudents)
dash('/coaches/students/:id', () => renderCoachStudentDetail(), mountCoachStudentDetail)
dash('/coaches/tasks', () => renderCoachTasks(), initCoachTasks)
dash('/coaches/tasks/new', () => renderCoachNewTask(), initCoachNewTask)
dash('/coaches/tasks/:id', () => renderCoachTaskDetail(), initCoachTaskDetail)
dash('/coaches/schedules', () => renderCoachSchedules(), initCoachSchedules)
dash('/coaches/seasons', () => renderCoachSeasons(), initCoachSeasons)
dash('/coaches/teams', () => renderCoachTeams(), initCoachTeams)
dash('/coaches/scrims', () => renderCoachScrims(), initCoachScrims)
dash('/coaches/promotions', () => renderCoachPromotions(), initCoachPromotions)
dash('/coaches/players', () => renderCoachPlayers(), initCoachPlayers)
dash('/coaches/questions', () => renderCoachQuestions(), initCoachQuestions)
dash('/coaches/questions/:id', () => renderCoachQuestionDetail(), initCoachQuestionDetail)

// Student routes
dash('/students/dashboard', () => renderStudentDashboard(), initStudentDashboard)
dash('/students/profile', () => renderStudentProfile(), initStudentProfile)
dash('/students/courses', () => renderStudentCourses(), initStudentCourses)
dash('/students/courses/:id', () => renderStudentCourseDetail(), initStudentCourseDetail)
dash('/students/courses/:id/exams', () => renderStudentExamList(), initStudentExamList)
dash('/students/courses/:id/exams/:examId', () => renderStudentExamTake(), initStudentExamTake)
dash('/students/tasks', () => renderStudentTasks(), initStudentTasks)
dash('/students/tasks/:id', () => renderStudentTaskDetail(), initStudentTaskDetail)
dash('/students/grades', () => renderStudentGrades(), initStudentGrades)
dash('/students/schedule', () => renderStudentSchedule(), initStudentSchedule)
// Player routes
dash('/players/dashboard', () => renderPlayerDashboard(), initPlayerDashboard)
dash('/players/profile', () => renderPlayerProfile(), initPlayerProfile)
dash('/players/tasks', () => renderPlayerTasks(), initPlayerTasks)
dash('/players/tasks/:id', () => renderPlayerTaskDetail(), initPlayerTaskDetail)
dash('/players/courses', () => renderPlayerCourses(), initPlayerCourses)
dash('/players/courses/:id', () => renderPlayerCourseDetail(), initPlayerCourseDetail)
dash('/players/schedule', () => renderPlayerSchedule(), initPlayerSchedule)
dash('/players/scrims', () => renderPlayerScrims(), initPlayerScrims)
dash('/players/team', () => renderPlayerTeam(), initPlayerTeam)

// Shared routes
dash('/payments', () => renderPayments(), initPayments)
dash('/notifications', () => renderNotifications(), initNotifications)
dash('/chat', () => renderChat(), initChat)
dash('/support', () => renderTickets(), initTickets)
dash('/support/new', () => renderNewTicket(), initNewTicket)
dash('/support/:id', () => renderTickets(), initTickets)
dash('/logs', () => renderLogs(), initLogs)

// 404
router.fallbackRoute(async () => {
  document.getElementById('app')!.innerHTML = renderNotFound()
})

// Init
document.addEventListener('DOMContentLoaded', () => {
  initToastContainer()
  router.start()

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      // Real-time notification toast
      const notifChannel = supabase.channel('notif-toast')
      notifChannel.on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${session.user.id}` },
        (payload: any) => {
          const n = payload.new
          if (n && (window as any).__toast) {
            const typeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
              task: 'info', evaluation: 'info', schedule: 'info',
              payment: 'success', scrim: 'warning', system: 'info',
              message: 'info', grade: 'success', promotion: 'success',
            }
            const iconMap: Record<string, string> = {
              task: 'clipboardList', evaluation: 'target', schedule: 'calendar',
              payment: 'dollarSign', scrim: 'sword', system: 'bell',
              message: 'mail', grade: 'scrollText', promotion: 'trophy',
            }
            ;(window as any).__toast(typeMap[n.type] || 'info', n.title || 'Nueva notificación')
            // Update sidebar badge
            const notifLinks = document.querySelectorAll('a[href="#/notifications"]')
            notifLinks.forEach((a) => {
              const span = a.querySelector('span')
              if (span) {
                const match = span.textContent?.match(/\((\d+)\)/)
                const current = match ? parseInt(match[1]) : 0
                span.textContent = 'Notificaciones (' + (current + 1) + ')'
              }
            })
            ;(window as any).__unreadNotifs = ((window as any).__unreadNotifs || 0) + 1
          }
        }
      ).subscribe()

      // Store toast reference for real-time notifications
      if (!(window as any).__toast) {
        import('@/4725dc/4f2900').then((m) => { (window as any).__toast = m.toast })
      }
    }

    if (session && (!location.hash || location.hash === '#' || location.hash === '#/')) {
      getProfile().then((profile) => {
        if (profile) {
          const prefix = profile.role === 'coach' ? 'coaches' : profile.role === 'student' ? 'students' : 'players'
          location.hash = `/${prefix}/dashboard`
        }
      })
    }
  })
})
