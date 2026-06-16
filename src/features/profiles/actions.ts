'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePublicProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const slug = (formData.get('slug') as string)?.trim()
  const isPublic = formData.get('isPublic') === 'on'

  if (!slug) return { error: 'El slug no puede estar vacío' }

  const { data: existing } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('slug', slug)
    .neq('profile_id', user.id)
    .maybeSingle()

  if (existing) return { error: 'Ese slug ya está en uso' }

  try {
    const { data: existingProfile } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()

    const payload: Record<string, any> = {
      slug,
      is_public: isPublic,
    }

    if (existingProfile) {
      payload.display_name = existingProfile.display_name
      payload.bio = existingProfile.bio
      payload.social_links = existingProfile.social_links
    }

    if (existingProfile) {
      const { error } = await supabase.from('public_profiles').update(payload).eq('profile_id', user.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('public_profiles').insert({
        profile_id: user.id,
        ...payload,
      })
      if (error) return { error: error.message }
    }

    revalidatePath('/coaches/profile', 'layout')
    revalidatePath('/students/profile', 'layout')
    revalidatePath('/players/profile', 'layout')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al guardar perfil público' }
  }
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
