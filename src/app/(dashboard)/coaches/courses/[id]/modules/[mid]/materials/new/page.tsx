import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function createMaterial(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('materials').insert({
    module_id: moduleId,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    type: formData.get('type') as string,
    url: formData.get('url') as string,
    display_order: parseInt(formData.get('displayOrder') as string) || 0,
  })

  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
  redirect(`/coaches/courses/${courseId}/modules/${moduleId}`)
}

export default async function NewMaterialPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>
}) {
  const { id: courseId, mid: moduleId } = await params

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Nuevo material</h1>

      <form action={createMaterial} className="space-y-4">
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="courseId" value={courseId} />

        <div>
          <label className="block text-sm font-medium text-zinc-300">Título</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={2} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Tipo</label>
            <select name="type" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="image">Imagen</option>
              <option value="link">Link externo</option>
              <option value="embed">Embed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Orden</label>
            <input name="displayOrder" type="number" defaultValue={0} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">URL</label>
          <input name="url" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" placeholder="https://..." />
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Crear material
        </button>
      </form>
    </div>
  )
}
