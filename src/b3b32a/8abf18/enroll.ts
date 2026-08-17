import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachEnroll(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEnroll(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id

    const assignedIds = await getAssignedCourseIds(coachId)
    const hasAssignments = assignedIds.length > 0

    // Show ALL active courses (free and paid)
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, price, course_type')
      .eq('is_active', true)
      .order('display_order')
    const allCourses = courses ?? []

    // Courses that can actually be enrolled (assigned to this coach, or all if no assignments)
    let enrollableCourseIds: string[]
    if (hasAssignments) {
      enrollableCourseIds = assignedIds
    } else {
      enrollableCourseIds = allCourses.map((c: any) => c.id)
    }
    const enrollableSet = new Set(enrollableCourseIds)

    // Students logic:
    // 1. Students enrolled in THIS coach's assigned courses
    // 2. Students who ONLY have free courses (no paid courses) — unassigned students
    // 3. Exclude students enrolled in paid courses NOT assigned to this coach
    const paidCourseIds = allCourses.filter((c: any) => c.price > 0).map((c: any) => c.id)
    const paidIdFilter = paidCourseIds.length > 0 ? paidCourseIds : ['00000000-0000-0000-0000-000000000000']
    const assignedPaidIds = allCourses.filter((c: any) => enrollableSet.has(c.id) && c.price > 0).map((c: any) => c.id)
    const assignedPaidFilter = assignedPaidIds.length > 0 ? assignedPaidIds : ['00000000-0000-0000-0000-000000000000']

    // Get all students with their paid course enrollments
    const { data: allEnrolls } = await supabase
      .from('enrollments')
      .select('profile_id, course_id')
      .in('course_id', paidIdFilter)
      .in('status', ['active', 'recovery'])
    const studentsWithPaid = new Set((allEnrolls ?? []).map((e: any) => e.profile_id))

    // Get students in this coach's assigned paid courses
    const { data: myEnrolls } = await supabase
      .from('enrollments')
      .select('profile_id')
      .in('course_id', assignedPaidFilter)
      .in('status', ['active', 'recovery'])
    const myStudentIds = new Set((myEnrolls ?? []).map((e: any) => e.profile_id))

    // Get all active students
    const { data: sRes } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, email, avatar_url, riot_id, social_discord, platform')
      .in('role', ['student', 'player'])
      .eq('is_active', true)
      .order('full_name')
    const allProfiles = sRes ?? []

    // Split: my students vs students with ONLY free courses
    const myStudents = allProfiles.filter((s: any) => myStudentIds.has(s.id))
    const freeOnlyStudents = allProfiles.filter((s: any) => !myStudentIds.has(s.id) && !studentsWithPaid.has(s.id))

    const allDisplayStudents = [...myStudents, ...freeOnlyStudents]
    const studentIds = allDisplayStudents.map((s: any) => s.id)
    const sidFilter = studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000']
    const allCourseIds = allCourses.map((c: any) => c.id)
    const cidFilter = allCourseIds.length > 0 ? allCourseIds : ['00000000-0000-0000-0000-000000000000']
    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('profile_id, course_id, course_type')
      .in('profile_id', sidFilter)
      .in('course_id', cidFilter)
      .in('status', ['active', 'recovery'])

    const enrolledMap = new Map<string, Set<string>>()
    const studentModeMap = new Map<string, string>() // studentId -> courseType (from first enrollment)
    for (const e of enrolls ?? []) {
      if (!enrolledMap.has(e.profile_id)) enrolledMap.set(e.profile_id, new Set())
      enrolledMap.get(e.profile_id)!.add(e.course_id)
      // Use the first enrollment's course_type for the student's mode toggle
      if (!studentModeMap.has(e.profile_id)) studentModeMap.set(e.profile_id, e.course_type || 'group')
    }

    // Pending changes tracker
    type Change = { studentId: string; courseId: string; enroll: boolean; type: string; courseType: string }
    type ModeChange = { studentId: string; courseId: string; courseType: string }
    let pendingChanges: Change[] = []
    let pendingModes: ModeChange[] = []
    const pendingSet = new Set<string>() // "studentId-courseId" for quick lookup
    const modeSet = new Set<string>() // "studentId-courseId" for mode changes

    // Store original mode for each enrolled student
    const originalModeMap = new Map<string, string>() // "studentId-courseId" -> 'group'|'individual'|'intensive'
    for (const e of enrolls ?? []) {
      originalModeMap.set(e.profile_id + '-' + e.course_id, e.course_type || 'group')
    }

    function updateSaveBar(): void {
      const bar = document.getElementById('enroll-save-bar')
      const count = document.getElementById('enroll-changes-count')
      if (!bar || !count) return
      const n = pendingChanges.length + pendingModes.length
      if (n > 0) {
        bar.classList.remove('hidden')
        count.textContent = `${n} cambio${n !== 1 ? 's' : ''} pendiente${n !== 1 ? 's' : ''}`
      } else {
        bar.classList.add('hidden')
      }
    }

    function toggleEnroll(studentId: string, courseId: string, enroll: boolean): void {
      const key = studentId + '-' + courseId
      const typeEl = document.querySelector<HTMLInputElement>(`.enroll-player-type[data-student="${studentId}"]`)
      const type = typeEl?.checked ? 'player' : 'student'
      const modeBtn = document.querySelector<HTMLElement>(`.enroll-mode-selector[data-student="${studentId}"] .enroll-mode-btn[data-mode].bg-`)
      const courseType = modeBtn?.dataset.mode || 'group'

      if (pendingSet.has(key)) {
        // Remove existing pending change
        pendingChanges = pendingChanges.filter(c => !(c.studentId === studentId && c.courseId === courseId))
        pendingSet.delete(key)
      }

      // Only add if it changes the current state
      const isCurrentlyEnrolled = enrolledMap.get(studentId)?.has(courseId)
      if (enroll !== isCurrentlyEnrolled) {
        pendingChanges.push({ studentId, courseId, enroll, type, courseType })
        pendingSet.add(key)
      }

      // Update badge visual
      const badge = document.querySelector<HTMLElement>(`.course-badge[data-student="${studentId}"][data-course="${courseId}"]`)
      if (badge) {
        if (enroll) {
          badge.classList.remove('bg-zinc-800', 'text-zinc-600')
          badge.classList.add('bg-amber-500/30', 'text-amber-400', 'pending-enroll')
        } else {
          badge.classList.remove('bg-green-500/20', 'text-green-400')
          badge.classList.add('bg-red-500/30', 'text-red-400', 'pending-enroll')
        }
        badge.dataset.pending = enroll ? 'enroll' : 'unenroll'
      }
      updateSaveBar()
    }

    const coachCourses = allCourses.filter((c: any) => enrollableSet.has(c.id))
    const courseFilterHtml = coachCourses.map((c: any) => {
      const isIndividual = c.course_type === 'individual'
      const isIntensive = c.course_type === 'intensive'
      const typeColor = isIntensive ? 'border-red-500/40 bg-red-500/10' : isIndividual ? 'border-amber-500/40 bg-amber-500/10' : 'border-[#8B5CF6]/30 bg-[#8B5CF6]/15'
      const typeLabel = isIntensive ? 'Intensivo' : isIndividual ? '1a1' : 'Equipo'
      const typeLabelColor = isIntensive ? 'text-red-400' : isIndividual ? 'text-amber-400' : 'text-zinc-500'
      return `
      <div class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition select-none enroll-course-filter-wrap ${typeColor}"
        data-course-id="${escapeHtml(c.id)}" data-active="1" data-course-type="${isIntensive ? 'intensive' : isIndividual ? 'individual' : 'group'}">
        <button class="enroll-course-filter flex items-center gap-1.5" data-course-id="${escapeHtml(c.id)}">
          ${Icon('checkCircle', 14)}
          <span>${escapeHtml(c.name)}</span>
        </button>
        <span class="mx-1 text-zinc-600">|</span>
        <label class="relative inline-flex cursor-pointer items-center enroll-mode-toggle" data-course-id="${escapeHtml(c.id)}">
          <input type="checkbox" class="peer sr-only" ${isIndividual || isIntensive ? 'checked' : ''} />
          <div class="h-4 w-7 rounded-full bg-zinc-700 after:absolute after:start-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all peer-checked:bg-amber-500 peer-checked:after:translate-x-full"></div>
          <span class="ml-1.5 text-[10px] ${typeLabelColor}">${typeLabel}</span>
        </label>
      </div>`
    }).join('')

    function fmtProfile(p: any): string {
      const parts = [p.riot_id, p.social_discord, p.display_name, p.full_name].filter(Boolean)
      return parts.join(' | ')
    }

    function renderTableRows(students: any[]): string {
      return students.map((s: any) => {
      const initial = (s.full_name || '?').charAt(0).toUpperCase()
      const platformBadge = s.platform === 'mobile'
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
      return `
      <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30">
        <td class="py-3 px-4"><input type="checkbox" class="enroll-student-cb h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(s.id)}"></td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">
              ${s.avatar_url ? `<img src="${escapeHtml(s.avatar_url)}" alt="" class="h-full w-full object-cover" />` : escapeHtml(initial)}
            </div>
            <div class="min-w-0">
              <span class="text-sm text-white">${escapeHtml(fmtProfile(s))}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-zinc-400 hidden md:table-cell">${escapeHtml(s.email || '')}</td>
        <td class="py-3 px-4">${platformBadge}</td>
        <td class="py-3 px-4">
          <div class="flex flex-wrap gap-1">
            ${allCourses.map((c: any) => {
              const enr = enrolledMap.get(s.id)?.has(c.id)
              return `<span class="course-badge inline-block rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition ${enr ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-600'}" data-student="${escapeHtml(s.id)}" data-course="${escapeHtml(c.id)}">${escapeHtml(c.name)}</span>`
            }).join('')}
          </div>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-3">
            ${(() => {
              const currentMode = studentModeMap.get(s.id) || 'group'
              return `
            <div class="enroll-mode-selector inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5" data-student="${escapeHtml(s.id)}">
              <button type="button" class="enroll-mode-btn rounded-md px-2 py-1 text-[10px] font-medium transition ${currentMode === 'group' ? 'bg-[#8B5CF6]/20 text-[#C4B5FD]' : 'text-zinc-500 hover:text-zinc-300'}" data-mode="group">Equipo</button>
              <button type="button" class="enroll-mode-btn rounded-md px-2 py-1 text-[10px] font-medium transition ${currentMode === 'individual' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}" data-mode="individual">1a1</button>
              <button type="button" class="enroll-mode-btn rounded-md px-2 py-1 text-[10px] font-medium transition ${currentMode === 'intensive' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'}" data-mode="intensive">Intensivo</button>
            </div>`
            })()}
            <label class="relative inline-flex cursor-pointer items-center w-[68px]">
              <input type="checkbox" class="enroll-player-type peer sr-only" data-student="${escapeHtml(s.id)}" />
              <div class="h-5 w-9 shrink-0 rounded-full bg-zinc-700 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#8B5CF6] peer-checked:after:translate-x-full"></div>
              <span class="ml-2 w-8 text-[10px] text-zinc-500 peer-checked:text-[#8B5CF6]">Player</span>
            </label>
          </div>
        </td>
      </tr>`
    }).join('')
    }

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="kicker">Matrícula de alumnos</span>
          <h1 class="font-heading text-2xl font-bold text-white">Inscribir</h1>
          <p class="mt-1 text-sm text-zinc-500">Selecciona alumnos y haz clic en los cursos para marcar cambios. Despu\u00e9s presiona "Guardar cambios".</p>
        </div>
        <div class="flex items-center gap-3">
          <select id="bulk-course-select" class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Curso para todos...</option>
            ${allCourses.map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <button id="btn-mark-all" class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition">${Icon('plus', 14)} Marcar todos</button>
        </div>
      </div>

      <div id="enroll-save-bar" class="mb-4 hidden flex items-center justify-between rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-3">
        <span class="text-sm text-zinc-300"><span id="enroll-changes-count">0 cambios pendientes</span></span>
        <div class="flex gap-2">
          <button id="btn-discard-enroll" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Descartar</button>
          <button id="btn-save-enroll" class="rounded-lg bg-[#8B5CF6] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 12)} Guardar cambios</button>
        </div>
      </div>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span class="text-xs text-zinc-500">Filtro cursos:</span>
        ${courseFilterHtml}
        <span class="mx-2 text-zinc-700">|</span>
        <label class="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" id="select-all-enroll" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]">
          Seleccionar todos
        </label>
      ${myStudents.length > 0 ? `
      <div class="w-full mb-6">
        <h2 class="mb-3 font-heading text-base font-bold text-white">Mis alumnos</h2>
        <div class="w-full rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th class="py-3 px-4 font-medium w-10"></th>
                  <th class="py-3 px-4 font-medium">Nombre</th>
                  <th class="py-3 px-4 font-medium hidden md:table-cell">Email</th>
                  <th class="py-3 px-4 font-medium">Plataforma</th>
                  <th class="py-3 px-4 font-medium">Cursos</th>
                  <th class="py-3 px-4 font-medium text-right w-32">Modo · Tipo</th>
                </tr>
              </thead>
              <tbody>${renderTableRows(myStudents)}</tbody>
            </table>
          </div>
        </div>
      </div>` : ''}
      ${freeOnlyStudents.length > 0 ? `
      <div class="w-full">
        <h2 class="mb-3 font-heading text-base font-bold text-zinc-400">Alumnos sin curso asignado (solo cursos gratuitos)</h2>
        <div class="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th class="py-3 px-4 font-medium w-10"></th>
                  <th class="py-3 px-4 font-medium">Nombre</th>
                  <th class="py-3 px-4 font-medium hidden md:table-cell">Email</th>
                  <th class="py-3 px-4 font-medium">Plataforma</th>
                  <th class="py-3 px-4 font-medium">Cursos</th>
                  <th class="py-3 px-4 font-medium text-right w-32">Modo · Tipo</th>
                </tr>
              </thead>
              <tbody>${renderTableRows(freeOnlyStudents)}</tbody>
            </table>
          </div>
        </div>
      </div>` : ''}`

    // Click badge to toggle pending change
    document.querySelectorAll('.course-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const el = badge as HTMLElement
        const sid = el.dataset.student
        const cid = el.dataset.course
        if (!sid || !cid) return
        if (!enrollableSet.has(cid)) { toast('warning', 'No tienes este curso asignado'); return }
        const isCurrentlyEnrolled = enrolledMap.get(sid)?.has(cid)
        toggleEnroll(sid, cid, !isCurrentlyEnrolled)
      })
    })

    // Mark all selected students for the selected course
    document.getElementById('btn-mark-all')?.addEventListener('click', () => {
      const courseId = (document.getElementById('bulk-course-select') as HTMLSelectElement).value
      if (!courseId) { toast('warning', 'Selecciona un curso primero'); return }
      const selected = Array.from(document.querySelectorAll<HTMLInputElement>('.enroll-student-cb:checked')).map(cb => cb.value)
      if (selected.length === 0) { toast('warning', 'Selecciona al menos un alumno'); return }
      for (const sid of selected) {
        toggleEnroll(sid, courseId, true)
      }
    })

    // Save all pending changes
    document.getElementById('btn-save-enroll')?.addEventListener('click', async () => {
      const changes = [...pendingChanges]
      const modes = [...pendingModes]
      if (changes.length === 0 && modes.length === 0) return
      ;(window as any).__blockReload = true
      const btn = document.getElementById('btn-save-enroll') as HTMLButtonElement
      btn.disabled = true
      btn.textContent = 'Guardando...'
      let ok = 0, fail = 0
      // Group by course + courseType for batch processing
      const enrollByCourse = new Map<string, { ids: string[]; type: string; courseType: string }>()
      const unenrollByCourse = new Map<string, string[]>()
      for (const c of changes) {
        if (c.enroll) {
          const groupKey = c.courseId + '|' + c.courseType
          if (!enrollByCourse.has(groupKey)) enrollByCourse.set(groupKey, { ids: [], type: c.type, courseType: c.courseType })
          enrollByCourse.get(groupKey)!.ids.push(c.studentId)
        } else {
          if (!unenrollByCourse.has(c.courseId)) unenrollByCourse.set(c.courseId, [])
          unenrollByCourse.get(c.courseId)!.push(c.studentId)
        }
      }

      // Process unenrollments by course
      for (const [cid, sids] of unenrollByCourse) {
        const { data: enrs } = await supabase.from('enrollments').select('id').in('profile_id', sids).eq('course_id', cid)
        const eids = (enrs ?? []).map((e: any) => e.id)
        if (eids.length > 0) {
          await supabase.from('payments').delete().in('enrollment_id', eids)
          await supabase.from('enrollments').delete().in('id', eids)
        }
        ok += sids.length
      }

      // Process enrollments by course + courseType
      for (const [groupKey, data] of enrollByCourse) {
        const cid = groupKey.split('|')[0]
        const { data: result, error } = await supabase.rpc('batch_enroll', {
          p_student_ids: data.ids,
          p_course_id: cid,
          p_type: data.type,
          p_course_type: data.courseType,
        })
        if (error) {
          fail += data.ids.length
          toast('error', 'Error batch: ' + error.message)
        } else {
          for (const r of result ?? []) {
            if (r.ok) ok++
            else fail++
          }
        }
      }

      // Process mode changes: update enrollment.course_type + payment.amount
      for (const m of modes) {
        const priceMap: Record<string, number> = { group: 15, individual: 20, intensive: 50 }
        const newAmount = priceMap[m.courseType] ?? 15
        const { data: enr } = await supabase.from('enrollments').select('id').eq('profile_id', m.studentId).eq('course_id', m.courseId).maybeSingle()
        if (enr?.id) {
          await supabase.from('enrollments').update({ course_type: m.courseType }).eq('id', enr.id)
          await supabase.from('payments').update({ amount: newAmount }).eq('enrollment_id', enr.id)
          ok++
        } else {
          fail++
        }
      }
      if (fail > 0) toast('warning', `${ok} exitoso${ok !== 1 ? 's' : ''}, ${fail} error${fail !== 1 ? 'es' : ''}`)
      else toast('success', `${ok} cambio${ok !== 1 ? 's' : ''} guardado${ok !== 1 ? 's' : ''}`)
      pendingChanges = []
      pendingModes = []
      pendingSet.clear()
      modeSet.clear()
      ;(window as any).__blockReload = false
      initCoachEnroll()
    })

    // Discard changes
    document.getElementById('btn-discard-enroll')?.addEventListener('click', () => {
      pendingChanges = []
      pendingModes = []
      pendingSet.clear()
      modeSet.clear()
      // Reset badges
      document.querySelectorAll<HTMLElement>('.course-badge.pending-enroll').forEach(badge => {
        const sid = badge.dataset.student
        const cid = badge.dataset.course
        if (!sid || !cid) return
        const enr = enrolledMap.get(sid)?.has(cid)
        badge.className = `course-badge inline-block rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition ${enr ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-600'}`
        badge.dataset.pending = ''
      })
      // Reset mode selectors to original state
      document.querySelectorAll<HTMLElement>('.enroll-mode-selector').forEach(selector => {
        const sid = selector.dataset.student
        if (!sid) return
        const enrolledCourses = enrolledMap.get(sid)
        if (!enrolledCourses) return
        const firstCourse = [...enrolledCourses][0]
        const origType = originalModeMap.get(sid + '-' + firstCourse) || 'group'
        selector.querySelectorAll('.enroll-mode-btn').forEach(btn => {
          const mode = (btn as HTMLElement).dataset.mode
          btn.classList.remove('bg-[#8B5CF6]/20', 'text-[#C4B5FD]', 'bg-amber-500/20', 'text-amber-400', 'bg-red-500/20', 'text-red-400')
          btn.classList.add('text-zinc-500')
          if (mode === origType) {
            btn.classList.remove('text-zinc-500')
            if (mode === 'group') btn.classList.add('bg-[#8B5CF6]/20', 'text-[#C4B5FD]')
            else if (mode === 'individual') btn.classList.add('bg-amber-500/20', 'text-amber-400')
            else if (mode === 'intensive') btn.classList.add('bg-red-500/20', 'text-red-400')
          }
        })
      })
      updateSaveBar()
    })

    // Select all
    document.getElementById('select-all-enroll')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked
      document.querySelectorAll<HTMLInputElement>('.enroll-student-cb').forEach(cb => cb.checked = checked)
    })

    // Mode selector: 3-option segmented control (Equipo/1a1/Intensivo)
    document.querySelectorAll<HTMLElement>('.enroll-mode-selector').forEach(selector => {
      selector.querySelectorAll('.enroll-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = selector.dataset.student
          if (!sid) return
          const newMode = (btn as HTMLElement).dataset.mode || 'group'

          // Update button styles
          selector.querySelectorAll('.enroll-mode-btn').forEach(b => {
            b.classList.remove('bg-[#8B5CF6]/20', 'text-[#C4B5FD]', 'bg-amber-500/20', 'text-amber-400', 'bg-red-500/20', 'text-red-400')
            b.classList.add('text-zinc-500')
          })
          btn.classList.remove('text-zinc-500')
          if (newMode === 'group') { btn.classList.add('bg-[#8B5CF6]/20', 'text-[#C4B5FD]') }
          else if (newMode === 'individual') { btn.classList.add('bg-amber-500/20', 'text-amber-400') }
          else if (newMode === 'intensive') { btn.classList.add('bg-red-500/20', 'text-red-400') }

          // Track mode change for already-enrolled students
          const enrolledCourses = enrolledMap.get(sid)
          if (!enrolledCourses) return
          for (const cid of enrolledCourses) {
            const key = sid + '-' + cid
            const origType = originalModeMap.get(key) || 'group'
            if (newMode !== origType) {
              if (!modeSet.has(key)) {
                pendingModes.push({ studentId: sid, courseId: cid, courseType: newMode })
                modeSet.add(key)
              } else {
                const existing = pendingModes.find(m => m.studentId === sid && m.courseId === cid)
                if (existing) existing.courseType = newMode
              }
            } else {
              pendingModes = pendingModes.filter(m => !(m.studentId === sid && m.courseId === cid))
              modeSet.delete(key)
            }
          }
          updateSaveBar()
        })
      })
    })

    // Course filter toggles
    document.querySelectorAll('.enroll-course-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const wrapper = (btn as HTMLElement).closest('.enroll-course-filter-wrap') as HTMLElement
        if (!wrapper) return
        const cid = wrapper.dataset.courseId
        const active = wrapper.dataset.active === '1'
        wrapper.dataset.active = active ? '0' : '1'
        wrapper.classList.toggle('border-dashed', active)
        wrapper.classList.toggle('border-[#8B5CF6]/30', !active)
        wrapper.classList.toggle('bg-[#8B5CF6]/15', !active)
        wrapper.classList.toggle('bg-zinc-800/40', active)
        wrapper.classList.toggle('text-zinc-500', active)
        document.querySelectorAll<HTMLElement>('.course-badge').forEach(badge => {
          if (badge.dataset.course === cid) badge.classList.toggle('opacity-30', active)
        })
      })
    })

    // Course mode toggle: Equipo ↔ 1 a 1
    document.querySelectorAll('.enroll-mode-toggle').forEach(toggle => {
      toggle.addEventListener('click', async (e) => {
        e.stopPropagation()
        const el = toggle as HTMLElement
        const cid = el.dataset.courseId
        const input = el.querySelector('input') as HTMLInputElement
        const label = el.querySelector('span:last-child') as HTMLSpanElement
        const wrapper = el.closest('.enroll-course-filter-wrap') as HTMLElement
        if (!cid || !input || !label) return
        const isIndividual = input.checked
        const newType = isIndividual ? 'individual' : 'group'
        const { error } = await supabase.from('courses').update({ course_type: newType }).eq('id', cid)
        if (error) { toast('error', 'Error al cambiar modo: ' + error.message); return }
        if (wrapper) {
          wrapper.dataset.courseType = newType
          wrapper.classList.toggle('border-amber-500/40', isIndividual)
          wrapper.classList.toggle('bg-amber-500/10', isIndividual)
          wrapper.classList.toggle('border-[#8B5CF6]/30', !isIndividual)
          wrapper.classList.toggle('bg-[#8B5CF6]/15', !isIndividual)
        }
        label.textContent = isIndividual ? '1a1' : 'Equipo'
        label.classList.toggle('text-amber-400', isIndividual)
        label.classList.toggle('text-zinc-500', !isIndividual)
        toast('success', `${allCourses.find((c: any) => c.id === cid)?.name || ''}: modo ${isIndividual ? '1 a 1 ($20/hr)' : 'Equipo ($15/mes)'}`)
      })
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
