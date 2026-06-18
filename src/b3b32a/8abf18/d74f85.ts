import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

const RANK_OPTIONS = ['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiante']

const COURSE_TEMPLATES = [
  { name: 'Rookie', months: 6, minRank: 'Hierro', order: 1,
    desc: 'Curso de nivel básico para jugadores con rango Hierro+. Fundamentos del juego, mecánicas básicas y conceptos esenciales.' },
  { name: 'Trainee', months: 6, minRank: 'Bronce', order: 2,
    desc: 'Curso de nivel intermedio-bajo para jugadores Bronce+. Técnicas avanzadas, comunicación y trabajo en equipo.' },
  { name: 'Amateur', months: 6, minRank: 'Plata', order: 3,
    desc: 'Curso de nivel intermedio para jugadores Plata+. Estrategias, macrogestión y análisis de partidas.' },
  { name: 'Competitor', months: 6, minRank: 'Oro', order: 4,
    desc: 'Curso de nivel intermedio-alto para jugadores Oro+. Tácticas competitivas, roles especializados y draft.' },
  { name: 'Elite', months: 6, minRank: 'Platino', order: 5,
    desc: 'Curso de nivel avanzado para jugadores Platino+. Alto rendimiento, liderazgo y ejecución estratégica.' },
  { name: 'Semi-Pro', months: 6, minRank: 'Diamante', order: 6,
    desc: 'Curso de nivel semi-profesional para jugadores Diamante+. Preparación para escena competitiva profesional.' },
  { name: 'Pro', months: 6, minRank: 'Ascendente', order: 7,
    desc: 'Curso de nivel profesional para jugadores Ascendente+. Coaching de élite, análisis profundo y rendimiento máximo.' },
]

export function renderCoachNewCourse(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewCourse(): Promise<void> {
  try {
    const { data: seasons } = await supabase.from('seasons').select('id, name').eq('is_active', true).order('name')

    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a cursos
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nuevo curso</h1>

        <div class="mb-6 glass rounded-xl p-4">
          <h2 class="mb-3 font-medium text-white flex items-center gap-2">${Icon('bookOpen', 16)} Plantillas</h2>
          <p class="mb-3 text-xs text-zinc-500">Selecciona una plantilla para pre-llenar los datos del curso.</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${COURSE_TEMPLATES.map((t, i) => `
              <button type="button" class="template-btn rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs transition hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                data-index="${i}">
                <span class="block font-medium text-white">${escapeHtml(t.name)}</span>
                <span class="text-zinc-500">${t.months} meses · ${escapeHtml(t.minRank)}+</span>
              </button>
            `).join('')}
          </div>
        </div>

        <form id="course-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Nombre del curso</label>
            <input type="text" name="name" required id="field-name"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Descripción</label>
            <textarea name="description" rows="3" id="field-desc"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Temporada</label>
              <select name="seasonId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Sin temporada</option>
                ${(seasons ?? []).map((s: any) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Duración (meses)</label>
              <input type="number" name="durationMonths" id="field-months" value="3" min="1" max="24"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Rango mínimo</label>
              <select name="minRank" id="field-rank"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">— Sin rango —</option>
                ${RANK_OPTIONS.map(r => `<option value="${r}">${r}+</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Orden</label>
              <input type="number" name="displayOrder" id="field-order" value="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isActive" checked
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Curso activo
          </label>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="createModules" id="create-modules" checked
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Crear módulos automáticos (1 por mes)
          </label>
          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('plus', 14)} Crear curso
            </button>
            <a href="#/coaches/courses"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // Template selection
    document.querySelectorAll('.template-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index || '0')
        const tpl = COURSE_TEMPLATES[idx]
        ;(document.getElementById('field-name') as HTMLInputElement).value = tpl.name
        ;(document.getElementById('field-desc') as HTMLTextAreaElement).value = tpl.desc
        ;(document.getElementById('field-months') as HTMLInputElement).value = String(tpl.months)
        ;(document.getElementById('field-rank') as HTMLSelectElement).value = tpl.minRank
        ;(document.getElementById('field-order') as HTMLInputElement).value = String(tpl.order)
        // Highlight selected
        document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('border-[#8B5CF6]', 'bg-[#8B5CF6]/10'))
        btn.classList.add('border-[#8B5CF6]', 'bg-[#8B5CF6]/10')
      })
    })

    document.getElementById('course-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)

      const name = fd.get('name') as string
      const duration = parseInt(fd.get('durationMonths') as string) || 3
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const createMods = fd.get('createModules') === 'on'

      const { data: course, error } = await supabase.from('courses').insert({
        name,
        slug,
        description: (fd.get('description') as string) || null,
        season_id: (fd.get('seasonId') as string) || null,
        duration_months: duration,
        min_rank: (fd.get('minRank') as string) || '',
        display_order: parseInt(fd.get('displayOrder') as string) || 0,
        is_active: fd.get('isActive') === 'on',
      }).select().maybeSingle()

      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
        return
      }

      // Auto-create modules
      if (createMods && course) {
        const modules = Array.from({ length: duration }, (_, i) => ({
          course_id: course.id,
          name: `Mes ${i + 1}`,
          description: `Módulo del mes ${i + 1}`,
          month_number: i + 1,
          display_order: i + 1,
        }))
        const { error: modErr } = await supabase.from('course_modules').insert(modules)
        if (modErr) console.error('Error creating modules:', modErr)
      }

      toast('success', 'Curso creado correctamente' + (createMods && course ? ` con ${duration} módulos` : ''))
      router.navigate('/coaches/courses')
    })
  } catch (err) {
    console.error('Error loading form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
