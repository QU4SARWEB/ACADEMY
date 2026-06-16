import Link from 'next/link'
import { Plus, ArrowLeft, FileText, Video, Link2, Image, FileType, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText size={16} className="text-red-400" />,
  video: <Video size={16} className="text-blue-400" />,
  image: <Image size={16} className="text-green-400" />,
  link: <Link2 size={16} className="text-purple-400" />,
  embed: <FileType size={16} className="text-yellow-400" />,
}

async function deleteMaterial(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const materialId = formData.get('materialId') as string
  const courseId = formData.get('courseId') as string
  const moduleId = formData.get('moduleId') as string

  await supabase.from('materials').delete().eq('id', materialId)
  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
}

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>
}) {
  const { id: courseId, mid: moduleId } = await params
  const supabase = await createClient()

  const { data: mod } = await supabase.from('course_modules').select('*').eq('id', moduleId).maybeSingle()
  if (!mod) return <p className="text-zinc-400">Módulo no encontrado.</p>

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('module_id', moduleId)
    .order('display_order')

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at')

  return (
    <div>
      <Link
        href={`/coaches/courses/${courseId}`}
        className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Volver al curso
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{mod.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">Mes {mod.month_number} · {mod.description}</p>
        </div>
        <Link
          href={`/coaches/courses/${courseId}/modules/${moduleId}/edit`}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
        >
          Editar
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Materiales</h2>
            <Link
              href={`/coaches/courses/${courseId}/modules/${moduleId}/materials/new`}
              className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-sm text-white transition hover:bg-[#7C3AED]"
            >
              <Plus size={14} /> Añadir
            </Link>
          </div>

          <div className="space-y-2">
            {(materials ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">Sin materiales todavía.</p>
            )}
            {(materials ?? []).map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3 transition hover:border-zinc-700"
              >
                <a href={mat.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                  {typeIcons[mat.type] ?? <FileText size={16} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{mat.title}</p>
                    <p className="text-xs text-zinc-500 capitalize">{mat.type}</p>
                  </div>
                </a>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/coaches/courses/${courseId}/modules/${moduleId}/materials/${mat.id}/edit`}
                    className="rounded p-1 text-zinc-500 hover:text-white hover:bg-zinc-800"
                  >
                    <Pencil size={14} />
                  </Link>
                  <ConfirmDeleteForm message="¿Eliminar este material?" action={deleteMaterial}>
                    <input type="hidden" name="materialId" value={mat.id} />
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="moduleId" value={moduleId} />
                    <button
                      type="submit"
                      className="rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </ConfirmDeleteForm>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Evaluaciones</h2>
            <Link
              href={`/coaches/evaluations/new?moduleId=${moduleId}`}
              className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-sm text-white transition hover:bg-[#7C3AED]"
            >
              <Plus size={14} /> Añadir
            </Link>
          </div>

          <div className="space-y-2">
            {(evaluations ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">Sin evaluaciones todavía.</p>
            )}
            {(evaluations ?? []).map((evalItem) => (
              <Link
                key={evalItem.id}
                href={`/coaches/evaluations/${evalItem.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#111] px-4 py-3 transition hover:border-zinc-700"
              >
                <div>
                  <p className="text-sm font-medium text-white">{evalItem.title}</p>
                  <p className="text-xs text-zinc-500">Peso: {evalItem.weight}%</p>
                </div>
                <span className="text-sm text-zinc-400">{evalItem.max_score} pts</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
