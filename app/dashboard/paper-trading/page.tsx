
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaperTradingLabView } from '@/components/paper-trading-lab-view';

export default async function PaperTradingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <DashboardLayout>
      <PaperTradingLabView />
    </DashboardLayout>
  );
}
