import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { router } from '@/f3395c'

export function renderCoachGradesList(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachGradesList(): Promise<void> {
  try {
    const { data: students } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord, rank').eq('role', 'student').order('full_name')
    const { data: allGrades } = await supabase.from('grades').select('profile_id, score').order('created_at', { ascending: false })
    const { data: enrolls } = await supabase.from('enrollments').select('profile_id, id')
    const enrollIds = (enrolls ?? []).map((e: any) => e.id)
    let examScores: Record<string, number[]> = {}
    let taskScores: Record<string, number[]> = {}
    if (enrollIds.length > 0) {
      const { data: exams } = await supabase.from('exam_attempts').select('enrollment_id, score').in('enrollment_id', enrollIds).not('score', 'is', null)
      for (const e of exams ?? []) {
        const pid = (enrolls ?? []).find((en: any) => en.id === e.enrollment_id)?.profile_id
        if (!pid) continue
        if (!examScores[pid]) examScores[pid] = []
        examScores[pid].push(e.score)
      }
      const { data: tasks } = await supabase.from('task_submissions').select('enrollment_id, score').in('enrollment_id', enrollIds).not('score', 'is', null)
      for (const t of tasks ?? []) {
        const pid = (enrolls ?? []).find((en: any) => en.id === t.enrollment_id)?.profile_id
        if (!pid) continue
        if (!taskScores[pid]) taskScores[pid] = []
        taskScores[pid].push(t.score)
      }
    }
    const gradeMap: Record<string, number[]> = {}
    for (const g of allGrades ?? []) {
      if (!gradeMap[g.profile_id]) gradeMap[g.profile_id] = []
      gradeMap[g.profile_id].push(g.score)
    }
    const html = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Notas de estudiantes</h1><p class="mt-1 text-sm text-zinc-500">${(students ?? []).length} estudiantes</p></div>
      ${(students ?? []).length === 0 ? '<p class="text-zinc-500">No hay estudiantes.</p>' : `
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
        <th class="pb-3 pr-4 font-medium">Estudiante</th><th class="pb-3 pr-4 font-medium">Rango</th><th class="pb-3 pr-4 font-medium">Manuales</th><th class="pb-3 pr-4 font-medium">Exámenes</th><th class="pb-3 pr-4 font-medium">Tareas</th><th class="pb-3 font-medium">Promedio</th>
      </tr></thead><tbody>
      ${(students ?? []).map((s: any) => {
        const manualScores = gradeMap[s.id] || []
        const eScores = examScores[s.id] || []
        const tScores = taskScores[s.id] || []
        const allS = [...manualScores, ...eScores, ...tScores]
        const avg = allS.length > 0 ? Math.round(allS.reduce((a: number, b: number) => a + b, 0) / allS.length) : null
        const displayName = [s.riot_id || s.full_name, s.social_discord].filter(Boolean).join(' | ') || s.full_name || ''
        return '<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30"><td class="py-3 pr-4"><a href="#/coaches/students/' + s.id + '/grades" class="flex items-center gap-2 text-white hover:text-[#8B5CF6] transition">' + (s.avatar_url ? '<img src="' + escapeHtml(s.avatar_url) + '" class="h-7 w-7 rounded-full object-cover" />' : '<div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">' + escapeHtml(displayName.charAt(0)) + '</div>') + '<span>' + escapeHtml(displayName) + '</span></a></td><td class="py-3 pr-4 text-zinc-400">' + escapeHtml(s.rank || '-') + '</td><td class="py-3 pr-4 text-zinc-400">' + manualScores.length + '</td><td class="py-3 pr-4 text-zinc-400">' + eScores.length + '</td><td class="py-3 pr-4 text-zinc-400">' + tScores.length + '</td><td class="py-3">' + (avg !== null ? '<span class="rounded px-2 py-0.5 text-xs font-medium ' + (avg >= 70 ? 'bg-green-500/20 text-green-400' : avg >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400') + '">' + avg + '%</span>' : '<span class="text-xs text-zinc-600">—</span>') + '</td></tr>'
      }).join('')}
      </tbody></table></div>`}
    `
    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading grades list:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
