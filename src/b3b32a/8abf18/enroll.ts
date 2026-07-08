import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { createEnrollmentWithPayment } from '@/2b3583/course_utils'

export function renderCoachEnroll(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEnroll(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [studentsData, coursesData] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('role', ['student', 'player']).eq('is_active', true).order('full_name'),
      supabase.from('courses').select('id, name, price').eq('is_active', true).order('display_order'),
    ])

    const students = studentsData.data ?? []
    const courses = coursesData.data ?? []

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Inscribir en curso</h1>
        <p class="mt-1 text-sm text-zinc-500">Selecciona un alumno y un curso para inscribirlo.</p>
      </div>
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-zinc-300">Alumno / Jugador</label>
          <select id="enroll-student" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            ${students.map((s: any) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.full_name || '')} (${escapeHtml(s.email || '')})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-zinc-300">Curso</label>
          <select id="enroll-course" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            ${courses.map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.price ? ' - S/. ' + c.price : ' - Gratis'}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mt-6">
        <label class="mb-2 block text-sm font-medium text-zinc-300">Tipo</label>
        <select id="enroll-type" class="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]">
          <option value="student">Alumno</option>
          <option value="player">Jugador</option>
        </select>
      </div>
      <p id="enroll-error" class="mt-4 hidden text-sm text-red-400"></p>
      <button id="btn-enroll" class="mt-6 rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition" disabled>${Icon('plus', 16)} Inscribir</button>`

    const studentSel = document.getElementById('enroll-student') as HTMLSelectElement
    const courseSel = document.getElementById('enroll-course') as HTMLSelectElement
    const btnEnroll = document.getElementById('btn-enroll') as HTMLButtonElement
    const errorEl = document.getElementById('enroll-error')!

    function checkReady(): void {
      btnEnroll.disabled = !studentSel.value || !courseSel.value
    }

    studentSel.addEventListener('change', checkReady)
    courseSel.addEventListener('change', checkReady)

    btnEnroll.addEventListener('click', async () => {
      const studentId = studentSel.value
      const courseId = courseSel.value
      const type = (document.getElementById('enroll-type') as HTMLSelectElement).value
      if (!studentId || !courseId) return

      btnEnroll.disabled = true
      btnEnroll.textContent = 'Inscribiendo...'
      errorEl.classList.add('hidden')

      const result = await createEnrollmentWithPayment(studentId, courseId, type)

      if ('error' in result) {
        errorEl.textContent = result.error
        errorEl.classList.remove('hidden')
        btnEnroll.disabled = false
        btnEnroll.innerHTML = `${Icon('plus', 16)} Inscribir`
        return
      }

      toast('success', 'Estudiante inscrito correctamente. Pago: ' + result.payStatus)
      studentSel.value = ''
      courseSel.value = ''
      btnEnroll.disabled = true
      btnEnroll.innerHTML = `${Icon('plus', 16)} Inscribir`
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
