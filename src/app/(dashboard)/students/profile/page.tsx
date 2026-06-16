import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import ProfileForm from './ProfileForm'

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
    region: formData.get('region') as string,
    in_game_role: formData.get('inGameRole') as string,
    institutional_email: formData.get('institutionalEmail') as string,
    mouse_dpi: formData.get('mouseDpi') ? Number(formData.get('mouseDpi')) : null,
    mouse_sens: formData.get('mouseSens') ? Number(formData.get('mouseSens')) : null,
    mouse_scope_sens: formData.get('mouseScopeSens') ? Number(formData.get('mouseScopeSens')) : null,
    edpi: formData.get('edpi') ? Number(formData.get('edpi')) : null,
    mouse_hertz: formData.get('mouseHertz') ? Number(formData.get('mouseHertz')) : null,
    social_discord: formData.get('socialDiscord') as string,
    social_youtube: formData.get('socialYoutube') as string,
    social_twitter: formData.get('socialTwitter') as string,
    social_twitch: formData.get('socialTwitch') as string,
  }).eq('id', user.id)

  revalidatePath('/students/profile')
}

export default async function StudentProfilePage() {
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
      <Link href="/students/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mi perfil</h1>

      <div className="glass rounded-xl p-6">
        <ProfileForm profile={profile} action={updateProfile} role="student" />
      </div>
    </div>
  )
}
