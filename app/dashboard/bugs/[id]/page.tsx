'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BugDetails } from '@/components/bug-module-shared';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BugDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function BugDetailsPage({ params }: BugDetailsPageProps) {
  const router = useRouter();
  const [bugId, setBugId] = React.useState<string>('');
  
  React.useEffect(() => {
    params.then(p => setBugId(p.id));
  }, [params]);
  
  if (!bugId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/bugs')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bugs
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Bug Details</h1>
        <p className="mt-2 text-sm text-gray-600">View and update bug information</p>
      </div>
      
      <BugDetails bugId={bugId} />
    </div>
  );
}
