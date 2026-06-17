'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitAnswers(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const evaluationId = formData.get('evaluationId') as string
  const enrollmentId = formData.get('enrollmentId') as string
  const eqIds = formData.getAll('eqId') as string[]
  const selectedOptions = formData.getAll('selectedOption') as string[]
  const textAnswers = formData.getAll('textAnswer') as string[]
  const types = formData.getAll('type') as string[]

  for (let i = 0; i < eqIds.length; i++) {
    const type = types[i]
    let payload: any = {
      evaluation_question_id: eqIds[i],
      enrollment_id: enrollmentId,
    }

    if (type === 'multiple_choice' || type === 'true_false') {
      const optionId = selectedOptions[i]
      if (!optionId) continue

      const { data: option } = await supabase
        .from('question_options')
        .select('is_correct')
        .eq('id', optionId)
        .maybeSingle()

      payload.selected_option = optionId
      payload.is_correct = option?.is_correct ?? false
      payload.score = option?.is_correct ? 100 : 0
    } else {
      const text = textAnswers[i] || ''
      payload.text_answer = text
    }

    const { error } = await supabase.from('evaluation_answers').upsert(payload, {
      onConflict: 'evaluation_question_id, enrollment_id',
    })
    if (error) console.error(error)
  }

  revalidatePath(`/students/evaluations/${evaluationId}`)
  redirect(`/students/evaluations/${evaluationId}?submitted=true`)
}
