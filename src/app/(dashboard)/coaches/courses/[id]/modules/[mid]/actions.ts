'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteMaterial(formData: FormData) {
  const supabase = await createClient()
  const materialId = formData.get('materialId') as string
  const courseId = formData.get('courseId') as string
  const moduleId = formData.get('moduleId') as string

  await supabase.from('materials').delete().eq('id', materialId)
  revalidatePath(`/coaches/courses/${courseId}/modules/${moduleId}`)
}
