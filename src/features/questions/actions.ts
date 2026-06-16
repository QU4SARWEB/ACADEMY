'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getQuestions, getQuestion, createQuestion, updateQuestion, deleteQuestion } from '@/services/questions'

export async function fetchQuestions(courseId?: string) {
  const supabase = await createClient()
  return getQuestions(supabase, courseId)
}

export async function fetchQuestion(id: string) {
  const supabase = await createClient()
  return getQuestion(supabase, id)
}

export async function createNewQuestion(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const courseId = formData.get('courseId') as string
  const type = formData.get('type') as string
  const stem = formData.get('stem') as string

  if (!courseId || !type || !stem) return

  const optionTexts = formData.getAll('optionText') as string[]
  const optionCorrect = formData.getAll('optionCorrect') as string[]
  const options = optionTexts.map((text, i) => ({
    text,
    is_correct: optionCorrect[i] === 'true',
    order_num: i,
  })).filter((o) => o.text.trim())

  await createQuestion(supabase, {
    course_id: courseId,
    type,
    stem,
    explanation: (formData.get('explanation') as string) || undefined,
    difficulty: parseInt(formData.get('difficulty') as string) || 1,
    points: parseFloat(formData.get('points') as string) || 1,
    options: options.length > 0 ? options : undefined,
  })

  revalidatePath('/coaches/questions')
  redirect('/coaches/questions')
}

export async function editQuestion(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const id = formData.get('id') as string

  const optionTexts = formData.getAll('optionText') as string[]
  const optionCorrect = formData.getAll('optionCorrect') as string[]
  const options = optionTexts.map((text, i) => ({
    text,
    is_correct: optionCorrect[i] === 'true',
    order_num: i,
  })).filter((o) => o.text.trim())

  const result = await updateQuestion(supabase, id, {
    stem: (formData.get('stem') as string) || undefined,
    explanation: (formData.get('explanation') as string) || undefined,
    difficulty: parseInt(formData.get('difficulty') as string) || undefined,
    points: parseFloat(formData.get('points') as string) || undefined,
    options: options.length > 0 ? options : undefined,
  })

  revalidatePath('/coaches/questions')
  redirect('/coaches/questions')
}

export async function removeQuestion(id: string) {
  const supabase = await createClient()
  const result = await deleteQuestion(supabase, id)
  revalidatePath('/coaches/questions')
  return result
}
