import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    // KPIs
    const [{ count: studentsCount }, { count: playersCount }, { count: coursesCount },
      { count: examsCount }, { count: pendingSubs }, { count: openTickets }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player').eq('is_active', true),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('exams').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('task_submissions').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'reviewed']),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    ])

    // Academic performance
    const { data: gradeData } = await supabase
      .from('enrollments')
      .select('final_grade, promoted')
      .eq('status', 'active')
      .not('final_grade', 'is', null)

    const grades = (gradeData ?? []).map((e: any) => e.final_grade).filter((g: any) => g !== null)
    const avgGrade = grades.length > 0 ? (grades.reduce((a: number, b: number) => a + b, 0) / grades.length).toFixed(1) : '—'
    const passed = (gradeData ?? []).filter((e: any) => e.final_grade >= 70).length
    const failed = (gradeData ?? []).filter((e: any) => e.final_grade < 70).length
    const total = passed + failed
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    const failRate = total > 0 ? Math.round((failed / total) * 100) : 0

    // Payments about to expire (pending older than 4 days = within 3 days of 7-day expiry)
    const EXPIRE_MS = 2 * 24 * 60 * 60 * 1000
    const SOON_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id, created_at, amount, profiles!inner(full_name, display_name, email, id), seasons(name), enrollments!inner(courses!inner(name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    const expiringPayments = (pendingPayments ?? []).filter((p: any) =>
      p.created_at && (now - new Date(p.created_at).getTime()) > EXPIRE_MS - SOON_MS
    )
    const expiringCount = expiringPayments.length

    // Students at risk + course averages (consolidated)
    const { data: allEnrollData } = await supabase
      .from('enrollments')
      .select('course_id, final_grade, promoted, profiles!inner(full_name, display_name), courses(name)')
      .eq('status', 'active')
      .not('final_grade', 'is', null)

    const riskEnrollments = (allEnrollData ?? [])
      .filter((e: any) => e.final_grade < 70)
      .sort((a: any, b: any) => a.final_grade - b.final_grade)
      .slice(0, 6)

    const byCourse: Record<string, { grades: number[]; name: string }> = {}
    for (const e of allEnrollData ?? []) {
      const cid = e.course_id
      const courseObj = e.courses as { name?: string } | null
      if (!byCourse[cid]) byCourse[cid] = { grades: [], name: courseObj?.name || 'Curso' }
      byCourse[cid].grades.push(e.final_grade)
    }
    const courseAvgs = Object.values(byCourse).map((c) => ({
      name: c.name,
      avg: c.grades.length > 0 ? Math.round(c.grades.reduce((a, b) => a + b, 0) / c.grades.length) : 0,
    }))

    const kpiCards = [
      { icon: 'users', label: 'Alumnos activos', value: String(studentsCount ?? 0), color: '#8B5CF6' },
      { icon: 'sword', label: 'Jugadores activos', value: String(playersCount ?? 0), color: '#6D28D9' },
      { icon: 'bookOpen', label: 'Cursos activos', value: String(coursesCount ?? 0), color: '#7C3AED' },
      { icon: 'target', label: 'Exámenes publicados', value: String(examsCount ?? 0), color: '#10B981' },
      { icon: 'clipboardList', label: 'Tareas por revisar', value: String(pendingSubs ?? 0), color: '#F59E0B' },
      { icon: 'alertTriangle', label: 'Tickets abiertos', value: String(openTickets ?? 0), color: '#EF4444' },
      { icon: 'dollarSign', label: 'Pagos por vencer', value: String(expiringCount), color: '#F59E0B' },
    ]

    const chartMax = Math.max(...courseAvgs.map((c) => c.avg), 20)
    const chartColors = ['#8B5CF6', '#6D28D9', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899']

    const chartHtml = courseAvgs.length > 0 ? `
      <div class="space-y-3">
        ${courseAvgs.map((c, i) => `
          <div class="flex items-center gap-3">
            <span class="w-28 text-xs text-zinc-400 text-right truncate" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</span>
            <div class="flex-1 h-6 rounded-lg bg-zinc-800 overflow-hidden">
              <div class="h-full rounded-lg transition-all duration-700" style="width:${Math.max((c.avg / chartMax) * 100, 3)}%;background:${chartColors[i % chartColors.length]}"></div>
            </div>
            <span class="w-8 text-xs text-zinc-300 text-right font-mono">${c.avg}</span>
          </div>
        `).join('')}
      </div>
      <p class="mt-2 text-[10px] text-zinc-600">Promedio de notas por curso (máx 20)</p>
    ` : '<p class="text-sm text-zinc-500 text-center py-4">Sin datos de notas</p>'

    const riskHtml = (riskEnrollments ?? []).length > 0
      ? (riskEnrollments ?? []).map((e: any) => {
          const name = e.profiles?.display_name || e.profiles?.full_name || 'Desconocido'
          return `
            <div class="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm">
              <div>
                <span class="text-red-300">${escapeHtml(name)}</span>
                <span class="text-zinc-500 text-xs ml-2">${escapeHtml(e.courses?.name || '')}</span>
              </div>
              <span class="text-red-400 font-mono text-xs">${e.final_grade ?? '—'}</span>
            </div>`
        }).join('')
      : '<p class="text-sm text-zinc-500 text-center py-4">Ningún estudiante en riesgo</p>'

    const userName = profile?.display_name || profile?.full_name || 'Coach'

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Panel de control — QU<span class="text-[#8B5CF6]">4</span>SAR Analytics</p>
      </div>

      <div class="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        ${kpiCards.map(c => `
          <div class="glass rounded-xl p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: ${c.color}20">
                <span style="color: ${c.color}">${Icon(c.icon, 18)}</span>
              </div>
              <div>
                <p class="text-xl font-bold text-white">${escapeHtml(c.value)}</p>
                <p class="text-[10px] text-zinc-500">${escapeHtml(c.label)}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mb-8 grid gap-6 lg:grid-cols-2">
        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Rendimiento académico</h2>
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="rounded-lg bg-zinc-800/50 p-3 text-center">
              <p class="text-2xl font-bold text-white">${avgGrade}</p>
              <p class="text-xs text-zinc-500">Promedio general</p>
            </div>
            <div class="rounded-lg bg-zinc-800/50 p-3 text-center">
              <p class="text-2xl font-bold text-green-400">${passRate}%</p>
              <p class="text-xs text-zinc-500">Aprobados</p>
            </div>
            <div class="rounded-lg bg-zinc-800/50 p-3 text-center">
              <p class="text-2xl font-bold text-red-400">${failRate}%</p>
              <p class="text-xs text-zinc-500">Reprobados</p>
            </div>
            <div class="rounded-lg bg-zinc-800/50 p-3 text-center">
              <p class="text-2xl font-bold text-[#8B5CF6]">${total}</p>
              <p class="text-xs text-zinc-500">Total evaluados</p>
            </div>
          </div>
          <div class="flex gap-1 h-8 items-end">
            ${total > 0 ? `
              <div class="flex-1 rounded-t bg-green-500/60 transition-all duration-500" style="height:${passRate}%"></div>
              <div class="flex-1 rounded-t bg-red-500/60 transition-all duration-500" style="height:${failRate}%"></div>
            ` : '<p class="text-xs text-zinc-600 w-full text-center">Sin datos</p>'}
          </div>
          <div class="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>Aprobados (${passRate}%)</span>
            <span>Reprobados (${failRate}%)</span>
          </div>
        </div>

        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Promedio por curso</h2>
          ${chartHtml}
        </div>
      </div>

      ${pendingPayments && pendingPayments.length > 0 ? `
      <div class="mb-6 glass rounded-xl p-5">
        <h2 class="mb-4 font-heading text-base font-bold text-white flex items-center gap-2">
          ${Icon('dollarSign', 16)} Pagos pendientes
          <span class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">${pendingPayments.length}</span>
          <a href="#/payments" class="ml-auto text-xs text-[#8B5CF6] hover:underline">Gestionar →</a>
        </h2>
        <div class="space-y-2">
          ${pendingPayments.map((p: any) => {
            const prof = p.profiles || {}
            const name = prof.display_name || prof.full_name || prof.email || 'Desconocido'
            const courseName = p.enrollments?.courses?.name || ''
            const createdAt = p.created_at ? new Date(p.created_at).getTime() : 0
            const expiresAt = createdAt + EXPIRE_MS
            const remaining = expiresAt - now
            const daysLeft = Math.floor(remaining / 86400000)
            const hoursLeft = Math.floor((remaining % 86400000) / 3600000)
            const isUrgent = remaining < 86400000
            const isSoon = remaining < 172800000
            return `
            <div class="flex items-center justify-between rounded-lg border ${isUrgent ? 'border-red-500/20 bg-red-500/5' : isSoon ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-zinc-700/30 bg-zinc-800/20'} px-3 py-2 text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <span class="${isUrgent ? 'text-red-300' : isSoon ? 'text-yellow-300' : 'text-zinc-300'} truncate">${escapeHtml(name)}</span>
                ${courseName ? `<span class="text-zinc-500 text-xs shrink-0">${escapeHtml(courseName)}</span>` : ''}
              </div>
              <span class="shrink-0 text-xs font-mono ${isUrgent ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-zinc-400'}">${daysLeft > 0 ? daysLeft + 'd ' : ''}${hoursLeft}h restantes</span>
            </div>`
          }).join('')}
        </div>
      </div>` : ''}

      ${(() => {
        const raw = localStorage.getItem('recentStudents')
        const recent: { id: string; name: string; ts: number }[] = raw ? JSON.parse(raw) : []
        const sorted = recent.sort((a, b) => b.ts - a.ts).slice(0, 5)
        return sorted.length > 0 ? `
      <div class="mb-6 glass rounded-xl p-5">
        <h2 class="mb-3 font-heading text-base font-bold text-white flex items-center gap-2">
          ${Icon('clock', 16)} Alumnos recientes
        </h2>
        <div class="flex flex-wrap gap-2">
          ${sorted.map(s => `
            <a href="#/coaches/students/${escapeHtml(s.id)}"
               class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/30 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
              ${Icon('user', 14)} ${escapeHtml(s.name)}
            </a>
          `).join('')}
        </div>
      </div>` : ''
      })()}

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white flex items-center gap-2">
            ${Icon('alertTriangle', 16)} Estudiantes en riesgo
            ${(riskEnrollments ?? []).length > 0 ? `<span class="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">${(riskEnrollments ?? []).length}</span>` : ''}
          </h2>
          <div class="space-y-2">
            ${riskHtml}
            ${(riskEnrollments ?? []).length >= 6 ? '<p class="text-xs text-zinc-500 text-center mt-2">Mostrando los 6 más bajos</p>' : ''}
          </div>
        </div>

        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Acceso rápido</h2>
          <div class="grid grid-cols-2 gap-3">
            <a href="#/coaches/students" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('users', 16)} Estudiantes
            </a>
            <a href="#/coaches/courses" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('bookOpen', 16)} Cursos
            </a>
            <a href="#/coaches/tasks" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('clipboardList', 16)} Tareas
            </a>
            <a href="#/support" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('alertTriangle', 16)} Tickets
            </a>
            <a href="#/chat" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('mail', 16)} Chat
            </a>
            <a href="#/logs" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('scrollText', 16)} Auditoría
            </a>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading coach dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el dashboard</p>'
  }
}
