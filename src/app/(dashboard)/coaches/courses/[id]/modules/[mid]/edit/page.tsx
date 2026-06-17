'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { updateModule, deleteModuleAction } from './actions'

export default function EditModulePage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>
}) {
  const { id: courseId, mid: moduleId } = use(params)
  const [mod, setMod] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: mod } = await supabase.from('course_modules').select('*').eq('id', moduleId).maybeSingle()
      setMod(mod)
      setLoading(false)
    })()
  }, [moduleId])

  if (loading) return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-zinc-800" />
      <div className="h-8 w-48 rounded bg-zinc-800" />
      <div className="h-10 rounded-lg bg-zinc-800" />
      <div className="h-20 rounded-lg bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 rounded-lg bg-zinc-800" />
        <div className="h-10 rounded-lg bg-zinc-800" />
      </div>
      <div className="h-10 w-40 rounded-lg bg-zinc-800" />
      <div className="h-10 rounded-lg bg-zinc-800" />
    </div>
  )
  if (!mod) return <p className="text-zinc-400">Módulo no encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/coaches/courses/${courseId}/modules/${moduleId}`} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al módulo
      </Link>

      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Editar módulo</h1>

      <form action={updateModule} className="space-y-4">
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="courseId" value={courseId} />

        <div>
          <label className="block text-sm font-medium text-zinc-300">Nombre</label>
          <input name="name" defaultValue={mod.name} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={3} defaultValue={mod.description ?? ''} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Mes</label>
            <input name="monthNumber" type="number" min={1} max={12} defaultValue={mod.month_number} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Orden</label>
            <input name="displayOrder" type="number" defaultValue={mod.display_order} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Guardar cambios
        </button>
      </form>

      <ConfirmDeleteForm message="¿Eliminar este módulo y todo su contenido?" action={deleteModuleAction}>
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="courseId" value={courseId} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Eliminar módulo
        </button>
      </ConfirmDeleteForm>
    </div>
  )
}
