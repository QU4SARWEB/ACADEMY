'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parseDateTime } from '@/lib/parseDateTime'

export async function updateEval(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  const { error } = await supabase.from('evaluations').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: formData.get('dueDate') ? parseDateTime(formData.get('dueDate') as string) : null,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${id}`)
}

export async function deleteEval(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  const { error } = await supabase.from('evaluations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/coaches/evaluations')
  redirect('/coaches/evaluations')
}

export async function addQuestion(formData: FormData) {
  const supabase = await createClient()
  const evaluationId = formData.get('evaluationId') as string
  const questionId = formData.get('questionId') as string

  const { error } = await supabase.from('evaluation_questions').insert({
    evaluation_id: evaluationId,
    question_id: questionId,
    order_num: parseInt(formData.get('orderNum') as string) || 0,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}

export async function removeQuestion(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const evaluationId = formData.get('evaluationId') as string

  const { error } = await supabase.from('evaluation_questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}

export async function gradeAnswer(formData: FormData) {
  const supabase = await createClient()
  const answerId = formData.get('answerId') as string
  const score = parseFloat(formData.get('score') as string) || 0
  const evaluationId = formData.get('evaluationId') as string

  const { error } = await supabase.from('evaluation_answers').update({
    score,
    graded_by: (await supabase.auth.getUser()).data.user?.id,
    graded_at: new Date().toISOString(),
  }).eq('id', answerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}
