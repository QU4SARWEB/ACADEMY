'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'

export default function StudentEvaluationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [evalsByModule, setEvalsByModule] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()

      const { data: c } = await supabase
        .from('courses')
        .select('name')
        .eq('id', id)
        .maybeSingle()

      if (!c) {
        setLoading(false)
        return
      }
      setCourse(c)

      const { data: mods } = await supabase
        .from('course_modules')
        .select('id, name')
        .eq('course_id', id)
        .order('display_order')

      setModules(mods ?? [])

      const moduleIds = (mods ?? []).map((m: any) => m.id)

      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('*')
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
        .order('created_at', { ascending: false })

      const grouped: Record<string, any[]> = {}
      for (const ev of evaluations ?? []) {
        if (!grouped[ev.module_id]) {
          grouped[ev.module_id] = []
        }
        grouped[ev.module_id]!.push(ev)
      }
      setEvalsByModule(grouped)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        {[1, 2].map((i) => (
          <div key={i} className="mb-6">
            <div className="mb-3 h-6 w-40 animate-pulse rounded bg-zinc-800" />
            <div className="ml-4 space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-zinc-800" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
                    <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <Link href={`/students/courses/${id}`} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a {course.name}
      </Link>

      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Evaluaciones</h1>

      {modules.length === 0 && (
        <p className="text-sm text-zinc-500">No hay módulos disponibles.</p>
      )}

      {modules.map((mod) => {
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
