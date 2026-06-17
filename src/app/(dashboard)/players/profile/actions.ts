'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').update({
    full_name: formData.get('fullName') as string,
    display_name: formData.get('displayName') as string,
    riot_id: formData.get('riotId') as string,
    rank: formData.get('rank') as string,
    bio: formData.get('bio') as string,
    country: formData.get('country') as string,
    institutional_email: formData.get('institutionalEmail') as string,
    social_discord: formData.get('socialDiscord') as string,
    social_youtube: formData.get('socialYoutube') as string,
    social_twitter: formData.get('socialTwitter') as string,
    social_twitch: formData.get('socialTwitch') as string,
    region: formData.get('region') as string,
    in_game_role: formData.get('inGameRole') as string,
    mouse_dpi: formData.get('mouseDpi') ? parseInt(formData.get('mouseDpi') as string) : null,
    mouse_sens: formData.get('mouseSens') ? parseFloat(formData.get('mouseSens') as string) : null,
    mouse_scope_sens: formData.get('mouseScopeSens') ? parseFloat(formData.get('mouseScopeSens') as string) : null,
    mouse_hertz: formData.get('mouseHertz') ? parseInt(formData.get('mouseHertz') as string) : null,
    edpi: formData.get('edpi') ? parseInt(formData.get('edpi') as string) : null,
  }).eq('id', user.id)

  revalidatePath('/players/profile')
}
