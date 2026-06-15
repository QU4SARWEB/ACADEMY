import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { notifyStudentsInCourse } from '@/services/notify'

async function createTask(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const moduleId = formData.get('moduleId') as string
  const title = formData.get('title') as string

  const { data: mod } = await supabase
    .from('course_modules')
    .select('course_id')
    .eq('id', moduleId)
    .maybeSingle()

  await supabase.from('tasks').insert({
    module_id: moduleId,
    season_id: formData.get('seasonId') as string,
    title,
    description: formData.get('description') as string,
    due_date: new Date(formData.get('dueDate') as string).toISOString(),
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    allow_pdf: formData.get('allowPdf') === 'on',
    allow_image: formData.get('allowImage') === 'on',
    allow_video: formData.get('allowVideo') === 'on',
    allow_audio: formData.get('allowAudio') === 'on',
    allow_link: formData.get('allowLink') === 'on',
  })

  if (mod) {
    await notifyStudentsInCourse(
      mod.course_id,
      'task',
      `Nueva tarea: ${title}`,
      `Se ha asignado una nueva tarea en el curso.`,
      `/tasks`
    )
  }

  revalidatePath('/coaches/tasks')
  redirect('/coaches/tasks')
}

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: modules } = await supabase
    .from('course_modules')
    .select('id, name')
    .order('course_id')

  const { data: seasons } = await supabase.from('seasons').select('id, name, is_active')

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Módulo</label>
            <select name="moduleId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              {(modules ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Season</label>
            <select name="seasonId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111] px-4 py-2.5 text-white outline-none focus:border-[#8B5CF6]">
              {(seasons ?? []).map((s) => (
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
