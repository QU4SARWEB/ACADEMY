'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, use } from 'react'
import { createModule } from './actions'

export default function NewModulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: courseId } = use(params)
  const [courseName, setCourseName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).maybeSingle()
      setCourseName(course?.name ?? null)
      setLoading(false)
    })()
  }, [courseId])

  if (loading) return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-4">
      <div className="h-8 w-64 rounded bg-zinc-800" />
      <div className="h-10 rounded-lg bg-zinc-800" />
      <div className="h-20 rounded-lg bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 rounded-lg bg-zinc-800" />
        <div className="h-10 rounded-lg bg-zinc-800" />
      </div>
      <div className="h-10 w-32 rounded-lg bg-zinc-800" />
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">
        Nuevo módulo — {courseName}
      </h1>

      <form action={createModule} className="space-y-4">
        <input type="hidden" name="courseId" value={courseId} />

        <div>
          <label className="block text-sm font-medium text-zinc-300">Nombre del módulo</label>
          <input name="name" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" placeholder="Ej: Fundamentos de Aim" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Mes</label>
            <input name="monthNumber" type="number" min={1} max={12} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Orden</label>
            <input name="displayOrder" type="number" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Crear módulo
        </button>
      </form>
    </div>
  )
}
