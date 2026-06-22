import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachStudents(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachStudents(): void {
  ;(async () => {
    try {
      const [{ data: students }, { data: courses }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, riot_id, social_discord, rank, scholarship, is_active, created_at').eq('role', 'student').order('full_name'),
        supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order'),
      ])

      const studentIds = (students ?? []).map((s: any) => s.id)

      const [{ data: payments }, { data: enrollments }] = await Promise.all([
        studentIds.length > 0
          ? supabase.from('payments').select('profile_id, status, created_at').in('profile_id', studentIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        studentIds.length > 0
          ? supabase.from('enrollments').select('profile_id, status, courses!inner(name)').in('profile_id', studentIds)
          : Promise.resolve({ data: [] }),
      ])

      const paymentMap = new Map<string, string>()
      // Last payment by profile_id wins (ordered by created_at desc, then take first per profile)
      const sortedPays = (payments ?? []).sort((a: any, b: any) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0))
      for (const p of sortedPays) {
        if (!paymentMap.has(p.profile_id)) paymentMap.set(p.profile_id, p.status)
      }

      const enrollmentMap = new Map<string, { count: number; anyActive: boolean; courses: string[] }>()
      for (const e of enrollments ?? []) {
        const current = enrollmentMap.get(e.profile_id) || { count: 0, anyActive: false, courses: [] }
        current.count++
        if (e.status === 'active' || e.status === 'recovery') current.anyActive = true
        const courseName = (e as any).courses?.name
        if (courseName && !current.courses.includes(courseName)) current.courses.push(courseName)
        enrollmentMap.set(e.profile_id, current)
      }

      const html = `
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="font-heading text-2xl font-bold text-white">Estudiantes</h1>
            <p class="mt-1 text-sm text-zinc-500">${(students ?? []).length} estudiantes</p>
          </div>
        </div>

        <div id="bulk-bar" class="hidden mb-4 flex items-center gap-2 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-2.5">
          <span class="text-sm text-zinc-300" id="bulk-count">0 seleccionados</span>
          <div class="ml-auto flex gap-2">
            <button id="bulk-scholarship" class="rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition hover:bg-yellow-500/10">${Icon('dollarSign', 12)} Dar beca</button>
            <button id="bulk-uns-cholarship" class="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">${Icon('x', 12)} Quitar beca</button>
            <button id="bulk-enroll" class="rounded-lg border border-[#8B5CF6]/30 px-3 py-1.5 text-xs text-[#8B5CF6] transition hover:bg-[#8B5CF6]/10">${Icon('plus', 12)} Inscribir en curso</button>
            <button id="bulk-delete" class="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10">${Icon('trash', 12)} Eliminar</button>
          </div>
        </div>

        <div id="enroll-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
          <div class="glass max-w-md w-full mx-4 my-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
            <h3 class="mb-4 font-heading text-lg font-bold text-white">Inscribir seleccionados</h3>
            <select id="bulk-course-select" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar curso...</option>
              ${(courses ?? []).map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
            <p id="bulk-enroll-error" class="mt-2 hidden text-xs text-red-400"></p>
            <div class="flex gap-3 mt-4">
              <button id="bulk-enroll-confirm" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Inscribir</button>
              <button id="bulk-enroll-cancel" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="pb-3 pr-2 font-medium"><input type="checkbox" id="select-all" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"></th>
                <th class="pb-3 pr-4 font-medium"></th>
                <th class="pb-3 pr-4 font-medium">Nombre / Riot</th>
                <th class="pb-3 pr-4 font-medium">Email</th>
                <th class="pb-3 pr-4 font-medium">Rango</th>
                <th class="pb-3 pr-4 font-medium">Beca</th>
                <th class="pb-3 pr-4 font-medium">Pago</th>
                <th class="pb-3 pr-4 font-medium">Activo</th>
                <th class="pb-3 pr-4 font-medium">Cursos</th>
                <th class="pb-3 pr-4 font-medium">Registro</th>
                <th class="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              ${(students ?? []).length === 0
                ? '<tr><td colspan="12" class="pt-4 text-zinc-500">No hay estudiantes.</td></tr>'
                : (students ?? []).map((s: any) => {
                    const enrollment = enrollmentMap.get(s.id) || { count: 0, anyActive: false, courses: [] }
                    const paymentStatus = paymentMap.get(s.id)
                    const displayName = [s.riot_id || s.full_name, s.social_discord].filter(Boolean).join(' | ') || 'Desconocido'
                    const initial = (displayName || '?').charAt(0).toUpperCase()
                    return `
                      <tr class="border-b border-zinc-800/50">
                        <td class="py-3 pr-2"><input type="checkbox" class="student-cb h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(s.id)}"></td>
                        <td class="py-3 pr-4">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                            ${s.avatar_url ? `<img src="${escapeHtml(s.avatar_url)}" alt="" class="h-full w-full rounded-full object-cover" />` : escapeHtml(initial)}
                          </div>
                        </td>
                        <td class="py-3 pr-4"><a href="#/coaches/students/${escapeHtml(s.id)}" class="text-white hover:text-[#8B5CF6] transition">${escapeHtml(displayName)}</a></td>
                        <td class="py-3 pr-4 text-zinc-400">${escapeHtml(s.email || '-')}</td>
                        <td class="py-3 pr-4 text-zinc-400">${escapeHtml(s.rank || 'Unranked')}</td>
                        <td class="py-3 pr-4"><span class="text-xs ${s.scholarship ? 'text-yellow-400' : 'text-zinc-600'}">${s.scholarship ? 'Sí' : 'No'}</span></td>
                        <td class="py-3 pr-4">${paymentStatus ? `<span class="inline-block rounded-full px-2 py-0.5 text-xs ${paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${escapeHtml(paymentStatus)}</span>` : '<span class="text-xs text-zinc-600">—</span>'}</td>
                        <td class="py-3 pr-4"><span class="inline-block h-2.5 w-2.5 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-red-500'}"></span></td>
                        <td class="py-3 pr-4 text-zinc-400 text-xs max-w-[120px] truncate" title="${escapeHtml(enrollment.courses.join(', '))}">${enrollment.count > 0 ? escapeHtml(enrollment.courses.join(', ')) : '—'}</td>
                        <td class="py-3 text-zinc-500 text-xs">${formatDate(s.created_at)}</td>
                        <td class="py-3 pl-2">${!s.is_active ? '<button class="hard-delete-student rounded border border-red-700 px-2 py-1 text-[10px] text-red-400 hover:bg-red-900/30 transition" data-id="' + s.id + '" data-name="' + escapeHtml(displayName) + '">' + Icon('trash', 10) + ' Eliminar</button>' : ''}</td>
                      </tr>`
                  }).join('')
              }
            </tbody>
          </table>
        </div>`

      document.getElementById('page-content')!.innerHTML = html
      initBulkActions(students ?? [])
    } catch (err) {
      console.error('Error loading students:', err)
      document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar estudiantes</p>'
    }
  })()
}

function initBulkActions(students: any[]): void {
  const cbs = document.querySelectorAll<HTMLInputElement>('.student-cb')
  const selectAll = document.getElementById('select-all') as HTMLInputElement
  const bulkBar = document.getElementById('bulk-bar')!
  const bulkCount = document.getElementById('bulk-count')!

  function updateBulkBar() {
    const checked = document.querySelectorAll<HTMLInputElement>('.student-cb:checked')
    bulkCount.textContent = `${checked.length} seleccionados`
    bulkBar.classList.toggle('hidden', checked.length === 0)
  }

  selectAll?.addEventListener('change', () => {
    cbs.forEach(cb => cb.checked = selectAll.checked)
    updateBulkBar()
  })

  cbs.forEach(cb => cb.addEventListener('change', updateBulkBar))

  function getSelectedIds(): string[] {
    return [...document.querySelectorAll<HTMLInputElement>('.student-cb:checked')].map(cb => cb.value)
  }

  // Bulk scholarship toggle
  document.getElementById('bulk-scholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Dar beca a ${ids.length} estudiantes?`))) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: true }).eq('id', id)
      await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', id).eq('status', 'pending')
    }
    toast('success', `Beca asignada a ${ids.length} estudiantes`)
    window.location.reload()
  })

  document.getElementById('bulk-uns-cholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Quitar beca a ${ids.length} estudiantes?`))) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: false }).eq('id', id)
      await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', id).eq('status', 'scholarship')
    }
    toast('success', `Beca quitada a ${ids.length} estudiantes`)
    window.location.reload()
  })

  // Bulk enroll
  document.getElementById('bulk-enroll')?.addEventListener('click', () => {
    document.getElementById('enroll-modal')!.classList.remove('hidden')
  })
  document.getElementById('bulk-enroll-cancel')?.addEventListener('click', () => {
    document.getElementById('enroll-modal')!.classList.add('hidden')
  })
  document.getElementById('bulk-enroll-confirm')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    const courseId = (document.getElementById('bulk-course-select') as HTMLSelectElement).value
    if (!courseId || !ids.length) return
    let ok = 0, fail = 0
    for (const pid of ids) {
      const { error } = await supabase.from('enrollments').upsert({
        profile_id: pid, course_id: courseId, type: 'student', status: 'active',
      }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true })
      if (error) fail++
      else ok++
    }
    document.getElementById('enroll-modal')!.classList.add('hidden')
    toast('success', `${ok} inscritos, ${fail} errores`)
    window.location.reload()
  })

  // Bulk delete (soft: set inactive)
  document.getElementById('bulk-delete')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Desactivar ${ids.length} estudiantes?`))) return
    let ok = 0, fail = 0
    for (const id of ids) {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
      if (error) fail++
      else ok++
    }
    toast('success', `${ok} desactivados, ${fail} errores`)
    window.location.reload()
  })

  // Hard delete individual inactive students
  document.querySelectorAll('.hard-delete-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      const name = (btn as HTMLElement).dataset.name
      if (!id || !(await confirmDialog(`¿Eliminar PERMANENTEMENTE a ${name}? Se borrarán todos sus datos (inscripciones, pagos, respuestas). Esta acción NO se puede deshacer.`, 'Eliminar permanentemente'))) return
      const { error } = await supabase.from('profiles').delete().eq('id', id).eq('is_active', false)
      if (error) { toast('error', error.message); return }
      toast('success', 'Estudiante eliminado permanentemente')
      window.location.reload()
    })
  })
}
