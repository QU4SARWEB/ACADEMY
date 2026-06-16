import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'

export default async function StudentEvaluationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('name')
    .eq('id', id)
    .maybeSingle()

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  const { data: modules } = await supabase
    .from('course_modules')
    .select('id, name')
    .eq('course_id', id)
    .order('display_order')

  const moduleIds = (modules ?? []).map((m) => m.id)

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*')
    .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
    .order('created_at', { ascending: false })

  const evalsByModule: Record<string, typeof evaluations> = {}
  for (const ev of evaluations ?? []) {
    if (!evalsByModule[ev.module_id]) {
      evalsByModule[ev.module_id] = []
    }
    evalsByModule[ev.module_id]!.push(ev)
  }

  return (
    <div>
      <Link href={`/students/courses/${id}`} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a {course.name}
      </Link>

      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Evaluaciones</h1>

      {(modules ?? []).length === 0 && (
        <p className="text-sm text-zinc-500">No hay módulos disponibles.</p>
      )}

      {(modules ?? []).map((mod) => {
        const modEvals = evalsByModule[mod.id] ?? []
        return (
          <div key={mod.id} className="mb-6">
            <h2 className="mb-3 font-heading text-lg font-semibold text-white">{mod.name}</h2>
            {modEvals.length === 0 && (
              <p className="ml-4 text-sm text-zinc-600">Sin evaluaciones.</p>
            )}
            <div className="ml-4 space-y-2">
              {modEvals.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/students/evaluations/${ev.id}`}
                  className="glass glass-hover flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <ClipboardList size={16} className="text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{ev.title}</p>
                    <p className="text-xs text-zinc-500">
                      Peso: {ev.weight}%{ev.due_date && ` · Límite: ${formatDate(ev.due_date)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
