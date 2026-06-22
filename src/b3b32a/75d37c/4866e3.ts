import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderStudentDashboard(): string {
  return `<div id="page-content">
    <div class="mb-6">${LoadingSkeleton('list', 1)}</div>
    <div class="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">${LoadingSkeleton('card', 4)}</div>
    <div>${LoadingSkeleton('card', 3)}</div>
  </div>`
}

export async function initStudentDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', session.user.id)
      .maybeSingle()

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, id)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    const courseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)

    // Task stats
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('status')
      .in('enrollment_id', (enrollments ?? []).map((e: any) => e.id))

    const totalSubs = submissions?.length ?? 0
    const gradedSubs = submissions?.filter((s: any) => s.status === 'graded').length ?? 0

    // Exam stats
    let examAvg = '—'
    const { data: attempts } = await supabase
      .from('exam_attempts')
      .select('score')
      .not('score', 'is', null)
    const examScores = (attempts ?? []).map((a: any) => a.score).filter((s: any) => s !== null)
    if (examScores.length > 0) {
      examAvg = (examScores.reduce((a: number, b: number) => a + b, 0) / examScores.length).toFixed(1)
    }

    // Course progress
    const courseProgress = await Promise.all((enrollments ?? []).map(async (e: any) => {
      const { count: totalMods } = await supabase
        .from('exams') 
        .select('*', { count: 'exact', head: true })
        .eq('course_id', e.course_id)
      const progress = totalMods && totalMods > 0 ? Math.min(Math.round(((e.current_module || 0) / totalMods) * 100), 100) : 0
      return { ...e, progress, totalModules: totalMods || 0 }
    }))

    const userName = profile?.display_name || profile?.full_name || 'Estudiante'

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Tu progreso académico</p>
      </div>

      <div class="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-white">${(enrollments ?? []).length}</p>
          <p class="text-xs text-zinc-500">Cursos activos</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-green-400">${totalSubs}</p>
          <p class="text-xs text-zinc-500">Tareas entregadas</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-[#8B5CF6]">${examAvg}</p>
          <p class="text-xs text-zinc-500">Promedio exámenes</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-yellow-400">${totalSubs > 0 ? Math.round((gradedSubs / totalSubs) * 100) : 0}%</p>
          <p class="text-xs text-zinc-500">Tareas calificadas</p>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Progreso por curso</h2>
        <div class="space-y-4">
          ${(courseProgress ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
            : courseProgress.map((e: any) => `
              <div class="glass rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <h3 class="font-medium text-white">${escapeHtml(e.courses?.name || 'Curso')}</h3>
                    <p class="text-xs text-zinc-500">${escapeHtml(e.seasons?.name || '')}</p>
                  </div>
                  <span class="text-sm font-bold text-white">${e.progress}%</span>
                </div>
                <div class="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-[#8B5CF6] transition-all duration-700" style="width:${e.progress}%"></div>
                </div>
                <p class="mt-1 text-xs text-zinc-600">Módulo ${e.current_module || 1} de ${e.totalModules}</p>
              </div>
            `).join('')
          }
        </div>
      </div>

      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Acceso rápido</h2>
        <div class="grid grid-cols-2 gap-3">
          <a href="#/students/courses" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('bookOpen', 20)} <span class="text-sm text-white">Mis cursos</span>
          </a>
          <a href="#/students/tasks" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('clipboardList', 20)} <span class="text-sm text-white">Tareas</span>
          </a>
          <a href="#/students/grades" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('scrollText', 20)} <span class="text-sm text-white">Calificaciones</span>
          </a>
          <a href="#/payments" class="glass flex items-center gap-3 rounded-xl p-4 hover:bg-zinc-800/50 transition">
            ${Icon('dollarSign', 20)} <span class="text-sm text-white">Pagos</span>
          </a>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading student dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
