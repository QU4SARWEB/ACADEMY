import type { SupabaseClient } from '@supabase/supabase-js'

export async function getExams(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('exams').select('*, course_modules(name)').order('created_at', { ascending: false })
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  if (error) console.error('getExams error:', error)
  return data ?? []
}

export async function getExam(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*, course_modules(name), exam_questions(*, questions(*, question_options(*)))')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function createExam(supabase: SupabaseClient, params: {
  course_id: string
  module_id?: string
  title: string
  description?: string
  passing_score?: number
  time_limit?: number
  shuffle?: boolean
  max_attempts?: number
  weight?: number
  due_date?: string
}) {
  const { data, error } = await supabase.from('exams').insert({
    course_id: params.course_id,
    module_id: params.module_id ?? null,
    title: params.title,
    description: params.description ?? null,
    passing_score: params.passing_score ?? 60,
    time_limit: params.time_limit ?? null,
    shuffle: params.shuffle ?? false,
    max_attempts: params.max_attempts ?? 1,
    weight: params.weight ?? 0,
    due_date: params.due_date ?? null,
  }).select().maybeSingle()

  if (error || !data) return { error: error?.message ?? 'Error creating exam' }
  return { success: true, exam: data }
}

export async function updateExam(supabase: SupabaseClient, id: string, params: Record<string, any>) {
  const { error } = await supabase.from('exams').update(params).eq('id', id)
  return { error: error?.message }
}

export async function addQuestionToExam(supabase: SupabaseClient, examId: string, questionId: string, points?: number) {
  const { data: maxOrder } = await supabase
    .from('exam_questions')
    .select('order_num')
    .eq('exam_id', examId)
    .order('order_num', { ascending: false })
    .maybeSingle()

  const { error } = await supabase.from('exam_questions').insert({
    exam_id: examId,
    question_id: questionId,
    order_num: (maxOrder?.order_num ?? -1) + 1,
    points: points ?? 1,
  })
  return { error: error?.message }
}

export async function removeQuestionFromExam(supabase: SupabaseClient, examId: string, questionId: string) {
  const { error } = await supabase
    .from('exam_questions')
    .delete()
    .eq('exam_id', examId)
    .eq('question_id', questionId)
  return { error: error?.message }
}

export async function publishExam(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('exams').update({ is_published: true }).eq('id', id)
  return { error: error?.message }
}

export async function startExamAttempt(supabase: SupabaseClient, examId: string, enrollmentId: string) {
  const { data: existing } = await supabase
    .from('exam_attempts')
    .select('attempt_num')
    .eq('exam_id', examId)
    .eq('enrollment_id', enrollmentId)
    .order('attempt_num', { ascending: false })
    .maybeSingle()

  const attemptNum = (existing?.attempt_num ?? 0) + 1

  const { data, error } = await supabase.from('exam_attempts').insert({
    exam_id: examId,
    enrollment_id: enrollmentId,
    attempt_num: attemptNum,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  }).select().maybeSingle()

  if (error || !data) return { error: error?.message ?? 'Error starting attempt' }
  return { success: true, attempt: data }
}

export async function submitExamAttempt(supabase: SupabaseClient, attemptId: string, answers: {
  question_id: string
  selected_option?: string
  text_answer?: string
  is_correct?: boolean
  score?: number
}[]) {
  const { error: ansError } = await supabase.from('student_answers').insert(
    answers.map((a) => ({ ...a, attempt_id: attemptId }))
  )

  if (ansError) return { error: ansError.message }

  const autoGraded = answers.filter((a) => a.is_correct !== null)
  const score = autoGraded.length > 0
    ? (autoGraded.filter((a) => a.is_correct).length / autoGraded.length) * 100
    : null

  const { error: upError } = await supabase
    .from('exam_attempts')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), score })
    .eq('id', attemptId)

  if (upError) return { error: upError.message }
  return { success: true, score }
}

export async function getExamAttempts(supabase: SupabaseClient, examId: string) {
  const { data } = await supabase
    .from('exam_attempts')
    .select('*, enrollments(profile_id, profiles!inner(full_name, avatar_url))')
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: false })
  return data ?? []
}

export async function getExamAttempt(supabase: SupabaseClient, attemptId: string) {
  const { data } = await supabase
    .from('exam_attempts')
    .select('*, student_answers(*, questions(*, question_options(*)))')
    .eq('id', attemptId)
    .maybeSingle()
  return data
}

export async function gradeOpenAnswers(supabase: SupabaseClient, attemptId: string, grades: { answer_id: string; score: number }[]) {
  for (const g of grades) {
    await supabase.from('student_answers').update({ score: g.score }).eq('id', g.answer_id)
  }
  return { success: true }
}

export async function finalizeExamGrade(supabase: SupabaseClient, attemptId: string) {
  const { data: answers } = await supabase
    .from('student_answers')
    .select('score')
    .eq('attempt_id', attemptId)

  if (!answers || answers.length === 0) return { error: 'No answers found' }

  const totalScore = answers.reduce((s, a) => s + (a.score ?? 0), 0)
  const maxScore = answers.length * 100
  const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

  const { error } = await supabase
    .from('exam_attempts')
    .update({ status: 'graded', score: finalScore })
    .eq('id', attemptId)

  if (error) return { error: error.message }
  return { success: true, score: finalScore }
}
