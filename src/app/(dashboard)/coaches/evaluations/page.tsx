import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Plus, ArrowLeft } from 'lucide-react'

async function createEvaluation(formData: FormData) {
  'use server'
  const supabase = await createClient()

  await supabase.from('evaluations').insert({
    module_id: formData.get('moduleId') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: formData.get('dueDate') ? new Date(formData.get('dueDate') as string).toISOString() : null,
  })

  revalidatePath('/coaches/evaluations')
  redirect('/coaches/evaluations')
}

export default async function EvaluationsPage() {
  const supabase = await createClient()

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*, course_modules(name, courses(name))')
    .order('created_at', { ascending: false })

  const { data: modules } = await supabase
    .from('course_modules')
    .select('id, name')
    .order('course_id')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Evaluaciones</h1>
        <Link
          href="/coaches/evaluations/new"
          className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} /> Nueva evaluación
        </Link>
      </div>

      <div className="space-y-3">
        {(evaluations ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay evaluaciones creadas.</p>
        )}
        {(evaluations ?? []).map((ev) => (
          <Link
            key={ev.id}
            href={`/coaches/evaluations/${ev.id}`}
            className="glass glass-hover flex items-center justify-between rounded-xl p-4"
          >
            <div>
              <h3 className="font-medium text-white">{ev.title}</h3>
              <p className="text-sm text-zinc-500">{ev.course_modules?.courses?.name} / {ev.course_modules?.name}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-zinc-400">{ev.max_score} pts</p>
              <p className="text-zinc-500">Peso: {ev.weight}%</p>
            </div>
          </Link>
        ))}
      </div>

      <details className="glass mt-8 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">Crear evaluación rápida</summary>
        <div className="border-t border-zinc-800 px-4 py-4">
          <form action={createEvaluation} className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Título</label>
                <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Módulo</label>
                <select name="moduleId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  {(modules ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Puntaje máximo</label>
                <input name="maxScore" type="number" defaultValue={100} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Peso (%)</label>
                <input name="weight" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Fecha límite</label>
                <input name="dueDate" type="date" className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <button type="submit" className="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear evaluación
            </button>
          </form>
        </div>
      </details>
    </div>
  )
}
