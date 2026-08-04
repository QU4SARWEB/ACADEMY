import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { getAssignedCourseIds } from '@/2b3583/assignments'

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

    // Auto-delete accounts with expired payments older than 5 days
    try {
      await supabase.rpc('delete_expired_users')
    } catch (e) {
      // non-critical, ignore
    }

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

    const kpiCards = [
      { icon: 'users', label: 'Alumnos activos', value: String(studentsCount ?? 0), color: '#8B5CF6' },


      { icon: 'bookOpen', label: 'Cursos activos', value: String(coursesCount ?? 0), color: '#7C3AED' },
      { icon: 'dollarSign', label: 'Pagos por vencer', value: String(expiringCount), color: '#F59E0B' },
    ]



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
