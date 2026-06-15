import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import NotificationBell from '@/features/notifications/NotificationBell'
import DebtBanner from './DebtBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=pending')
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <DashboardSidebar
        role={profile.role}
        userName={profile.full_name}
        avatarUrl={profile.avatar_url}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-zinc-800 bg-[#0A0A0A] px-6 py-2">
          <NotificationBell profileId={user.id} />
        </header>
        <DebtBanner userId={user.id} role={profile.role} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
