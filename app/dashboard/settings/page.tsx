
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SettingsView } from '@/components/settings-view'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <SettingsView />
    </DashboardLayout>
  )
}
