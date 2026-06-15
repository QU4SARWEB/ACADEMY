'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePublicProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const slug = formData.get('slug') as string
  const isPublic = formData.get('isPublic') === 'on'

  if (slug) {
    const { data: existing } = await supabase
      .from('public_profiles')
      .select('id')
      .eq('slug', slug)
      .neq('profile_id', user.id)
      .maybeSingle()

    if (existing) {
      return { error: 'Ese slug ya está en uso' }
    }
  }

  const { data: existingProfile } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const payload = {
    slug,
    is_public: isPublic,
    display_name: formData.get('displayName') as string,
    bio: formData.get('bio') as string,
    social_links: {
      discord: formData.get('socialDiscord') || undefined,
      youtube: formData.get('socialYoutube') || undefined,
      twitter: formData.get('socialTwitter') || undefined,
      twitch: formData.get('socialTwitch') || undefined,
    },
  }

  if (existingProfile) {
    await supabase.from('public_profiles').update(payload).eq('profile_id', user.id)
  } else {
    await supabase.from('public_profiles').insert({
      profile_id: user.id,
      ...payload,
    })
  }

  revalidatePath('/profile', 'layout')
  return { success: true }
}

export async function getPublicProfileByUserId(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle()

  return data
}
