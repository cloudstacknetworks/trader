'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BugList } from '@/components/bug-module-shared';
import { Card } from '@/components/ui/card';

export default function BugsListPage() {
  const router = useRouter();
  
  const handleBugClick = (bugId: string) => {
    router.push(`/dashboard/bugs/${bugId}`);
  };
  
  const handleNewBug = () => {
    router.push('/dashboard/bugs/new');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bug Tracker</h1>
        <p className="mt-2 text-sm text-gray-600">View and manage all bug reports</p>
      </div>
      
      <BugList 
        onBugClick={handleBugClick}
        onNewBug={handleNewBug}
        showFilters={true}
      />
    </div>
  );
}
