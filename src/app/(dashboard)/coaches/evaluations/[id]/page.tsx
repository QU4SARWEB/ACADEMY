import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'

async function updateEvaluation(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('evaluations').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: formData.get('dueDate') ? new Date(formData.get('dueDate') as string).toISOString() : null,
  }).eq('id', id)

  revalidatePath(`/coaches/evaluations/${id}`)
}

async function deleteEvaluation(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('evaluations').delete().eq('id', id)
  revalidatePath('/coaches/evaluations')
  redirect('/coaches/evaluations')
}

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('evaluations')
    .select('*, course_modules(name, course_id, courses(name))')
    .eq('id', id)
    .maybeSingle()

  if (!ev) return <p className="text-zinc-400">Evaluación no encontrada.</p>

  const { data: results } = await supabase
    .from('evaluation_results')
    .select('*, enrollments(profile_id, profiles(full_name, avatar_url))')
    .eq('evaluation_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <Link href="/coaches/evaluations" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a evaluaciones
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{ev.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ev.course_modules?.courses?.name} / {ev.course_modules?.name}
          </p>
          <p className="text-sm text-zinc-500">
            {ev.max_score} pts · Peso: {ev.weight}%
            {ev.due_date && ` · Límite: ${new Date(ev.due_date).toLocaleDateString()}`}
          </p>
          {ev.description && <p className="mt-2 text-sm text-zinc-300">{ev.description}</p>}
        </div>
        <form action={deleteEvaluation}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            onClick={(e) => { if (!confirm('¿Eliminar esta evaluación?')) e.preventDefault() }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </form>
      </div>

      <details className="glass mb-6 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">Editar evaluación</summary>
        <div className="border-t border-zinc-800 px-4 py-4">
          <form action={updateEvaluation} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Título</label>
                <input name="title" defaultValue={ev.title} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Puntaje máximo</label>
                <input name="maxScore" type="number" defaultValue={ev.max_score} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Peso (%)</label>
                <input name="weight" type="number" defaultValue={ev.weight} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Fecha límite</label>
                <input name="dueDate" type="date" defaultValue={ev.due_date?.slice(0, 10)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Guardar cambios
            </button>
          </form>
        </div>
      </details>

      <h2 className="mb-4 font-heading text-lg font-bold text-white">Resultados ({results?.length ?? 0})</h2>

      <div className="space-y-2">
        {(results ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">Sin resultados todavía.</p>
        )}
        {(results ?? []).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                {r.enrollments?.profiles?.full_name?.charAt(0) ?? '?'}
              </div>
              <span className="text-sm text-white">{r.enrollments?.profiles?.full_name}</span>
            </div>
            <span className="text-sm font-medium text-white">{r.score}/{ev.max_score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
