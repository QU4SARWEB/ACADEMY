import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const ROLE_PREFIX: Record<string, string> = { coach: '/coaches', student: '/students', player: '/players' }
  if (profile?.role !== 'student') redirect(`${ROLE_PREFIX[profile?.role] || `/${profile?.role}`}/dashboard`)

  return <>{children}</>
}
