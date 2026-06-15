import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function updateCourse(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('courses').update({
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    min_rank: formData.get('minRank') as string,
    duration_months: parseInt(formData.get('durationMonths') as string),
    is_active: formData.get('isActive') === 'true',
  }).eq('id', id)

  revalidatePath(`/coaches/courses/${id}`)
  redirect(`/coaches/courses/${id}`)
}

async function deleteCourse(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('courses').delete().eq('id', id)

  revalidatePath('/coaches/courses')
  redirect('/coaches/courses')
}

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('*').eq('id', id).maybeSingle()
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

      <form action={deleteCourse} className="mt-8">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          onClick={(e) => { if (!confirm('¿Eliminar este curso permanentemente? Esto eliminará módulos, materiales y tareas asociadas.')) e.preventDefault() }}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Eliminar curso
        </button>
      </form>
    </div>
  )
}
