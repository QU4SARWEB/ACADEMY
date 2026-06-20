import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

export function renderCoachExamsOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachExamsOverview(): Promise<void> {
  try {
    const { data: courses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courseIds = (courses ?? []).map(c => c.id)
    const { data: exams } = await supabase.from('exams').select('id, title, course_id, is_published').order('created_at', { ascending: false })
    const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', courseIds.length > 0 ? courseIds : ['none'])
    const examCountByCourse: Record<string, number> = {}
    for (const e of exams ?? []) {
      if (!examCountByCourse[e.course_id]) examCountByCourse[e.course_id] = 0
      examCountByCourse[e.course_id]++
    }
    const studentsByCourse: Record<string, number> = {}
    for (const e of enrolls ?? []) {
      if (!studentsByCourse[e.course_id]) studentsByCourse[e.course_id] = 0
      studentsByCourse[e.course_id]++
    }
    const html = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Exámenes</h1><p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes · ${(enrolls ?? []).length} inscripciones</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${(courses ?? []).map(c => {
          const examCount = examCountByCourse[c.id] || 0
          const studentCount = studentsByCourse[c.id] || 0
          return '<a href="#/coaches/courses/' + c.id + '/exams" class="glass rounded-xl p-5 transition hover:scale-[1.02] hover:shadow-lg"><div class="flex items-center justify-between"><div><h3 class="font-medium text-white">' + escapeHtml(c.name) + '</h3><p class="mt-1 text-sm text-zinc-500">' + examCount + ' exámenes · ' + studentCount + ' estudiantes</p></div>' + Icon('chevronRight', 20) + '</div></a>'
        }).join('')}
      </div>`
    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading exams overview:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}
