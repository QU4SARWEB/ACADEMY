import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'

const CLASE_GENERAL_ID = 'e7f7f24d-8c5a-4006-99cf-7a74907ff3b0'

const ACH_PRESETS = [
  { badge: 'attendance', title: 'Asistencia perfecta', desc: '100% de asistencia en el mes', icon: 'checkCircle' },
  { badge: 'improvement', title: 'Mejora continua', desc: 'Progreso significativo enrank', icon: 'trendingUp' },
  { badge: 'teamwork', title: 'Trabajo en equipo', desc: 'Excelente comunicación y colaboración', icon: 'users' },
  { badge: 'leader', title: 'Liderazgo', desc: 'Demostró habilidades de liderazgo', icon: 'shield' },
  { badge: 'dedication', title: 'Dedicación', desc: 'Esfuerzo constante y compromiso', icon: 'clock' },
  { badge: 'mvp', title: 'MVP de la semana', desc: 'Mejor rendimiento de la semana', icon: 'star' },
  { badge: 'first_blood', title: 'Primer blood', desc: 'Primer logro desbloqueado', icon: 'zap' },
  { badge: 'veteran', title: 'Veterano', desc: '3+ meses en la academia', icon: 'award' },
]

const RANK_ORDER: Record<string, number> = {
  Unranked: 0, Iron: 1, Bronze: 2, Silver: 3, Gold: 4,
  Platinum: 5, Diamond: 6, Ascendant: 7, Immortal: 8, Radiant: 9,
  Rookie: 1, Trainee: 2, Amateur: 3, Competitor: 4, Elite: 5,
  'Semi-Pro': 6, Pro: 7,
}

export function renderCoachStudentDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachStudentDetail(): void {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  ;(async () => {
    try {
      const [{ data: profile }, { data: enrollData }, { data: courses }, { data: promotionData }, { data: payments }, { data: achievements }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('enrollments').select('*, courses(name, slug, min_rank, display_order)').eq('profile_id', id).order('enrolled_at', { ascending: false }),
        supabase.from('courses').select('id, name, display_order, min_rank').eq('is_active', true).order('display_order'),
        supabase.from('promotions').select('*, from_course:from_course_id(name), to_course:to_course_id(name)').eq('profile_id', id).order('created_at', { ascending: false }),
        supabase.from('payments').select('status, amount, enrollment_id').eq('profile_id', id),
        supabase.from('member_achievements').select('*').eq('profile_id', id).order('unlocked_at', { ascending: false }),
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

      const lastEnr = enrollments.find((e: any) => e.status === 'active' || e.status === 'recovery')
      let eligibility: any = null
      let nextCourse: any = null
      if (lastEnr) {
        const { data: enrFull } = await supabase
          .from('enrollments')
          .select('*, profiles(rank, full_name), courses(name, min_rank)')
          .eq('id', lastEnr.id)
          .maybeSingle()

        if (enrFull) {
          const grade = enrFull.final_grade
          const studentRank = (enrFull as any).profiles?.rank ?? 'Unranked'
          const minRank = (enrFull as any).courses?.min_rank ?? 'Unranked'
          const gradeOk = grade != null && grade >= 80
          const rankOk = (RANK_ORDER[studentRank] ?? 0) >= (RANK_ORDER[minRank] ?? 0)
          eligibility = {
            gradeOk, rankOk, eligible: gradeOk && rankOk,
            grade, minRank, studentRank,
            reason: !gradeOk ? `Nota insuficiente: ${grade ?? '—'}/100 (mínimo 80)` : !rankOk ? `Rango insuficiente: ${studentRank} (mínimo ${minRank})` : null,
          }
          if (lastEnr.courses?.display_order) {
            nextCourse = (courses ?? []).find((c: any) => c.display_order === lastEnr.courses!.display_order + 1) ?? null
          }
        }
      }

      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

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
              <a href="#/coaches/students/${escapeHtml(id)}/grades" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
                ${Icon('edit', 14)} Notas
              </a>
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
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="font-medium text-white">${escapeHtml(enr.courses?.name || '')}</p>
                          <p class="text-xs text-zinc-500">${escapeHtml(enr.courses?.name || enr.type || '')}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm capitalize ${statusColor}">
                            ${escapeHtml(enr.status)}${enr.promoted ? ' · Promocionado' : ''}
                          </p>
                          ${enr.final_grade ? `<p class="text-xs text-zinc-500">Nota: ${enr.final_grade}</p>` : ''}
                          <div class="mt-1">
                            ${paymentStatus
                              ? `<span class="inline-block rounded-full px-2 py-0.5 text-xs ${paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">${paymentStatus === 'paid' ? 'Pagado' : escapeHtml(paymentStatus)}</span>`
                              : '<span class="text-xs text-zinc-600">Sin pago</span>'
                            }
                          </div>
                        </div>
                        <button class="btn-unenroll text-xs ${enr.status === 'active' || enr.status === 'recovery' ? 'text-red-400 hover:text-red-300' : 'text-zinc-600 hover:text-red-400'}" data-enrollment-id="${escapeHtml(enr.id)}" data-status="${escapeHtml(enr.status)}">
                          ${Icon('trash', 14)}
                        </button>
                      </div>
                    </div>`
                }).join('')}
              </div>

              ${promotionData && (promotionData as any[]).length > 0 ? `
                <div class="mt-6">
                  <h2 class="mb-4 font-heading text-lg font-bold text-white">Historial de Promociones</h2>
                  <div class="space-y-2">
                    ${(promotionData as any[]).map((p: any) => `
                      <div class="rounded-lg border border-zinc-800 bg-[#111] p-3">
                        <div class="flex items-center gap-2 text-sm">
                          ${Icon('trophy', 14)}
                          <span class="text-purple-400" style="display: inline-flex; align-items: center;">${Icon('trophy', 14)}</span>
                          <span class="text-zinc-300">${escapeHtml(p.from_course?.name || '')}</span>
                          ${p.to_course ? `<span class="text-zinc-600">→</span><span class="text-zinc-300">${escapeHtml(p.to_course?.name)}</span>` : ''}
                          <span class="ml-auto text-xs text-zinc-500">${formatDate(p.created_at)}</span>
                        </div>
                        ${p.grade_at_time ? `<p class="mt-1 text-xs text-zinc-500">Nota: ${p.grade_at_time} · Rango: ${escapeHtml(p.rank_at_time || '')}</p>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <div>
              <h2 class="mb-4 font-heading text-lg font-bold text-white">Promocionar</h2>
              <div class="rounded-lg border border-zinc-800 bg-[#111] p-4">
                ${!lastEnr
                  ? '<p class="text-sm text-zinc-500">Sin inscripción activa para promocionar.</p>'
                  : !eligibility
                    ? '<p class="text-sm text-zinc-500">No se pudo verificar elegibilidad.</p>'
                    : `
                      <div class="mb-4 space-y-2">
                        <h3 class="text-sm font-medium text-zinc-300">Requisitos</h3>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-400">Nota mínima (80)</span>
                          ${eligibility.gradeOk !== undefined
                            ? `<span class="flex items-center gap-1 ${eligibility.gradeOk ? 'text-green-400' : 'text-red-400'}">
                                ${eligibility.gradeOk ? Icon('checkCircle', 14) : Icon('xCircle', 14)}
                                ${eligibility.grade ?? '—'}/100
                              </span>`
                            : '<span class="text-zinc-600">—</span>'
                          }
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-zinc-400">Rango mínimo (${escapeHtml(eligibility.minRank)})</span>
                          <span class="flex items-center gap-1 ${eligibility.rankOk ? 'text-green-400' : 'text-red-400'}">
                            ${eligibility.rankOk ? Icon('checkCircle', 14) : Icon('xCircle', 14)}
                            ${escapeHtml(eligibility.studentRank)}
                          </span>
                        </div>
                        ${!eligibility.eligible
                          ? `<div class="mt-2 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400">
                              ${Icon('alertTriangle', 14)}
                              <span>${escapeHtml(eligibility.reason || '')}</span>
                            </div>`
                          : `<div class="mt-2 flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                              ${Icon('checkCircle', 14)}
                              <span>Cumple todos los requisitos</span>
                            </div>`
                        }
                      </div>
                      <form id="form-promote" class="space-y-3">
                        <input type="hidden" name="enrollmentId" value="${escapeHtml(lastEnr.id)}" />
                        <input type="hidden" name="seasonId" value="" />
                        <div>
                          <label class="block text-sm font-medium text-zinc-300">${nextCourse ? 'Próximo curso' : 'Nuevo curso'}</label>
                          ${nextCourse
                            ? `<input type="hidden" name="newCourseId" value="${escapeHtml(nextCourse.id)}" />
                               <p class="mt-1 text-sm text-zinc-400">${escapeHtml(nextCourse.name)}</p>`
                            : `<select name="newCourseId" class="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-white outline-none focus:border-[#8B5CF6]">
                                ${(courses ?? []).map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
                              </select>`
                          }
                        </div>
                        ${eligibility.eligible
                          ? `<button type="submit" class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                              ${Icon('trophy', 14)} Promocionar a ${escapeHtml(nextCourse?.name || 'curso seleccionado')}
                            </button>`
                          : `<button type="submit" disabled class="flex cursor-not-allowed items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600">
                              ${Icon('trophy', 14)} No cumple requisitos
                            </button>`
                        }
                      </form>
                    `
                }
              </div>

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
                  ${Icon('trophy', 14)} Logros (${(achievements ?? []).length})
                  <button id="btn-add-achievement" class="ml-auto flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white">${Icon('plus', 10)} Agregar</button>
                </h3>

                <div class="flex flex-wrap gap-1.5 mt-3">
                  ${ACH_PRESETS.map((p, i) => `
                    <button class="ach-preset-btn rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-[#8B5CF6] hover:text-white hover:bg-[#8B5CF6]/10" data-index="${i}">${Icon(p.icon as any, 12)} ${escapeHtml(p.title)}</button>
                  `).join('')}
                </div>

                <div id="achievements-list" class="space-y-2 mt-3">
                  ${(achievements ?? []).length === 0
                    ? '<p class="text-xs text-zinc-500">Sin logros aún.</p>'
                    : (achievements ?? []).map((a: any) => `
                      <div class="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                        <span class="text-sm">${Icon('trophy', 14)}</span>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-white truncate">${escapeHtml(a.title)}</p>
                          ${a.description ? `<p class="text-xs text-zinc-500 truncate">${escapeHtml(a.description)}</p>` : ''}
                        </div>
                        <span class="text-[10px] text-zinc-600">${formatDate(a.unlocked_at)}</span>
                        <button class="del-achievement text-zinc-600 hover:text-red-400 transition" data-id="${escapeHtml(a.id)}">${Icon('x', 12)}</button>
                      </div>
                    `).join('')
                  }
                </div>

                <div id="add-achievement-form" class="hidden mt-3 space-y-2 border-t border-zinc-800 pt-3">
                  <input id="ach-title" type="text" placeholder="Título del logro personalizado" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  <input id="ach-desc" type="text" placeholder="Descripción (opcional)" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  <div class="flex gap-2">
                    <button id="btn-save-achievement" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">Guardar</button>
                    <button id="btn-cancel-achievement" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800">Cancelar</button>
                  </div>
                  <p id="ach-error" class="hidden text-xs text-red-400"></p>
                </div>
              </div>

              <div class="mt-4 rounded-lg border border-zinc-800 bg-[#111] p-4">
                <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  ${Icon('bookOpen', 14)} Inscribir en curso
                </h3>
                <form id="form-enroll" class="mt-3 space-y-3">
                  <input type="hidden" name="profileId" value="${escapeHtml(id)}" />
                  <div>
                    <select name="courseId" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="">Seleccionar curso...</option>
                      ${(available ?? []).map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                  </div>
                  <div class="flex gap-2">
                    <input type="hidden" name="seasonId" value="" />
                    <select name="type" class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="student">Alumno</option>
                      <option value="player">Jugador</option>
                    </select>
                  </div>
                  <p id="enroll-error" class="hidden text-xs text-red-400"></p>
                  ${(available ?? []).length === 0 ? '<p class="text-xs text-zinc-500">Ya está inscrito en todos los cursos.</p>' : ''}
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
    const { error } = await supabase.from('profiles').delete().eq('id', studentId)
    if (error) { toast('error', error.message); return }
    toast('success', 'Estudiante eliminado permanentemente')
    window.location.hash = '#/coaches/students'
  })

  // Achievements
  async function saveAchievement(title: string, desc: string | null) {
    document.getElementById('ach-error')!.classList.add('hidden')
    const { error } = await supabase.from('member_achievements').insert({
      profile_id: studentId, badge: 'custom', title, description: desc,
    })
    if (error) {
      document.getElementById('ach-error')!.textContent = error.message
      document.getElementById('ach-error')!.classList.remove('hidden')
      return
    }
    toast('success', 'Logro agregado')
    mountCoachStudentDetail()
  }

  document.getElementById('btn-add-achievement')?.addEventListener('click', () => {
    document.getElementById('add-achievement-form')?.classList.toggle('hidden')
  })
  document.getElementById('btn-cancel-achievement')?.addEventListener('click', () => {
    document.getElementById('add-achievement-form')?.classList.add('hidden')
  })
  document.getElementById('btn-save-achievement')?.addEventListener('click', async () => {
    const title = (document.getElementById('ach-title') as HTMLInputElement)?.value?.trim()
    if (!title) { document.getElementById('ach-error')!.textContent = 'El título es obligatorio'; document.getElementById('ach-error')!.classList.remove('hidden'); return }
    saveAchievement(title, (document.getElementById('ach-desc') as HTMLInputElement)?.value?.trim() || null)
  })

  // Preset buttons
  document.querySelectorAll('.ach-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt((btn as HTMLElement).dataset.index || '0')
      const preset = ACH_PRESETS[idx]
      if (preset) saveAchievement(preset.title, preset.desc)
    })
  })

  document.querySelectorAll('.del-achievement').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      if (!id || !(await confirmDialog('¿Eliminar este logro?'))) return
      const { error } = await supabase.from('member_achievements').delete().eq('id', id)
      if (error) toast('error', error.message)
      else { toast('success', 'Logro eliminado'); mountCoachStudentDetail() }
    })
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

  async function autoEnrollClaseGeneral(profileId: string, type: string): Promise<void> {
    const { data: exists } = await supabase.from('enrollments').select('id').eq('profile_id', profileId).eq('course_id', CLASE_GENERAL_ID).maybeSingle()
    if (exists) return
    const { data: enr, error } = await supabase.from('enrollments').insert({
      profile_id: profileId, course_id: CLASE_GENERAL_ID, type, status: 'active',
    }).select('id').maybeSingle()
    if (error || !enr) { console.error('Error enrolling in CLASE GENERAL:', error); return }
    await supabase.from('payments').insert({
      profile_id: profileId, enrollment_id: enr.id, type, status: 'paid', amount: 0,
    }).then(({ error: pe }) => { if (pe) console.error('Error creating payment for CLASE GENERAL:', pe) })
  }

  document.getElementById('form-promote')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const enrollmentId = fd.get('enrollmentId') as string
    const newCourseId = fd.get('newCourseId') as string
    const { data: enr } = await supabase
      .from('enrollments')
      .select('*, profiles(rank)')
      .eq('id', enrollmentId)
      .maybeSingle()

    if (!enr) { toast('error', 'Inscripción no encontrada'); return }

    const { error: err1 } = await supabase.from('enrollments').update({ status: 'graduated', promoted: true }).eq('id', enrollmentId)
    if (err1) { toast('error', 'Error al actualizar inscripción: ' + err1.message); return }

    const { error: err2 } = await supabase.from('promotions').insert({
      enrollment_id: enrollmentId,
      profile_id: studentId,
      from_course_id: enr.course_id,
      to_course_id: newCourseId || null,
      grade_at_time: enr.final_grade,
      rank_at_time: (enr as any).profiles?.rank,
    })
    if (err2) { toast('error', 'Error al registrar promoción: ' + err2.message); return }

    if (newCourseId) {
      const { data: promEnroll, error: err3 } = await supabase.from('enrollments').upsert({
        profile_id: studentId,
        course_id: newCourseId,
        type: 'student',
        status: 'active',
        current_module: 1,
      }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true }).select('id').maybeSingle()
      if (err3) { toast('error', 'Error al inscribir en nuevo curso: ' + err3.message); return }

      if (promEnroll) {
        const { data: promCourse } = await supabase.from('courses').select('price').eq('id', newCourseId).maybeSingle()
        const promPrice = promCourse?.price ?? 1.54
        const { data: promProf } = await supabase.from('profiles').select('scholarship').eq('id', studentId).maybeSingle()
        const promPayStatus = promPrice === 0 ? 'paid' : (promProf?.scholarship ? 'scholarship' : 'pending')
        const { error: payErr } = await supabase.from('payments').insert({
          profile_id: studentId, enrollment_id: promEnroll.id,
          type: 'student', amount: promPrice,
          status: promPayStatus,
        })
        if (payErr) console.error('Error creating payment on promote:', payErr)
        else if (promPayStatus === 'paid' || promPayStatus === 'scholarship') autoEnrollClaseGeneral(studentId, 'student')
      }
    }

    toast('success', 'Estudiante promocionado correctamente')
    mountCoachStudentDetail()
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

    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (existing) {
      document.getElementById('enroll-error')!.textContent = 'Ya está inscrito en este curso'
      document.getElementById('enroll-error')!.classList.remove('hidden')
      return
    }

    const { data: newEnroll, error } = await supabase.from('enrollments').insert({
      profile_id: profileId,
      course_id: courseId,
      type,
      status: 'active',
    }).select('id').maybeSingle()

    if (error) {
      document.getElementById('enroll-error')!.textContent = error.message
      document.getElementById('enroll-error')!.classList.remove('hidden')
      return
    }

      if (newEnroll) {
        const { data: enrollCourse } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle()
        const coursePrice = enrollCourse?.price ?? 1.54
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('scholarship')
          .eq('id', profileId)
          .maybeSingle()

        const payStatus = coursePrice === 0 ? 'paid' : (studentProfile?.scholarship ? 'scholarship' : 'pending')
        const { error: payErr } = await supabase.from('payments').insert({
          profile_id: profileId,
          enrollment_id: newEnroll.id,
          type,
          status: payStatus,
          amount: coursePrice,
        })
        if (payErr) {
          console.error('Error creating payment:', payErr, { profileId, enrollmentId: newEnroll.id, type, payStatus, coursePrice })
          toast('error', 'Pago no creado: ' + payErr.message)
        } else {
          toast('success', 'Pago creado (' + payStatus + ')')
          if (payStatus === 'paid' || payStatus === 'scholarship') autoEnrollClaseGeneral(profileId, type)
        }
      }

    toast('success', 'Estudiante inscrito correctamente')
    mountCoachStudentDetail()
  })
}
