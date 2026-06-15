import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import ProfileForm from '@/app/(dashboard)/students/profile/ProfileForm'

async function updateProfile(formData: FormData) {
  'use server'
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
  }).eq('id', user.id)

  revalidatePath('/coaches/profile')
}

export default async function CoachProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mi perfil</h1>
      <div className="glass rounded-xl p-6">
        <ProfileForm profile={profile} action={updateProfile} role="coach" />
      </div>
    </div>
  )
}
