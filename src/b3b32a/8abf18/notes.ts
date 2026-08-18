import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachNotes(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNotes(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id

    const [{ data: students }, { data: notes }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, display_name, email, avatar_url').eq('role', 'student').eq('is_active', true).order('full_name'),
      supabase.from('coach_notes').select('*, profiles:student_id(full_name, display_name, avatar_url)').eq('coach_id', coachId).order('note_date', { ascending: false }).order('created_at', { ascending: false }),
    ])

    const today = new Date().toISOString().slice(0, 10)

    const notesHtml = (notes ?? []).length === 0
      ? '<p class="text-sm text-zinc-500">No hay notas todavía.</p>'
      : (notes ?? []).map((n: any) => {
          const studentName = n.profiles?.full_name || n.profiles?.display_name || 'Alumno'
          const initial = studentName.charAt(0).toUpperCase()
          const avatar = n.profiles?.avatar_url
          return `
          <div class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-[#111] p-4">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
              ${avatar ? `<img src="${escapeHtml(avatar)}" alt="" class="h-full w-full object-cover" />` : escapeHtml(initial)}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-white">${escapeHtml(studentName)}</span>
                <span class="text-xs text-zinc-600">·</span>
                <span class="text-xs text-zinc-500">${escapeHtml(formatDate(n.note_date, { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
              </div>
              <p class="mt-1 text-sm text-zinc-400 whitespace-pre-wrap">${escapeHtml(n.note)}</p>
            </div>
            <button class="delete-note-btn shrink-0 text-zinc-600 hover:text-red-400 transition" data-note-id="${escapeHtml(n.id)}" title="Eliminar nota">
              ${Icon('trash', 14)}
            </button>
          </div>`
        }).join('')

    const studentOptions = (students ?? []).map((s: any) => {
      const name = s.full_name || s.display_name || s.email
      return `<option value="${escapeHtml(s.id)}">${escapeHtml(name)}</option>`
    }).join('')

    const html = `
      <div class="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 class="font-heading text-xl font-bold text-white">Notas rápidas</h1>
          <p class="mt-1 text-sm text-zinc-500">Anota observaciones, progreso o incidencias de tus alumnos para cualquier día.</p>
        </div>

        <form id="note-form" class="rounded-lg border border-zinc-800 bg-[#111] p-4 space-y-3">
          <div class="flex flex-wrap gap-3">
            <div class="flex-1 min-w-[200px]">
              <label class="mb-1 block text-xs font-medium text-zinc-400">Alumno</label>
              <select id="note-student" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none">
                <option value="">Seleccionar alumno...</option>
                ${studentOptions}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Fecha</label>
              <input id="note-date" type="date" value="${today}" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Nota</label>
            <textarea id="note-text" rows="3" placeholder="Ej: Mejoró mucho el crosshair placement hoy, practicar ángulos en Bind..." class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-[#8B5CF6] focus:outline-none resize-none"></textarea>
          </div>
          <div class="flex justify-end">
            <button type="submit" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('save', 14)} Guardar nota
            </button>
          </div>
        </form>

        <div>
          <h2 class="mb-3 text-sm font-medium text-zinc-400">Historial</h2>
          <div class="space-y-2" id="notes-list">
            ${notesHtml}
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
    attachNoteEvents(coachId)
  } catch (err) {
    console.error('Error loading notes:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}

function attachNoteEvents(coachId: string): void {
  document.getElementById('note-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const studentId = (document.getElementById('note-student') as HTMLSelectElement).value
    const noteDate = (document.getElementById('note-date') as HTMLInputElement).value
    const noteText = (document.getElementById('note-text') as HTMLTextAreaElement).value.trim()

    if (!studentId) { toast('error', 'Selecciona un alumno'); return }
    if (!noteText) { toast('error', 'Escribe una nota'); return }

    const { error } = await supabase.from('coach_notes').insert({
      coach_id: coachId,
      student_id: studentId,
      note: noteText,
      note_date: noteDate,
    })

    if (error) { toast('error', error.message); return }
    toast('success', 'Nota guardada')
    initCoachNotes()
  })

  document.querySelectorAll('.delete-note-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const noteId = (btn as HTMLElement).dataset.noteId
      if (!noteId) return
      if (!await confirmDialog('¿Eliminar esta nota?')) return
      const { error } = await supabase.from('coach_notes').delete().eq('id', noteId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Nota eliminada')
      initCoachNotes()
    })
  })
}
