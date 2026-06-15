import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ moduleId?: string }>
}) {
  const { moduleId } = await searchParams
  const supabase = await createClient()

  const { data: modules } = await supabase
    .from('course_modules')
    .select('id, name, course_id, courses(name)')
    .order('course_id')

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/coaches/evaluations" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a evaluaciones
      </Link>

      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Nueva evaluación</h1>

      <form action={createEvaluation} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Título</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Módulo</label>
          <select name="moduleId" required defaultValue={moduleId ?? ''} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            {(modules ?? []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.courses?.name} / {m.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Puntaje máximo</label>
            <input name="maxScore" type="number" defaultValue={100} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Peso (%)</label>
            <input name="weight" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Fecha límite</label>
            <input name="dueDate" type="date" className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Crear evaluación
        </button>
      </form>
    </div>
  )
}
