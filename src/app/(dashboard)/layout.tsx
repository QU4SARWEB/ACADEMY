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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <DashboardSidebar userId={session.user.id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-zinc-800 bg-[#0A0A0A] px-6 py-2">
          <NotificationBell profileId={session.user.id} />
        </header>
        <DebtBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
