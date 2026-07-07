import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'
import { createEnrollmentWithPayment } from '@/2b3583/course_utils'

export function renderCoachStudentDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachStudentDetail(): void {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  ;(async () => {
    try {
      const [{ data: profile }, { data: enrollData }, { data: courses }, { data: payments }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('enrollments').select('*, courses(name, slug, min_rank, display_order)').eq('profile_id', id).order('enrolled_at', { ascending: false }),
        supabase.from('courses').select('id, name, display_order, min_rank').eq('is_active', true).order('display_order'),
        supabase.from('payments').select('status, amount, enrollment_id').eq('profile_id', id),
      ])

      // Track recent student visit
      try {
        const raw = localStorage.getItem('recentStudents')
        const recent: { id: string; name: string; ts: number }[] = raw ? JSON.parse(raw) : []
        const name = profile?.display_name || profile?.full_name || profile?.email || 'Alumno'
        const existing = recent.findIndex((r: any) => r.id === id)
        if (existing !== -1) recent.splice(existing, 1)
        recent.push({ id, name, ts: Date.now() })
        localStorage.setItem('recentStudents', JSON.stringify(recent.slice(-20)))
      } catch {}

      if (!profile) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-400">Estudiante no encontrado.</p>'
        return
      }

      const enrollments = (enrollData ?? []) as any[]
      const paymentByEnroll = new Map<string, string>()
      for (const p of payments ?? []) {
        const key = p.enrollment_id || 'none'
        if (!paymentByEnroll.has(key)) {
          if (p.status === 'paid' || p.status === 'scholarship') paymentByEnroll.set(key, 'paid')
          else paymentByEnroll.set(key, p.status)
        }
      }

      const enrolledCourseIds = enrollments.map((e: any) => e.course_id)
      const { data: available } = enrolledCourseIds.length > 0
        ? await supabase.from('courses').select('id, name').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.join(',')})`).neq('slug', 'clase-general').order('name')
        : await supabase.from('courses').select('id, name').eq('is_active', true).neq('slug', 'clase-general').order('name')
      // Filter out complementaria unless the student has at least one paid/scholarship payment (non-free)
      const hasPaidAny = (payments ?? []).some((p: any) => (p.status === 'paid' || p.status === 'scholarship') && p.enrollment_id)
      const filteredAvailable = (available ?? []).filter((c: any) => c.id !== 'aea1376e-95d2-4dec-a4ef-07b2395e8f78' || hasPaidAny)

      // Fetch grades for active enrollments
      const activeEnrollments = enrollments.filter((e: any) => e.status === 'active' || e.status === 'recovery')
      const gradesByCourse = new Map<string, any[]>()
      for (const enr of activeEnrollments) {
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*, class_grades!left(*)')
          .eq('course_id', enr.course_id)
          .order('start_time', { ascending: true })
        if (schedules) {
          gradesByCourse.set(enr.course_id, schedules)
        }
      }

      const html = `
        ${Breadcrumb([
          { label: 'Estudiantes', href: '#/coaches/students' },
          { label: (profile as any).full_name || 'Detalle' },
        ])}
        <div class="mb-6 flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-2xl font-bold text-purple-400">
                ${(profile as any).avatar_url
                  ? `<img src="${escapeHtml((profile as any).avatar_url)}" alt="" class="h-full w-full object-cover" />`
                  : escapeHtml((profile as any).full_name?.charAt(0) || '?')
                }
              </div>
              <div>
                <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((profile as any).full_name)}</h1>
                <p class="text-sm text-zinc-400">${escapeHtml((profile as any).email)} · ${escapeHtml((profile as any).riot_id || 'Sin Riot ID')}</p>
                <p class="text-sm text-zinc-500">Rango: ${escapeHtml((profile as any).rank)} · ${escapeHtml((profile as any).country || 'País no especificado')}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button id="btn-toggle-active" class="rounded-lg border px-4 py-2 text-sm transition ${(profile as any).is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}">
                ${(profile as any).is_active ? 'Desactivar' : 'Activar'}
              </button>
              ${!(profile as any).is_active ? '<button id="btn-hard-delete" class="rounded-lg border border-red-700 px-4 py-2 text-sm text-red-400 transition hover:bg-red-900/30">' + Icon('trash', 14) + ' Eliminar permanentemente</button>' : ''}
              <button id="btn-toggle-scholarship" class="flex items-center gap-2 rounded-lg border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-500/10">
                ${Icon('trophy', 14)}
                ${(profile as any).scholarship ? 'Quitar beca' : 'Dar beca'}
              </button>

            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 class="mb-4 font-heading text-lg font-bold text-white">Inscripciones</h2>
              <div class="space-y-3" id="enrollments-list">
                ${enrollments.length === 0 ? '<p class="text-sm text-zinc-500">Sin inscripciones.</p>' : ''}
                ${enrollments.map((enr: any) => {
                  const payStat = paymentByEnroll.get(enr.id)
                  const paymentStatus = payStat === 'paid' || payStat === 'scholarship' ? 'paid' : payStat || null
                  const statusColor = enr.status === 'active' ? 'text-green-400' : enr.status === 'recovery' ? 'text-yellow-400' : 'text-zinc-400'
                  return `
                    <div class="rounded-lg border border-zinc-800 bg-[#111] p-4" data-enrollment-id="${escapeHtml(enr.id)}">
                      <div class="flex items-start justify-between">
                        <div class="min-w-0 flex-1">
                          <p class="font-medium text-white">${escapeHtml(enr.courses?.name || '')}</p>
                          <p class="text-xs text-zinc-500">${escapeHtml(enr.type || '')}</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <a href="#/coaches/courses/${escapeHtml(enr.course_id)}/classes" class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition">${Icon('bookOpen', 10)} Clases</a>
                          </div>
                        </div>
                        <div class="text-right shrink-0 ml-3">
                          <p class="text-sm capitalize ${statusColor}">
                            ${escapeHtml(enr.status)}${enr.promoted ? ' · Promocionado' : ''}
                          </p>

                          <div class="mt-1">
                            ${paymentStatus
                              ? `<span class="inline-block rounded-full px-2 py-0.5 text-xs ${paymentStatus === 'paid' || paymentStatus === 'free' ? 'bg-green-500/20 text-green-400' : paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${paymentStatus === 'paid' ? 'Pagado' : paymentStatus === 'free' ? 'Gratis' : escapeHtml(paymentStatus)}</span>`
                              : '<span class="text-xs text-zinc-600">Sin pago</span>'
                            }
                          </div>
                        </div>
                        <button class="btn-unenroll text-xs shrink-0 ml-2 ${enr.status === 'active' || enr.status === 'recovery' ? 'text-red-400 hover:text-red-300' : 'text-zinc-600 hover:text-red-400'}" data-enrollment-id="${escapeHtml(enr.id)}" data-status="${escapeHtml(enr.status)}">
                          ${Icon('trash', 14)}
                        </button>
                      </div>
                    </div>`
                }).join('')}
              </div>

              ${activeEnrollments.length > 0 ? `
                <h2 class="mb-4 mt-8 font-heading text-lg font-bold text-white">Notas por clase</h2>
                ${activeEnrollments.map((enr: any) => {
                  const courseSchedules = gradesByCourse.get(enr.course_id) || []
                  const grades = courseSchedules.map((s: any) => {
                    const grade = (s.class_grades || []).find((cg: any) => cg.student_id === id)
                    return { schedule: s, grade }
                  })
                  const totals = grades.filter(g => g.grade).map(g => (g.grade.theory_score || 0) + (g.grade.practice_score || 0))
                  const avg = totals.length > 0 ? (totals.reduce((a: number, b: number) => a + b, 0) / totals.length).toFixed(2) : '—'
                  return `
                    <div class="rounded-lg border border-zinc-800 bg-[#111] p-4 mt-4">
                      <h3 class="mb-3 font-medium text-white">${escapeHtml(enr.courses?.name || '')}</h3>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                          <thead>
                            <tr class="text-zinc-500 text-xs uppercase">
                              <th class="pb-2 pr-2">Fecha</th>
                              <th class="pb-2 pr-2">Teoría (0-5)</th>
                              <th class="pb-2 pr-2">Práctica (0-15)</th>
                              <th class="pb-2 pr-2">Total (0-20)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${grades.map((g: any) => {
                              const dateStr = formatDate(g.schedule.start_time)
                              const theory = g.grade ? (g.grade.theory_score ?? '—') : '—'
                              const practice = g.grade ? (g.grade.practice_score ?? '—') : '—'
                              const total = g.grade ? (g.grade.theory_score ?? 0) + (g.grade.practice_score ?? 0) : '—'
                              return `
                                <tr class="border-b border-zinc-800/50 text-zinc-300">
                                  <td class="py-2 pr-2">${dateStr}</td>
                                  <td class="py-2 pr-2">${theory}</td>
                                  <td class="py-2 pr-2">${practice}</td>
                                  <td class="py-2 pr-2 font-medium">${total}</td>
                                </tr>`
                            }).join('')}
                          </tbody>
                        </table>
                      </div>
                      <p class="mt-3 text-sm text-zinc-400"><strong>Promedio final:</strong> ${avg}</p>
                    </div>`
                }).join('')}
              ` : ''}

            </div>

            <div>

              <div class="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
                <h3 class="mb-2 text-sm font-medium text-zinc-300">Información adicional</h3>
                <div class="space-y-1 text-sm text-zinc-500">
                  <p>Bio: ${escBr((profile as any).bio || 'Sin biografía')}</p>
                  <p>Redes: ${[(profile as any).social_discord, (profile as any).social_twitter, (profile as any).social_youtube].filter(Boolean).join(', ') || 'Ninguna'}</p>
                  <p>Email institucional: ${escapeHtml((profile as any).institutional_email || 'No generado')}</p>
                  <p>Beca: ${(profile as any).scholarship ? 'Sí (completa)' : 'No'}</p>
                </div>
              </div>

              <div class="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
                <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  ${Icon('bookOpen', 14)} Inscribir en curso
                </h3>
                <form id="form-enroll" class="mt-3 space-y-3">
                  <input type="hidden" name="profileId" value="${escapeHtml(id)}" />
                  <div>
                    <input type="hidden" name="courseId" id="enroll-course-id" value="" />
                    <div class="flex flex-wrap gap-2" id="enroll-course-grid">
                      ${filteredAvailable.length === 0 ? '<p class="text-xs text-zinc-500">Ya está inscrito en todos los cursos.</p>' : filteredAvailable.map((c: any) => `
                        <button type="button" class="enroll-course-btn rounded-xl border px-4 py-2 text-sm text-zinc-300 transition hover:border-[#8B5CF6] hover:text-white border-zinc-700 bg-zinc-900/50"
                          data-course-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>
                      `).join('')}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <input type="hidden" name="seasonId" value="" />
                    <select name="type" class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="student">Alumno</option>
                      <option value="player">Jugador</option>
                    </select>
                  </div>
                  <p id="enroll-error" class="hidden text-xs text-red-400"></p>
                  <button type="submit" class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                    ${Icon('plus', 14)} Inscribir
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>`

      document.getElementById('page-content')!.innerHTML = html
      attachEventListeners(id, (profile as any).is_active, (profile as any).scholarship)
    } catch (err) {
      console.error('Error loading student detail:', err)
      document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar estudiante</p>'
    }
  })()
}

function attachEventListeners(studentId: string, isActive: boolean, hasScholarship: boolean): void {
  document.getElementById('btn-toggle-active')?.addEventListener('click', async () => {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', studentId)
    if (error) toast('error', error.message)
    else mountCoachStudentDetail()
  })

  document.getElementById('btn-toggle-scholarship')?.addEventListener('click', async () => {
    const newVal = !hasScholarship
    const { error } = await supabase.from('profiles').update({ scholarship: newVal }).eq('id', studentId)
    if (error) { toast('error', error.message); return }
    if (newVal) {
      await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', studentId).eq('status', 'pending')
    } else {
      await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', studentId).eq('status', 'scholarship')
    }
    mountCoachStudentDetail()
  })

  document.getElementById('btn-hard-delete')?.addEventListener('click', async () => {
    if (!await confirmDialog('¿Eliminar PERMANENTEMENTE a este estudiante? Se borrarán todos sus datos. Esta acción NO se puede deshacer.', 'Eliminar permanentemente')) return
    await supabase.from('payments').delete().eq('profile_id', studentId)
    await supabase.from('enrollments').delete().eq('profile_id', studentId)
    await supabase.from('team_members').delete().eq('profile_id', studentId)
    const { error } = await supabase.from('profiles').delete().eq('id', studentId)
    if (error) { toast('error', error.message); return }
    toast('success', 'Estudiante eliminado permanentemente')
    window.location.hash = '#/coaches/students'
  })


  document.querySelectorAll('.btn-unenroll').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const enrollmentId = (btn as HTMLElement).dataset.enrollmentId
      const enrollmentStatus = (btn as HTMLElement).dataset.status || ''
      if (!enrollmentId) return
      const isInactive = enrollmentStatus === 'inactive'
      if (!await confirmDialog(isInactive ? '¿Eliminar permanentemente esta inscripción inactiva?' : '¿Dar de baja esta inscripción?')) return
      try {
        const { error } = isInactive
          ? await supabase.from('enrollments').delete().eq('id', enrollmentId)
          : await supabase.from('enrollments').update({ status: 'inactive' }).eq('id', enrollmentId)
        if (error) { toast('error', error.message); return }
        window.location.reload()
      } catch (err: any) { toast('error', err?.message || 'Error al eliminar'); console.error(err) }
    })
  })

  // Course selector buttons
  document.querySelectorAll('.enroll-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.enroll-course-btn').forEach(b => {
        b.classList.remove('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
        b.classList.add('border-zinc-700', 'text-zinc-300')
      })
      btn.classList.add('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
      btn.classList.remove('border-zinc-700', 'text-zinc-300')
      document.getElementById('enroll-course-id')!.setAttribute('value', (btn as HTMLElement).dataset.courseId || '')
    })
  })

  document.getElementById('form-enroll')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const profileId = fd.get('profileId') as string
    const courseId = fd.get('courseId') as string
    const type = (fd.get('type') as string) || 'student'

    if (!courseId) {
      document.getElementById('enroll-error')!.textContent = 'Selecciona un curso'
      document.getElementById('enroll-error')!.classList.remove('hidden')
      return
    }

    const result = await createEnrollmentWithPayment(profileId, courseId, type)

    if ('error' in result) {
      document.getElementById('enroll-error')!.textContent = result.error
      document.getElementById('enroll-error')!.classList.remove('hidden')
      return
    }

    toast('success', 'Pago creado (' + result.payStatus + ')')
    toast('success', 'Estudiante inscrito correctamente')
    mountCoachStudentDetail()
  })

}
