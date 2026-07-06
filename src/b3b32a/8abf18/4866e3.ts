import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

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
    const [{ count: studentsCount }, { count: playersCount }, { count: coursesCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player').eq('is_active', true),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])


    // Payments about to expire (pending older than 4 days = within 3 days of 7-day expiry)
    const EXPIRE_MS = 2 * 24 * 60 * 60 * 1000
    const SOON_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id, created_at, amount, enrollment_id, profiles!inner(full_name, display_name, email, id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

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
      { icon: 'sword', label: 'Jugadores activos', value: String(playersCount ?? 0), color: '#6D28D9' },
      { icon: 'bookOpen', label: 'Cursos activos', value: String(coursesCount ?? 0), color: '#7C3AED' },
      { icon: 'dollarSign', label: 'Pagos por vencer', value: String(expiringCount), color: '#F59E0B' },
    ]



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
            <div class="flex items-center justify-between rounded-lg border ${isUrgent ? 'border-red-500/20 bg-red-500/5' : isSoon ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-zinc-700/30 bg-zinc-800/20'} px-3 py-2 text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <span class="${isUrgent ? 'text-red-300' : isSoon ? 'text-yellow-300' : 'text-zinc-300'} truncate">${escapeHtml(name)}</span>
                ${courseName ? `<span class="text-zinc-500 text-xs shrink-0">${escapeHtml(courseName)}</span>` : ''}
              </div>
              <span class="shrink-0 text-xs font-mono ${isUrgent ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-zinc-400'}">${timeText}</span>
            </div>`
          }).filter(Boolean).join('')}
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
      })()}`

    document.getElementById('page-content')!.innerHTML = html


  } catch (err) {
    console.error('Error loading coach dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el dashboard</p>'
  }
}
