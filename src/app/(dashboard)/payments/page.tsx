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

  if (profile.role === 'coach') {
    return <CoachPaymentsView />
  }

  return <StudentPaymentsView />
}
