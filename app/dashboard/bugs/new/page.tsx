'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BugForm } from '@/components/bug-module-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewBugPage() {
  const router = useRouter();
  
  const handleSuccess = (bugId: string) => {
    router.push(`/dashboard/bugs/${bugId}`);
  };
  
  const handleCancel = () => {
    router.push('/dashboard/bugs');
  };
  
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
        <h1 className="text-3xl font-bold text-gray-900">Report New Bug</h1>
        <p className="mt-2 text-sm text-gray-600">Fill out the form below to report a new bug</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Bug Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BugForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
