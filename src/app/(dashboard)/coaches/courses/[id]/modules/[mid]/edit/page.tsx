import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'

async function updateModule(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    month_number: parseInt(formData.get('monthNumber') as string),
    display_order: parseInt(formData.get('displayOrder') as string),
  }).eq('id', moduleId)

  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
  redirect(`/coaches/courses/${courseId}/modules/${moduleId}`)
}

async function deleteModule(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('course_modules').delete().eq('id', moduleId)

  revalidatePath(`/coaches/courses/${courseId}`)
  redirect(`/coaches/courses/${courseId}`)
}

const deleteModuleAction = deleteModule

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>
}) {
  const { id: courseId, mid: moduleId } = await params
  const supabase = await createClient()

  const { data: mod } = await supabase.from('course_modules').select('*').eq('id', moduleId).maybeSingle()
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
