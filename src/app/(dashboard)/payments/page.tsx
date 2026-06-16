import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoachPaymentsView from './CoachPaymentsView'
import StudentPaymentsView from './StudentPaymentsView'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')

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
