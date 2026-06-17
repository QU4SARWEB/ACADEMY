'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parseDateTime } from '@/lib/parseDateTime'

export async function createEvaluation(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('evaluations').insert({
    module_id: formData.get('moduleId') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: formData.get('dueDate') ? parseDateTime(formData.get('dueDate') as string) : null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/coaches/evaluations')
  redirect('/coaches/evaluations')
}
