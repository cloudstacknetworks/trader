'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Calendar, Package, Tag, AlertCircle } from 'lucide-react';
import { showToast } from '@/components/helpers/toast';

interface FeatureNote {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'enhancement' | 'bugfix' | 'breaking';
  version: string;
  releaseDate: string;
  status: 'planned' | 'in_progress' | 'released' | 'deprecated';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface FeatureNoteDetailsProps {
  featureId: string;
}

export function FeatureNoteDetails({ featureId }: FeatureNoteDetailsProps) {
  const [feature, setFeature] = React.useState<FeatureNote | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchFeatureDetails();
  }, [featureId]);

  const fetchFeatureDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/features/${featureId}`);
      if (response.ok) {
        const data = await response.json();
        setFeature(data.feature);
      } else {
        showToast('Failed to load feature details', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch feature details:', error);
      showToast('Failed to load feature details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showToast('Status updated successfully', 'success');
        fetchFeatureDetails();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      feature: 'bg-blue-500',
      enhancement: 'bg-green-500',
      bugfix: 'bg-yellow-500',
      breaking: 'bg-red-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-gray-500',
      in_progress: 'bg-blue-500',
      released: 'bg-green-500',
      deprecated: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">Loading feature details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!feature) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Feature not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge className={getCategoryColor(feature.category)}>
                    {feature.category}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(feature.status)}>
                    {feature.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {feature.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">{feature.version}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Release Date:</span>
              <span className="font-medium">
                {new Date(feature.releaseDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Update Status</Label>
            <Select
              value={feature.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {feature.createdBy && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created by:</span>
              <span className="font-medium">{feature.createdBy}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created at:</span>
            <span className="font-medium">
              {new Date(feature.createdAt).toLocaleString()}
            </span>
          </div>
          {feature.updatedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="font-medium">
                {new Date(feature.updatedAt).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
