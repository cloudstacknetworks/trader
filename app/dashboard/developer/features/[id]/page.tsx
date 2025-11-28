'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FeatureNoteDetails } from '@/components/feature-notes-shared';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface FeatureDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function FeatureDetailsPage({ params }: FeatureDetailsPageProps) {
  const router = useRouter();
  const [featureId, setFeatureId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((resolvedParams) => {
      setFeatureId(resolvedParams.id);
    });
  }, [params]);

  if (!featureId) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/developer/features')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Features
      </Button>
      <FeatureNoteDetails featureId={featureId} />
    </div>
  );
}
