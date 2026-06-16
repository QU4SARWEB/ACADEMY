import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import CoursePresetSelector from './CoursePresetSelector'

async function createCourse(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const seasonId = formData.get('seasonId') as string
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const displayOrder = parseInt(formData.get('displayOrder') as string)
  const minRank = formData.get('minRank') as string
  const durationMonths = parseInt(formData.get('durationMonths') as string)

  const { data: newCourse } = await supabase.from('courses').insert({
    season_id: seasonId,
    name,
    slug,
    display_order: displayOrder,
    min_rank: minRank,
    duration_months: durationMonths,
  }).select('id').maybeSingle()

  if (!newCourse) return
  await supabase.from('promotion_requirements').insert({
    course_id: newCourse.id,
    min_grade: 80,
    min_rank: minRank,
  })

  revalidatePath('/coaches/courses')
  redirect('/coaches/courses')
}

export default async function NewCoursePage() {
  const supabase = await createClient()
  const { data: seasons } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })

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
            {(seasons ?? []).map((s) => (
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
