'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormValidation } from '@/components/behaviors/use-form-validation';
import { showToast } from '@/components/helpers/toast';
import { submitBug } from '@/components/helpers/api-helpers';
import { Bug as BugIcon, AlertCircle } from 'lucide-react';

interface BugFormProps {
  onSuccess?: (bugId: string) => void;
  onCancel?: () => void;
}

const bugFormSchema = {
  title: {
    required: true,
    minLength: 5,
    message: 'Title must be at least 5 characters',
  },
  description: {
    required: true,
    minLength: 10,
    message: 'Description must be at least 10 characters',
  },
  priority: {
    required: true,
  },
  reportedBy: {
    required: true,
    minLength: 2,
    message: 'Reporter name must be at least 2 characters',
  },
};

export const BugForm: React.FC<BugFormProps> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { values, errors, handleChange, handleBlur, validate } = useFormValidation({
    title: '',
    description: '',
    priority: 'medium',
    reportedBy: '',
  }, bugFormSchema);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await submitBug({
        title: values?.title,
        description: values?.description,
        priority: values?.priority,
        reportedBy: values?.reportedBy,
      });
      
      if (result?.success) {
        showToast('Bug submitted successfully!', 'success');
        onSuccess?.(result?.bugId || '');
      } else {
        showToast(result?.error || 'Failed to submit bug', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Bug Submission Form</p>
          <p className="mt-1 text-blue-700">Please provide detailed information to help us resolve the issue quickly.</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bug-title">Bug Title</Label>
        <Input
          id="bug-title"
          placeholder="Brief description of the bug"
          value={values?.title}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
        />
        {errors?.title && <p className="text-sm text-red-600">{errors?.title}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bug-description">Description</Label>
        <Textarea
          id="bug-description"
          placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior..."
          value={values?.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          rows={6}
        />
        {errors?.description && <p className="text-sm text-red-600">{errors?.description}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bug-priority">Priority</Label>
        <Select
          value={values?.priority}
          onValueChange={(value) => handleChange('priority', value)}
        >
          <SelectTrigger id="bug-priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        {errors?.priority && <p className="text-sm text-red-600">{errors?.priority}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bug-reporter">Reported By</Label>
        <Input
          id="bug-reporter"
          placeholder="Your name or email"
          value={values?.reportedBy}
          onChange={(e) => handleChange('reportedBy', e.target.value)}
          onBlur={() => handleBlur('reportedBy')}
        />
        {errors?.reportedBy && <p className="text-sm text-red-600">{errors?.reportedBy}</p>}
      </div>
      
      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          <BugIcon className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit Bug'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

BugForm.displayName = 'BugForm';
