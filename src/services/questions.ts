import type { SupabaseClient } from '@supabase/supabase-js'

export async function getQuestions(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('questions').select('*, question_options(*)').order('created_at', { ascending: false })
  if (courseId) query = query.eq('course_id', courseId)
  const { data } = await query
  return data ?? []
}

export async function getQuestion(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from('questions').select('*, question_options(*)').eq('id', id).maybeSingle()
  return data
}

export async function createQuestion(supabase: SupabaseClient, params: {
  course_id: string
  type: string
  stem: string
  explanation?: string
  difficulty?: number
  points?: number
  options?: { text: string; is_correct: boolean; order_num: number }[]
}) {
  const { data: question, error } = await supabase.from('questions').insert({
    course_id: params.course_id,
    type: params.type,
    stem: params.stem,
    explanation: params.explanation ?? null,
    difficulty: params.difficulty ?? 1,
    points: params.points ?? 1,
  }).select().maybeSingle()

  if (error || !question) return { error: error?.message ?? 'Error creating question' }

  if (params.options && params.options.length > 0) {
    const { error: optError } = await supabase.from('question_options').insert(
      params.options.map((o) => ({ ...o, question_id: question.id }))
    )
    if (optError) return { error: optError.message }
  }

  return { success: true, question }
}

export async function updateQuestion(supabase: SupabaseClient, id: string, params: {
  stem?: string
  explanation?: string
  difficulty?: number
  points?: number
  options?: { text: string; is_correct: boolean; order_num: number }[]
}) {
  const { error } = await supabase.from('questions').update({
    stem: params.stem,
    explanation: params.explanation,
    difficulty: params.difficulty,
    points: params.points,
  }).eq('id', id)

  if (error) return { error: error.message }

  if (params.options) {
    await supabase.from('question_options').delete().eq('question_id', id)
    if (params.options.length > 0) {
      const { error: optError } = await supabase.from('question_options').insert(
        params.options.map((o) => ({ ...o, question_id: id }))
      )
      if (optError) return { error: optError.message }
    }
  }

  return { success: true }
}

export async function deleteQuestion(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  return { error: error?.message }
}
