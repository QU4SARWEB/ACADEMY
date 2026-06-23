import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'

export function renderStudentCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

function scoreToLetter(s: number): string {
  const r = Math.round(s)
  if (r >= 18) return 'AD'
  if (r >= 14) return 'A'
  if (r >= 11) return 'B'
  if (r >= 5) return 'C'
  return 'D'
}

export async function initStudentCourses(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('rank, scholarship, is_active')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profile && profile.is_active === false) {
      document.getElementById('page-content')!.innerHTML = '<div class="flex flex-col items-center justify-center min-h-[50vh] text-center"><p class="text-red-400 text-lg font-bold mb-2">Cuenta desactivada</p><p class="text-sm text-zinc-500">Tu cuenta ha sido desactivada. Contacta con un coach para más información.</p></div>'
      return
    }

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, slug, description, display_order, duration_months)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const enrolledCourseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)

    // Fetch tasks count per course
    const { data: allTasks } = enrolledCourseIds.length > 0
      ? await supabase.from('tasks').select('course_id').in('course_id', enrolledCourseIds)
      : { data: [] }
    const taskCountByCourse: Record<string, number> = {}
    for (const t of allTasks ?? []) {
      if (!taskCountByCourse[t.course_id]) taskCountByCourse[t.course_id] = 0
      taskCountByCourse[t.course_id]++
    }

    // Fetch student's task submissions completed per course (via enrollments)
    const enrollIds = (enrollments ?? []).map((e: any) => e.id)
    const { data: submissions } = enrollIds.length > 0
      ? await supabase.from('task_submissions').select('enrollment_id, status').in('enrollment_id', enrollIds)
      : { data: [] }
    const enrCourseMap: Record<string, string> = {}
    for (const e of enrollments ?? []) enrCourseMap[e.id] = e.course_id
    const completedByCourse: Record<string, number> = {}
    for (const s of submissions ?? []) {
      const cid = enrCourseMap[s.enrollment_id]
      if (cid && (s.status === 'submitted' || s.status === 'graded')) {
        if (!completedByCourse[cid]) completedByCourse[cid] = 0
        completedByCourse[cid]++
      }
    }

    // Fetch last monthly grade per enrollment
    const { data: grades } = enrollIds.length > 0
      ? await supabase.from('monthly_grades').select('enrollment_id, score, month').in('enrollment_id', enrollIds).order('month', { ascending: false })
      : { data: [] }
    const lastGradeByEnroll: Record<string, { score: number; letter: string }> = {}
    for (const g of grades ?? []) {
      if (!lastGradeByEnroll[g.enrollment_id]) {
        lastGradeByEnroll[g.enrollment_id] = { score: Number(g.score), letter: (g as any).letter }
      }
    }
    const gradeByCourse: Record<string, { score: number; letter: string }> = {}
    for (const e of enrollments ?? []) {
      const g = lastGradeByEnroll[e.id]
      if (g) gradeByCourse[e.course_id] = g
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('status')
      .eq('profile_id', session.user.id)

    const available = enrolledCourseIds.length > 0
      ? await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.map((id: any) => `"${id}"`).join(',')})`).order('name')
      : await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).order('name')
    const coursesData = available.data ?? []

    function card(course: any, extra: string, link: string): string {
        const desc = course.description || course.courses?.description || ''
        return `<a href="${link}" class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group block">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
            ${Icon('bookOpen', 24)}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-white truncate">${escapeHtml(course.name || course.courses?.name || '')}</h3>
            <p class="text-xs text-zinc-500">${course.duration_months || course.courses?.duration_months || 0} meses</p>
          </div>
        </div>
        ${desc ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(desc)}</p>` : '<div class="flex-1"></div>'}
        ${extra}
        <div class="mt-3 flex items-center justify-between pt-3 border-t border-zinc-800">
          <span class="text-xs text-zinc-500 group-hover:text-white transition">Ver curso →</span>
        </div>
      </a>`
    }

    const enrollHtml = (enrollments ?? []).length === 0
      ? '<p class="text-sm text-zinc-500 col-span-full">No estás inscrito en ningún curso actualmente.</p>'
      : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${(enrollments ?? []).map((e: any) => {
          const c = e.courses || {}
          const total = taskCountByCourse[c.id] || 0
          const done = completedByCourse[c.id] || 0
          const g = gradeByCourse[c.id]
          let extra = '<div class="space-y-1 mb-3 flex-1">'
          if (total > 0) extra += `<div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('clipboardList', 12)} ${total} tareas · ${done} realizadas</div>`
          if (g) extra += `<div class="flex items-center gap-2 text-xs ${g.score >= 14 ? 'text-green-400' : g.score >= 11 ? 'text-yellow-400' : 'text-zinc-400'}">${Icon('trendingUp', 12)} ${g.score.toFixed(1)}/20 (${escapeHtml(g.letter)})</div>`
          extra += '</div>'
          return card(e, extra, `#/students/courses/${escapeHtml(e.course_id)}`)
        }).join('')}
      </div>`

    const availableHtml = coursesData.length === 0 ? '' : `
      <div class="mt-10">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Cursos disponibles</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${coursesData.map((course: any) => {
            const btn = `<form class="mt-auto" data-enroll-form data-course-id="${escapeHtml(course.id)}">
              <button type="submit" data-enroll-btn="${escapeHtml(course.id)}"
                class="w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] flex items-center justify-center gap-2">
                ${Icon('plus', 14)} Inscribirme
              </button>
            </form>`
            return card(course, '', '#')
              .replace('href="#"', 'href="#" onclick="event.preventDefault()"')
              .replace('Ver curso →', '')
              .replace('<div class="mt-3 flex items-center justify-between pt-3 border-t border-zinc-800">', '')
              .replace('</a>', `${btn}</a>`)
          }).join('')}
        </div>
      </div>`

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis cursos</h1>
      </div>
      ${enrollHtml}
      ${availableHtml}`

    document.getElementById('page-content')!.innerHTML = html

    // Enroll handlers
    document.querySelectorAll('[data-enroll-form]').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const courseId = (form as HTMLElement).dataset.courseId
        if (!courseId) return
        const btn = document.querySelector(`[data-enroll-btn="${courseId}"]`) as HTMLButtonElement
        if (btn?.disabled) return
        if (btn) { btn.disabled = true; btn.textContent = 'Inscribiendo...' }
        const { data: prof } = await supabase.from('profiles').select('rank, scholarship, is_active, role').eq('id', session.user.id).maybeSingle()
        if (prof?.is_active === false) { toast('error', 'Cuenta desactivada'); return }
        const { data: course } = await supabase.from('courses').select('min_rank, name, price').eq('id', courseId).maybeSingle()
        if (course?.min_rank && prof?.role !== 'coach' && prof?.rank !== course.min_rank) { toast('error', `Este curso requiere rango ${course.min_rank}`); return }
        const { data: enrollment, error: enrError } = await supabase.from('enrollments').upsert({
          profile_id: session.user.id, course_id: courseId, type: 'student', status: 'active',
        }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true }).select().maybeSingle()
        if (enrError) { toast('error', 'Error al inscribirse: ' + enrError.message); if (btn) { btn.disabled = false; btn.innerHTML = `${Icon('plus', 14)} Inscribirme` }; return }
        if (enrollment?.id) {
          const { data: prevEnrolls } = await supabase.from('enrollments').select('final_grade, promoted').eq('profile_id', session.user.id).eq('course_id', courseId).neq('id', enrollment.id)
          const alreadyPassed = (prevEnrolls ?? []).some((x: any) => x.final_grade !== null && x.final_grade >= 14 && x.promoted)
          if (!alreadyPassed) await supabase.from('payments').insert({ profile_id: session.user.id, enrollment_id: enrollment.id, type: 'student', status: prof?.scholarship ? 'scholarship' : 'pending', amount: course?.price ?? 1.54 })
        }
        toast('success', `¡Inscrito en ${course?.name ?? 'el curso'}!`)
        if (btn) btn.disabled = false
        location.reload()
      })
    })
  } catch (err) {
    console.error('Error loading student courses:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
  }
}
