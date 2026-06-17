'use server'

import { createClient } from '@/lib/supabase/server'

export async function incrementProfileViews(profileId: string) {
  const client = await createClient()
  void client.rpc('increment_profile_views', { profile_id: profileId })
}
