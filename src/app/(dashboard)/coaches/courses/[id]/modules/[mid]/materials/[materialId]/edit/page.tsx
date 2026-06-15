import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

async function updateMaterial(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const materialId = formData.get('materialId') as string
  const moduleId = formData.get('moduleId') as string
  const courseId = formData.get('courseId') as string

  await supabase.from('materials').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    type: formData.get('type') as string,
    url: formData.get('url') as string,
    display_order: parseInt(formData.get('displayOrder') as string) || 0,
  }).eq('id', materialId)

  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
  redirect(`/coaches/courses/${courseId}/modules/${moduleId}`)
}

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string; mid: string; materialId: string }>
}) {
  const { id: courseId, mid: moduleId, materialId } = await params
  const supabase = await createClient()

  const { data: material } = await supabase.from('materials').select('*').eq('id', materialId).maybeSingle()
  if (!material) return <p className="text-zinc-400">Material no encontrado.</p>

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/coaches/courses/${courseId}/modules/${moduleId}`} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al módulo
      </Link>

      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Editar material</h1>

      <form action={updateMaterial} className="space-y-4">
        <input type="hidden" name="materialId" value={materialId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="courseId" value={courseId} />

        <div>
          <label className="block text-sm font-medium text-zinc-300">Título</label>
          <input name="title" defaultValue={material.title} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Descripción</label>
          <textarea name="description" rows={2} defaultValue={material.description ?? ''} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Tipo</label>
            <select name="type" required defaultValue={material.type} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="image">Imagen</option>
              <option value="link">Link externo</option>
              <option value="embed">Embed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Orden</label>
            <input name="displayOrder" type="number" defaultValue={material.display_order} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">URL</label>
          <input name="url" defaultValue={material.url} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]" placeholder="https://..." />
        </div>

        <button type="submit" className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 font-medium text-white transition hover:bg-[#7C3AED]">
          Guardar cambios
        </button>
      </form>
    </div>
  )
}
