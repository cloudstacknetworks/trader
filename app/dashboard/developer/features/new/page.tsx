'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FeatureNoteForm } from '@/components/feature-notes-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewFeaturePage() {
  const router = useRouter();

  const handleSuccess = (featureId: string) => {
    router.push(`/dashboard/developer/features/${featureId}`);
  };

  const handleCancel = () => {
    router.push('/dashboard/developer/features');
  };

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
      <FeatureNoteForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
