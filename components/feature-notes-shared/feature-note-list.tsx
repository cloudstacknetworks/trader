'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Search, Plus } from 'lucide-react';

interface FeatureNote {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'enhancement' | 'bugfix' | 'breaking';
  version: string;
  releaseDate: string;
  status: 'planned' | 'in_progress' | 'released' | 'deprecated';
  createdAt: string;
}

interface FeatureNoteListProps {
  onFeatureClick?: (featureId: string) => void;
  onNewFeature?: () => void;
  showFilters?: boolean;
}

export function FeatureNoteList({
  onFeatureClick,
  onNewFeature,
  showFilters = true,
}: FeatureNoteListProps) {
  const [features, setFeatures] = React.useState<FeatureNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  React.useEffect(() => {
    fetchFeatures();
  }, [categoryFilter, statusFilter]);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/features?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.features || []);
      }
    } catch (error) {
      console.error('Failed to fetch features:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeatures = features.filter((feature) =>
    feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feature Notes</h2>
          <p className="text-muted-foreground">
            Track features, enhancements, and updates
          </p>
        </div>
        {onNewFeature && (
          <Button onClick={onNewFeature} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search features..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="enhancement">Enhancement</SelectItem>
                    <SelectItem value="bugfix">Bug Fix</SelectItem>
                    <SelectItem value="breaking">Breaking Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <p className="text-muted-foreground">Loading features...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredFeatures.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No features found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFeatures.map((feature) => (
            <Card
              key={feature.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onFeatureClick?.(feature.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getCategoryColor(feature.category)}>
                        {feature.category}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(feature.status)}>
                        {feature.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        v{feature.version}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                  <time className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(feature.releaseDate).toLocaleDateString()}
                  </time>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
