'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfileForm from '@/app/(dashboard)/students/profile/ProfileForm'
import { updateProfile } from './actions'

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      setProfile(data)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="glass rounded-xl p-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

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
