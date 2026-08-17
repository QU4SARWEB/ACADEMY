import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { rankBadge } from '@/2b3583/ranks'
import { meetsRank } from '@/2b3583/grades_utils'
import { getStudentEnrollments, isStudentPreview } from '@/2b3583/student_view'
import { clickToNav } from '@/b3b32a/shared/clickable_cards'

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

    const enrollments = await getStudentEnrollments(session.user.id)
    const preview = isStudentPreview()

    const enrolledCourseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)

    const { data: payments } = await supabase
      .from('payments')
      .select('status')
      .eq('profile_id', session.user.id)

    const hasPaidAny = (payments ?? []).some((p: any) => p.status === 'paid' || p.status === 'scholarship')

    let coursesData: any[] = []
    if (!preview) {
      const available = enrolledCourseIds.length > 0
        ? await supabase.from('courses').select('id, name, description, duration_months, min_rank, cover_url').eq('is_active', true).not('id', 'in', `(${enrolledCourseIds.map((id: any) => `"${id}"`).join(',')})`).order('name')
        : await supabase.from('courses').select('id, name, description, duration_months, min_rank, cover_url').eq('is_active', true).order('name')
      coursesData = (available.data ?? []).filter((c: any) => c.id !== 'aea1376e-95d2-4dec-a4ef-07b2395e8f78' || hasPaidAny)
    }

    function courseCard(course: any, extra: string, footer: string, navHref?: string): string {
      const desc = course.description || course.courses?.description || ''
      const cName = course.name || course.courses?.name || ''
      const dur = course.duration_months || course.courses?.duration_months || 0
      const cover = course.cover_url || course.courses?.cover_url || ''
      const rank = course.min_rank || course.courses?.min_rank || ''
      const nav = navHref ? ` data-nav data-href="${escapeHtml(navHref)}"` : ''
      return `<div class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group"${nav}>
        ${cover ? `<img src="${escapeHtml(cover)}" alt="" class="mb-4 h-32 w-full rounded-lg border border-zinc-800 object-cover" loading="lazy" decoding="async" />` : ''}
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
            ${Icon('bookOpen', 24)}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-white truncate">${escapeHtml(cName)}</h3>
            <p class="text-xs text-zinc-500 flex items-center gap-1.5">${rank ? `${rankBadge(rank, 15)} ${escapeHtml(rank)} · ` : ''}${dur === 0.5 ? '15 d\u00edas' : dur + ' meses'}</p>
          </div>
        </div>
        ${desc ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(desc)}</p>` : '<div class="flex-1"></div>'}
        ${extra}
        ${footer}
      </div>`
    }

    const enrollHtml = (enrollments ?? []).length === 0
      ? '<p class="text-sm text-zinc-500 col-span-full">No estás inscrito en ningún curso actualmente.</p>'
      : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${(enrollments ?? []).map((e: any) => {
          const footer = `<div class="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between"><span class="text-xs text-zinc-500 group-hover:text-white transition">Ver curso →</span></div>`
          return courseCard(e, '', footer, `#/students/courses/${escapeHtml(e.course_id)}`)
        }).join('')}
      </div>`

    const availableHtml = ''

    const previewBanner = preview
      ? `<div class="mb-6 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-4 text-sm text-[#A78BFA]">${Icon('eye', 15)} Vista previa como alumno — todos los cursos, sin inscribirte.</div>`
      : ''

    const html = `
      <div class="mb-6">
        <span class="kicker">Tu formación</span>
        <h1 class="font-heading text-2xl font-bold text-white">Mis cursos</h1>
      </div>
      ${previewBanner}
      ${enrollHtml}
      ${availableHtml}`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll<HTMLElement>('[data-nav]').forEach(el => {
      el.addEventListener('click', e => clickToNav(e, el.dataset.href || ''))
    })
    ;(window as any).__carouselUpdate?.()
  } catch (err) {
    console.error('Error loading student courses:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
  }
}
