
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import UserGuideView from '@/components/user-guide-view';

export default async function UserGuidePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <DashboardLayout>
      <UserGuideView />
    </DashboardLayout>
  );
}
