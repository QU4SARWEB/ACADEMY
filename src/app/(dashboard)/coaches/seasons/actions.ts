'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSeason(formData: FormData) {
  const supabase = await createClient()

  await supabase.from('seasons').insert({
    name: formData.get('name') as string,
    start_date: formData.get('startDate') as string,
    end_date: formData.get('endDate') as string,
    is_active: formData.get('isActive') === 'true',
  })

  revalidatePath('/coaches/seasons')
  redirect('/coaches/seasons')
}

export async function activateSeason(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('seasons').update({ is_active: false }).neq('id', id)
  await supabase.from('seasons').update({ is_active: true }).eq('id', id)

  revalidatePath('/coaches/seasons')
}

export async function updateSeason(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('seasons').update({
    name: formData.get('name') as string,
    start_date: formData.get('startDate') as string,
    end_date: formData.get('endDate') as string,
  }).eq('id', id)

  revalidatePath('/coaches/seasons')
}

export async function deleteSeason(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('seasons').delete().eq('id', id)

  revalidatePath('/coaches/seasons')
}
