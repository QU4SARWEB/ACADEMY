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

    const assignedIds = await getAssignedCourseIds(session.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

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

    // Analítica: pagos pagados por día (últimos 14 días)
    const paidSeries: { label: string; value: number; ratio: number }[] = []
    let paidMonthTotal = 0
    try {
      const since = new Date()
      since.setDate(since.getDate() - 13)
      since.setHours(0, 0, 0, 0)
      let payQ = supabase.from('payments').select('paid_at, amount').eq('status', 'paid').gte('paid_at', since.toISOString())
      if (assignedEnrollIds) {
        const filt = assignedEnrollIds.length > 0 ? assignedEnrollIds : ['00000000-0000-0000-0000-000000000000']
        payQ = payQ.in('enrollment_id', filt)
      }
      const { data: paidPays } = await payQ
      const buckets: Record<string, number> = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        buckets[d.toISOString().slice(0, 10)] = 0
      }
      for (const p of paidPays ?? []) {
        const day = (p.paid_at || '').slice(0, 10)
        if (day && buckets[day] !== undefined) buckets[day]++
        const amt = Number(p.amount) || 0
        const m = (p.paid_at || '').slice(0, 7)
        const nowM = new Date().toISOString().slice(0, 7)
        if (m === nowM) paidMonthTotal += amt
      }
      const max = Math.max(1, ...Object.values(buckets))
      paidSeries.push(...Object.entries(buckets).map(([day, value]) => ({
        label: day.slice(5).split('-').reverse().join('/'),
        value,
        ratio: value / max,
      })))
    } catch (e) {
      console.warn('Analytic series unavailable:', e)
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

        <!-- Analítica semanal -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <h2 class="font-heading text-base font-bold text-white flex items-center gap-2">
              ${Icon('lineChart', 16)} Pagos pagados · últimos 14 días
            </h2>
            <span class="badge bg-green-500/15 text-green-400 border border-green-500/30">${paidSeries.reduce((acc, b) => acc + b.value, 0)}</span>
          </div>
          ${paidSeries.length > 0 ? `
          <div class="flex h-36 items-end gap-1.5 mb-2">
            ${paidSeries.map(b => `
              <div class="flex-1 flex flex-col items-center justify-end min-w-0" title="${escapeHtml(b.label)}: ${b.value}">
                <span class="mb-1 text-[10px] text-zinc-500">${b.value > 0 ? b.value : ''}</span>
                <div class="w-full rounded-t-md" style="height:${Math.max(4, Math.round(b.ratio * 120))}px;background:linear-gradient(180deg,#22C55E,#16A34A);opacity:${b.value > 0 ? 1 : 0.12}"></div>
              </div>`).join('')}
          </div>
          <div class="flex justify-between text-[10px] text-zinc-600">
            <span>${escapeHtml(paidSeries[0]?.label || '')}</span>
            <span>Hoy</span>
          </div>
          <p class="mt-3 text-xs text-zinc-500">Ingresos cobrados este mes: <span class="font-semibold text-green-400">$${paidMonthTotal.toFixed(2)}</span></p>
          ` : EmptyState({ icon: 'dollarSign', title: 'Sin pagos en los últimos 14 días', hint: 'Cuando los alumnos paguen verás el resumen aquí.' })}
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
            { href: '#/chat', icon: 'mail', label: 'Mensajes' },
          ].map((q, i) => `
            <a href="${q.href}" class="card flex flex-col items-center gap-2 p-4 text-center transition hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5" style="--i:${i}">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">${Icon(q.icon, 18)}</span>
              <span class="text-xs text-zinc-300">${escapeHtml(q.label)}</span>
            </a>
          `).join('')}
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html


  } catch (err) {
    console.error('Error loading coach dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el dashboard</p>'
  }
}
