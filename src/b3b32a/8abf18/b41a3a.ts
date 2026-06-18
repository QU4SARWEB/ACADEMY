import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachNewSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewSchedule(): Promise<void> {
  try {
    const [{ data: seasons }, { data: modules }] = await Promise.all([
      supabase.from('seasons').select('id, name').order('name'),
      supabase.from('course_modules').select('id, name, courses(name)').order('name'),
    ])

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/schedules" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a horarios
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nuevo horario</h1>

        <form id="schedule-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Título</label>
            <input type="text" name="title" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Temporada</label>
              <select name="seasonId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Seleccionar temporada...</option>
                ${(seasons ?? []).map((s: any) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Módulo</label>
              <select name="moduleId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Seleccionar módulo...</option>
                ${(modules ?? []).map((m: any) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}${m.courses?.name ? ' (' + escapeHtml(m.courses.name) + ')' : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Semana</label>
              <input type="number" name="weekNumber" min="1" max="52"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Día de la semana</label>
              <select name="dayOfWeek"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                ${days.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Hora inicio</label>
              <input type="time" name="startTime" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Hora fin</label>
              <input type="time" name="endTime" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Tipo</label>
              <select name="type"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="academic">Académico</option>
                <option value="competitive">Competitivo</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Ubicación</label>
              <input type="text" name="location"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"
                placeholder="Ej: Sala 101" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Descripción</label>
            <textarea name="description" rows="3"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"></textarea>
          </div>

          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear horario
            </button>
            <a href="#/coaches/schedules"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('schedule-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)

      const { error } = await supabase.from('schedules').insert({
        title: fd.get('title') as string,
        season_id: (fd.get('seasonId') as string) || null,
        module_id: (fd.get('moduleId') as string) || null,
        week_number: (fd.get('weekNumber') as string) ? parseInt(fd.get('weekNumber') as string) : null,
        day_of_week: parseInt(fd.get('dayOfWeek') as string) || 0,
        start_time: (fd.get('startTime') as string) || null,
        end_time: (fd.get('endTime') as string) || null,
        type: (fd.get('type') as string) || 'academic',
        location: (fd.get('location') as string) || null,
        description: (fd.get('description') as string) || null,
        is_active: true,
      })

      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Horario creado correctamente')
        router.navigate('/coaches/schedules')
      }
    })
  } catch (err) {
    console.error('Error loading schedule form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
