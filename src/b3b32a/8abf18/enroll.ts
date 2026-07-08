import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { createEnrollmentWithPayment } from '@/2b3583/course_utils'

export function renderCoachEnroll(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEnroll(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [studentsRes, coursesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, avatar_url').in('role', ['student', 'player']).eq('is_active', true).order('full_name'),
      supabase.from('courses').select('id, name, price').eq('is_active', true).order('display_order'),
    ])

    const students = studentsRes.data ?? []
    const courses = coursesRes.data ?? []

    const studentIds = students.map((s: any) => s.id)
    const sidFilter = studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000']
    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('profile_id, course_id')
      .in('profile_id', sidFilter)
      .in('status', ['active', 'recovery'])

    const enrolledMap = new Map<string, Set<string>>()
    for (const e of enrolls ?? []) {
      if (!enrolledMap.has(e.profile_id)) enrolledMap.set(e.profile_id, new Set())
      enrolledMap.get(e.profile_id)!.add(e.course_id)
    }

    // Pending changes tracker
    type Change = { studentId: string; courseId: string; enroll: boolean; type: string }
    let pendingChanges: Change[] = []
    const pendingSet = new Set<string>() // "studentId-courseId" for quick lookup

    function updateSaveBar(): void {
      const bar = document.getElementById('enroll-save-bar')
      const count = document.getElementById('enroll-changes-count')
      if (!bar || !count) return
      const n = pendingChanges.length
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

      if (pendingSet.has(key)) {
        // Remove existing pending change
        pendingChanges = pendingChanges.filter(c => !(c.studentId === studentId && c.courseId === courseId))
        pendingSet.delete(key)
      }

      // Only add if it changes the current state
      const isCurrentlyEnrolled = enrolledMap.get(studentId)?.has(courseId)
      if (enroll !== isCurrentlyEnrolled) {
        pendingChanges.push({ studentId, courseId, enroll, type })
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

    const courseFilterHtml = courses.map((c: any) => `
      <button class="enroll-course-filter flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
      </button>
    `).join('')

    const tableRows = students.map((s: any) => {
      const initial = (s.full_name || '?').charAt(0).toUpperCase()
      return `
      <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30">
        <td class="py-3 px-4"><input type="checkbox" class="enroll-student-cb h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(s.id)}"></td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">
              ${s.avatar_url ? `<img src="${escapeHtml(s.avatar_url)}" alt="" class="h-full w-full object-cover" />` : escapeHtml(initial)}
            </div>
            <span class="text-sm text-white">${escapeHtml(s.full_name || '')}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-zinc-400 hidden md:table-cell">${escapeHtml(s.email || '')}</td>
        <td class="py-3 px-4">
          <div class="flex flex-wrap gap-1">
            ${courses.map((c: any) => {
              const enr = enrolledMap.get(s.id)?.has(c.id)
              return `<span class="course-badge inline-block rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition ${enr ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-600'}" data-student="${escapeHtml(s.id)}" data-course="${escapeHtml(c.id)}">${escapeHtml(c.name)}</span>`
            }).join('')}
          </div>
        </td>
        <td class="py-3 px-4 text-right">
          <label class="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" class="enroll-player-type peer sr-only" data-student="${escapeHtml(s.id)}" />
            <div class="h-5 w-9 rounded-full bg-zinc-700 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#8B5CF6] peer-checked:after:translate-x-full"></div>
            <span class="ml-2 text-[10px] text-zinc-500 peer-checked:text-[#8B5CF6]">Player</span>
          </label>
        </td>
      </tr>`
    }).join('')

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Inscribir</h1>
          <p class="mt-1 text-sm text-zinc-500">Selecciona alumnos y haz clic en los cursos para marcar cambios. Despu\u00e9s presiona "Guardar cambios".</p>
        </div>
        <div class="flex items-center gap-3">
          <select id="bulk-course-select" class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Curso para todos...</option>
            ${courses.map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
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
      </div>
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-3 px-4 font-medium w-10"></th>
                <th class="py-3 px-4 font-medium">Nombre</th>
                <th class="py-3 px-4 font-medium hidden md:table-cell">Email</th>
                <th class="py-3 px-4 font-medium">Cursos</th>
                <th class="py-3 px-4 font-medium text-right w-20">Tipo</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`

    // Click badge to toggle pending change
    document.querySelectorAll('.course-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const el = badge as HTMLElement
        const sid = el.dataset.student
        const cid = el.dataset.course
        if (!sid || !cid) return
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
      if (pendingChanges.length === 0) return
      const btn = document.getElementById('btn-save-enroll') as HTMLButtonElement
      btn.disabled = true
      btn.textContent = 'Guardando...'
      let ok = 0, fail = 0
      for (const c of pendingChanges) {
        if (c.enroll) {
          const result = await createEnrollmentWithPayment(c.studentId, c.courseId, c.type)
          if ('error' in result) { fail++ } else { ok++ }
        } else {
          const { data: enrs } = await supabase.from('enrollments').select('id').eq('profile_id', c.studentId).eq('course_id', c.courseId)
          const eids = (enrs ?? []).map((e: any) => e.id)
          if (eids.length > 0) {
            await supabase.from('payments').delete().in('enrollment_id', eids)
            await supabase.from('enrollments').delete().eq('profile_id', c.studentId).eq('course_id', c.courseId)
          }
          ok++
        }
      }
      if (fail > 0) toast('warning', `${ok} exitoso${ok !== 1 ? 's' : ''}, ${fail} error${fail !== 1 ? 'es' : ''}`)
      else toast('success', `${ok} cambio${ok !== 1 ? 's' : ''} guardado${ok !== 1 ? 's' : ''}`)
      initCoachEnroll()
    })

    // Discard changes
    document.getElementById('btn-discard-enroll')?.addEventListener('click', () => {
      pendingChanges = []
      pendingSet.clear()
      // Reset badges
      document.querySelectorAll<HTMLElement>('.course-badge.pending-enroll').forEach(badge => {
        const sid = badge.dataset.student
        const cid = badge.dataset.course
        if (!sid || !cid) return
        const enr = enrolledMap.get(sid)?.has(cid)
        badge.className = `course-badge inline-block rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition ${enr ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-600'}`
        badge.dataset.pending = ''
      })
      updateSaveBar()
    })

    // Select all
    document.getElementById('select-all-enroll')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked
      document.querySelectorAll<HTMLInputElement>('.enroll-student-cb').forEach(cb => cb.checked = checked)
    })

    // Course filter toggles
    document.querySelectorAll('.enroll-course-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLElement
        const cid = el.dataset.courseId
        const active = el.dataset.active === '1'
        el.dataset.active = active ? '0' : '1'
        el.classList.toggle('bg-[#8B5CF6]/15', !active)
        el.classList.toggle('text-[#8B5CF6]', !active)
        el.classList.toggle('border-[#8B5CF6]/30', !active)
        el.classList.toggle('bg-zinc-800/40', active)
        el.classList.toggle('text-zinc-500', active)
        el.classList.toggle('border-dashed', active)
        el.innerHTML = active ? `${Icon('plus', 12)} <span>${escapeHtml(courses.find((c: any) => c.id === cid)?.name || '')}</span>` : `${Icon('checkCircle', 14)} <span>${escapeHtml(courses.find((c: any) => c.id === cid)?.name || '')}</span>`
        document.querySelectorAll<HTMLElement>('.course-badge').forEach(badge => {
          if (badge.dataset.course === cid) badge.classList.toggle('opacity-30', active)
        })
      })
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
