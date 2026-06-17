'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCourse(formData: FormData) {
  const supabase = await createClient()
  const seasonId = formData.get('seasonId') as string
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const displayOrder = parseInt(formData.get('displayOrder') as string)
  const minRank = formData.get('minRank') as string
  const durationMonths = parseInt(formData.get('durationMonths') as string)

  const { data: newCourse } = await supabase.from('courses').insert({
    season_id: seasonId,
    name,
    slug,
    display_order: displayOrder,
    min_rank: minRank,
    duration_months: durationMonths,
  }).select('id').maybeSingle()

  if (!newCourse) return
  await supabase.from('promotion_requirements').insert({
    course_id: newCourse.id,
    min_grade: 80,
    min_rank: minRank,
  })

  revalidatePath('/coaches/courses')
  redirect('/coaches/courses')
}
