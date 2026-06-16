import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { createNewQuestion } from '@/features/questions/actions'

export default async function NewQuestionPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('courses').select('id, name').order('name')

  return (
    <div>
      <div className="mb-6">
        <Link href="/coaches/questions" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver a preguntas
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Nueva Pregunta</h1>
      </div>

      <form action={createNewQuestion} className="glass max-w-2xl rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Curso</label>
          <select name="courseId" required
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar curso...</option>
            {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo de pregunta</label>
          <select name="type" required id="questionType"
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="multiple_choice">Opción múltiple</option>
            <option value="true_false">Verdadero/Falso</option>
            <option value="short_answer">Respuesta corta</option>
            <option value="open_ended">Desarrollo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Enunciado</label>
          <textarea name="stem" required rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
            placeholder="Escribe el enunciado de la pregunta..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Puntos</label>
            <input name="points" type="number" defaultValue={1} min={0.5} step={0.5}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Dificultad (1-5)</label>
            <input name="difficulty" type="number" defaultValue={1} min={1} max={5}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Explicación (opcional)</label>
          <textarea name="explanation" rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
            placeholder="Explicación que verá el estudiante después de responder..." />
        </div>

        <div id="optionsContainer">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Opciones</label>
          <p className="text-xs text-zinc-500 mb-3">Agrega las opciones para preguntas de opción múltiple o verdadero/falso</p>
          <div id="optionsList" className="space-y-2">
            <div className="flex items-center gap-2 option-row">
              <input type="hidden" name="optionCorrect" value="true" />
              <input type="radio" name="correctOption" defaultChecked className="accent-[#8B5CF6]" />
              <input name="optionText" placeholder="Opción 1 (correcta)" required
                className="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
          </div>
          <button type="button" id="addOptionBtn"
            className="mt-2 flex items-center gap-1 text-xs text-[#8B5CF6] hover:text-[#7C3AED]">
            <Plus size={14} /> Agregar opción
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit"
            className="rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            Crear pregunta
          </button>
          <Link href="/coaches/questions"
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white">
            Cancelar
          </Link>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{
        __html: `
          document.getElementById('addOptionBtn')?.addEventListener('click', function() {
            const list = document.getElementById('optionsList')
            const rows = list.querySelectorAll('.option-row')
            const i = rows.length + 1
            const div = document.createElement('div')
            div.className = 'flex items-center gap-2 option-row'
            div.innerHTML = '<input type=\\"hidden\\" name=\\"optionCorrect\\" value=\\"false\\" /><input type=\\"radio\\" name=\\"correctOption\\" class=\\"accent-[#8B5CF6]\\" onchange=\\"this.previousElementSibling.value='true';this.closest('.option-row').querySelectorAll('input[type=hidden]').forEach(h=>h.value='false');this.previousElementSibling.value='true'\\" /><input name=\\"optionText\\" placeholder=\\"Opci\u00f3n ' + i + '\\" class=\\"flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]\\" /><button type=\\"button\\" onclick=\\"this.parentElement.remove()\\" class=\\"text-zinc-500 hover:text-red-400\\"><svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\"><line x1=\\"18\\" y1=\\"6\\" x2=\\"6\\" y2=\\"18\\"/><line x1=\\"6\\" y1=\\"6\\" x2=\\"18\\" y2=\\"18\\"/></svg></button>'
            list.appendChild(div)
          })
        `
      }} />
    </div>
  )
}
