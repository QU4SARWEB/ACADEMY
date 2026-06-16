import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autenticado', { status: 401 })

  const formData = await req.formData()
  const taskId = formData.get('taskId') as string
  const courseId = formData.get('courseId') as string
  const dueDate = formData.get('dueDate') as string
  const filesJson = formData.get('filesJson') as string

  if (!taskId || !courseId) {
    return new NextResponse('Faltan datos requeridos', { status: 400 })
  }

  const files = filesJson ? JSON.parse(filesJson) : []

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('profile_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle()

  if (!enrollment) return new NextResponse('Inscripción no encontrada', { status: 404 })

  const now = Date.now()
  const due = new Date(dueDate).getTime()
  const status = !isNaN(due) && now > due ? 'late' : 'submitted'

  const { error } = await supabase.from('task_submissions').insert({
    task_id: taskId,
    enrollment_id: enrollment.id,
    files,
    status,
    submitted_at: new Date(now).toISOString(),
  })

  if (error) return new NextResponse(error.message, { status: 500 })

  revalidatePath(`/students/tasks/${taskId}`)
  return NextResponse.redirect(new URL(`/students/tasks/${taskId}`, req.url))
}
