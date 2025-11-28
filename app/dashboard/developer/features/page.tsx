'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FeatureNoteList } from '@/components/feature-notes-shared';

export default function FeaturesPage() {
  const router = useRouter();

  const handleFeatureClick = (featureId: string) => {
    router.push(`/dashboard/developer/features/${featureId}`);
  };

  const handleNewFeature = () => {
    router.push('/dashboard/developer/features/new');
  };

  return (
    <FeatureNoteList
      onFeatureClick={handleFeatureClick}
      onNewFeature={handleNewFeature}
      showFilters={true}
    />
  );
}
