'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createNewExam } from '@/features/exams/actions'
import { fetchQuestions } from '@/features/questions/actions'
import QuestionSearch from './QuestionSearch'

export default function NewExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const [{ data: courseData }, { data: modulesData }, questionsData] = await Promise.all([
        supabase.from('courses').select('name').eq('id', id).maybeSingle(),
        supabase.from('course_modules').select('id, name').eq('course_id', id).order('order_num'),
        fetchQuestions(id),
      ])
      setCourse(courseData)
      setModules(modulesData ?? [])
      setQuestions(questionsData)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="glass max-w-3xl rounded-xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/coaches/courses/${id}/exams`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver a exámenes
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Nuevo Examen — {course?.name}</h1>
      </div>

      <form action={createNewExam} className="glass max-w-3xl rounded-xl p-6 space-y-4">
        <input type="hidden" name="courseId" value={id} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Título</label>
            <input name="title" required
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Módulo</label>
            <select name="moduleId"
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Sin módulo</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
          <textarea name="description" rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Peso (%)</label>
            <input name="weight" type="number" defaultValue={0} min={0} max={100} step={0.1}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Nota mínima (%)</label>
            <input name="passingScore" type="number" defaultValue={60} min={0} max={100}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Tiempo (min)</label>
            <input name="timeLimit" type="number" placeholder="Sin límite"
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Intentos máx</label>
            <input name="maxAttempts" type="number" defaultValue={1} min={1} max={10}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Fecha límite</label>
            <input name="dueDate" type="datetime-local"
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input name="shuffle" type="checkbox" value="true" className="accent-[#8B5CF6]" />
              Aleatorizar preguntas
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Preguntas del examen</label>
          <QuestionSearch questions={questions} />
          <div id="selectedQuestions" className="mt-3 space-y-2">
            <p className="text-xs text-zinc-500">Usa el buscador de arriba para agregar preguntas al examen.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit"
            className="rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            Crear examen
          </button>
          <Link href={`/coaches/courses/${id}/exams`}
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white">
            Cancelar
          </Link>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{
        __html: `
          let selectedQuestions = []
          window.addQuestion = function(id, text) {
            if (selectedQuestions.includes(id)) return
            selectedQuestions.push(id)
            const container = document.getElementById('selectedQuestions')
            const div = document.createElement('div')
            div.className = 'flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0A0A0A] px-3 py-2'
            div.innerHTML = '<span class=\\"text-sm text-white truncate\\">' + text + '</span><input type=\\"hidden\\" name=\\"questionIds\\" value=\\"' + id + '\\" /><button type=\\"button\\" onclick=\\"this.parentElement.remove();selectedQuestions=selectedQuestions.filter(q=>q!==' + id + ')\\" class=\\"text-xs text-red-400\\">Quitar</button>'
            container.appendChild(div)
            document.getElementById('questionSearchInput').value = ''
            document.getElementById('questionSearchResults').innerHTML = ''
          }
          document.getElementById('questionSearchInput')?.addEventListener('input', function() {
            const q = this.value.toLowerCase()
            const results = document.getElementById('questionSearchResults')
            if (!q || q.length < 2) { results.innerHTML = ''; return }
            const all = ' + JSON.stringify(questions.map(q => ({ id: q.id, stem: q.stem, type: q.type }))) + '
            const filtered = all.filter(function(item) { return item.stem.toLowerCase().includes(q) })
            results.innerHTML = filtered.map(function(item) {
              return '<button type=\\"button\\" class=\\"w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded\\" onclick=\\"addQuestion(\\"'+item.id+'\\", \\"'+item.stem.replace(/'/g,"\\\\'")+'\\")\\">'+item.stem+'</button>'
            }).join('') || '<p class=\\"text-xs text-zinc-500 px-3 py-2\\">Sin resultados</p>'
          })
        `
      }} />
    </div>
  )
}
