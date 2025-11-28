import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import EarningsResultsView from '@/components/earnings-results-view';

export default async function EarningsResultsPage({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  const { screenId } = await params;

  return (
    <DashboardLayout>
      <EarningsResultsView screenId={screenId} />
    </DashboardLayout>
  );
}
