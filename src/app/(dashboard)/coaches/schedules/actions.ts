'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSchedule(formData: FormData) {
  const supabase = await createClient()

  await supabase.from('schedules').insert({
    season_id: formData.get('seasonId') as string,
    week_number: parseInt(formData.get('weekNumber') as string),
    day_of_week: parseInt(formData.get('dayOfWeek') as string),
    start_time: formData.get('startTime') as string,
    end_time: formData.get('endTime') as string,
    type: formData.get('type') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    location: formData.get('location') as string || null,
  })

  revalidatePath('/coaches/schedules')
  redirect('/coaches/schedules')
}

export async function deleteSchedule(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('schedules').delete().eq('id', formData.get('id') as string)
  revalidatePath('/coaches/schedules')
}
