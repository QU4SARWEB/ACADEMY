import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function createModule(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').insert({
    course_id: courseId,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    month_number: parseInt(formData.get('monthNumber') as string),
    display_order: parseInt(formData.get('displayOrder') as string),
  })

  revalidatePath(`/coaches/courses/${courseId}`)
  redirect(`/coaches/courses/${courseId}`)
}

export default async function NewModulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: courseId } = await params
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).maybeSingle()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">
        Nuevo módulo — {course?.name}
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
