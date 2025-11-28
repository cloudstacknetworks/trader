'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fetchBugsList } from '@/components/helpers/api-helpers';
import { showToast } from '@/components/helpers/toast';
import { useLoadingState } from '@/components/behaviors/use-loading-state';
import { Bug, Plus, Filter, AlertCircle, Clock, CheckCircle2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BugListProps {
  onBugClick?: (bugId: string) => void;
  onNewBug?: () => void;
  showFilters?: boolean;
}

interface BugItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reportedBy: string;
  createdAt: string;
  _count?: {
    activities: number;
  };
}

export const BugList: React.FC<BugListProps> = ({ 
  onBugClick, 
  onNewBug,
  showFilters = true 
}) => {
  const [bugs, setBugs] = React.useState<BugItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const { isLoading, startLoading, stopLoading } = useLoadingState();
  
  React.useEffect(() => {
    loadBugs();
  }, [statusFilter, priorityFilter]);
  
  const loadBugs = async () => {
    startLoading();
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const result = await fetchBugsList(params);
      if (result?.success) {
        setBugs(result?.bugs || []);
      } else {
        showToast(result?.error || 'Failed to load bugs', 'error');
      }
    } catch (error) {
      showToast('Failed to load bugs', 'error');
    } finally {
      stopLoading();
    }
  };
  
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];
  
  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Bug Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            {bugs?.length} {bugs?.length === 1 ? 'bug' : 'bugs'} found
          </p>
        </div>
        {onNewBug && (
          <Button onClick={onNewBug}>
            <Plus className="h-4 w-4 mr-2" />
            Report New Bug
          </Button>
        )}
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      {/* Bug List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : bugs?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bugs found</p>
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bugs?.map((bug) => (
            <div
              key={bug?.id}
              onClick={() => onBugClick?.(bug?.id)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                    {bug?.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {bug?.description}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                      priorityColors[bug?.priority as keyof typeof priorityColors] || 'text-gray-700 bg-gray-100'
                    )}>
                      <Flag className="h-3 w-3" />
                      {bug?.priority}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                      {statusIcons[bug?.status as keyof typeof statusIcons]}
                      {bug?.status?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(bug?.createdAt).toLocaleDateString()}
                    </span>
                    {bug?._count?.activities && bug._count.activities > 0 && (
                      <span className="text-xs text-gray-500">
                        {bug._count.activities} {bug._count.activities === 1 ? 'activity' : 'activities'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-xs text-gray-500">
                    <p className="mb-1">Reported by</p>
                    <p className="font-medium text-gray-900">{bug?.reportedBy}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

BugList.displayName = 'BugList';