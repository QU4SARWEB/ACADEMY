import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { initBulkActions } from '@/2b3583/bulk_actions'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachStudents(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

function getStudentCourseIds(enrollments: any[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const e of enrollments ?? []) {
    if (!map[e.profile_id]) map[e.profile_id] = []
    if (!map[e.profile_id].includes(e.course_id)) map[e.profile_id].push(e.course_id)
  }
  return map
}

async function loadStudentData() {
  const { data: { session } } = await supabase.auth.getSession()
  const assignedIds = await getAssignedCourseIds(session?.user?.id || '')

  let coursesQuery = supabase.from('courses').select('id, name, display_order, price').eq('is_active', true).order('display_order')
  if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)

  const [{ data: students }, { data: courses }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, avatar_url, riot_id, social_discord, rank, scholarship, is_active, platform, created_at').eq('role', 'student').order('full_name'),
    coursesQuery,
  ])

  const studentIds = (students ?? []).map((s: any) => s.id)
  const freeCourseIds = new Set((courses ?? []).filter((c: any) => !c.price || c.price <= 0).map((c: any) => c.id))

  let enrollmentsQuery = supabase.from('enrollments').select('id, profile_id, status, course_id, courses!inner(name)')
  if (studentIds.length > 0) enrollmentsQuery = enrollmentsQuery.in('profile_id', studentIds)
  if (assignedIds.length > 0) enrollmentsQuery = enrollmentsQuery.in('course_id', assignedIds)

  const [{ data: payments }, { data: enrollments }] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('payments').select('profile_id, status, created_at, enrollment_id').in('profile_id', studentIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    enrollmentsQuery,
  ])

  // Filter students to only those enrolled in assigned courses
  const enrolledPids = new Set((enrollments ?? []).map((e: any) => e.profile_id))
  const filteredStudents = assignedIds.length > 0
    ? (students ?? []).filter((s: any) => enrolledPids.has(s.id))
    : (students ?? [])

  const paymentByEnrollId: Record<string, string> = {}
  const paidCountPerProfile: Record<string, number> = {}
  const scholarCountPerProfile: Record<string, number> = {}
  const enrollCountPerProfile: Record<string, number> = {}
  for (const p of payments ?? []) {
    const eid = p.enrollment_id
    if (eid && !paymentByEnrollId[eid]) {
      paymentByEnrollId[eid] = p.status
    }
  }
  for (const e of enrollments ?? []) {
    if (freeCourseIds.has(e.course_id)) continue
    if (!enrollCountPerProfile[e.profile_id]) enrollCountPerProfile[e.profile_id] = 0
    enrollCountPerProfile[e.profile_id]++
    const st = paymentByEnrollId[e.id]
    if (st === 'paid') {
      if (!paidCountPerProfile[e.profile_id]) paidCountPerProfile[e.profile_id] = 0
      paidCountPerProfile[e.profile_id]++
    } else if (st === 'scholarship') {
      if (!scholarCountPerProfile[e.profile_id]) scholarCountPerProfile[e.profile_id] = 0
      scholarCountPerProfile[e.profile_id]++
    }
  }
  for (const pid of Object.keys(enrollCountPerProfile)) {
    if (!paidCountPerProfile[pid]) paidCountPerProfile[pid] = 0
    if (!scholarCountPerProfile[pid]) scholarCountPerProfile[pid] = 0
  }

  const enrollmentMap = new Map<string, { count: number; anyActive: boolean; courses: string[] }>()
  const courseStudentCount: Record<string, number> = {}
  const courseStudentIds: Record<string, Set<string>> = {}
  for (const e of enrollments ?? []) {
    const current = enrollmentMap.get(e.profile_id) || { count: 0, anyActive: false, courses: [] }
    current.count++
    if (e.status === 'active' || e.status === 'recovery') current.anyActive = true
    const courseName = (e as any).courses?.name
    if (courseName && !current.courses.includes(courseName)) current.courses.push(courseName)
    enrollmentMap.set(e.profile_id, current)

    if (!courseStudentCount[e.course_id]) {
      courseStudentCount[e.course_id] = 0
      courseStudentIds[e.course_id] = new Set()
    }
    courseStudentCount[e.course_id]++
    courseStudentIds[e.course_id].add(e.profile_id)
  }

  const studentCourseIds = getStudentCourseIds(enrollments ?? [])

  return { students: filteredStudents, courses, paidCountPerProfile, scholarCountPerProfile, enrollCountPerProfile, enrollmentMap, courseStudentCount, courseStudentIds, studentCourseIds }
}

function renderStudentTable(students: any[], courses: any[], paidCountPerProfile: Record<string, number>, scholarCountPerProfile: Record<string, number>, enrollCountPerProfile: Record<string, number>, enrollmentMap: Map<string, { count: number; anyActive: boolean; courses: string[] }>, courseStudentCount: Record<string, number>, courseStudentIds: Record<string, Set<string>>, studentCourseIds: Record<string, string[]>): string {
  const filterHtml = (courses ?? []).map((c: any) => {
    const total = courseStudentCount[c.id] || 0
    return `
    <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
      bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
      data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-course-count="${total}" data-active="1">
      ${Icon('checkCircle', 14)}
      <span>${escapeHtml(c.name)}</span>
      <span class="text-zinc-500">${total}</span>
    </button>`
  }).join('')

  return `
    <div class="mb-6">
      <span class="kicker">Gestión de alumnos</span>
      <h1 class="font-heading text-2xl font-bold text-white">Estudiantes</h1>
      <p class="mt-1 text-sm text-zinc-500">${(students ?? []).length} estudiantes</p>
    </div>

    <div id="bulk-action-bar" class="hidden mb-4 flex items-center gap-2 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-2.5">
      <span class="text-sm text-zinc-300" id="bulk-count">0 seleccionados</span>
      <div class="ml-auto flex gap-2">
        <button id="bulk-scholarship" class="rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition hover:bg-yellow-500/10">${Icon('dollarSign', 12)} Dar beca</button>
        <button id="bulk-unscholarship" class="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">${Icon('x', 12)} Quitar beca</button>
        <button id="bulk-enroll" class="rounded-lg border border-[#8B5CF6]/30 px-3 py-1.5 text-xs text-[#8B5CF6] transition hover:bg-[#8B5CF6]/10">${Icon('plus', 12)} Inscribir en curso</button>
        <button id="bulk-delete" class="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10">${Icon('trash', 12)} Eliminar</button>
      </div>
    </div>

    <div class="mb-4">
      <div class="relative">
        <input type="text" id="student-search" placeholder="Buscar por nombre, Riot ID, Discord o email..."
          class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] pl-9 pr-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
        <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">${Icon('search', 14)}</div>
      </div>
    </div>

    <div id="no-results" class="hidden py-8 text-center text-sm text-zinc-500">No se encontraron estudiantes.</div>

    <div class="mb-4 flex flex-wrap gap-2" id="course-filters">${filterHtml}</div>

    <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th class="py-3 px-4 font-medium"><input type="checkbox" id="select-all" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"></th>
            <th class="py-3 px-4 font-medium">Nombre</th>
            <th class="py-3 px-4 font-medium">Email</th>
            <th class="py-3 px-4 font-medium">Cursos</th>
            <th class="py-3 px-4 font-medium">Estado</th>
            <th class="py-3 px-4 font-medium">Plataforma</th>
            <th class="py-3 px-4 font-medium">Rol</th>
            <th class="py-3 px-4 font-medium text-right">Acci\u00f3n</th>
          </tr>
        </thead>
        <tbody id="students-tbody">
          ${(students ?? []).length === 0
            ? '<tr><td colspan="8" class="py-8 text-center text-sm text-zinc-500">No hay estudiantes.</td></tr>'
            : (students ?? []).map((s: any) => {
                const enrollment = enrollmentMap.get(s.id) || { count: 0, anyActive: false, courses: [] }
                const displayName = [s.riot_id || s.full_name, s.social_discord].filter(Boolean).join(' | ') || 'Desconocido'
                const initial = (displayName || '?').charAt(0).toUpperCase()
                const myCourseIds = (studentCourseIds[s.id] || []).join(',')
                return `
                  <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50" data-search="${escapeHtml([s.full_name, s.riot_id, s.social_discord, s.email].filter(Boolean).join(' ').toLowerCase())}" data-course-ids="${escapeHtml(myCourseIds)}">
                    <td class="py-3 px-4"><input type="checkbox" class="row-checkbox h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(s.id)}"></td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2">
                        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400 shrink-0">
                          ${s.avatar_url ? `<img src="${escapeHtml(s.avatar_url)}" alt="" class="h-full w-full rounded-full object-cover" />` : escapeHtml(initial)}
                        </div>
                        <a href="#/coaches/students/${escapeHtml(s.id)}" class="text-sm text-white hover:text-[#8B5CF6] transition">${escapeHtml(displayName)}</a>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-xs text-zinc-400">${escapeHtml(s.email || '-')}</td>
                    <td class="py-3 px-4 text-xs text-zinc-400 max-w-[180px] truncate" title="${escapeHtml(enrollment.courses.join(', '))}">${enrollment.count > 0 ? escapeHtml(enrollment.courses.join(', ')) : '—'}</td>
                    <td class="py-3 px-4">${s.is_active
                      ? '<span class="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400"><span class="h-1.5 w-1.5 rounded-full bg-green-400"></span>Activo</span>'
                      : '<span class="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-400"><span class="h-1.5 w-1.5 rounded-full bg-red-400"></span>Inactivo</span>'}</td>
                    <td class="py-3 px-4">${s.platform === 'mobile'
                      ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2.5 py-0.5 text-xs text-[#C4B5FD]">${Icon('smartphone', 12)} Mobile</span>`
                      : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">${Icon('play', 12)} PC</span>`}</td>
                    <td class="py-3 px-4 text-xs text-zinc-500">Estudiante</td>
                    <td class="py-3 px-4 text-right">${!s.is_active ? '<button class="hard-delete-student rounded border border-red-700 px-2 py-1 text-[10px] text-red-400 hover:bg-red-900/30 transition" data-id="' + s.id + '" data-name="' + escapeHtml(displayName) + '">' + Icon('trash', 10) + ' Eliminar</button>' : ''}</td>
                  </tr>`
              }).join('')
          }
        </tbody>
      </table>
    </div>`
}

function initSearchFilter(container: HTMLElement, allRows: NodeListOf<HTMLTableRowElement>): void {
  const searchInput = container.querySelector<HTMLInputElement>('#student-search')!
  const noResults = container.querySelector<HTMLElement>('#no-results')!
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim()
    let visible = 0
    allRows.forEach(row => {
      const text = (row as HTMLElement).dataset.search || ''
      const match = !q || text.includes(q)
      ;(row as HTMLElement).dataset.searchHidden = match ? '' : '1'
      const courseHidden = (row as HTMLElement).dataset.courseHidden === '1'
      row.classList.toggle('hidden', !match || courseHidden)
      if (match && !courseHidden) visible++
    })
    noResults.classList.toggle('hidden', visible > 0 || !q)
  })
}

function initCourseFilters(container: HTMLElement, allRows: NodeListOf<HTMLTableRowElement>): void {
  container.querySelectorAll('.course-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = (btn as HTMLElement).dataset.courseId
      const active = (btn as HTMLElement).dataset.active === '1'
      ;(btn as HTMLElement).dataset.active = active ? '0' : '1'

      btn.classList.toggle('bg-[#8B5CF6]/15', !active)
      btn.classList.toggle('text-[#8B5CF6]', !active)
      btn.classList.toggle('border-[#8B5CF6]/30', !active)
      btn.classList.toggle('bg-zinc-800/40', active)
      btn.classList.toggle('text-zinc-500', active)
      btn.classList.toggle('border-dashed', active)
      btn.classList.toggle('border-zinc-700/50', active)

      btn.innerHTML = active
        ? `${Icon('plus', 12)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
        : `${Icon('checkCircle', 14)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`

      const excludedCourses = new Set<string>()
      container.querySelectorAll('.course-filter-btn').forEach(b => {
        if ((b as HTMLElement).dataset.active === '0') {
          excludedCourses.add((b as HTMLElement).dataset.courseId || '')
        }
      })

      const searchInput = container.querySelector<HTMLInputElement>('#student-search')
      const q = (searchInput?.value || '').toLowerCase().trim()
      const noResults = container.querySelector<HTMLElement>('#no-results')
      let visible = 0
      allRows.forEach(row => {
        const rowCourseIds = ((row as HTMLElement).dataset.courseIds || '').split(',').filter(Boolean)
        const isExcluded = rowCourseIds.length > 0 && rowCourseIds.every((id: string) => excludedCourses.has(id))
        ;(row as HTMLElement).dataset.courseHidden = isExcluded ? '1' : ''
        const searchHidden = (row as HTMLElement).dataset.searchHidden === '1'
        const hidden = isExcluded || (!q || ((row as HTMLElement).dataset.search || '').includes(q)) ? false : true
        row.classList.toggle('hidden', isExcluded || searchHidden)
        if (!isExcluded && !searchHidden) visible++
      })
      if (noResults) noResults.classList.toggle('hidden', visible > 0 || !q)
    })
  })
}

function initSingleActions(container: HTMLElement, reloadFn: () => void): void {
  container.querySelectorAll('.hard-delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      const name = (btn as HTMLElement).dataset.name || 'este estudiante'
      if (!id || !(await confirmDialog(`¿Eliminar PERMANENTEMENTE a ${name}? Se borrarán todos sus datos. Esta acción NO se puede deshacer.`))) return
      await supabase.from('payments').delete().eq('profile_id', id)
      await supabase.from('enrollments').delete().eq('profile_id', id)
      await supabase.from('team_members').delete().eq('profile_id', id)
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) { toast('error', 'Error al eliminar: ' + error.message); return }
      toast('success', 'Estudiante eliminado permanentemente')
      reloadFn()
    })
  })
}

export function mountCoachStudents(): void {
  ;(async () => {
    try {
      const { students, courses, paidCountPerProfile, scholarCountPerProfile, enrollCountPerProfile, enrollmentMap, courseStudentCount, courseStudentIds, studentCourseIds } = await loadStudentData()

      const mainHtml = renderStudentTable(students ?? [], courses ?? [], paidCountPerProfile, scholarCountPerProfile, enrollCountPerProfile, enrollmentMap, courseStudentCount, courseStudentIds, studentCourseIds)

      const enrollModalHtml = `
        <div id="enroll-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60">
          <div class="flex min-h-full items-center justify-center p-4">
          <div class="glass max-w-md w-full rounded-xl p-6">
            <h3 class="mb-4 font-heading text-lg font-bold text-white">Inscribir seleccionados</h3>
            <input type="hidden" id="bulk-course-id" value="" />
            <div class="flex flex-wrap gap-2 mb-4" id="bulk-course-grid">
              ${(courses ?? []).map((c: any) => `
                <button type="button" class="bulk-course-btn rounded-xl border px-3 py-1.5 text-xs text-zinc-300 transition hover:border-[#8B5CF6] hover:text-white border-zinc-700 bg-zinc-900/50"
                  data-course-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>
              `).join('')}
            </div>
            <p id="bulk-enroll-error" class="mt-2 hidden text-xs text-red-400"></p>
            <div class="flex gap-3 mt-4">
              <button id="bulk-enroll-confirm" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Inscribir</button>
              <button id="bulk-enroll-cancel" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
          </div>
          </div>
        </div>`

      document.getElementById('page-content')!.innerHTML = mainHtml
      document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', enrollModalHtml)

      const container = document.getElementById('page-content')!
      const allRows = container.querySelectorAll<HTMLTableRowElement>('#students-tbody tr')

      initSearchFilter(container, allRows)
      initCourseFilters(container, allRows)
      initSingleActions(container, () => mountCoachStudents())
      initBulkActions(container, { role: 'student', afterAction: () => mountCoachStudents() })

      document.getElementById('bulk-enroll')?.addEventListener('click', () => {
        document.getElementById('enroll-modal')!.classList.remove('hidden')
      })
      document.getElementById('bulk-enroll-cancel')?.addEventListener('click', () => {
        document.getElementById('enroll-modal')!.classList.add('hidden')
      })
      document.getElementById('enroll-modal')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const btn = target.closest('.bulk-course-btn') as HTMLElement
        if (!btn) return
        document.querySelectorAll('.bulk-course-btn').forEach(b => {
          b.classList.remove('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
          b.classList.add('border-zinc-700', 'text-zinc-300')
        })
        btn.classList.add('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
        btn.classList.remove('border-zinc-700', 'text-zinc-300')
        document.getElementById('bulk-course-id')!.setAttribute('value', btn.dataset.courseId || '')
      })
      document.getElementById('bulk-enroll-confirm')?.addEventListener('click', async () => {
        const ids = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')).map(cb => cb.value)
        const courseId = (document.getElementById('bulk-course-id') as HTMLInputElement).value
        if (!courseId || !ids.length) return

        const { data: course } = await supabase.from('courses').select('price, name').eq('id', courseId).maybeSingle()
        const amount = course?.price != null ? parseFloat(course.price) : 15

        let ok = 0, fail = 0
        for (const pid of ids) {
          const { data: enr, error } = await supabase.from('enrollments').upsert({
            profile_id: pid, course_id: courseId, type: 'student', status: 'active',
          }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true }).select('id').maybeSingle()
          if (error) { fail++; continue }

          if (enr?.id) {
            const { data: profile } = await supabase.from('profiles').select('scholarship').eq('id', pid).maybeSingle()
            const payStatus = amount === 0 ? 'free' : profile?.scholarship ? 'scholarship' : 'pending'
            const { error: pe } = await supabase.from('payments').insert({
              profile_id: pid, enrollment_id: enr.id, type: 'student', status: payStatus, amount,
            })
            if (pe) { console.error('Error creating payment:', pe); fail++; continue }
          }
          ok++
        }
        document.getElementById('enroll-modal')!.classList.add('hidden')
        toast('success', `${ok} inscritos, ${fail} errores`)
        window.location.reload()
      })
    } catch (err) {
      console.error('Error loading students:', err)
      document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar estudiantes</p>'
    }
  })()
}
