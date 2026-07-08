import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'

export function renderCoachAssignments(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachAssignments(): Promise<void> {
  try {
    const [{ data: coaches }, { data: courses }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, avatar_url, role_color, custom_bg_url').eq('role', 'coach').eq('is_active', true).order('full_name'),
      supabase.from('courses').select('id, name, price').eq('is_active', true).order('display_order'),
    ])

    const { data: assignments } = await supabase.from('course_assignments').select('*')
    const assignedMap = new Map<string, Set<string>>()
    for (const a of assignments ?? []) {
      if (!assignedMap.has(a.coach_id)) assignedMap.set(a.coach_id, new Set())
      assignedMap.get(a.coach_id)!.add(a.course_id)
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Asignaciones</h1>
        <p class="mt-1 text-sm text-zinc-500">Asigna cursos a cada coach. Solo ver\u00e1n los cursos que tengan asignados.</p>
      </div>
      <div class="space-y-4">
        ${(coaches ?? []).map((coach: any) => {
          const coachCourses = assignedMap.get(coach.id) || new Set()
          const bg = coach.custom_bg_url
          const accent = coach.role_color || '#8B5CF6'
          return `
          <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
            ${bg ? `<div class="h-24 bg-cover bg-center" style="background-image:url('${escapeHtml(bg)}')"></div>` : ''}
            <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold" style="background:${accent}20;color:${accent}">${coach.avatar_url ? `<img src="${escapeHtml(coach.avatar_url)}" alt="" class="h-full w-full object-cover" />` : escapeHtml((coach.full_name || '?').charAt(0).toUpperCase())}</div>
              <div>
                <h3 class="text-sm font-semibold text-white">${escapeHtml(coach.full_name || '')}</h3>
                <p class="text-xs text-zinc-500">${escapeHtml(coach.email || '')}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2" data-coach-id="${escapeHtml(coach.id)}">
              ${(courses ?? []).map((c: any) => {
                const assigned = coachCourses.has(c.id)
                return `
                <button class="assign-course-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
                  ${assigned
                    ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25'
                    : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}"
                  data-coach-id="${escapeHtml(coach.id)}" data-course-id="${escapeHtml(c.id)}" data-assigned="${assigned ? '1' : '0'}">
                  ${assigned ? Icon('checkCircle', 14) : Icon('plus', 12)}
                  <span>${escapeHtml(c.name)}</span>
                </button>`
              }).join('')}
            </div>
          </div>
          </div>`
        }).join('')}
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll('.assign-course-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement
        const coachId = el.dataset.coachId
        const courseId = el.dataset.courseId
        const assigned = el.dataset.assigned === '1'

        if (assigned) {
          await supabase.from('course_assignments').delete().eq('coach_id', coachId).eq('course_id', courseId)
        } else {
          await supabase.from('course_assignments').insert({ coach_id: coachId, course_id: courseId })
        }

        el.dataset.assigned = assigned ? '0' : '1'
        el.classList.toggle('bg-[#8B5CF6]/15', !assigned)
        el.classList.toggle('text-[#8B5CF6]', !assigned)
        el.classList.toggle('border-[#8B5CF6]/30', !assigned)
        el.classList.toggle('bg-zinc-800/40', assigned)
        el.classList.toggle('text-zinc-500', assigned)
        el.classList.toggle('border-dashed', assigned)
        el.innerHTML = assigned
          ? `${Icon('plus', 12)} <span>${escapeHtml(courses?.find((c: any) => c.id === courseId)?.name || '')}</span>`
          : `${Icon('checkCircle', 14)} <span>${escapeHtml(courses?.find((c: any) => c.id === courseId)?.name || '')}</span>`
      })
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asignaciones</p>'
  }
}
