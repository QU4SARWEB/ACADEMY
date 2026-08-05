import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'
import { formatDate } from '@/2b3583/6b239c'

export function renderStudentCourseDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentCourseDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado.</p>'
      return
    }
    sessionStorage.setItem(`qu4sar-course-context:${id}`, course.name)

    let paymentStatus: string | null = null
    let paidAt: string | null = null
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('course_id', id)
      .eq('status', 'active')
      .maybeSingle()
    if (enrollment) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status, amount, paid_at')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false })
        .maybeSingle()
      if (payment) { paymentStatus = payment.status; paidAt = payment.paid_at }
    }

    const [{ data: tasks }, { data: exams }, { data: schedules }] = await Promise.all([
      supabase.from('course_tasks').select('id, title, description, due_date, week_number').eq('course_id', id).order('due_date', { ascending: true }),
      supabase.from('exams').select('id, title, week_number, published').eq('course_id', id).eq('published', true).order('week_number', { ascending: true }),
      supabase.from('schedules').select('id, title, schedule_date, start_time, end_time').eq('course_id', id).order('schedule_date').order('start_time').limit(5),
    ])
    const { data: modules } = await supabase.from('course_modules').select('id, title, description, display_order').eq('course_id', id).eq('is_published', true).order('display_order')
    const moduleIds = (modules ?? []).map((module: any) => module.id).filter(Boolean)
    const { data: materials } = moduleIds.length > 0
      ? await supabase.from('course_materials').select('id, module_id, title, description, material_type, resource_url, display_order').in('module_id', moduleIds).eq('is_published', true).order('display_order')
      : { data: [] as any[] }
    const materialIds = (materials ?? []).map((material: any) => material.id).filter(Boolean)
    const { data: materialProgress } = materialIds.length > 0
      ? await supabase.from('course_material_progress').select('material_id').eq('student_id', session.user.id).in('material_id', materialIds)
      : { data: [] as any[] }
    const completedMaterialIds = new Set((materialProgress ?? []).map((progress: any) => progress.material_id))
    const taskIds = (tasks ?? []).map((task: any) => task.id).filter(Boolean)
    const { data: submissions } = taskIds.length > 0
      ? await supabase.from('task_submissions').select('task_id, score').eq('student_id', session.user.id).in('task_id', taskIds)
      : { data: [] as any[] }
    const submittedIds = new Set((submissions ?? []).map((submission: any) => submission.task_id))
    const pendingTasks = (tasks ?? []).filter((task: any) => !submittedIds.has(task.id))
    const completedTasks = (tasks ?? []).length - pendingTasks.length
    const progress = tasks && tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
    const { data: examResults } = exams && exams.length > 0
      ? await supabase.from('exam_results').select('exam_id, status, score').eq('student_id', session.user.id).in('exam_id', exams.map((exam: any) => exam.id))
      : { data: [] as any[] }
    const resultMap = new Map((examResults ?? []).map((result: any) => [result.exam_id, result]))

    let paidDaysLeft = ''
    if (paidAt) {
      const elapsed = Date.now() - new Date(paidAt).getTime()
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 86400000))
      paidDaysLeft = remaining > 0 ? ` — ${remaining} día${remaining !== 1 ? 's' : ''} restantes` : ' — vencida'
    }

    const statusBadge = paymentStatus === 'pending'
      ? `<div class="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Pago pendiente — <a href="#/payments" class="underline hover:text-yellow-300">Sube tu comprobante aquí</a>
        </div>`
      : paymentStatus === 'paid'
      ? `<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          Pago confirmado${paidDaysLeft}
        </div>`
      : paymentStatus === 'scholarship'
      ? `<div class="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-400">
          Este curso está cubierto por una beca.
        </div>`
      : course.slug === 'clase-complementaria'
      ? `<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <strong>IMPORTANTE:</strong> Está estrictamente prohibido compartir el material, documentos, videos o cualquier información de este curso con alumnos que no hayan cancelado su inscripción. Si llegamos a detectar o se reporta que has compartido contenido, se aplicarán sanciones severas que pueden incluir la expulsión definitiva de la academia. <strong>Protege tu inversión y la de tus compañeros.</strong>
        </div>`
      : course.price && course.price > 0 ? ''
        : `<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
            Curso gratuito. ¡Disfruta del curso!
          </div>`

    const nextTask = pendingTasks[0]
    const nextExam = exams?.find((exam: any) => !resultMap.get(exam.id) || resultMap.get(exam.id)?.status !== 'graded')
    const nextSchedule = schedules?.[0]
    const taskRows = (tasks ?? []).slice(0, 5).map((task: any) => `
      <a href="#/students/tasks" class="course-detail-row">
        <span class="course-detail-row__icon">${Icon(submittedIds.has(task.id) ? 'checkCircle' : 'clipboardList', 16)}</span>
        <span><strong>${escapeHtml(task.title)}</strong><small>${task.due_date ? `Entrega ${escapeHtml(formatDate(task.due_date))}` : `Semana ${task.week_number || '—'}`}</small></span>
        <span class="course-detail-row__status ${submittedIds.has(task.id) ? 'done' : ''}">${submittedIds.has(task.id) ? 'Entregada' : 'Pendiente'}</span>
      </a>`).join('')
    const examRows = (exams ?? []).slice(0, 4).map((exam: any) => {
      const result = resultMap.get(exam.id)
      return `<a href="#/students/exams" class="course-detail-row">
        <span class="course-detail-row__icon">${Icon('scrollText', 16)}</span>
        <span><strong>${escapeHtml(exam.title)}</strong><small>Semana ${exam.week_number || '—'}</small></span>
        <span class="course-detail-row__status ${result?.status === 'graded' ? 'done' : ''}">${result?.status === 'graded' ? `${result.score ?? ''}/20` : 'Disponible'}</span>
      </a>`
    }).join('')
    const materialByModule = new Map<string, any[]>()
    for (const material of materials ?? []) {
      const rows = materialByModule.get(material.module_id) || []
      rows.push(material)
      materialByModule.set(material.module_id, rows)
    }
    const materialIcon: Record<string, string> = { video: 'video', document: 'fileText', link: 'externalLink', text: 'bookOpen' }
    const contentRows = (modules ?? []).map((module: any) => `
      <div class="course-module">
        <div class="course-module__head"><span>${String(module.display_order).padStart(2, '0')}</span><div><h3>${escapeHtml(module.title)}</h3>${module.description ? `<p>${escapeHtml(module.description)}</p>` : ''}</div></div>
        <div class="course-module__materials">
          ${(materialByModule.get(module.id) || []).map((material: any) => {
            const completed = completedMaterialIds.has(material.id)
            const tag = material.resource_url ? 'a' : 'button'
            const href = material.resource_url ? ` href="${escapeHtml(material.resource_url)}" target="_blank" rel="noopener"` : ' type="button"'
            return `<${tag}${href} class="course-material${completed ? ' completed' : ''}" data-material-id="${escapeHtml(material.id)}">
              <span class="course-material__icon">${Icon(materialIcon[material.material_type] || 'fileText', 15)}</span>
              <span><strong>${escapeHtml(material.title)}</strong><small>${escapeHtml(material.description || material.material_type || 'Material de estudio')}</small></span>
              <span class="course-material__check">${Icon(completed ? 'checkCircle' : 'chevronRight', 15)}</span>
            </${tag}>`
          }).join('') || '<p class="course-detail-empty">Contenido en preparación.</p>'}
        </div>
      </div>`).join('')

    const html = `
      <div class="course-detail-page">
        ${Breadcrumb([{ label: 'Cursos', href: '#/students/courses' }, { label: course.name }])}
        <section class="course-detail-hero">
          <div>
            <span class="kicker">Ruta de entrenamiento</span>
            <h1>${escapeHtml(course.name)}</h1>
            <p>${course.duration_months} meses · Rango mínimo: ${escapeHtml(course.min_rank)}${course.price && course.price > 0 ? ` · $${course.price}/mes` : ' · Gratis'}</p>
            ${course.description ? `<div class="course-detail-hero__description">${escBr(course.description)}</div>` : ''}
          </div>
          <div class="course-detail-hero__progress"><strong>${progress}%</strong><span>actividad completada</span><div><i style="width:${progress}%"></i></div></div>
        </section>
        ${statusBadge}
        <div class="course-detail-actions">
          <a href="#/students/tasks" class="course-detail-action course-detail-action--main"><span>${Icon('clipboardList', 18)}</span><b>Próxima tarea</b><strong>${escapeHtml(nextTask?.title || 'Revisar tareas')}</strong><small>${nextTask?.due_date ? `Entrega ${escapeHtml(formatDate(nextTask.due_date))}` : 'Mantén tu ruta activa'}</small></a>
          <a href="#/students/schedule" class="course-detail-action"><span>${Icon('calendar', 18)}</span><b>Próxima clase</b><strong>${escapeHtml(nextSchedule?.title || 'Ver horario')}</strong><small>${nextSchedule?.schedule_date ? `${escapeHtml(formatDate(nextSchedule.schedule_date))} ${nextSchedule.start_time ? `· ${escapeHtml(nextSchedule.start_time.slice(0, 5))}` : ''}` : 'Sin clases próximas'}</small></a>
          <a href="#/students/exams" class="course-detail-action"><span>${Icon('scrollText', 18)}</span><b>Siguiente evaluación</b><strong>${escapeHtml(nextExam?.title || 'Ver exámenes')}</strong><small>${nextExam ? 'Disponible en tu ruta' : 'Todo al día'}</small></a>
        </div>
        <section class="card course-content-panel"><div class="course-detail-panel__head"><div><span class="kicker">Ruta de aprendizaje</span><h2>Contenido del curso</h2></div><span class="course-content-count">${completedMaterialIds.size}/${materials?.length || 0} materiales</span></div>${contentRows || '<p class="course-detail-empty">El contenido de este curso se está preparando.</p>'}</section>
        <div class="course-detail-columns">
          <section class="card course-detail-panel"><div class="course-detail-panel__head"><div><span class="kicker">Actividad</span><h2>Tareas del curso</h2></div><a href="#/students/tasks">Ver todas →</a></div>${taskRows || '<p class="course-detail-empty">Todavía no hay tareas en este curso.</p>'}</section>
          <section class="card course-detail-panel"><div class="course-detail-panel__head"><div><span class="kicker">Evaluación</span><h2>Exámenes</h2></div><a href="#/students/exams">Ver todos →</a></div>${examRows || '<p class="course-detail-empty">Todavía no hay exámenes publicados.</p>'}</section>
        </div>
        <div class="course-detail-footer-actions"><a href="#/students/grades" class="btn btn-ghost">${Icon('trophy', 15)} Ver mis notas</a><a href="#/payments" class="btn btn-primary">${Icon('dollarSign', 15)} Gestionar pagos</a></div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll<HTMLElement>('[data-material-id]').forEach(material => {
      material.addEventListener('click', async () => {
        const materialId = material.dataset.materialId
        if (!materialId || material.classList.contains('completed')) return
        const { error } = await supabase.from('course_material_progress').upsert({ material_id: materialId, student_id: session.user.id }, { onConflict: 'material_id,student_id' })
        if (!error) material.classList.add('completed')
      })
    })


  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
