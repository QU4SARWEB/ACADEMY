'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTask } from './actions'

export default function NewTaskPage() {
  const [modules, setModules] = useState<any[]>([])
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select('id, name, course_id, courses(name)')
        .order('course_id')
      const { data: seasonsData } = await supabase.from('seasons').select('id, name, is_active')

      setModules(modulesData ?? [])
      setSeasons(seasonsData ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Nueva tarea</h1>

      <form action={createTask} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Título</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={4} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Material adjunto (opcional)</label>
          <input name="materialFile" type="file" accept=".pdf,.doc,.docx,.zip,.rar,image/*,video/*"
            className="mt-1 w-full text-sm text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-[#8B5CF6]/20 file:px-3 file:py-1.5 file:text-sm file:text-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Módulo</label>
            <select name="moduleId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {(m.courses as any)?.name ?? ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Season</label>
            <select name="seasonId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Activa)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Fecha límite</label>
            <input name="dueDate" type="datetime-local" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Puntaje máximo</label>
            <input name="maxScore" type="number" defaultValue={100} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Tipos de entrega permitidos</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[{ id: 'allowPdf', label: 'PDF' }, { id: 'allowImage', label: 'Imagen' }, { id: 'allowVideo', label: 'Video' }, { id: 'allowAudio', label: 'Audio' }, { id: 'allowLink', label: 'Link externo' }].map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300">
                <input type="checkbox" name={id} defaultChecked className="accent-[#8B5CF6]" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Crear tarea
        </button>
      </form>
    </div>
  )
}
