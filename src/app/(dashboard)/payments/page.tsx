'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import CoachPaymentsView from './CoachPaymentsView'
import StudentPaymentsView from './StudentPaymentsView'

export default function PaymentsPage() {
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

      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!p) {
        router.replace('/login')
        return
      }

      setProfile(p)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const dashboardLink = profile.role === 'coach' ? '/coaches/dashboard' : profile.role === 'player' ? '/players/dashboard' : '/students/dashboard'

  return (
    <div>
      <Link href={dashboardLink} className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      {profile.role === 'coach' ? <CoachPaymentsView /> : <StudentPaymentsView />}
    </div>
  )
}
