'use client';

import * as React from 'react';
import { TabLayout, Tab } from '@/components/layouts/tab-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateBug, fetchBugDetails } from '@/components/helpers/api-helpers';
import { showToast } from '@/components/helpers/toast';
import { useLoadingState } from '@/components/behaviors/use-loading-state';
import { Bug, Activity, Clock, CheckCircle2, AlertCircle, Flag, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BugDetailsProps {
  bugId: string;
}

interface BugData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  activities: Array<{
    id: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    comment?: string;
    userName: string;
    createdAt: string;
  }>;
}

export const BugDetails: React.FC<BugDetailsProps> = ({ bugId }) => {
  const [bugData, setBugData] = React.useState<BugData | null>(null);
  const { isLoading, startLoading, stopLoading } = useLoadingState();
  
  React.useEffect(() => {
    loadBugDetails();
  }, [bugId]);
  
  const loadBugDetails = async () => {
    startLoading();
    try {
      const result = await fetchBugDetails(bugId);
      if (result?.success) {
        setBugData(result?.bug || null);
      } else {
        showToast(result?.error || 'Failed to load bug details', 'error');
      }
    } catch (error) {
      showToast('Failed to load bug details', 'error');
    } finally {
      stopLoading();
    }
  };
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await updateBug(bugId, { status: newStatus });
      if (result?.success) {
        showToast('Status updated successfully', 'success');
        loadBugDetails();
      } else {
        showToast(result?.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };
  
  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];
  
  const priorityColors = {
    low: 'text-green-700 bg-green-100',
    medium: 'text-yellow-700 bg-yellow-100',
    high: 'text-orange-700 bg-orange-100',
    critical: 'text-red-700 bg-red-100',
  };
  
  const statusIcons = {
    open: <AlertCircle className="h-4 w-4" />,
    in_progress: <Clock className="h-4 w-4" />,
    resolved: <CheckCircle2 className="h-4 w-4" />,
    closed: <CheckCircle2 className="h-4 w-4" />,
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!bugData) {
    return (
      <div className="text-center py-12">
        <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Bug not found</p>
      </div>
    );
  }
  
  const detailsTab = (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{bugData?.title}</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', priorityColors[bugData?.priority as keyof typeof priorityColors] || 'text-gray-700 bg-gray-100')}>
                <Flag className="h-3.5 w-3.5" />
                {bugData?.priority}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                {statusIcons[bugData?.status as keyof typeof statusIcons]}
                {bugData?.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="w-48 space-y-2">
            <Label>Status</Label>
            <Select value={bugData?.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{bugData?.description}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            Reporter Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Reported By</p>
              <p className="text-sm font-medium text-gray-900">{bugData?.reportedBy}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Created At</p>
              <p className="text-sm text-gray-700">{new Date(bugData?.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Status Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Last Updated</p>
              <p className="text-sm text-gray-700">{new Date(bugData?.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Assigned To</p>
              <p className="text-sm font-medium text-gray-900">{bugData?.assignedTo || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  const activityTab = (
    <div className="space-y-4">
      {bugData?.activities?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bugData?.activities?.map((activity) => (
            <div key={activity?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity?.userName}</span>
                    {' '}
                    <span className="text-gray-600">{activity?.action?.replace('_', ' ')}</span>
                    {activity?.field && (
                      <span className="text-gray-600">
                        {' '}{activity?.field}: 
                        <span className="text-red-600 line-through mx-1">{activity?.oldValue}</span>
                        <span className="text-green-600">{activity?.newValue}</span>
                      </span>
                    )}
                  </p>
                  {activity?.comment && (
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 rounded p-2">{activity?.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">{new Date(activity?.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const tabs: Tab[] = [
    {
      id: 'details',
      label: 'Details',
      icon: <Bug className="h-4 w-4" />,
      content: detailsTab,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity className="h-4 w-4" />,
      content: activityTab,
    },
  ];
  
  return <TabLayout tabs={tabs} defaultTab="details" />;
};

BugDetails.displayName = 'BugDetails';
