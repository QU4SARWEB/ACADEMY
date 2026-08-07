import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { getAssignedCourseIds } from '@/2b3583/assignments'
import { EmptyState } from '@/4725dc/ui_kit'

export function renderCoachDashboard(): string {
  return `<div id="page-content">
    <div class="mb-6">${LoadingSkeleton('list', 1)}</div>
    <div class="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">${LoadingSkeleton('card', 6)}</div>
    <div class="grid gap-6 lg:grid-cols-2">
      <div>${LoadingSkeleton('card', 4)}</div>
      <div>${LoadingSkeleton('card', 1)}</div>
    </div>
  </div>`
}

export async function initCoachDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [{ data: profile }, assignedIds] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle(),
      getAssignedCourseIds(session.user.id),
    ])

    // Nota: se desactivó delete_expired_users (borraba cuentas de alumnos
    // con pagos vencidos, incluidos alumnos activos). Con el sistema mensual
    // los pagos pasan a pending/expired pero la cuenta se conserva.

    // Build enrollment-based filter for assigned courses
    let assignedEnrollIds: string[] | undefined
    let assignedProfileIds: string[] | undefined
    if (assignedIds.length > 0) {
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('id, profile_id')
        .in('course_id', assignedIds)
      assignedEnrollIds = [...new Set((enrollData ?? []).map((e: any) => e.id))]
      assignedProfileIds = [...new Set((enrollData ?? []).map((e: any) => e.profile_id))]
    }

    // KPIs
    let studentKpiQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true)
    let courseKpiQuery = supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true)
    if (assignedProfileIds) {
      studentKpiQuery = studentKpiQuery.in('id', assignedProfileIds)
    }
    if (assignedIds.length > 0) {
      courseKpiQuery = courseKpiQuery.in('id', assignedIds)
    }

    const [{ count: studentsCount }, { count: coursesCount }] = await Promise.all([
      studentKpiQuery,
      courseKpiQuery,
    ])


    // Payments about to expire (pending older than 4 days = within 3 days of 7-day expiry)
    const EXPIRE_MS = 2 * 24 * 60 * 60 * 1000
    const SOON_MS = 24 * 60 * 60 * 1000
    const now = Date.now()

    let pendingPaymentsQuery = supabase
      .from('payments')
      .select('id, created_at, amount, enrollment_id, profiles!inner(full_name, display_name, email, id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (assignedEnrollIds) {
      const filt = assignedEnrollIds.length > 0 ? assignedEnrollIds : ['00000000-0000-0000-0000-000000000000']
      pendingPaymentsQuery = pendingPaymentsQuery.in('enrollment_id', filt)
    }

    const { data: pendingPayments } = await pendingPaymentsQuery

    // Fetch course names for pending payments
    const pendEnrollIds = [...new Set((pendingPayments ?? []).map((p: any) => p.enrollment_id).filter(Boolean))]
    const { data: pendEnrollData } = pendEnrollIds.length > 0
      ? await supabase.from('enrollments').select('id, courses(name)').in('id', pendEnrollIds)
      : { data: [] }
    const courseByPendEnroll: Record<string, string> = {}
    for (const e of pendEnrollData ?? []) courseByPendEnroll[e.id] = (e as any).courses?.name || ''

    const expiringPayments = (pendingPayments ?? []).filter((p: any) =>
      p.created_at && (now - new Date(p.created_at).getTime()) > EXPIRE_MS - SOON_MS
    )
    const expiringCount = expiringPayments.length

    let pendingReviewsCount = 0
    let pendingExamsCount = 0
    let upcomingSchedulesCount = 0
    if (assignedIds.length > 0) {
      const { data: coachTasks } = await supabase.from('course_tasks').select('id').in('course_id', assignedIds)
      const taskIds = (coachTasks ?? []).map((task: any) => task.id).filter(Boolean)
      if (taskIds.length > 0) {
        const { count } = await supabase.from('task_submissions').select('id', { count: 'exact', head: true }).in('task_id', taskIds).is('score', 'null')
        pendingReviewsCount = count ?? 0
      }

      const { data: coachExams } = await supabase.from('exams').select('id').in('course_id', assignedIds).eq('published', true)
      const examIds = (coachExams ?? []).map((exam: any) => exam.id).filter(Boolean)
      if (examIds.length > 0) {
        const { count } = await supabase.from('exam_results').select('id', { count: 'exact', head: true }).in('exam_id', examIds).in('status', ['pending', 'review', 'in_review'])
        pendingExamsCount = count ?? 0
      }

      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase.from('schedules').select('id', { count: 'exact', head: true }).in('course_id', assignedIds).gte('schedule_date', today)
      upcomingSchedulesCount = count ?? 0
    }

    const kpiCards = [
      { icon: 'users', label: 'Alumnos activos', value: String(studentsCount ?? 0), color: '#8B5CF6' },


      { icon: 'bookOpen', label: 'Cursos activos', value: String(coursesCount ?? 0), color: '#7C3AED' },
      { icon: 'dollarSign', label: 'Pagos por vencer', value: String(expiringCount), color: '#F59E0B' },
    ]

    // Analítica: inscripciones por semana / mes / año
    let inscWeekTotal = 0, inscMonthTotal = 0, inscYearTotal = 0
    let weekChart = '', monthChart = '', yearChart = ''
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1)
      let encQ = supabase.from('enrollments').select('created_at').gte('created_at', startOfYear.toISOString())
      if (assignedIds.length > 0) encQ = encQ.in('course_id', assignedIds)
      const { data: yearEnrolls } = await encQ
      const list = yearEnrolls ?? []

      const dayKey = (d: Date) => d.toISOString().slice(0, 10)
      const weekDays: Date[] = []
      const monthDays: Date[] = []
      for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); weekDays.push(d) }
      for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); monthDays.push(d) }

      const weekBuckets: Record<string, number> = {}
      const monthBuckets: Record<string, number> = {}
      weekDays.forEach(d => { weekBuckets[dayKey(d)] = 0 })
      monthDays.forEach(d => { monthBuckets[dayKey(d)] = 0 })
      const yearKeys: string[] = []
      const yearBuckets: Record<string, number> = {}
      for (let m = 11; m >= 0; m--) {
        const d = new Date()
        d.setDate(1); d.setMonth(d.getMonth() - m)
        const key = d.toISOString().slice(0, 7)
        yearKeys.push(key); yearBuckets[key] = 0
      }

      const firstWeekDay = dayKey(weekDays[0])
      const firstMonthDay = dayKey(monthDays[0])
      for (const e of list) {
        const c = e.created_at || ''
        if (!c) continue
        const day = c.slice(0, 10)
        if (day >= firstWeekDay) inscWeekTotal++
        if (day >= firstMonthDay) inscMonthTotal++
        inscYearTotal++
        if (weekBuckets[day] !== undefined) weekBuckets[day]++
        if (monthBuckets[day] !== undefined) monthBuckets[day]++
        const mk = c.slice(0, 7)
        if (yearBuckets[mk] !== undefined) yearBuckets[mk]++
      }

      const chartHtml = (cells: { label: string; value: number }[]): string => {
        const max = Math.max(1, ...cells.map(c => c.value))
        return `<div class="flex h-36 items-end gap-1.5 mb-2">
          ${cells.map(c => `
            <div class="flex-1 flex flex-col items-center justify-end min-w-0" title="${escapeHtml(c.label)}: ${c.value}">
              <span class="mb-1 text-[10px] text-zinc-500">${c.value > 0 ? c.value : ''}</span>
              <div class="w-full rounded-t-md" style="height:${Math.max(4, Math.round((c.value / max) * 120))}px;background:linear-gradient(180deg,#22C55E,#16A34A);opacity:${c.value > 0 ? 1 : 0.12}"></div>
            </div>`).join('')}
        </div>`
      }
      const short = (d: Date) => d.toISOString().slice(5, 10).split('-').reverse().join('/')
      inscWeekTotal > 0 || Object.values(weekBuckets).join('')
      weekChart = chartHtml(weekDays.map(d => ({ label: short(d), value: weekBuckets[dayKey(d)] })))
      monthChart = chartHtml(monthDays.map(d => ({ label: short(d), value: monthBuckets[dayKey(d)] })))
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      yearChart = chartHtml(yearKeys.map(k => ({ label: monthNames[parseInt(k.slice(5, 7), 10) - 1], value: yearBuckets[k] || 0 })))
    } catch (e) {
      console.warn('Enrollment series unavailable:', e)
    }



    const userName = profile?.display_name || profile?.full_name || 'Coach'

    const html = `
      <!-- Encabezado -->
      <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="section-head mb-0">
          <span class="kicker">Panel de control · QU4SAR Analytics</span>
          <h1>Bienvenido, ${escapeHtml(userName)}</h1>
          <p>Resumen de tu academia y actividad reciente.</p>
        </div>
        <a href="#/coaches/enroll" class="btn btn-primary self-start md:self-auto">
          ${Icon('plus', 16)} Inscribir alumno
        </a>
      </div>

      <div class="coach-attention-grid mb-8">
        <a href="#/coaches/tasks" class="coach-attention-card coach-attention-card--urgent">
          <span class="coach-attention-card__icon">${Icon('clipboardList', 18)}</span>
          <span><small>Revisión pendiente</small><strong>${pendingReviewsCount}</strong><em>entregas por calificar</em></span>
          ${Icon('arrowRight', 16)}
        </a>
        <a href="#/coaches/exams" class="coach-attention-card">
          <span class="coach-attention-card__icon">${Icon('scrollText', 18)}</span>
          <span><small>Evaluación</small><strong>${pendingExamsCount}</strong><em>exámenes por revisar</em></span>
          ${Icon('arrowRight', 16)}
        </a>
        <a href="#/coaches/schedules" class="coach-attention-card">
          <span class="coach-attention-card__icon">${Icon('calendar', 18)}</span>
          <span><small>Agenda</small><strong>${upcomingSchedulesCount}</strong><em>actividades próximas</em></span>
          ${Icon('arrowRight', 16)}
        </a>
        <a href="#/payments" class="coach-attention-card">
          <span class="coach-attention-card__icon">${Icon('dollarSign', 18)}</span>
          <span><small>Seguimiento</small><strong>${expiringCount}</strong><em>pagos por vencer</em></span>
          ${Icon('arrowRight', 16)}
        </a>
      </div>

      <!-- KPIs -->
      <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        ${kpiCards.map((c, i) => `
          <div class="kpi-card reveal in" style="--i:${i}">
            <div class="flex items-center gap-4">
              <div class="kpi-icon" style="background: ${c.color}20">
                <span style="color: ${c.color}">${Icon(c.icon, 20)}</span>
              </div>
              <div class="min-w-0">
                <p class="kpi-value">${escapeHtml(c.value)}</p>
                <p class="kpi-label">${escapeHtml(c.label)}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Analítica de inscripciones -->
        <div class="card p-5">
          <div class="mb-3 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white flex items-center gap-2">
              ${Icon('users', 16)} Inscripciones
            </h2>
            <div id="insc-seg" class="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-1">
              <button type="button" data-w="week" class="insc-seg-btn rounded-md px-2.5 py-1 text-[11px] font-medium text-white transition"
                style="background:#8B5CF6;color:#fff">Semana</button>
              <button type="button" data-w="month" class="insc-seg-btn rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:text-white">Mes</button>
              <button type="button" data-w="year" class="insc-seg-btn rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:text-white">Año</button>
            </div>
          </div>

          <div id="insc-chart" class="${inscYearTotal === 0 ? 'hidden' : ''}">
            <div data-w="week" class="insc-panel">
              ${weekChart}
              <div class="flex justify-between text-[10px] text-zinc-600"><span>Últimos 7 días</span><span>Hoy</span></div>
            </div>
            <div data-w="month" class="insc-panel hidden">
              ${monthChart}
              <div class="flex justify-between text-[10px] text-zinc-600"><span>Últimos 30 días</span><span>Hoy</span></div>
            </div>
            <div data-w="year" class="insc-panel hidden">
              ${yearChart}
              <div class="flex justify-between text-[10px] text-zinc-600"><span>Últimos 12 meses</span><span>${new Date().getFullYear()}</span></div>
            </div>
          </div>
          ${inscYearTotal === 0 ? EmptyState({ icon: 'users', title: 'Sin inscripciones este año', hint: 'Cuando los alumnos se inscriban verás el resumen aquí.' }) : ''}

          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-3 py-2 text-center">
              <p class="text-lg font-bold text-white">${inscWeekTotal}</p>
              <p class="text-[10px] uppercase tracking-wider text-zinc-500">Esta semana</p>
            </div>
            <div class="rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-3 py-2 text-center">
              <p class="text-lg font-bold text-white">${inscMonthTotal}</p>
              <p class="text-[10px] uppercase tracking-wider text-zinc-500">Este mes</p>
            </div>
            <div class="rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-3 py-2 text-center">
              <p class="text-lg font-bold text-white">${inscYearTotal}</p>
              <p class="text-[10px] uppercase tracking-wider text-zinc-500">Este año</p>
            </div>
          </div>
        </div>

        <!-- Pagos pendientes -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white flex items-center gap-2">
              ${Icon('dollarSign', 16)} Pagos pendientes
            </h2>
            <span class="badge bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">${pendingPayments?.length ?? 0}</span>
            <a href="#/payments" class="ml-auto text-xs text-[#8B5CF6] hover:underline">Gestionar →</a>
          </div>
          ${pendingPayments && pendingPayments.length > 0 ? `
          <div class="space-y-2">
            ${pendingPayments.map((p: any) => {
              const prof = p.profiles || {}
              const name = prof.display_name || prof.full_name || prof.email || 'Desconocido'
              const courseName = courseByPendEnroll[p.enrollment_id] || ''
              const createdAt = p.created_at ? new Date(p.created_at).getTime() : 0
              const expiresAt = createdAt + EXPIRE_MS
              const remaining = expiresAt - now
              if (remaining <= 0) return ''
              const daysLeft = Math.floor(remaining / 86400000)
              const hoursLeft = Math.floor((remaining % 86400000) / 3600000)
              const minsLeft = Math.floor((remaining % 3600000) / 60000)
              const isUrgent = remaining < 86400000
              const isSoon = remaining < 172800000
              let timeText = ''
              if (daysLeft > 0) timeText += daysLeft + 'd '
              timeText += hoursLeft + 'h ' + minsLeft + 'm'
              return `
              <div class="flex items-center justify-between rounded-lg border ${isUrgent ? 'border-red-500/20 bg-red-500/5' : isSoon ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-zinc-700/30 bg-zinc-800/20'} px-3 py-2.5 text-sm">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                    ${escapeHtml((name.charAt(0) || '?').toUpperCase())}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate ${isUrgent ? 'text-red-300' : isSoon ? 'text-yellow-300' : 'text-zinc-300'}">${escapeHtml(name)}</p>
                    ${courseName ? `<p class="truncate text-xs text-zinc-500">${escapeHtml(courseName)}</p>` : ''}
                  </div>
                </div>
                <span class="shrink-0 text-xs font-mono ${isUrgent ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-zinc-400'}">${timeText}</span>
              </div>`
            }).filter(Boolean).join('')}
          </div>` : '<p class="text-sm text-zinc-500">No hay pagos pendientes. Todo al día.</p>'}
        </div>

        <!-- Alumnos recientes -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white flex items-center gap-2">
              ${Icon('clock', 16)} Alumnos recientes
            </h2>
            <a href="#/coaches/students" class="ml-auto text-xs text-[#8B5CF6] hover:underline">Ver todos →</a>
          </div>
          ${(() => {
            const raw = localStorage.getItem('recentStudents')
            const recent: { id: string; name: string; ts: number }[] = raw ? JSON.parse(raw) : []
            const sorted = recent.sort((a, b) => b.ts - a.ts).slice(0, 5)
            return sorted.length > 0 ? `
          <div class="flex flex-wrap gap-2">
            ${sorted.map(s => `
              <a href="#/coaches/students/${escapeHtml(s.id)}"
                 class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/30 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B5CF6]/15 text-[10px] font-bold text-[#8B5CF6]">${escapeHtml((s.name.charAt(0) || '?').toUpperCase())}</span>
                ${escapeHtml(s.name)}
              </a>
            `).join('')}
          </div>` : '<p class="text-sm text-zinc-500">Aún no has visitado perfiles de alumnos.</p>'
          })()}
        </div>
      </div>

      <!-- Acceso rápido -->
      <div class="mt-8">
        <div class="mb-4 flex items-center gap-2">
          <span class="kicker">Herramientas</span>
          <h2 class="font-heading text-base font-bold text-white">Accesos rápidos</h2>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          ${[
            { href: '#/coaches/students', icon: 'users', label: 'Estudiantes' },
            { href: '#/coaches/courses', icon: 'bookOpen', label: 'Cursos' },
            { href: '#/coaches/schedules', icon: 'calendar', label: 'Horarios' },
            { href: '#/coaches/exams', icon: 'scrollText', label: 'Exámenes' },
{ href: '#/coaches/grades', icon: 'clipboardList', label: 'Notas' },
            { href: '#/coaches/tasks', icon: 'clipboardList', label: 'Tareas' },
            { href: '#/members', icon: 'share2', label: 'Comunidad' },
          ].map((q, i) => `
            <a href="${q.href}" class="card flex flex-col items-center gap-2 p-4 text-center transition hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5" style="--i:${i}">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">${Icon(q.icon, 18)}</span>
              <span class="text-xs text-zinc-300">${escapeHtml(q.label)}</span>
            </a>
          `).join('')}
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    const inscSeg = document.getElementById('insc-seg')
    inscSeg?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-w]')
      if (!btn) return
      const w = btn.dataset.w
      inscSeg.querySelectorAll('[data-w]').forEach(b => {
        const el = b as HTMLElement
        if (el.dataset.w === w) {
          el.style.background = '#8B5CF6'
          el.style.color = '#fff'
        } else {
          el.style.background = 'transparent'
          el.style.color = '#a1a1aa'
        }
      })
      document.querySelectorAll('#insc-chart .insc-panel').forEach(p => {
        p.classList.toggle('hidden', (p as HTMLElement).dataset.w !== w)
      })
    })

  } catch (err) {
    console.error('Error loading coach dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el dashboard</p>'
  }
}
