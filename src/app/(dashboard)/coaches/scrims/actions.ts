'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createScrim(formData: FormData) {
  const supabase = await createClient()

  const rivalLogo = formData.get('rivalLogo') as File | null
  let rivalLogoUrl: string | null = null
  if (rivalLogo && rivalLogo.size > 0) {
    const ext = rivalLogo.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, rivalLogo, { upsert: true, contentType: rivalLogo.type || 'application/octet-stream' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      rivalLogoUrl = publicUrl
    }
  }

  const scoreQu4sar = formData.get('scoreQu4sar') as string
  const scoreOpponent = formData.get('scoreOpponent') as string
  const score = scoreQu4sar && scoreOpponent ? `${scoreQu4sar}-${scoreOpponent}` : null

  await supabase.from('scrims').insert({
    team_id: formData.get('teamId') as string,
    season_id: formData.get('seasonId') as string || null,
    rival: formData.get('rival') as string,
    scheduled_at: new Date(formData.get('scheduledAt') as string).toISOString(),
    result: formData.get('result') as string || null,
    score,
    rival_logo: rivalLogoUrl,
    notes: formData.get('notes') as string || null,
  })
  revalidatePath('/coaches/scrims')
  redirect('/coaches/scrims')
}

export async function deleteScrim(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('scrims').delete().eq('id', formData.get('id') as string)
  revalidatePath('/coaches/scrims')
}
