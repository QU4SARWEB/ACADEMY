import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { initBulkActions } from '@/2b3583/bulk_actions'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachPlayers(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPlayers(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const assignedIds = await getAssignedCourseIds(session.user.id)

    let coursesQuery = supabase.from('courses').select('id, price, name')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)

    const { data: players } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at, social_discord')
      .eq('role', 'player')
      .order('full_name')

    let paymentsByPlayer: Record<string, any[]> = {}
    let enrollsByPlayer: Record<string, any[]> = {}
    let priceMap: Record<string, number> = {}
    let coursesList: any[] = []
    let filteredPlayers: any[] = players ?? []
    if (players && players.length > 0) {
      const playerIds = players.map((p: any) => p.id)

      let enrollmentsQuery = supabase.from('enrollments').select('id, profile_id, course_id, status, courses!inner(name)').in('profile_id', playerIds)
      if (assignedIds.length > 0) enrollmentsQuery = enrollmentsQuery.in('course_id', assignedIds)

      const [{ data: payments }, { data: enrollments }, { data: courses }] = await Promise.all([
        supabase.from('payments').select('profile_id, amount, status, enrollment_id').in('profile_id', playerIds),
        enrollmentsQuery,
        coursesQuery,
      ])

      // Filter players to only those enrolled in assigned courses
      if (assignedIds.length > 0) {
        const enrolledPids = new Set((enrollments ?? []).map((e: any) => e.profile_id))
        filteredPlayers = players.filter((p: any) => enrolledPids.has(p.id))
      }

      coursesList = courses ?? []
      if (courses) for (const c of courses) priceMap[c.id] = parseFloat(c.price ?? 0)
      if (payments) {
        for (const p of payments) {
          if (!paymentsByPlayer[p.profile_id]) paymentsByPlayer[p.profile_id] = []
          paymentsByPlayer[p.profile_id].push(p)
        }
      }
      for (const e of enrollments ?? []) {
        if (!enrollsByPlayer[e.profile_id]) enrollsByPlayer[e.profile_id] = []
        enrollsByPlayer[e.profile_id].push(e)
      }
    }

    const enrollCountByCourse: Record<string, number> = {}
    for (const p of filteredPlayers) {
      const pEnrolls = enrollsByPlayer[p.id] || []
      for (const e of pEnrolls) {
        if (!enrollCountByCourse[e.course_id]) enrollCountByCourse[e.course_id] = 0
        enrollCountByCourse[e.course_id]++
      }
    }

    const filterHtml = coursesList.map((c: any) => {
      const total = enrollCountByCourse[c.id] || 0
      return `
      <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
        bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
        <span class="text-zinc-500">${total}</span>
      </button>`
    }).join('')

    const activeFilters = new Set(coursesList.map((c: any) => c.id))

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Jugadores</h1>
        <p class="mt-1 text-sm text-zinc-500">${(filteredPlayers).length} jugadores</p>
      </div>
      <div class="mb-4 flex flex-wrap gap-2" id="course-filters">${filterHtml}</div>

      <div id="bulk-action-bar" class="hidden mb-4 flex items-center gap-2 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-2.5">
        <span class="text-sm text-zinc-300" id="bulk-count">0 seleccionados</span>
        <div class="ml-auto flex gap-2">
          <button id="bulk-scholarship" class="rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition hover:bg-yellow-500/10">${Icon('dollarSign', 12)} Dar beca</button>
          <button id="bulk-unscholarship" class="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">${Icon('x', 12)} Quitar beca</button>
          <button id="bulk-delete" class="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10">${Icon('trash', 12)} Eliminar</button>
        </div>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-3 px-4 font-medium"><input type="checkbox" id="select-all" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"></th>
                <th class="py-3 px-4 font-medium">Nombre</th>
                <th class="py-3 px-4 font-medium hidden md:table-cell">Email</th>
                <th class="py-3 px-4 font-medium">Rango</th>
                <th class="py-3 px-4 font-medium">Cursos</th>
                <th class="py-3 px-4 font-medium">Pago</th>
                <th class="py-3 px-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${(filteredPlayers).length === 0
                ? '<tr><td colspan="7" class="py-8 text-center text-zinc-500">No hay jugadores registrados.</td></tr>'
                : (filteredPlayers).map((p: any) => {
                    const displayName = [p.riot_id || p.full_name, p.social_discord].filter(Boolean).join(' | ') || 'Desconocido'
                    const initial = (displayName || '?')[0]
                    const pPayments = paymentsByPlayer[p.id] || []
                    const pEnrolls = enrollsByPlayer[p.id] || []
                    const enrolledCount = pEnrolls.filter((e: any) => e.status === 'active').length
                    const courseIds = [...new Set(pEnrolls.filter((e: any) => e.status === 'active').map((e: any) => e.course_id))]
                    const courseNames = [...new Set(pEnrolls.filter((e: any) => e.status === 'active').map((e: any) => e.courses?.name).filter(Boolean))]
                    const hasPaidEnrollment = pEnrolls.some((e: any) => e.status === 'active' && pPayments.some((pp: any) => pp.enrollment_id === e.id && (pp.status === 'paid' || pp.status === 'scholarship')))
                    const allFree = !hasPaidEnrollment && pEnrolls.filter((e: any) => e.status === 'active').every((e: any) => (priceMap[e.course_id] || 0) === 0 || pPayments.some((pp: any) => pp.enrollment_id === e.id && pp.status === 'free'))
                    const payStatus = enrolledCount > 0 ? (hasPaidEnrollment ? 'pagado' : allFree ? 'gratis' : 'pendiente') : 'sin curso'
                    const payColor = payStatus === 'pagado' ? 'text-green-400' : payStatus === 'gratis' ? 'text-green-400' : payStatus === 'pendiente' ? 'text-yellow-400' : 'text-zinc-500'
                    const rowCourseIds = courseIds
                    const isVisible = rowCourseIds.length === 0 || rowCourseIds.some((cid: string) => activeFilters.has(cid))
                    return `
                      <tr class="border-b border-zinc-800/50 player-row ${isVisible ? '' : 'hidden'}" data-course-ids="${escapeHtml(rowCourseIds.join(','))}">
                        <td class="py-3 px-4"><input type="checkbox" class="row-checkbox h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(p.id)}"></td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2">
                            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml(initial)}</div>
                            <a href="#/coaches/players/${escapeHtml(p.id)}" class="text-sm font-medium text-white hover:text-[#8B5CF6] transition">${escapeHtml(displayName)}</a>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-xs text-zinc-400 hidden md:table-cell">${escapeHtml(p.email || '-')}</td>
                        <td class="py-3 px-4 text-xs text-zinc-400">${escapeHtml(p.rank || '-')}</td>
                        <td class="py-3 px-4"><div class="flex flex-wrap gap-1">${courseNames.length > 0 ? courseNames.map((n: string) => '<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">' + escapeHtml(n) + '</span>').join('') : '<span class="text-xs text-zinc-600">—</span>'}</div></td>
                        <td class="py-3 px-4"><span class="text-xs ${payColor}">${payStatus === 'gratis' ? 'Gratis' : escapeHtml(payStatus)}</span></td>
                        <td class="py-3 px-4">${p.is_active ? '<span class="inline-block h-2 w-2 rounded-full bg-green-400"></span>' : '<span class="inline-block h-2 w-2 rounded-full bg-red-400"></span>'}</td>
                      </tr>`
                  }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // Filter toggles
    document.querySelectorAll('.course-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const courseId = (btn as HTMLElement).dataset.courseId
        const active = (btn as HTMLElement).dataset.active === '1'
        if (active) activeFilters.delete(courseId)
        else activeFilters.add(courseId)
        ;(btn as HTMLElement).dataset.active = active ? '0' : '1'
        btn.classList.toggle('bg-[#8B5CF6]/15', !active)
        btn.classList.toggle('text-[#8B5CF6]', !active)
        btn.classList.toggle('border-[#8B5CF6]/30', !active)
        btn.classList.toggle('bg-zinc-800/40', active)
        btn.classList.toggle('text-zinc-500', active)
        btn.classList.toggle('border-dashed', active)
        btn.innerHTML = active
          ? `${Icon('plus', 12)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span>`
          : `${Icon('checkCircle', 14)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span>`

        document.querySelectorAll<HTMLElement>('.player-row').forEach(row => {
          const ids = (row.dataset.courseIds || '').split(',').filter(Boolean)
          row.classList.toggle('hidden', ids.length > 0 && !ids.some((id: string) => activeFilters.has(id)))
        })
      })
    })

    initBulkActions(document.getElementById('page-content')!, { role: 'player', afterAction: () => initCoachPlayers() })
  } catch (err) {
    console.error('Error loading players:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar jugadores</p>'
  }
}
