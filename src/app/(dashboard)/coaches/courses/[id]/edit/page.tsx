'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { updateCourse, deleteCourse } from './actions'

export default function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase.from('courses').select('*').eq('id', id).maybeSingle()
      setCourse(data)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Editar curso</h1>

      <form action={updateCourse} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label className="block text-sm font-medium text-zinc-300">Nombre</label>
          <input name="name" defaultValue={course.name} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Slug</label>
            <input name="slug" defaultValue={course.slug} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Rango mínimo</label>
            <input name="minRank" defaultValue={course.min_rank} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Duración (meses)</label>
            <input name="durationMonths" type="number" defaultValue={course.duration_months} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Estado</label>
            <select name="isActive" defaultValue={String(course.is_active)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Guardar cambios
        </button>
      </form>

      <ConfirmDeleteForm message="¿Eliminar este curso permanentemente? Esto eliminará módulos, materiales y tareas asociadas." action={deleteCourse}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Eliminar curso
        </button>
      </ConfirmDeleteForm>
    </div>
  )
}
