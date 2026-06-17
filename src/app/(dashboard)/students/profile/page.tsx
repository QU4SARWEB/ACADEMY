'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import ProfileForm from './ProfileForm'
import { updateProfile } from './actions'

export default function StudentProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

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
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="glass rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-10 w-full animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

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
