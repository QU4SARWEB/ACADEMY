'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CoursePresetSelector from './CoursePresetSelector'
import { createCourse } from './actions'

export default function NewCoursePage() {
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
      setSeasons(data ?? [])
      setLoading(false)
    })()
  }, [])

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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Nuevo curso</h1>

      <form action={createCourse} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Nombre</label>
          <CoursePresetSelector />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Slug</label>
            <input name="slug" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Orden</label>
            <input name="displayOrder" type="number" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Rango mínimo</label>
            <input name="minRank" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Duración (meses)</label>
            <input name="durationMonths" type="number" defaultValue={2} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Season</label>
          <select name="seasonId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Seleccionar...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Activa)' : ''}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Crear curso
        </button>
      </form>

      <details className="glass mt-8 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">Guía rápida: Cursos QU4SAR</summary>
        <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500">
          <p className="mb-2 font-medium text-zinc-300">Progresión recomendada:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Rookie (Hierro) — 2 meses</li>
            <li>Trainee (Bronce) — 2 meses</li>
            <li>Amateur (Plata) — 2 meses</li>
            <li>Competitor (Oro) — 2 meses</li>
            <li>Elite (Platino) — 2 meses</li>
            <li>Semi-Pro (Diamante) — 2 meses</li>
            <li>Pro (Ascendente+) — Graduado</li>
          </ol>
        </div>
      </details>
    </div>
  )
}
