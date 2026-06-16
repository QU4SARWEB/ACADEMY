'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getExams, getExam, createExam, updateExam, addQuestionToExam, removeQuestionFromExam, publishExam, startExamAttempt, submitExamAttempt, getExamAttempts, getExamAttempt, gradeOpenAnswers, finalizeExamGrade } from '@/services/exams'

export async function fetchExams(courseId?: string) {
  const supabase = await createClient()
  return getExams(supabase, courseId)
}

export async function fetchExam(id: string) {
  const supabase = await createClient()
  return getExam(supabase, id)
}

export async function createNewExam(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const result = await createExam(supabase, {
    course_id: formData.get('courseId') as string,
    module_id: (formData.get('moduleId') as string) || undefined,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || undefined,
    passing_score: parseFloat(formData.get('passingScore') as string) || 60,
    time_limit: parseInt(formData.get('timeLimit') as string) || undefined,
    shuffle: formData.get('shuffle') === 'true',
    max_attempts: parseInt(formData.get('maxAttempts') as string) || 1,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: (formData.get('dueDate') as string) || undefined,
  })

  if (result.success) {
    const questionIds = formData.getAll('questionIds') as string[]
    const supabase = await createClient()
    for (const qId of questionIds) {
      await addQuestionToExam(supabase, result.exam.id, qId)
    }
  }

  revalidatePath('/coaches/courses')
  redirect(`/coaches/courses/${formData.get('courseId')}/exams`)
}

export async function attachQuestionToExam(examId: string, questionId: string) {
  const supabase = await createClient()
  const result = await addQuestionToExam(supabase, examId, questionId)
  revalidatePath('/coaches/courses')
  return result
}

export async function detachQuestionFromExam(examId: string, questionId: string) {
  const supabase = await createClient()
  const result = await removeQuestionFromExam(supabase, examId, questionId)
  revalidatePath('/coaches/courses')
  return result
}

export async function publishExamAction(id: string) {
  const supabase = await createClient()
  const result = await publishExam(supabase, id)
  revalidatePath('/coaches/courses')
  return result
}

export async function fetchExamAttempts(examId: string) {
  const supabase = await createClient()
  return getExamAttempts(supabase, examId)
}

export async function fetchExamAttempt(attemptId: string) {
  const supabase = await createClient()
  return getExamAttempt(supabase, attemptId)
}

export async function startStudentExam(examId: string, enrollmentId: string) {
  const supabase = await createClient()
  return startExamAttempt(supabase, examId, enrollmentId)
}

export async function submitStudentExam(prev: any, formData: FormData) {
  const supabase = await createClient()
  const attemptId = formData.get('attemptId') as string

  const questionIds = formData.getAll('questionId') as string[]
  const selectedOptions = formData.getAll('selectedOption') as string[]
  const textAnswers = formData.getAll('textAnswer') as string[]
  const questionTypes = formData.getAll('questionType') as string[]

  const { getExam } = await import('@/services/exams')
  const { data: attempt } = await supabase.from('exam_attempts').select('exam_id').eq('id', attemptId).maybeSingle()
  if (!attempt) return
  const exam = await getExam(supabase, attempt.exam_id)

  const answers = questionIds.map((qId, i) => {
    const type = questionTypes[i]

    if (type === 'multiple_choice' || type === 'true_false') {
      const selectedOption = selectedOptions[i]
      if (!selectedOption) return null

      let isCorrect = false
      const question = exam?.exam_questions?.find((eq: any) => eq.question_id === qId)
      const option = question?.questions?.question_options?.find((o: any) => o.id === selectedOption)
      if (option) isCorrect = option.is_correct

      return {
        question_id: qId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        score: isCorrect ? 100 : 0,
      }
    }

    return {
      question_id: qId,
      text_answer: textAnswers[i] || '',
    }
  }).filter(Boolean) as any[]

  return submitExamAttempt(supabase, attemptId, answers)
}

export async function gradeOpenQuestions(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const attemptId = formData.get('attemptId') as string
  const answerIds = formData.getAll('answerId') as string[]
  const scores = formData.getAll('score') as string[]

  const grades = answerIds.map((id, i) => ({
    answer_id: id,
    score: parseFloat(scores[i]) || 0,
  }))

  await gradeOpenAnswers(supabase, attemptId, grades)
  await finalizeExamGrade(supabase, attemptId)
  revalidatePath('/coaches/courses')
}
