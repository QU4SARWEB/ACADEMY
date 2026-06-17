'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateCourse(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('courses').update({
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    min_rank: formData.get('minRank') as string,
    duration_months: parseInt(formData.get('durationMonths') as string),
    is_active: formData.get('isActive') === 'true',
  }).eq('id', id)

  revalidatePath(`/coaches/courses/${id}`)
  redirect(`/coaches/courses/${id}`)
}

export async function deleteCourse(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('courses').delete().eq('id', id)

  revalidatePath('/coaches/courses')
  redirect('/coaches/courses')
}
