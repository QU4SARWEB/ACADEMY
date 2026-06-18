import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'

export function renderCoachQuestions(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachQuestions(): Promise<void> {
  try {
    const { data } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .order('created_at', { ascending: false })

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .order('name')

    const courseIdsWithQuestions = [...new Set((data ?? []).map((q: any) => q.course_id).filter(Boolean))]

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Banco de preguntas</h1>
          <p class="mt-1 text-sm text-zinc-500">${(data ?? []).length} preguntas</p>
        </div>
        <button id="btn-new-question"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nueva pregunta
        </button>
      </div>

      <div id="new-question-form" class="hidden mb-6 glass rounded-xl p-4">
        <h3 class="mb-3 font-medium text-white">Nueva pregunta</h3>
        <form id="question-create-form" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
              <select name="type" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="multiple_choice">Opción múltiple</option>
                <option value="true_false">Verdadero/Falso</option>
                <option value="open_ended">Respuesta abierta</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Curso</label>
              <select name="courseId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Sin curso</option>
                ${(courses ?? []).map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Enunciado</label>
            <textarea name="stem" required rows="2"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Puntos</label>
              <input type="number" name="points" value="10" min="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Dificultad</label>
              <select name="difficulty"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="easy">Fácil</option>
                <option value="medium" selected>Media</option>
                <option value="hard">Difícil</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Duración (min)</label>
              <input type="number" name="duration_minutes" min="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
          </div>
          <p id="question-form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-2">
            <button type="submit"
              class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear pregunta</button>
            <button type="button" id="btn-cancel-question"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          </div>
        </form>
      </div>

      <div class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay preguntas.</p>'
          : (data ?? []).map((q: any) => {
              const typeBadge = q.type === 'multiple_choice' ? 'Opción múltiple' : q.type === 'true_false' ? 'V/F' : 'Abierta'
              const stem = q.stem || q.text || ''
              const truncatedStem = stem.length > 100 ? stem.slice(0, 100) + '...' : stem
              const optionsPreview = (q.question_options ?? []).map((o: any) => o.text).join(', ').slice(0, 80)
              return `
                <div class="glass rounded-xl p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <p class="text-sm text-white">${escapeHtml(truncatedStem)}</p>
                      <div class="mt-1 flex flex-wrap gap-2">
                        <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">${escapeHtml(typeBadge)}</span>
                        <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">${q.points} pts</span>
                        <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">${escapeHtml(q.difficulty || 'medium')}</span>
                        ${q.course_id ? `<span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Curso ID: ${escapeHtml(q.course_id)}</span>` : ''}
                      </div>
                      ${optionsPreview ? `<p class="mt-1 text-xs text-zinc-600 truncate">${escapeHtml(optionsPreview)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2 shrink-0 ml-4">
                      <button class="delete-question-btn p-1 text-zinc-500 hover:text-red-400 transition" data-id="${escapeHtml(q.id)}">
                        ${Icon('trash', 14)}
                      </button>
                    </div>
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('btn-new-question')?.addEventListener('click', () => {
      const form = document.getElementById('new-question-form')
      if (form) form.classList.toggle('hidden')
    })

    document.getElementById('btn-cancel-question')?.addEventListener('click', () => {
      document.getElementById('new-question-form')?.classList.add('hidden')
    })

    document.getElementById('question-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const { error } = await supabase.from('questions').insert({
        type: fd.get('type') as string,
        stem: fd.get('stem') as string,
        points: parseFloat(fd.get('points') as string) || 10,
        difficulty: (fd.get('difficulty') as string) || 'medium',
        course_id: (fd.get('courseId') as string) || null,
        duration_minutes: fd.get('duration_minutes') ? parseInt(fd.get('duration_minutes') as string) : null,
      })
      if (error) {
        const errEl = document.getElementById('question-form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
      } else {
        toast('success', 'Pregunta creada')
        document.getElementById('new-question-form')?.classList.add('hidden')
        initCoachQuestions()
      }
    })

    document.querySelectorAll('.delete-question-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const qId = (btn as HTMLElement).getAttribute('data-id')
        if (!qId || !confirm('¿Eliminar esta pregunta?')) return
        const { error } = await supabase.from('questions').delete().eq('id', qId)
        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Pregunta eliminada')
          initCoachQuestions()
        }
      })
    })

    if ((window as any).__channels?.questions) {
      supabase.removeChannel((window as any).__channels.questions)
    }
    const channel = supabase.channel('questions-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.questions = channel
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        () => initCoachQuestions()
      )
      .subscribe()
  } catch (err) {
    console.error('Error loading questions:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar preguntas</p>'
  }
}
