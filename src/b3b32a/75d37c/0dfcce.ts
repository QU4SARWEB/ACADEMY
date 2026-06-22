import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'

export function renderStudentCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
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
      .select('*, courses(name, slug, display_order, duration_months)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const pm = new Map<string, string>()
    const { data: payments } = await supabase
      .from('payments')
      .select('status')
      .eq('profile_id', session.user.id)
    for (const p of payments ?? []) pm.set('paid', p.status)

    const enrolledCourseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)
    const { data: coursesData } = enrolledCourseIds.length > 0
      ? await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.map((id: any) => `"${id}"`).join(',')})`).order('name')
      : await supabase.from('courses').select('id, name, description, duration_months, min_rank').eq('is_active', true).order('name')

    const enrollHtml = (enrollments ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso actualmente.</p>'
      : (enrollments ?? []).map((e: any) => `
        <a href="#/students/courses/${escapeHtml(e.course_id)}"
           class="glass glass-hover flex items-center justify-between rounded-xl p-4">
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('bookOpen', 20)}
            </div>
            <div>
              <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || '')}</h3>
              <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || '')} · ${e.courses?.duration_months || 0} meses</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            ${''}
            ${Icon('arrowRight', 16)}
          </div>
        </a>
      `).join('')

    const availableHtml = (coursesData ?? []).length === 0
      ? ''
      : `
        <div class="mt-8">
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Cursos disponibles</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            ${(coursesData ?? []).map((course: any) => `
              <div class="glass rounded-xl p-4">
                <h3 class="font-medium text-white">${escapeHtml(course.name)}</h3>
                <p class="mt-1 text-xs text-zinc-500">${course.duration_months} meses${course.min_rank ? ` · Rango mínimo: ${escapeHtml(course.min_rank)}` : ''}</p>
                ${course.description ? `<p class="mt-1 text-xs text-zinc-400">${escBr(course.description)}</p>` : ''}
                <form class="mt-3" data-enroll-form data-course-id="${escapeHtml(course.id)}">
                  <button type="submit" data-enroll-btn="${escapeHtml(course.id)}"
                    class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                    ${Icon('plus', 14)} Inscribirme
                  </button>
                </form>
              </div>
            `).join('')}
          </div>
        </div>`

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis cursos</h1>
      </div>
      <div class="space-y-3">${enrollHtml}</div>
      ${availableHtml}`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll('[data-enroll-form]').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const courseId = (form as HTMLElement).dataset.courseId
        if (!courseId) return

        const btn = document.querySelector(`[data-enroll-btn="${courseId}"]`) as HTMLButtonElement
        if (btn?.disabled) return
        if (btn) { btn.disabled = true; btn.textContent = 'Inscribiendo...' }

        const { data: profile } = await supabase
          .from('profiles')
          .select('rank, scholarship, is_active')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile?.is_active === false) { toast('error', 'Cuenta desactivada'); return }

        const { data: course } = await supabase
          .from('courses')
          .select('min_rank, name, price')
          .eq('id', courseId)
          .maybeSingle()

        if (course?.min_rank && profile?.rank !== course.min_rank) {
          toast('error', `Este curso requiere rango ${course.min_rank}`)
          return
        }

        const { data: enrollment, error: enrError } = await supabase
          .from('enrollments')
          .upsert({
            profile_id: session.user.id,
            course_id: courseId,
            type: 'student',
            status: 'active',
          }, { onConflict: 'profile_id,course_id', ignoreDuplicates: true })
          .select()
          .maybeSingle()

        if (enrError) {
          toast('error', 'Error al inscribirse: ' + enrError.message)
          if (btn) { btn.disabled = false; btn.innerHTML = `${Icon('plus', 14)} Inscribirme` }
          return
        }

        if (enrollment?.id) {
          // Check if course was already passed (if so, no new payment needed)
          const { data: prevEnrolls } = await supabase
            .from('enrollments')
            .select('final_grade, promoted')
            .eq('profile_id', session.user.id)
            .eq('course_id', courseId)
            .neq('id', enrollment.id)
          const alreadyPassed = (prevEnrolls ?? []).some((e: any) => e.final_grade !== null && e.final_grade >= 70 && e.promoted)
          if (!alreadyPassed) {
            await supabase.from('payments').insert({
              profile_id: session.user.id,
              enrollment_id: enrollment.id,
              type: 'student',
              status: profile?.scholarship ? 'scholarship' : 'pending',
              amount: course?.price ?? 1.54,
            })
          }
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
